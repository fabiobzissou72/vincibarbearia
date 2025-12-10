import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agendamentos/buscar-barbeiro-rodizio
 *
 * Retorna o próximo barbeiro disponível no rodízio
 * Usado pelo formulário de agendamento quando não há barbeiro preferido
 *
 * Query Params:
 * - data: string (YYYY-MM-DD)
 * - hora: string (HH:MM)
 * - duracao: number (minutos)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data')
    const hora = searchParams.get('hora')
    const duracao = parseInt(searchParams.get('duracao') || '30')

    if (!data || !hora) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetros data e hora são obrigatórios'
      }, { status: 400 })
    }

    // Converter data de YYYY-MM-DD para DD/MM/YYYY (formato do banco)
    const [year, month, day] = data.split('-')
    const dataBR = `${day}/${month}/${year}`

    // Buscar barbeiros do rodízio atual (ordenado por menos atendimentos)
    const { data: rodizio, error: rodizioError } = await supabase
      .from('v_rodizio_atual')
      .select('*')
      .order('total_atendimentos_hoje', { ascending: true })
      .order('ultima_vez', { ascending: true, nullsFirst: true })

    if (rodizioError || !rodizio || rodizio.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum barbeiro disponível no rodízio'
      }, { status: 404 })
    }

    // Buscar agendamentos existentes
    const { data: agendamentosExistentes } = await supabase
      .from('agendamentos')
      .select(`
        profissional_id,
        hora_inicio,
        agendamento_servicos (duracao_minutos)
      `)
      .eq('data_agendamento', dataBR)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])

    // Calcular horário de início e fim do novo agendamento
    const [horaReq, minReq] = hora.split(':').map(Number)
    const inicioReq = horaReq * 60 + minReq
    const fimReq = inicioReq + duracao

    // Verificar cada barbeiro do rodízio
    for (const barbeiro of rodizio) {
      const ocupado = agendamentosExistentes?.some(ag => {
        if (ag.profissional_id !== barbeiro.profissional_id) return false

        const [horaAg, minAg] = ag.hora_inicio.split(':').map(Number)
        const duracaoAg = ag.agendamento_servicos?.reduce((sum: number, s: any) =>
          sum + (s.duracao_minutos || 30), 0) || 30

        const inicioAg = horaAg * 60 + minAg
        const fimAg = inicioAg + duracaoAg

        // Verifica sobreposição
        return (inicioReq < fimAg && fimReq > inicioAg)
      })

      if (!ocupado) {
        // Encontrou barbeiro disponível!
        return NextResponse.json({
          success: true,
          data: {
            barbeiro_id: barbeiro.profissional_id,
            barbeiro_nome: barbeiro.profissional_nome,
            total_atendimentos_hoje: barbeiro.total_atendimentos_hoje,
            disponivel: true
          }
        })
      }
    }

    // Nenhum barbeiro disponível neste horário
    return NextResponse.json({
      success: false,
      message: 'Todos os barbeiros estão ocupados neste horário',
      data: {
        barbeiros_verificados: rodizio.length,
        sugestao: 'Tente outro horário'
      }
    }, { status: 409 })

  } catch (error) {
    console.error('Erro ao buscar barbeiro do rodízio:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
