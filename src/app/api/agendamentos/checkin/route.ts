import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO (permite requisições internas do dashboard sem token)
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      return NextResponse.json(
        { success: false, error: erro || 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { agendamento_id } = body

    if (!agendamento_id) {
      return NextResponse.json(
        { success: false, error: 'agendamento_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar agendamento
    const { data: agendamento, error: erroAgendamento } = await supabase
      .from('agendamentos')
      .select('*, profissionais(*)')
      .eq('id', agendamento_id)
      .single()

    if (erroAgendamento || !agendamento) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já não foi feito check-in
    if (agendamento.status === 'em_andamento' || agendamento.status === 'concluido') {
      return NextResponse.json(
        { success: false, error: 'Check-in já realizado' },
        { status: 400 }
      )
    }

    // Fazer check-in
    const { data: atualizado, error: erroUpdate } = await supabase
      .from('agendamentos')
      .update({
        status: 'em_andamento',
        compareceu: true,
        hora_checkin: new Date().toISOString()
      })
      .eq('id', agendamento_id)
      .select('*, profissionais(*)')
      .single()

    if (erroUpdate) {
      console.error('Erro ao fazer check-in:', erroUpdate)
      return NextResponse.json(
        { success: false, error: 'Erro ao fazer check-in' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in realizado com sucesso!',
      agendamento: atualizado
    })
  } catch (error) {
    console.error('Erro ao fazer check-in:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
