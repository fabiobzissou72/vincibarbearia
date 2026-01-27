import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { toZonedTime } from 'date-fns-tz'
import { verificarAutenticacao } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BRASILIA_TZ = 'America/Sao_Paulo'

/**
 * GET /api/clientes/meus-agendamentos
 *
 * Retorna os agendamentos FUTUROS de um cliente pelo telefone
 * Usado para o cliente ver seus agendamentos e poder cancelar via WhatsApp
 *
 * SEGURANÇA: Requer autenticação (token API ou requisição interna)
 * Isso protege os dados dos clientes de acesso não autorizado
 *
 * Aceita telefone via:
 * - Query params: ?telefone=5511999999999
 * - Header: telefone: 5511999999999
 *
 * Exemplo: /api/clientes/meus-agendamentos?telefone=5511999999999
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 SEGURANÇA: Verificar autenticação
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Use token de API válido.', detalhes: erro },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Aceita telefone via query param, header OU body
    let telefone = searchParams.get('telefone') || request.headers.get('telefone')

    // Se não veio nem por query nem por header, tenta pegar do body
    if (!telefone) {
      try {
        const body = await request.json()
        telefone = body.telefone
      } catch (e) {
        // Se falhar ao ler o body, continua sem telefone
      }
    }

    if (!telefone) {
      return NextResponse.json(
        { error: 'Telefone do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Normaliza o telefone (remove caracteres especiais)
    const telefoneNormalizado = telefone.replace(/\D/g, '')

    // 1. Data e hora atuais em Brasília (UTC-3)
    const agoraUTC = new Date()
    const agora = toZonedTime(agoraUTC, BRASILIA_TZ)
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const horaAtual = agora.getHours()
    const minutoAtual = agora.getMinutes()

    const formatarData = (data: Date) => {
      const dia = String(data.getDate()).padStart(2, '0')
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const ano = data.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    const dataHoje = formatarData(hoje)

    // 2. Buscar agendamentos do cliente (por telefone normalizado ou original)
    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_agendamento,
        hora_inicio,
        status,
        nome_cliente,
        telefone,
        compareceu,
        observacoes,
        valor,
        profissionais (
          nome
        ),
        agendamento_servicos (
          servicos (
            nome,
            preco,
            duracao_minutos
          )
        )
      `)
      .or(`telefone.eq.${telefone},telefone.eq.${telefoneNormalizado}`)
      .in('status', ['agendado', 'confirmado', 'em_andamento', 'pendente_retirada'])
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar agendamentos' },
        { status: 500 }
      )
    }

    if (!agendamentos || agendamentos.length === 0) {
      return NextResponse.json({
        cliente: {
          telefone: telefone,
          nome: null
        },
        total_agendamentos: 0,
        agendamentos_futuros: [],
        message: 'Você não possui agendamentos futuros'
      })
    }

    // 3. Filtrar apenas agendamentos futuros
    const agendamentosFuturos = agendamentos.filter(ag => {
      const [dia, mes, ano] = ag.data_agendamento.split('/').map(Number)
      const dataAg = new Date(ano, mes - 1, dia)

      // Se é uma data futura
      if (dataAg > hoje) return true

      // Se é hoje, verificar a hora
      if (dataAg.getTime() === hoje.getTime()) {
        const [horaAg, minutoAg] = ag.hora_inicio.split(':').map(Number)

        // Considera futuro se ainda não passou o horário
        if (horaAg > horaAtual) return true
        if (horaAg === horaAtual && minutoAg > minutoAtual) return true
      }

      return false
    })

    // 4. Processar agendamentos
    const agendamentosProcessados = agendamentosFuturos.map(ag => {
      const servicos = ag.agendamento_servicos?.map((as: any) => ({
        nome: as.servicos.nome,
        preco: as.servicos.preco,
        duracao_minutos: as.servicos.duracao_minutos
      })) || []

      // Usar valor do banco se disponível, senão calcular dos serviços
      const valorTotal = ag.valor || servicos.reduce((acc: number, s: any) => acc + parseFloat(s.preco), 0)
      const duracaoTotal = servicos.reduce((acc: number, s: any) => acc + parseInt(s.duracao_minutos), 0)

      // Calcular se ainda pode cancelar (mínimo 2 horas de antecedência)
      // Cria data/hora em Brasília
      const [dia, mes, ano] = ag.data_agendamento.split('/').map(Number)
      const [hora, minuto] = ag.hora_inicio.split(':').map(Number)
      const dataHoraAgendamento = toZonedTime(
        new Date(ano, mes - 1, dia, hora, minuto),
        BRASILIA_TZ
      )
      const diffHoras = (dataHoraAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60)
      const podeCancelar = diffHoras >= 2

      // Calcular tempo até o agendamento
      const diffMinutos = Math.floor((dataHoraAgendamento.getTime() - agora.getTime()) / (1000 * 60))
      let tempoRestante = ''

      if (diffMinutos < 60) {
        tempoRestante = `${diffMinutos} minutos`
      } else if (diffMinutos < 1440) {
        const horas = Math.floor(diffMinutos / 60)
        tempoRestante = `${horas} hora${horas > 1 ? 's' : ''}`
      } else {
        const dias = Math.floor(diffMinutos / 1440)
        tempoRestante = `${dias} dia${dias > 1 ? 's' : ''}`
      }

      return {
        id: ag.id,
        data: ag.data_agendamento,
        hora_inicio: ag.hora_inicio,
        status: ag.status,
        barbeiro: ag.profissionais?.nome || 'Não atribuído',
        servicos: servicos,
        valor_total: valorTotal,
        duracao_total: duracaoTotal,
        pode_cancelar: podeCancelar,
        tempo_restante: tempoRestante,
        motivo_nao_cancelar: podeCancelar ? null : 'Cancelamento deve ser feito com no mínimo 2 horas de antecedência',
        observacoes: ag.observacoes || null
      }
    })

    // 5. Informações do cliente (pegar do primeiro agendamento)
    const nomeCliente = agendamentos[0]?.nome_cliente || null

    // 6. Próximo agendamento (mais próximo)
    const proximoAgendamento = agendamentosFuturos.length > 0 ? agendamentosProcessados[0] : null

    return NextResponse.json({
      cliente: {
        telefone: telefone,
        nome: nomeCliente
      },
      total_agendamentos: agendamentosProcessados.length,
      proximo_agendamento: proximoAgendamento,
      agendamentos_futuros: agendamentosProcessados,
      avisos: {
        cancelamento: 'Para cancelar, você deve fazer com no mínimo 2 horas de antecedência',
        como_cancelar: 'Responda com o número do agendamento que deseja cancelar'
      }
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos do cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
