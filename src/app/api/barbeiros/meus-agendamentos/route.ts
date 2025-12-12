import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=hoje
 *
 * Retorna os agendamentos do barbeiro (para usar no WhatsApp)
 *
 * Parâmetros:
 * - barbeiro_nome: Nome do barbeiro (obrigatório)
 * - periodo: hoje | amanha | semana | semana_que_vem | mes | mes_que_vem | proximos7dias | proximos30dias (opcional, padrão: hoje)
 * - data_inicio: DD-MM-YYYY ou YYYY-MM-DD (para período customizado)
 * - data_fim: DD-MM-YYYY ou YYYY-MM-DD (para período customizado)
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
    const barbeiroNome = searchParams.get('barbeiro_nome')
    const periodo = searchParams.get('periodo') || 'hoje'
    const dataInicioParam = searchParams.get('data_inicio')
    const dataFimParam = searchParams.get('data_fim')

    if (!barbeiroNome) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro barbeiro_nome é obrigatório'
      }, { status: 400 })
    }

    // Buscar barbeiro pelo nome
    const { data: barbeiro, error: barbeiroError } = await supabase
      .from('profissionais')
      .select('*')
      .ilike('nome', barbeiroNome)
      .eq('ativo', true)
      .single()

    if (barbeiroError || !barbeiro) {
      return NextResponse.json({
        success: false,
        message: `Barbeiro "${barbeiroNome}" não encontrado`
      }, { status: 404 })
    }

    // Função auxiliar para formatar data
    const formatarData = (date: Date): string => {
      const [year, month, day] = date.toISOString().split('T')[0].split('-')
      return `${day}/${month}/${year}`
    }

    // Função auxiliar para parsear data customizada
    const parsearDataCustomizada = (dataStr: string): Date => {
      if (dataStr.includes('-')) {
        const partes = dataStr.split('-')
        if (partes[0].length === 4) {
          // YYYY-MM-DD
          return new Date(`${partes[0]}-${partes[1]}-${partes[2]}`)
        } else {
          // DD-MM-YYYY
          return new Date(`${partes[2]}-${partes[1]}-${partes[0]}`)
        }
      }
      return new Date(dataStr)
    }

    // Calcular período
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    let dataInicio: string
    let dataFim: string
    let descricaoPeriodo: string

    // Período customizado com data_inicio e data_fim
    if (dataInicioParam && dataFimParam) {
      const inicio = parsearDataCustomizada(dataInicioParam)
      const fim = parsearDataCustomizada(dataFimParam)
      dataInicio = formatarData(inicio)
      dataFim = formatarData(fim)
      descricaoPeriodo = `período customizado (${dataInicio} a ${dataFim})`
    } else if (periodo === 'hoje') {
      dataInicio = formatarData(hoje)
      dataFim = dataInicio
      descricaoPeriodo = `hoje (${dataInicio})`
    } else if (periodo === 'amanha') {
      const amanha = new Date(hoje)
      amanha.setDate(hoje.getDate() + 1)
      dataInicio = formatarData(amanha)
      dataFim = dataInicio
      descricaoPeriodo = `amanhã (${dataInicio})`
    } else if (periodo === 'semana') {
      // Domingo até Sábado da semana atual
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - hoje.getDay())
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)
      dataInicio = formatarData(inicioSemana)
      dataFim = formatarData(fimSemana)
      descricaoPeriodo = `esta semana (${dataInicio} a ${dataFim})`
    } else if (periodo === 'semana_que_vem') {
      const proximoDomingo = new Date(hoje)
      proximoDomingo.setDate(hoje.getDate() + (7 - hoje.getDay()))
      const proximoSabado = new Date(proximoDomingo)
      proximoSabado.setDate(proximoDomingo.getDate() + 6)
      dataInicio = formatarData(proximoDomingo)
      dataFim = formatarData(proximoSabado)
      descricaoPeriodo = `próxima semana (${dataInicio} a ${dataFim})`
    } else if (periodo === 'mes') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      dataInicio = formatarData(inicioMes)
      dataFim = formatarData(fimMes)
      descricaoPeriodo = `este mês (${dataInicio} a ${dataFim})`
    } else if (periodo === 'mes_que_vem') {
      const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
      const fimProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0)
      dataInicio = formatarData(inicioProximoMes)
      dataFim = formatarData(fimProximoMes)
      descricaoPeriodo = `próximo mês (${dataInicio} a ${dataFim})`
    } else if (periodo === 'proximos7dias') {
      const fim7dias = new Date(hoje)
      fim7dias.setDate(hoje.getDate() + 6)
      dataInicio = formatarData(hoje)
      dataFim = formatarData(fim7dias)
      descricaoPeriodo = `próximos 7 dias (${dataInicio} a ${dataFim})`
    } else if (periodo === 'proximos30dias') {
      const fim30dias = new Date(hoje)
      fim30dias.setDate(hoje.getDate() + 29)
      dataInicio = formatarData(hoje)
      dataFim = formatarData(fim30dias)
      descricaoPeriodo = `próximos 30 dias (${dataInicio} a ${dataFim})`
    } else {
      return NextResponse.json({
        success: false,
        message: 'Período inválido. Use: hoje, amanha, semana, semana_que_vem, mes, mes_que_vem, proximos7dias, proximos30dias ou forneça data_inicio e data_fim'
      }, { status: 400 })
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
      .order('data_agendamento')
      .order('hora_inicio')

    // Se for apenas hoje, filtrar exato
    if (periodo === 'hoje') {
      query = query.eq('data_agendamento', dataInicio)
    }
    // Se for semana ou mês, buscar todos e filtrar em memória
    // (porque data está em formato DD/MM/YYYY no banco)

    const { data: agendamentos, error: agendamentosError } = await query

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar agendamentos'
      }, { status: 500 })
    }

    // Filtrar por período (se necessário)
    let agendamentosFiltrados = agendamentos || []

    if (periodo !== 'hoje' && agendamentos) {
      // Converter datas para comparação
      const dataInicioObj = new Date(dataInicio.split('/').reverse().join('-'))
      const dataFimObj = new Date(dataFim.split('/').reverse().join('-'))

      agendamentosFiltrados = agendamentos.filter(ag => {
        const [day, month, year] = ag.data_agendamento.split('/')
        const dataAg = new Date(`${year}-${month}-${day}`)
        return dataAg >= dataInicioObj && dataAg <= dataFimObj
      })
    }

    // Filtrar apenas agendados, confirmados e em andamento
    agendamentosFiltrados = agendamentosFiltrados.filter(ag =>
      ['agendado', 'confirmado', 'em_andamento'].includes(ag.status)
    )

    // Formatar resposta para WhatsApp
    const agendamentosFormatados = agendamentosFiltrados.map(ag => {
      // Buscar todos os serviços
      const servicos = ag.agendamento_servicos?.map((as: any) => as.servicos.nome).join(' + ') || ag.servicos?.nome || 'N/A'
      const valorTotal = ag.valor

      return {
        id: ag.id,
        data: ag.data_agendamento,
        hora: ag.hora_inicio,
        cliente: ag.nome_cliente,
        telefone: ag.telefone,
        servicos: servicos,
        valor: valorTotal,
        status: ag.status,
        observacoes: ag.observacoes
      }
    })

    // Calcular totais
    const totalAgendamentos = agendamentosFormatados.length
    const valorTotal = agendamentosFormatados.reduce((sum, ag) => sum + (ag.valor || 0), 0)

    // Montar mensagem para WhatsApp
    let mensagemWhatsApp = `📅 *Seus agendamentos ${descricaoPeriodo}*\n\n`
    mensagemWhatsApp += `👤 *Barbeiro:* ${barbeiro.nome}\n`
    mensagemWhatsApp += `📊 *Total:* ${totalAgendamentos} agendamento(s)\n`
    mensagemWhatsApp += `💰 *Valor total:* R$ ${valorTotal.toFixed(2)}\n\n`

    if (totalAgendamentos === 0) {
      mensagemWhatsApp += `Nenhum agendamento encontrado para ${descricaoPeriodo} 😊`
    } else {
      mensagemWhatsApp += `─────────────────\n\n`
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

    return NextResponse.json({
      success: true,
      data: {
        barbeiro: {
          id: barbeiro.id,
          nome: barbeiro.nome
        },
        periodo: descricaoPeriodo,
        data_inicio: dataInicio,
        data_fim: dataFim,
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
