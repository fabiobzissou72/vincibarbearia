import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN' },
        { status: 401 }
      )
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json(
        { success: false, error: erro },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const telefone = searchParams.get('telefone')
    const cliente_id = searchParams.get('cliente_id')

    if (!telefone && !cliente_id) {
      return NextResponse.json(
        { success: false, error: 'telefone ou cliente_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar cliente
    let queryCliente = supabase
      .from('clientes')
      .select('*')

    if (cliente_id) {
      queryCliente = queryCliente.eq('id', cliente_id)
    } else if (telefone) {
      queryCliente = queryCliente.eq('telefone', telefone)
    }

    const { data: cliente, error: erroCliente } = await queryCliente.single()

    if (erroCliente || !cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Buscar todos os agendamentos do cliente por TELEFONE (não por cliente_id)
    // Isso garante que pegue TODOS, mesmo os criados antes do cadastro formal
    const { data: agendamentos, error: erroAgendamentos } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais(nome),
        agendamento_servicos(
          servicos(nome, preco, duracao_minutos)
        )
      `)
      .eq('telefone', telefone || cliente.telefone)
      .order('data_agendamento', { ascending: false })
      .order('hora_inicio', { ascending: false })

    if (erroAgendamentos) {
      console.error('Erro ao buscar agendamentos:', erroAgendamentos)
    }

    const agendamentosCompletos = agendamentos || []

    // Ordenar corretamente por data (converte DD/MM/YYYY para Date)
    agendamentosCompletos.sort((a, b) => {
      // Converter data brasileira DD/MM/YYYY para Date
      const parseDataBR = (dataStr: string): Date => {
        if (!dataStr) return new Date(0)
        const [dia, mes, ano] = dataStr.split('/')
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      }

      const dataA = parseDataBR(a.data_agendamento)
      const dataB = parseDataBR(b.data_agendamento)

      // Ordena por data (decrescente)
      if (dataB.getTime() !== dataA.getTime()) {
        return dataB.getTime() - dataA.getTime()
      }

      // Se mesma data, ordena por hora (decrescente)
      const horaA = a.hora_inicio || '00:00'
      const horaB = b.hora_inicio || '00:00'
      return horaB.localeCompare(horaA)
    })

    // Calcular estatísticas
    const totalAgendamentos = agendamentosCompletos.length
    const agendamentosRealizados = agendamentosCompletos.filter(
      a => a.compareceu === true || a.status === 'concluido'
    )
    const totalVisitas = agendamentosRealizados.length
    const totalGasto = agendamentosRealizados.reduce((sum, a) => sum + (a.valor || 0), 0)
    const ticketMedio = totalVisitas > 0 ? totalGasto / totalVisitas : 0

    // Serviços mais usados
    const servicosMap: Record<string, number> = {}
    agendamentosCompletos.forEach(ag => {
      ag.agendamento_servicos?.forEach((as: any) => {
        const nomeServico = as.servicos.nome
        servicosMap[nomeServico] = (servicosMap[nomeServico] || 0) + 1
      })
    })

    const servicosMaisUsados = Object.entries(servicosMap)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)

    // Barbeiro mais frequente
    const barbeirosMap: Record<string, number> = {}
    agendamentosCompletos.forEach(ag => {
      const nomeBarbeiro = ag.profissionais?.nome
      if (nomeBarbeiro) {
        barbeirosMap[nomeBarbeiro] = (barbeirosMap[nomeBarbeiro] || 0) + 1
      }
    })

    const barbeiroMaisFrequente = Object.entries(barbeirosMap)
      .sort((a, b) => b[1] - a[1])[0]

    // Último agendamento
    const ultimoAgendamento = agendamentosCompletos[0] || null

    // Taxa de comparecimento
    const taxaComparecimento = totalAgendamentos > 0
      ? ((totalVisitas / totalAgendamentos) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome_completo: cliente.nome_completo,
        telefone: cliente.telefone,
        email: cliente.email,
        is_vip: cliente.is_vip,
        data_cadastro: cliente.data_cadastro,
        profissional_preferido: cliente.profissional_preferido
      },
      estatisticas: {
        total_agendamentos: totalAgendamentos,
        total_visitas: totalVisitas,
        total_gasto: totalGasto,
        ticket_medio: Math.round(ticketMedio * 100) / 100,
        taxa_comparecimento: `${taxaComparecimento}%`,
        servicos_mais_usados: servicosMaisUsados,
        barbeiro_mais_frequente: barbeiroMaisFrequente
          ? { nome: barbeiroMaisFrequente[0], visitas: barbeiroMaisFrequente[1] }
          : null,
        ultimo_agendamento: ultimoAgendamento
          ? {
              data: ultimoAgendamento.data_agendamento,
              hora: ultimoAgendamento.hora_inicio,
              barbeiro: ultimoAgendamento.profissionais?.nome,
              servicos: ultimoAgendamento.agendamento_servicos?.map((as: any) => as.servicos.nome).join(', '),
              valor: ultimoAgendamento.valor,
              status: ultimoAgendamento.status
            }
          : null
      },
      agendamentos: agendamentosCompletos // TODOS os agendamentos em ordem decrescente
    })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
