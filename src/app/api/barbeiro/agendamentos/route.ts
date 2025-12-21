import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiro/agendamentos
 *
 * API intuitiva para barbeiros consultarem seus agendamentos
 *
 * Query Params:
 * - barbeiro: Nome do barbeiro (obrigatório)
 * - quando: Filtro de data (opcional)
 *   Valores aceitos:
 *   - "hoje", "amanha"
 *   - "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"
 *   - Data específica: "21/12/2024" ou "2024-12-21"
 *   - Se não informado: retorna todos os agendamentos futuros
 *
 * Exemplos:
 * - /api/barbeiro/agendamentos?barbeiro=Hiago&quando=hoje
 * - /api/barbeiro/agendamentos?barbeiro=Hiago&quando=terca
 * - /api/barbeiro/agendamentos?barbeiro=Hiago&quando=21/12/2024
 * - /api/barbeiro/agendamentos?barbeiro=Hiago (retorna todos futuros)
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        message: erro || 'Token de autorização inválido'
      }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const barbeiroParam = searchParams.get('barbeiro')
    const quando = searchParams.get('quando')?.toLowerCase()

    if (!barbeiroParam) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro "barbeiro" é obrigatório. Exemplo: ?barbeiro=Hiago ou ?barbeiro=uuid-do-barbeiro'
      }, { status: 400 })
    }

    // Detectar se é UUID ou nome
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barbeiroParam)

    // Buscar barbeiro pelo UUID ou nome
    let barbeiro
    let barbeiroError

    if (isUUID) {
      // Buscar por UUID
      const result = await supabase
        .from('profissionais')
        .select('*')
        .eq('id', barbeiroParam)
        .eq('ativo', true)
        .single()
      barbeiro = result.data
      barbeiroError = result.error
    } else {
      // Buscar por nome
      const result = await supabase
        .from('profissionais')
        .select('*')
        .ilike('nome', barbeiroParam)
        .eq('ativo', true)
        .single()
      barbeiro = result.data
      barbeiroError = result.error
    }

    if (barbeiroError || !barbeiro) {
      return NextResponse.json({
        success: false,
        message: `Barbeiro "${barbeiroParam}" não encontrado`
      }, { status: 404 })
    }

    // Obter data/hora atual de Brasília
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

    // Função para formatar data no formato DD/MM/YYYY
    const formatarData = (date: Date): string => {
      const dia = String(date.getDate()).padStart(2, '0')
      const mes = String(date.getMonth() + 1).padStart(2, '0')
      const ano = date.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    // Função para obter o próximo dia da semana
    const obterProximoDiaSemana = (diaSemana: number): Date => {
      const hoje = new Date(agora)
      const diaAtual = hoje.getDay()
      let diasAteProximo = diaSemana - diaAtual

      if (diasAteProximo <= 0) {
        diasAteProximo += 7
      }

      const proximaData = new Date(hoje)
      proximaData.setDate(hoje.getDate() + diasAteProximo)
      return proximaData
    }

    // Processar filtro "quando"
    let dataFiltro: string | null = null
    let descricao = 'todos os agendamentos futuros'

    if (quando) {
      if (quando === 'hoje') {
        dataFiltro = formatarData(agora)
        descricao = `hoje (${dataFiltro})`
      } else if (quando === 'amanha') {
        const amanha = new Date(agora)
        amanha.setDate(agora.getDate() + 1)
        dataFiltro = formatarData(amanha)
        descricao = `amanhã (${dataFiltro})`
      } else if (quando === 'segunda' || quando === 'segunda-feira') {
        const data = obterProximoDiaSemana(1)
        dataFiltro = formatarData(data)
        descricao = `segunda-feira (${dataFiltro})`
      } else if (quando === 'terca' || quando === 'terça' || quando === 'terça-feira' || quando === 'terca-feira') {
        const data = obterProximoDiaSemana(2)
        dataFiltro = formatarData(data)
        descricao = `terça-feira (${dataFiltro})`
      } else if (quando === 'quarta' || quando === 'quarta-feira') {
        const data = obterProximoDiaSemana(3)
        dataFiltro = formatarData(data)
        descricao = `quarta-feira (${dataFiltro})`
      } else if (quando === 'quinta' || quando === 'quinta-feira') {
        const data = obterProximoDiaSemana(4)
        dataFiltro = formatarData(data)
        descricao = `quinta-feira (${dataFiltro})`
      } else if (quando === 'sexta' || quando === 'sexta-feira') {
        const data = obterProximoDiaSemana(5)
        dataFiltro = formatarData(data)
        descricao = `sexta-feira (${dataFiltro})`
      } else if (quando === 'sabado' || quando === 'sábado' || quando === 'sabado-feira' || quando === 'sábado-feira') {
        const data = obterProximoDiaSemana(6)
        dataFiltro = formatarData(data)
        descricao = `sábado (${dataFiltro})`
      } else if (quando === 'domingo' || quando === 'domingo-feira') {
        const data = obterProximoDiaSemana(0)
        dataFiltro = formatarData(data)
        descricao = `domingo (${dataFiltro})`
      } else {
        // Tentar parsear como data específica
        let dataParseada: Date | null = null

        // Formato DD/MM/YYYY
        if (quando.includes('/')) {
          const partes = quando.split('/')
          if (partes.length === 3) {
            if (partes[0].length === 2 && partes[2].length === 4) {
              // DD/MM/YYYY
              dataParseada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`)
            } else if (partes[0].length === 4 && partes[2].length === 2) {
              // YYYY/MM/DD
              dataParseada = new Date(`${partes[0]}-${partes[1]}-${partes[2]}`)
            }
          }
        }
        // Formato YYYY-MM-DD
        else if (quando.includes('-')) {
          const partes = quando.split('-')
          if (partes.length === 3) {
            if (partes[0].length === 4) {
              // YYYY-MM-DD
              dataParseada = new Date(quando)
            } else if (partes[0].length === 2 && partes[2].length === 4) {
              // DD-MM-YYYY
              dataParseada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`)
            }
          }
        }

        if (dataParseada && !isNaN(dataParseada.getTime())) {
          dataFiltro = formatarData(dataParseada)
          descricao = `dia ${dataFiltro}`
        } else {
          return NextResponse.json({
            success: false,
            message: `Filtro "${quando}" não reconhecido. Use: hoje, amanha, segunda, terca, quarta, quinta, sexta, sabado, domingo, ou uma data (DD/MM/YYYY ou YYYY-MM-DD)`
          }, { status: 400 })
        }
      }
    }

    // Buscar agendamentos
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        servicos (nome, preco),
        agendamento_servicos (
          servicos (nome, preco)
        )
      `)
      .eq('profissional_id', barbeiro.id)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])
      .order('data_agendamento')
      .order('hora_inicio')

    // Se tiver filtro de data, aplicar
    if (dataFiltro) {
      query = query.eq('data_agendamento', dataFiltro)
    }

    const { data: agendamentos, error: agendamentosError } = await query

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar agendamentos'
      }, { status: 500 })
    }

    // Se não tiver filtro de data, filtrar apenas futuros
    let agendamentosFiltrados = agendamentos || []

    if (!dataFiltro && agendamentos) {
      const dataHoje = formatarData(agora)
      const horaAtual = agora.getHours()
      const minutoAtual = agora.getMinutes()

      agendamentosFiltrados = agendamentos.filter(ag => {
        const [dia, mes, ano] = ag.data_agendamento.split('/').map(Number)
        const dataAg = new Date(ano, mes - 1, dia)
        const hojeObj = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())

        // Agendamentos futuros
        if (dataAg > hojeObj) return true

        // Agendamentos de hoje que ainda não passaram
        if (ag.data_agendamento === dataHoje) {
          const [horaAg, minAg] = ag.hora_inicio.split(':').map(Number)
          return horaAg > horaAtual || (horaAg === horaAtual && minAg >= minutoAtual)
        }

        return false
      })
    }

    // Formatar resposta
    const agendamentosFormatados = agendamentosFiltrados.map(ag => {
      const servicos = ag.agendamento_servicos?.map((as: any) => as.servicos.nome).join(' + ') || ag.servicos?.nome || 'N/A'

      return {
        id: ag.id,
        data: ag.data_agendamento,
        hora: ag.hora_inicio,
        cliente: ag.nome_cliente,
        telefone: ag.telefone,
        servicos: servicos,
        valor: ag.valor,
        status: ag.status,
        observacoes: ag.observacoes
      }
    })

    // Calcular totais
    const totalAgendamentos = agendamentosFormatados.length
    const valorTotal = agendamentosFormatados.reduce((sum, ag) => sum + (ag.valor || 0), 0)

    // Montar mensagem para WhatsApp
    let mensagemWhatsApp = `📅 *Agendamentos - ${descricao}*\n\n`
    mensagemWhatsApp += `👤 *Barbeiro:* ${barbeiro.nome}\n`
    mensagemWhatsApp += `📊 *Total:* ${totalAgendamentos} agendamento(s)\n`
    mensagemWhatsApp += `💰 *Valor total:* R$ ${valorTotal.toFixed(2)}\n\n`

    if (totalAgendamentos === 0) {
      mensagemWhatsApp += `Nenhum agendamento encontrado 😊`
    } else {
      mensagemWhatsApp += `─────────────────\n\n`

      // Agrupar por data se não tiver filtro de data
      if (!dataFiltro) {
        const agendamentosPorData: { [key: string]: any[] } = {}

        agendamentosFormatados.forEach(ag => {
          if (!agendamentosPorData[ag.data]) {
            agendamentosPorData[ag.data] = []
          }
          agendamentosPorData[ag.data].push(ag)
        })

        Object.keys(agendamentosPorData).forEach(data => {
          mensagemWhatsApp += `📅 *${data}*\n\n`

          agendamentosPorData[data].forEach((ag, index) => {
            mensagemWhatsApp += `*${ag.hora}* - ${ag.cliente}\n`
            mensagemWhatsApp += `   📞 ${ag.telefone}\n`
            mensagemWhatsApp += `   ✂️ ${ag.servicos}\n`
            mensagemWhatsApp += `   💵 R$ ${ag.valor.toFixed(2)}\n`
            if (ag.observacoes) {
              mensagemWhatsApp += `   📝 ${ag.observacoes}\n`
            }
            mensagemWhatsApp += `\n`
          })

          mensagemWhatsApp += `\n`
        })
      } else {
        // Se tem filtro de data, mostrar direto
        agendamentosFormatados.forEach((ag, index) => {
          mensagemWhatsApp += `*${index + 1}. ${ag.hora}* - ${ag.cliente}\n`
          mensagemWhatsApp += `   📞 ${ag.telefone}\n`
          mensagemWhatsApp += `   ✂️ ${ag.servicos}\n`
          mensagemWhatsApp += `   💵 R$ ${ag.valor.toFixed(2)}\n`
          if (ag.observacoes) {
            mensagemWhatsApp += `   📝 ${ag.observacoes}\n`
          }
          mensagemWhatsApp += `\n`
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        barbeiro: {
          id: barbeiro.id,
          nome: barbeiro.nome
        },
        filtro: quando || 'todos futuros',
        descricao: descricao,
        data_filtro: dataFiltro,
        total_agendamentos: totalAgendamentos,
        valor_total: valorTotal,
        agendamentos: agendamentosFormatados,
        mensagem_whatsapp: mensagemWhatsApp
      }
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
