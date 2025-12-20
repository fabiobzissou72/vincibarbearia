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
    const { agendamento_id, nova_data, nova_hora } = body

    // Validações
    if (!agendamento_id || !nova_data || !nova_hora) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros obrigatórios: agendamento_id, nova_data, nova_hora' },
        { status: 400 }
      )
    }

    // Buscar agendamento existente
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

    // Verificar se agendamento pode ser reagendado
    if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') {
      return NextResponse.json(
        { success: false, error: 'Agendamento não pode ser reagendado (cancelado ou concluído)' },
        { status: 400 }
      )
    }

    // Formatar data
    let dataFormatada: string
    if (nova_data.includes('-')) {
      const partes = nova_data.split('-')
      if (partes[0].length === 4) {
        // YYYY-MM-DD
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`
      } else {
        // DD-MM-YYYY
        dataFormatada = `${partes[0]}/${partes[1]}/${partes[2]}`
      }
    } else if (nova_data.includes('/')) {
      dataFormatada = nova_data
    } else {
      return NextResponse.json(
        { success: false, error: 'Formato de data inválido. Use DD-MM-YYYY ou YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validar horário
    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!horaRegex.test(nova_hora)) {
      return NextResponse.json(
        { success: false, error: 'Formato de horário inválido. Use HH:MM' },
        { status: 400 }
      )
    }

    // Verificar disponibilidade do barbeiro no novo horário
    const { data: conflito } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', agendamento.profissional_id)
      .eq('data_agendamento', dataFormatada)
      .eq('hora_inicio', nova_hora)
      .neq('status', 'cancelado')
      .neq('id', agendamento_id)
      .single()

    if (conflito) {
      return NextResponse.json(
        { success: false, error: 'Barbeiro já possui agendamento neste horário' },
        { status: 409 }
      )
    }

    // Atualizar agendamento
    const { data: agendamentoAtualizado, error: erroUpdate } = await supabase
      .from('agendamentos')
      .update({
        data_agendamento: dataFormatada,
        hora_inicio: nova_hora,
        status: 'agendado' // Resetar status para agendado
      })
      .eq('id', agendamento_id)
      .select('*, profissionais(*), agendamento_servicos(servicos(*))')
      .single()

    if (erroUpdate) {
      console.error('Erro ao reagendar:', erroUpdate)
      return NextResponse.json(
        { success: false, error: 'Erro ao reagendar agendamento' },
        { status: 500 }
      )
    }

    // Disparar webhook de reagendamento (se configurado)
    try {
      const { data: config } = await supabase
        .from('configuracoes')
        .select('webhook_url')
        .single()

      if (config?.webhook_url) {
        await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'reagendamento',
            agendamento: agendamentoAtualizado,
            data_anterior: agendamento.data_agendamento,
            hora_anterior: agendamento.hora_inicio,
            nova_data: dataFormatada,
            nova_hora: nova_hora
          })
        }).catch(err => console.error('Erro ao enviar webhook:', err))
      }
    } catch (err) {
      console.error('Erro ao processar webhook:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Agendamento reagendado com sucesso!',
      agendamento: agendamentoAtualizado,
      alteracoes: {
        data_anterior: agendamento.data_agendamento,
        hora_anterior: agendamento.hora_inicio,
        nova_data: dataFormatada,
        nova_hora: nova_hora
      }
    })
  } catch (error) {
    console.error('Erro ao reagendar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
