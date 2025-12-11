import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=hoje
 *
 * Retorna os agendamentos do barbeiro (para usar no WhatsApp)
 *
 * Parâmetros:
 * - barbeiro_nome: Nome do barbeiro (obrigatório)
 * - periodo: hoje | semana | mes (opcional, padrão: hoje)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barbeiroNome = searchParams.get('barbeiro_nome')
    const periodo = searchParams.get('periodo') || 'hoje'

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

    // Calcular período
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    let dataInicio: string
    let dataFim: string
    let descricaoPeriodo: string

    if (periodo === 'hoje') {
      const [year, month, day] = hoje.toISOString().split('T')[0].split('-')
      dataInicio = `${day}/${month}/${year}`
      dataFim = dataInicio
      descricaoPeriodo = `hoje (${dataInicio})`
    } else if (periodo === 'semana') {
      // Domingo até Sábado da semana atual
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - hoje.getDay())
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)

      const [yI, mI, dI] = inicioSemana.toISOString().split('T')[0].split('-')
      const [yF, mF, dF] = fimSemana.toISOString().split('T')[0].split('-')
      dataInicio = `${dI}/${mI}/${yI}`
      dataFim = `${dF}/${mF}/${yF}`
      descricaoPeriodo = `esta semana (${dataInicio} a ${dataFim})`
    } else if (periodo === 'mes') {
      // Mês atual
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

      const [yI, mI, dI] = inicioMes.toISOString().split('T')[0].split('-')
      const [yF, mF, dF] = fimMes.toISOString().split('T')[0].split('-')
      dataInicio = `${dI}/${mI}/${yI}`
      dataFim = `${dF}/${mF}/${yF}`
      descricaoPeriodo = `este mês (${dataInicio} a ${dataFim})`
    } else {
      return NextResponse.json({
        success: false,
        message: 'Período inválido. Use: hoje, semana ou mes'
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
