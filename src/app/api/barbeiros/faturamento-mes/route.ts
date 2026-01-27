import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/barbeiros/faturamento-mes
 *
 * 🔐 REQUER AUTENTICAÇÃO: Header Authorization: Bearer SEU_TOKEN
 *
 * Retorna o faturamento do MÊS ATUAL para um barbeiro específico
 *
 * Query params (pelo menos um obrigatório):
 * - telefone: Telefone do barbeiro (com ou sem DDI)
 * - barbeiro_nome: Nome do barbeiro
 * - barbeiro_id: UUID do barbeiro
 * - mes: (Opcional) Mês no formato MM (01-12). Padrão: mês atual
 * - ano: (Opcional) Ano no formato YYYY. Padrão: ano atual
 *
 * Exemplos:
 * - /api/barbeiros/faturamento-mes?telefone=5511999999999
 * - /api/barbeiros/faturamento-mes?barbeiro_nome=Hiago&mes=11&ano=2025
 * - /api/barbeiros/faturamento-mes?barbeiro_id=uuid-123
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO OBRIGATÓRIA
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        error: erro || 'Token de autorização inválido'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get('telefone')
    const barbeiroNome = searchParams.get('barbeiro_nome')
    const barbeiroId = searchParams.get('barbeiro_id')
    const mesParam = searchParams.get('mes')
    const anoParam = searchParams.get('ano')

    if (!telefone && !barbeiroNome && !barbeiroId) {
      return NextResponse.json(
        { error: 'É obrigatório fornecer telefone, barbeiro_nome ou barbeiro_id' },
        { status: 400 }
      )
    }

    // 1. Buscar o profissional pelo telefone, nome ou ID
    let profissional
    let profissionalError

    if (barbeiroId) {
      // Buscar por ID
      const result = await supabase
        .from('profissionais')
        .select('id, nome, telefone')
        .eq('id', barbeiroId)
        .single()
      profissional = result.data
      profissionalError = result.error
    } else if (telefone) {
      // Buscar por telefone
      const telefoneNormalizado = telefone.replace(/\D/g, '')
      const result = await supabase
        .from('profissionais')
        .select('id, nome, telefone')
        .or(`telefone.eq.${telefone},telefone.eq.${telefoneNormalizado}`)
        .single()
      profissional = result.data
      profissionalError = result.error
    } else if (barbeiroNome) {
      // Buscar por nome
      const result = await supabase
        .from('profissionais')
        .select('id, nome, telefone')
        .ilike('nome', `%${barbeiroNome}%`)
        .single()
      profissional = result.data
      profissionalError = result.error
    }

    if (profissionalError || !profissional) {
      return NextResponse.json(
        {
          error: 'Barbeiro não encontrado',
          message: 'Barbeiro não cadastrado no sistema'
        },
        { status: 404 }
      )
    }

    // 2. Determinar mês e ano
    const hoje = new Date()
    const mes = mesParam ? parseInt(mesParam) : hoje.getMonth() + 1
    const ano = anoParam ? parseInt(anoParam) : hoje.getFullYear()

    // Validação
    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: 'Mês inválido. Use valores entre 01 e 12' },
        { status: 400 }
      )
    }

    // 3. Calcular primeiro e último dia do mês
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)

    const formatarData = (data: Date) => {
      const dia = String(data.getDate()).padStart(2, '0')
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const ano = data.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    const dataInicio = formatarData(primeiroDia)
    const dataFim = formatarData(ultimoDia)

    // 4. Buscar todos os agendamentos do profissional (sem filtro de data no Supabase)
    const { data: todosAgendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_agendamento,
        hora_inicio,
        hora_fim,
        status,
        nome_cliente,
        telefone_cliente,
        compareceu,
        agendamento_servicos (
          servicos (
            nome,
            preco,
            duracao
          )
        )
      `)
      .eq('profissional_id', profissional.id)
      .neq('status', 'cancelado')
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar agendamentos' },
        { status: 500 }
      )
    }

    // 5. Filtrar agendamentos do mês especificado
    const agendamentosMes = todosAgendamentos?.filter(ag => {
      const [dia, mesAg, anoAg] = ag.data_agendamento.split('/').map(Number)
      return mesAg === mes && anoAg === ano
    }) || []

    // 6. Processar agendamentos e calcular valores
    const agendamentosProcessados = agendamentosMes.map(ag => {
      const servicos = ag.agendamento_servicos?.map((as: any) => ({
        nome: as.servicos.nome,
        preco: as.servicos.preco,
        duracao: as.servicos.duracao
      })) || []

      const valorTotal = servicos.reduce((acc: number, s: any) => acc + parseFloat(s.preco), 0)

      return {
        id: ag.id,
        data: ag.data_agendamento,
        hora_inicio: ag.hora_inicio,
        hora_fim: ag.hora_fim,
        status: ag.status,
        cliente: ag.nome_cliente,
        telefone: ag.telefone_cliente,
        compareceu: ag.compareceu,
        servicos: servicos,
        valor_total: valorTotal
      }
    })

    // 7. Calcular totais e estatísticas
    const totalAgendamentos = agendamentosProcessados.length
    const faturamentoBruto = agendamentosProcessados.reduce((acc, ag) => acc + ag.valor_total, 0)

    // Faturamento confirmado (apenas clientes que compareceram)
    const faturamentoConfirmado = agendamentosProcessados
      .filter(ag => ag.compareceu === true)
      .reduce((acc, ag) => acc + ag.valor_total, 0)

    const totalConcluidos = agendamentosProcessados.filter(ag => ag.status === 'concluido').length
    const totalCompareceram = agendamentosProcessados.filter(ag => ag.compareceu === true).length
    const totalFaltaram = agendamentosProcessados.filter(ag => ag.compareceu === false).length

    // Taxa de comparecimento
    const taxaComparecimento = totalAgendamentos > 0
      ? ((totalCompareceram / totalAgendamentos) * 100).toFixed(1)
      : '0.0'

    // 8. Agrupar por dia do mês
    const faturamentoPorDia: { [key: string]: any } = {}
    const diasNoMes = ultimoDia.getDate()

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const diaStr = String(dia).padStart(2, '0')
      const mesStr = String(mes).padStart(2, '0')
      const dataFormatada = `${diaStr}/${mesStr}/${ano}`

      const agendsDoDia = agendamentosProcessados.filter(ag => ag.data === dataFormatada)
      const faturamentoDia = agendsDoDia.reduce((acc, ag) => acc + ag.valor_total, 0)
      const faturamentoConfirmadoDia = agendsDoDia
        .filter(ag => ag.compareceu === true)
        .reduce((acc, ag) => acc + ag.valor_total, 0)

      if (agendsDoDia.length > 0) {
        faturamentoPorDia[dataFormatada] = {
          dia: diaStr,
          data: dataFormatada,
          total_agendamentos: agendsDoDia.length,
          faturamento_bruto: faturamentoDia,
          faturamento_confirmado: faturamentoConfirmadoDia,
          concluidos: agendsDoDia.filter(ag => ag.status === 'concluido').length,
          compareceram: agendsDoDia.filter(ag => ag.compareceu === true).length
        }
      }
    }

    // 9. Top 5 serviços mais vendidos
    const servicosMap: { [key: string]: { nome: string; quantidade: number; total: number } } = {}

    agendamentosProcessados.forEach(ag => {
      ag.servicos.forEach((servico: any) => {
        if (!servicosMap[servico.nome]) {
          servicosMap[servico.nome] = {
            nome: servico.nome,
            quantidade: 0,
            total: 0
          }
        }
        servicosMap[servico.nome].quantidade += 1
        servicosMap[servico.nome].total += parseFloat(servico.preco)
      })
    })

    const topServicos = Object.values(servicosMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)

    // 10. Nome do mês
    const nomesMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    const nomeMes = nomesMeses[mes - 1]

    return NextResponse.json({
      barbeiro: {
        id: profissional.id,
        nome: profissional.nome,
        telefone: profissional.telefone
      },
      periodo: {
        mes: mes,
        ano: ano,
        nome_mes: nomeMes,
        data_inicio: dataInicio,
        data_fim: dataFim
      },
      faturamento: {
        bruto: faturamentoBruto,
        confirmado: faturamentoConfirmado,
        perdido: faturamentoBruto - faturamentoConfirmado
      },
      estatisticas: {
        total_agendamentos: totalAgendamentos,
        concluidos: totalConcluidos,
        compareceram: totalCompareceram,
        faltaram: totalFaltaram,
        taxa_comparecimento: `${taxaComparecimento}%`
      },
      faturamento_por_dia: Object.values(faturamentoPorDia),
      top_servicos: topServicos,
      agendamentos_detalhados: agendamentosProcessados
    })

  } catch (error) {
    console.error('Erro ao buscar faturamento do mês:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
