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
    const { agendamento_id, valor_final, observacoes } = body

    if (!agendamento_id) {
      return NextResponse.json(
        { success: false, error: 'agendamento_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar agendamento
    const { data: agendamento, error: erroAgendamento } = await supabase
      .from('agendamentos')
      .select('*, profissionais(*), agendamento_servicos(servicos(*))')
      .eq('id', agendamento_id)
      .single()

    if (erroAgendamento || !agendamento) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Calcular tempo de atendimento
    let tempo_atendimento_minutos = null
    if (agendamento.hora_checkin) {
      const checkin = new Date(agendamento.hora_checkin)
      const checkout = new Date()
      tempo_atendimento_minutos = Math.round((checkout.getTime() - checkin.getTime()) / 60000)
    }

    // Preparar dados de atualização
    const dadosAtualizacao: any = {
      status: 'concluido',
      compareceu: true,
      hora_checkout: new Date().toISOString(),
      tempo_atendimento_minutos
    }

    if (valor_final !== undefined) {
      dadosAtualizacao.valor = valor_final
    }

    if (observacoes) {
      dadosAtualizacao.observacoes = observacoes
    }

    // Finalizar agendamento
    const { data: atualizado, error: erroUpdate } = await supabase
      .from('agendamentos')
      .update(dadosAtualizacao)
      .eq('id', agendamento_id)
      .select('*, profissionais(*), agendamento_servicos(servicos(*))')
      .single()

    if (erroUpdate) {
      console.error('Erro ao finalizar agendamento:', erroUpdate)
      return NextResponse.json(
        { success: false, error: 'Erro ao finalizar agendamento' },
        { status: 500 }
      )
    }

    // Atualizar último serviço do cliente
    if (agendamento.cliente_id) {
      const servicosNomes = agendamento.agendamento_servicos
        ?.map((as: any) => as.servicos.nome)
        .join(', ') || ''

      await supabase
        .from('clientes')
        .update({ ultimo_servico: servicosNomes })
        .eq('id', agendamento.cliente_id)
        .catch(err => console.error('Erro ao atualizar cliente:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Atendimento finalizado com sucesso!',
      agendamento: atualizado,
      tempo_atendimento: tempo_atendimento_minutos ? `${tempo_atendimento_minutos} minutos` : null
    })
  } catch (error) {
    console.error('Erro ao finalizar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
