import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/barbeiros/agendamentos-semana
 *
 * Retorna os agendamentos da SEMANA ATUAL para um barbeiro específico
 *
 * Query params (pelo menos um obrigatório):
 * - telefone: Telefone do barbeiro (com ou sem DDI)
 * - barbeiro_nome: Nome do barbeiro
 * - barbeiro_id: UUID do barbeiro
 *
 * Exemplos:
 * - /api/barbeiros/agendamentos-semana?telefone=5511999999999
 * - /api/barbeiros/agendamentos-semana?barbeiro_nome=Hiago
 * - /api/barbeiros/agendamentos-semana?barbeiro_id=uuid-123
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get('telefone')
    const barbeiroNome = searchParams.get('barbeiro_nome')
    const barbeiroId = searchParams.get('barbeiro_id')

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

    // 2. Calcular início e fim da semana (Domingo a Sábado)
    const hoje = new Date()
    const diaSemana = hoje.getDay() // 0 = Domingo, 6 = Sábado

    // Início da semana (Domingo)
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - diaSemana)
    inicioSemana.setHours(0, 0, 0, 0)

    // Fim da semana (Sábado)
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 6)
    fimSemana.setHours(23, 59, 59, 999)

    // Formato DD/MM/YYYY para o banco
    const formatarData = (data: Date) => {
      const dia = String(data.getDate()).padStart(2, '0')
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const ano = data.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    const dataInicio = formatarData(inicioSemana)
    const dataFim = formatarData(fimSemana)

    // 3. Buscar todos os agendamentos da semana
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

    // 4. Filtrar agendamentos da semana atual
    const agendamentosSemana = todosAgendamentos?.filter(ag => {
      const [dia, mes, ano] = ag.data_agendamento.split('/').map(Number)
      const dataAgendamento = new Date(ano, mes - 1, dia)
      return dataAgendamento >= inicioSemana && dataAgendamento <= fimSemana
    }) || []

    // 5. Processar agendamentos e calcular valores
    const agendamentosProcessados = agendamentosSemana.map(ag => {
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

    // 6. Calcular totais
    const totalAgendamentos = agendamentosProcessados.length
    const faturamentoTotal = agendamentosProcessados.reduce((acc, ag) => acc + ag.valor_total, 0)
    const totalConfirmados = agendamentosProcessados.filter(ag => ag.status === 'confirmado').length
    const totalConcluidos = agendamentosProcessados.filter(ag => ag.status === 'concluido').length
    const totalCompareceram = agendamentosProcessados.filter(ag => ag.compareceu === true).length

    // 7. Agrupar por dia da semana
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const agendamentosPorDia: { [key: string]: any[] } = {}

    diasSemana.forEach((dia, index) => {
      const data = new Date(inicioSemana)
      data.setDate(inicioSemana.getDate() + index)
      const dataFormatada = formatarData(data)

      agendamentosPorDia[dia] = agendamentosProcessados.filter(ag => ag.data === dataFormatada)
    })

    // 8. Resumo por dia
    const resumoPorDia = diasSemana.map((nomeDia, index) => {
      const data = new Date(inicioSemana)
      data.setDate(inicioSemana.getDate() + index)
      const dataFormatada = formatarData(data)
      const agendsDoDia = agendamentosPorDia[nomeDia]
      const faturamentoDia = agendsDoDia.reduce((acc, ag) => acc + ag.valor_total, 0)

      return {
        dia: nomeDia,
        data: dataFormatada,
        total_agendamentos: agendsDoDia.length,
        faturamento: faturamentoDia,
        concluidos: agendsDoDia.filter(ag => ag.status === 'concluido').length
      }
    })

    // 9. Próximos agendamentos (futuros)
    const dataHoje = formatarData(hoje)
    const proximosAgendamentos = agendamentosProcessados.filter(ag => {
      const [dia, mes, ano] = ag.data.split('/').map(Number)
      const dataAg = new Date(ano, mes - 1, dia)
      const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

      // Agendamentos futuros ou de hoje
      if (dataAg > hojeDate) return true
      if (dataAg.getTime() === hojeDate.getTime()) {
        const [horaAg, minAg] = ag.hora_inicio.split(':').map(Number)
        const horaAtual = hoje.getHours()
        const minAtual = hoje.getMinutes()
        return horaAg > horaAtual || (horaAg === horaAtual && minAg >= minAtual)
      }
      return false
    })

    return NextResponse.json({
      barbeiro: {
        id: profissional.id,
        nome: profissional.nome,
        telefone: profissional.telefone
      },
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
        semana_atual: true
      },
      resumo: {
        total_agendamentos: totalAgendamentos,
        faturamento_total: faturamentoTotal,
        confirmados: totalConfirmados,
        concluidos: totalConcluidos,
        compareceram: totalCompareceram,
        proximos: proximosAgendamentos.length
      },
      agendamentos_por_dia: agendamentosPorDia,
      resumo_por_dia: resumoPorDia,
      proximos_agendamentos: proximosAgendamentos,
      todos_agendamentos: agendamentosProcessados
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos da semana:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
