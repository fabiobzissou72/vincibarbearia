import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/agendamentos/confirmar-comparecimento
 *
 * Confirma ou registra comparecimento/falta do cliente
 *
 * Body: {
 *   agendamento_id: string (UUID) (obrigatório)
 *   compareceu: boolean (obrigatório)
 *   observacoes: string (opcional)
 * }
 *
 * Usado por:
 * - N8N: Quando cliente confirma via WhatsApp
 * - Dashboard: Quando atendente marca manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agendamento_id, compareceu, observacoes } = body

    console.log('[COMPARECIMENTO] Dados recebidos:', { agendamento_id, compareceu, observacoes })

    // Validações
    if (!agendamento_id) {
      return NextResponse.json({
        success: false,
        message: 'agendamento_id é obrigatório',
        errors: ['ID do agendamento não fornecido']
      }, { status: 400 })
    }

    if (typeof compareceu !== 'boolean') {
      return NextResponse.json({
        success: false,
        message: 'compareceu deve ser true ou false',
        errors: ['Valor inválido para compareceu']
      }, { status: 400 })
    }

    // Buscar agendamento
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', agendamento_id)
      .single()

    if (agendamentoError || !agendamento) {
      return NextResponse.json({
        success: false,
        message: 'Agendamento não encontrado',
        errors: ['ID inválido ou agendamento não existe']
      }, { status: 404 })
    }

    // Atualizar comparecimento E status automaticamente
    console.log('[COMPARECIMENTO] Atualizando agendamento:', agendamento_id)
    console.log('[COMPARECIMENTO] Compareceu:', compareceu)

    // Se compareceu=true, mudar status para 'concluido'
    // Se compareceu=false, mudar status para 'cancelado'
    const novoStatus = compareceu ? 'concluido' : 'cancelado'

    const { data: agendamentoAtualizado, error: updateError } = await supabase
      .from('agendamentos')
      .update({
        compareceu: compareceu,
        status: novoStatus,
        checkin_at: compareceu ? new Date().toISOString() : null,
        observacoes: compareceu
          ? (observacoes || agendamento.observacoes)
          : `Cliente não compareceu - marcado automaticamente. ${observacoes || agendamento.observacoes || ''}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', agendamento_id)
      .select()
      .single()

    if (updateError) {
      console.error('[COMPARECIMENTO] ERRO ao atualizar:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao atualizar agendamento',
        errors: [updateError.message]
      }, { status: 500 })
    }

    console.log('[COMPARECIMENTO] Atualização bem-sucedida!')

    return NextResponse.json({
      success: true,
      message: compareceu
        ? 'Comparecimento confirmado com sucesso!'
        : 'Falta registrada com sucesso',
      data: {
        agendamento_id: agendamento_id,
        compareceu: compareceu,
        status: agendamentoAtualizado.status,
        checkin_at: agendamentoAtualizado.checkin_at,
        cliente: agendamento.nome_cliente,
        barbeiro: agendamento.Barbeiro,
        data: agendamento.data_agendamento,
        hora: agendamento.hora_inicio
      }
    })

  } catch (error) {
    console.error('[COMPARECIMENTO] ❌ ERRO CAPTURADO:', error)
    console.error('[COMPARECIMENTO] ❌ STACK:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }, { status: 500 })
  }
}
