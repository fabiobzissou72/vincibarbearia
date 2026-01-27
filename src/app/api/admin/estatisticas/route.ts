import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/estatisticas?periodo=mes
 *
 * Retorna estatísticas gerais da barbearia para o período especificado
 *
 * Query params:
 * - periodo: hoje | semana | mes | ano (padrão: mes)
 * - data_inicio: DD-MM-YYYY (opcional, para período customizado)
 * - data_fim: DD-MM-YYYY (opcional, para período customizado)
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        error: erro
      }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const periodo = searchParams.get('periodo') || 'mes'
    const dataInicioParam = searchParams.get('data_inicio')
    const dataFimParam = searchParams.get('data_fim')

    // Função auxiliar para formatar data
    const formatarData = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    // Calcular período
    const hoje = new Date()
    let dataInicio: string
    let dataFim: string
    let descricaoPeriodo: string

    if (dataInicioParam && dataFimParam) {
      // Período customizado
      dataInicio = dataInicioParam.replace(/-/g, '/')
      dataFim = dataFimParam.replace(/-/g, '/')
      descricaoPeriodo = `${dataInicio} a ${dataFim}`
    } else if (periodo === 'hoje') {
      dataInicio = formatarData(hoje)
      dataFim = dataInicio
      descricaoPeriodo = 'hoje'
    } else if (periodo === 'semana') {
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - hoje.getDay())
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)
      dataInicio = formatarData(inicioSemana)
      dataFim = formatarData(fimSemana)
      descricaoPeriodo = 'esta semana'
    } else if (periodo === 'mes') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      dataInicio = formatarData(inicioMes)
      dataFim = formatarData(fimMes)
      descricaoPeriodo = 'este mês'
    } else if (periodo === 'ano') {
      const inicioAno = new Date(hoje.getFullYear(), 0, 1)
      const fimAno = new Date(hoje.getFullYear(), 11, 31)
      dataInicio = formatarData(inicioAno)
      dataFim = formatarData(fimAno)
      descricaoPeriodo = 'este ano'
    } else {
      return NextResponse.json({
        success: false,
        error: 'Período inválido. Use: hoje, semana, mes, ano ou forneça data_inicio e data_fim'
      }, { status: 400 })
    }

    // Buscar todos os agendamentos do período
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais(nome),
        agendamento_servicos(
          servicos(nome)
        )
      `)

    // Filtrar por período em memória (devido ao formato DD/MM/YYYY)
    const dataInicioObj = new Date(dataInicio.split('/').reverse().join('-'))
    const dataFimObj = new Date(dataFim.split('/').reverse().join('-'))

    const agendamentosFiltrados = agendamentos?.filter(ag => {
      const [day, month, year] = ag.data_agendamento.split('/')
      const dataAg = new Date(`${year}-${month}-${day}`)
      return dataAg >= dataInicioObj && dataAg <= dataFimObj
    }) || []

    // Calcular estatísticas
    const totalAgendamentos = agendamentosFiltrados.length
    const agendamentosRealizados = agendamentosFiltrados.filter(
      ag => ag.compareceu === true || ag.status === 'concluido'
    )
    const agendamentosCancelados = agendamentosFiltrados.filter(
      ag => ag.status === 'cancelado'
    )

    const faturamentoTotal = agendamentosRealizados.reduce(
      (sum, ag) => sum + (ag.valor || 0),
      0
    )

    const taxaComparecimento = totalAgendamentos > 0
      ? ((agendamentosRealizados.length / totalAgendamentos) * 100).toFixed(1)
      : '0'

    const taxaCancelamentos = totalAgendamentos > 0
      ? ((agendamentosCancelados.length / totalAgendamentos) * 100).toFixed(1)
      : '0'

    // Barbeiro mais ativo
    const barbeiroContagem: Record<string, { nome: string; count: number }> = {}
    agendamentosFiltrados.forEach(ag => {
      if (ag.profissionais?.nome) {
        const nome = ag.profissionais.nome
        if (!barbeiroContagem[nome]) {
          barbeiroContagem[nome] = { nome, count: 0 }
        }
        barbeiroContagem[nome].count++
      }
    })

    const barbeiroMaisAtivo = Object.values(barbeiroContagem)
      .sort((a, b) => b.count - a.count)[0] || null

    // Serviço mais vendido
    const servicoContagem: Record<string, { nome: string; quantidade: number }> = {}
    agendamentosFiltrados.forEach(ag => {
      ag.agendamento_servicos?.forEach((as: any) => {
        const nomeServico = as.servicos.nome
        if (!servicoContagem[nomeServico]) {
          servicoContagem[nomeServico] = { nome: nomeServico, quantidade: 0 }
        }
        servicoContagem[nomeServico].quantidade++
      })
    })

    const servicoMaisVendido = Object.values(servicoContagem)
      .sort((a, b) => b.quantidade - a.quantidade)[0] || null

    // Horário pico (hora com mais agendamentos)
    const horarioContagem: Record<string, number> = {}
    agendamentosFiltrados.forEach(ag => {
      const hora = ag.hora_inicio.split(':')[0]
      horarioContagem[hora] = (horarioContagem[hora] || 0) + 1
    })

    const horarioPico = Object.entries(horarioContagem)
      .sort((a, b) => b[1] - a[1])[0]

    // Dia da semana mais movimentado
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const diaContagem: Record<string, number> = {}
    agendamentosFiltrados.forEach(ag => {
      const [day, month, year] = ag.data_agendamento.split('/')
      const dataAg = new Date(`${year}-${month}-${day}`)
      const diaSemana = diasSemana[dataAg.getDay()]
      diaContagem[diaSemana] = (diaContagem[diaSemana] || 0) + 1
    })

    const diaMaisMovimentado = Object.entries(diaContagem)
      .sort((a, b) => b[1] - a[1])[0]

    return NextResponse.json({
      success: true,
      periodo: descricaoPeriodo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      estatisticas: {
        faturamento_total: faturamentoTotal,
        total_agendamentos: totalAgendamentos,
        agendamentos_realizados: agendamentosRealizados.length,
        agendamentos_cancelados: agendamentosCancelados.length,
        taxa_comparecimento: `${taxaComparecimento}%`,
        taxa_cancelamentos: `${taxaCancelamentos}%`,
        barbeiro_mais_ativo: barbeiroMaisAtivo
          ? {
              nome: barbeiroMaisAtivo.nome,
              agendamentos: barbeiroMaisAtivo.count
            }
          : null,
        servico_mais_vendido: servicoMaisVendido
          ? {
              nome: servicoMaisVendido.nome,
              quantidade: servicoMaisVendido.quantidade
            }
          : null,
        horario_pico: horarioPico
          ? `${horarioPico[0]}:00 (${horarioPico[1]} agendamentos)`
          : null,
        dia_semana_mais_movimentado: diaMaisMovimentado
          ? `${diaMaisMovimentado[0]} (${diaMaisMovimentado[1]} agendamentos)`
          : null
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
