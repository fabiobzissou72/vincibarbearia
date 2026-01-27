import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/barbeiros/agendamentos-hoje
 *
 * Retorna os agendamentos de HOJE para um barbeiro específico
 *
 * Query params:
 * - telefone: Telefone do barbeiro (com ou sem DDI)
 *
 * Exemplo: /api/barbeiros/agendamentos-hoje?telefone=5511999999999
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get('telefone')

    if (!telefone) {
      return NextResponse.json(
        { error: 'Telefone do barbeiro é obrigatório' },
        { status: 400 }
      )
    }

    // Normaliza o telefone (remove caracteres especiais)
    const telefoneNormalizado = telefone.replace(/\D/g, '')

    // 1. Buscar o profissional pelo telefone
    const { data: profissional, error: profissionalError } = await supabase
      .from('profissionais')
      .select('id, nome, telefone')
      .or(`telefone.eq.${telefone},telefone.eq.${telefoneNormalizado}`)
      .single()

    if (profissionalError || !profissional) {
      return NextResponse.json(
        {
          error: 'Barbeiro não encontrado',
          message: 'Telefone não cadastrado no sistema'
        },
        { status: 404 }
      )
    }

    // 2. Data de hoje no formato DD/MM/YYYY (timezone Brasília)
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const dia = String(hoje.getDate()).padStart(2, '0')
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ano = hoje.getFullYear()
    const dataHoje = `${dia}/${mes}/${ano}`

    // 3. Buscar agendamentos de hoje deste barbeiro
    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_agendamento,
        hora_inicio,
        hora_fim,
        status,
        nome_cliente,
        telefone,
        compareceu,
        agendamento_servicos (
          servicos (
            nome,
            preco,
            duracao_minutos
          )
        )
      `)
      .eq('profissional_id', profissional.id)
      .eq('data_agendamento', dataHoje)
      .neq('status', 'cancelado')
      .order('hora_inicio', { ascending: true })

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar agendamentos' },
        { status: 500 }
      )
    }

    // 4. Processar agendamentos e calcular valores
    const agendamentosProcessados = agendamentos?.map(ag => {
      const servicos = ag.agendamento_servicos?.map((as: any) => ({
        nome: as.servicos.nome,
        preco: as.servicos.preco,
        duracao_minutos: as.servicos.duracao_minutos
      })) || []

      const valorTotal = servicos.reduce((acc: number, s: any) => acc + parseFloat(s.preco), 0)

      return {
        id: ag.id,
        data: ag.data_agendamento,
        hora_inicio: ag.hora_inicio,
        hora_fim: ag.hora_fim,
        status: ag.status,
        cliente: ag.nome_cliente,
        telefone: ag.telefone,
        compareceu: ag.compareceu,
        servicos: servicos,
        valor_total: valorTotal
      }
    }) || []

    // 5. Calcular totais
    const totalAgendamentos = agendamentosProcessados.length
    const faturamentoTotal = agendamentosProcessados.reduce((acc, ag) => acc + ag.valor_total, 0)
    const totalConfirmados = agendamentosProcessados.filter(ag => ag.status === 'confirmado').length
    const totalConcluidos = agendamentosProcessados.filter(ag => ag.status === 'concluido').length
    const totalCompareceram = agendamentosProcessados.filter(ag => ag.compareceu === true).length

    // 6. Agrupar por status
    const proximosAgendamentos = agendamentosProcessados.filter(ag =>
      ag.status === 'agendado' || ag.status === 'confirmado'
    )
    const emAndamento = agendamentosProcessados.filter(ag => ag.status === 'em_andamento')
    const concluidos = agendamentosProcessados.filter(ag => ag.status === 'concluido')

    return NextResponse.json({
      barbeiro: {
        id: profissional.id,
        nome: profissional.nome,
        telefone: profissional.telefone
      },
      data: dataHoje,
      resumo: {
        total_agendamentos: totalAgendamentos,
        faturamento_total: faturamentoTotal,
        confirmados: totalConfirmados,
        concluidos: totalConcluidos,
        compareceram: totalCompareceram,
        proximos: proximosAgendamentos.length,
        em_andamento: emAndamento.length
      },
      agendamentos: {
        proximos: proximosAgendamentos,
        em_andamento: emAndamento,
        concluidos: concluidos,
        todos: agendamentosProcessados
      }
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
