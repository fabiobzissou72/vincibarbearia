import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiros/meu-faturamento?barbeiro_nome=Hiago&periodo=hoje
 *
 * Retorna o faturamento do barbeiro (para usar no WhatsApp)
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

    // Buscar agendamentos CONCLUÍDOS (faturamento realizado)
    let query = supabase
      .from('agendamentos')
      .select('*')
      .eq('profissional_id', barbeiro.id)
      .eq('status', 'concluido') // Apenas concluídos contam como faturamento
      .order('data_agendamento')
      .order('hora_inicio')

    // Se for apenas hoje, filtrar exato
    if (periodo === 'hoje') {
      query = query.eq('data_agendamento', dataInicio)
    }

    const { data: agendamentos, error: agendamentosError } = await query

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar faturamento'
      }, { status: 500 })
    }

    // Filtrar por período (se necessário)
    let agendamentosFiltrados = agendamentos || []

    if (periodo !== 'hoje' && agendamentos) {
      const dataInicioObj = new Date(dataInicio.split('/').reverse().join('-'))
      const dataFimObj = new Date(dataFim.split('/').reverse().join('-'))

      agendamentosFiltrados = agendamentos.filter(ag => {
        const [day, month, year] = ag.data_agendamento.split('/')
        const dataAg = new Date(`${year}-${month}-${day}`)
        return dataAg >= dataInicioObj && dataAg <= dataFimObj
      })
    }

    // Calcular estatísticas
    const totalAtendimentos = agendamentosFiltrados.length
    const faturamentoTotal = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.valor || 0), 0)
    const ticketMedio = totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0

    // Agrupar por dia
    const faturamentoPorDia: { [key: string]: { quantidade: number, valor: number } } = {}
    agendamentosFiltrados.forEach(ag => {
      const data = ag.data_agendamento
      if (!faturamentoPorDia[data]) {
        faturamentoPorDia[data] = { quantidade: 0, valor: 0 }
      }
      faturamentoPorDia[data].quantidade++
      faturamentoPorDia[data].valor += ag.valor || 0
    })

    // Ordenar por data
    const faturamentoPorDiaArray = Object.entries(faturamentoPorDia)
      .map(([data, stats]) => ({ data, ...stats }))
      .sort((a, b) => {
        const [dA, mA, yA] = a.data.split('/')
        const [dB, mB, yB] = b.data.split('/')
        return new Date(`${yA}-${mA}-${dA}`).getTime() - new Date(`${yB}-${mB}-${dB}`).getTime()
      })

    // Montar mensagem para WhatsApp
    let mensagemWhatsApp = `💰 *Seu faturamento ${descricaoPeriodo}*\n\n`
    mensagemWhatsApp += `👤 *Barbeiro:* ${barbeiro.nome}\n\n`
    mensagemWhatsApp += `📊 *Total de atendimentos:* ${totalAtendimentos}\n`
    mensagemWhatsApp += `💵 *Faturamento total:* R$ ${faturamentoTotal.toFixed(2)}\n`
    mensagemWhatsApp += `📈 *Ticket médio:* R$ ${ticketMedio.toFixed(2)}\n\n`

    if (totalAtendimentos === 0) {
      mensagemWhatsApp += `Nenhum atendimento concluído ${descricaoPeriodo} 😊`
    } else if (periodo !== 'hoje' && faturamentoPorDiaArray.length > 1) {
      mensagemWhatsApp += `─────────────────\n\n`
      mensagemWhatsApp += `*Detalhamento por dia:*\n\n`
      faturamentoPorDiaArray.forEach(dia => {
        mensagemWhatsApp += `📅 *${dia.data}*\n`
        mensagemWhatsApp += `   ${dia.quantidade} atendimento(s) - R$ ${dia.valor.toFixed(2)}\n\n`
      })
    }

    // Comparação com média
    let comparacao = ''
    if (periodo === 'hoje' && totalAtendimentos > 0) {
      // Comparar com média dos últimos 7 dias
      const seteDiasAtras = new Date(hoje)
      seteDiasAtras.setDate(hoje.getDate() - 7)

      const { data: ultimosSete } = await supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', barbeiro.id)
        .eq('status', 'concluido')
        .gte('data_agendamento', seteDiasAtras.toISOString().split('T')[0])

      if (ultimosSete && ultimosSete.length > 0) {
        const mediaUltimosSete = ultimosSete.reduce((sum, ag) => sum + (ag.valor || 0), 0) / 7
        const diferenca = faturamentoTotal - mediaUltimosSete
        const percentual = ((diferenca / mediaUltimosSete) * 100).toFixed(1)

        if (diferenca > 0) {
          comparacao = `\n📈 *${percentual}% acima* da média dos últimos 7 dias`
        } else if (diferenca < 0) {
          comparacao = `\n📉 *${Math.abs(Number(percentual))}% abaixo* da média dos últimos 7 dias`
        } else {
          comparacao = `\n➡️ Igual à média dos últimos 7 dias`
        }
      }
    }

    mensagemWhatsApp += comparacao

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
        total_atendimentos: totalAtendimentos,
        faturamento_total: faturamentoTotal,
        ticket_medio: ticketMedio,
        faturamento_por_dia: faturamentoPorDiaArray,
        mensagem_whatsapp: mensagemWhatsApp
      }
    })

  } catch (error) {
    console.error('Erro ao buscar faturamento:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
