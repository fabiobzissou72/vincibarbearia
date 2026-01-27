import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/lembretes
 *
 * API SIMPLES para N8N buscar agendamentos e enviar lembretes
 *
 * Query Parameters:
 * - tipo: 'amanha' | 'hoje' | '1hora'
 *
 * Retorna lista de clientes para enviar lembrete
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'amanha'

    console.log(`[LEMBRETES] Buscando lembretes tipo: ${tipo}`)

    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    let dataBusca: string
    let agendamentos: any[] = []

    // ==========================================
    // TIPO: AMANHÃ (Lembrete 24h antes)
    // ==========================================
    if (tipo === 'amanha') {
      const amanha = new Date(agora)
      amanha.setDate(amanha.getDate() + 1)

      const dia = String(amanha.getDate()).padStart(2, '0')
      const mes = String(amanha.getMonth() + 1).padStart(2, '0')
      const ano = amanha.getFullYear()
      dataBusca = `${dia}/${mes}/${ano}`

      const { data } = await supabase
        .from('agendamentos')
        .select(`
          id,
          nome_cliente,
          telefone,
          data_agendamento,
          hora_inicio,
          valor,
          profissionais (nome),
          agendamento_servicos (servicos (nome))
        `)
        .eq('data_agendamento', dataBusca)
        .in('status', ['agendado', 'confirmado'])
        .order('hora_inicio', { ascending: true })

      agendamentos = data || []
    }

    // ==========================================
    // TIPO: HOJE (Lembrete no dia)
    // ==========================================
    else if (tipo === 'hoje') {
      const dia = String(agora.getDate()).padStart(2, '0')
      const mes = String(agora.getMonth() + 1).padStart(2, '0')
      const ano = agora.getFullYear()
      dataBusca = `${dia}/${mes}/${ano}`

      const { data } = await supabase
        .from('agendamentos')
        .select(`
          id,
          nome_cliente,
          telefone,
          data_agendamento,
          hora_inicio,
          valor,
          profissionais (nome),
          agendamento_servicos (servicos (nome))
        `)
        .eq('data_agendamento', dataBusca)
        .in('status', ['agendado', 'confirmado'])
        .order('hora_inicio', { ascending: true })

      agendamentos = data || []
    }

    // ==========================================
    // TIPO: 1 HORA ANTES
    // ==========================================
    else if (tipo === '1hora') {
      const dia = String(agora.getDate()).padStart(2, '0')
      const mes = String(agora.getMonth() + 1).padStart(2, '0')
      const ano = agora.getFullYear()
      dataBusca = `${dia}/${mes}/${ano}`

      // Calcular hora daqui 1 hora
      const daquiUmaHora = new Date(agora)
      daquiUmaHora.setHours(daquiUmaHora.getHours() + 1)
      const horaAlvo = `${String(daquiUmaHora.getHours()).padStart(2, '0')}:${String(daquiUmaHora.getMinutes()).padStart(2, '0')}`

      const { data } = await supabase
        .from('agendamentos')
        .select(`
          id,
          nome_cliente,
          telefone,
          data_agendamento,
          hora_inicio,
          valor,
          profissionais (nome),
          agendamento_servicos (servicos (nome))
        `)
        .eq('data_agendamento', dataBusca)
        .eq('hora_inicio', horaAlvo)
        .in('status', ['agendado', 'confirmado'])

      agendamentos = data || []
    }

    // ==========================================
    // FORMATAR RESPOSTA
    // ==========================================
    const detalhes = agendamentos.map(ag => {
      // Extrair nomes dos serviços do relacionamento agendamento_servicos
      const servicos = ag.agendamento_servicos?.map((as: any) => as.servicos?.nome).filter(Boolean) || []

      return {
        cliente: ag.nome_cliente,
        telefone: ag.telefone,
        data: ag.data_agendamento,
        hora: ag.hora_inicio,
        barbeiro: ag.profissionais?.nome || 'Não definido',
        servicos: servicos.length > 0 ? servicos : ['Serviço não definido'],
        valor: ag.valor ? Number(ag.valor).toFixed(2) : '0.00'
      }
    })

    console.log(`[LEMBRETES] Encontrados ${detalhes.length} agendamentos para tipo: ${tipo}`)

    return NextResponse.json({
      success: true,
      tipo: tipo,
      data_busca: dataBusca || 'N/A',
      total: detalhes.length,
      lembretes: detalhes
    })

  } catch (error) {
    console.error('[LEMBRETES] Erro:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar lembretes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
