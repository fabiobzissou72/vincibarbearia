import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
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

    // Buscar todos os agendamentos do cliente
    const { data: agendamentos, error: erroAgendamentos } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais(nome),
        agendamento_servicos(
          servicos(nome, valor)
        )
      `)
      .eq('cliente_id', cliente.id)
      .order('data_agendamento', { ascending: false })
      .order('hora_inicio', { ascending: false })

    if (erroAgendamentos) {
      console.error('Erro ao buscar agendamentos:', erroAgendamentos)
    }

    const agendamentosCompletos = agendamentos || []

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
      agendamentos: agendamentosCompletos.slice(0, 10) // Últimos 10
    })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
