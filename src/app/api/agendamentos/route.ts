import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, formatDateTimeForGoogle, addMinutesToDateTime } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data')
    const profissionalId = searchParams.get('profissional_id')

    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        clientes (nome_completo, telefone),
        profissionais (nome, id_agenda),
        servicos (nome, preco, duracao_minutos)
      `)
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (data) {
      query = query.eq('data_agendamento', data)
    }

    if (profissionalId) {
      query = query.eq('profissional_id', profissionalId)
    }

    const { data: agendamentos, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(agendamentos)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cliente_id, profissional_id, servico_id, data_agendamento, hora_inicio, observacoes, nome_cliente, telefone } = body

    // Buscar dados do serviço e profissional
    const { data: servico } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', servico_id)
      .single()

    const { data: profissional } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', profissional_id)
      .single()

    if (!servico || !profissional) {
      return NextResponse.json({ error: 'Serviço ou profissional não encontrado' }, { status: 400 })
    }

    // Criar agendamento no Supabase
    const { data: novoAgendamento, error: supabaseError } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id,
        profissional_id,
        servico_id,
        data_agendamento,
        hora_inicio,
        observacoes,
        nome_cliente,
        telefone,
        valor: servico.preco,
        status: 'agendado'
      })
      .select()
      .single()

    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message }, { status: 500 })
    }

    // Sincronizar com Google Calendar
    try {
      const startDateTime = formatDateTimeForGoogle(data_agendamento, hora_inicio)
      const endDateTime = addMinutesToDateTime(startDateTime.dateTime, servico.duracao_minutos)

      const eventData = {
        summary: `${servico.nome} - ${nome_cliente}`,
        description: `Cliente: ${nome_cliente}\nTelefone: ${telefone}\nServiço: ${servico.nome}\nValor: R$ ${servico.preco}\nObservações: ${observacoes || 'Nenhuma'}`,
        start: startDateTime,
        end: endDateTime,
        attendees: telefone ? [{ email: `${telefone}@cliente.com` }] : undefined
      }

      const googleEvent = await createCalendarEvent(profissional.id_agenda, eventData)

      // Atualizar agendamento com ID do evento do Google
      await supabase
        .from('agendamentos')
        .update({ google_calendar_event_id: googleEvent.id })
        .eq('id', novoAgendamento.id)

    } catch (calendarError) {
      console.error('Erro ao sincronizar com Google Calendar:', calendarError)
      // Não falha o agendamento se der erro no Google Calendar
    }

    return NextResponse.json(novoAgendamento, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, cliente_id, profissional_id, servico_id, data_agendamento, hora_inicio, observacoes, nome_cliente, telefone, status } = body

    // Buscar agendamento existente
    const { data: agendamentoExistente } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais (id_agenda),
        servicos (nome, preco, duracao_minutos)
      `)
      .eq('id', id)
      .single()

    if (!agendamentoExistente) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Buscar novos dados se mudaram
    const { data: novoServico } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', servico_id)
      .single()

    const { data: novoProfissional } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', profissional_id)
      .single()

    // Atualizar no Supabase
    const { data: agendamentoAtualizado, error: supabaseError } = await supabase
      .from('agendamentos')
      .update({
        cliente_id,
        profissional_id,
        servico_id,
        data_agendamento,
        hora_inicio,
        observacoes,
        nome_cliente,
        telefone,
        valor: novoServico?.preco,
        status
      })
      .eq('id', id)
      .select()
      .single()

    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message }, { status: 500 })
    }

    // Sincronizar com Google Calendar
    try {
      if (agendamentoExistente.google_calendar_event_id) {
        const startDateTime = formatDateTimeForGoogle(data_agendamento, hora_inicio)
        const endDateTime = addMinutesToDateTime(startDateTime.dateTime, novoServico?.duracao_minutos || 30)

        const eventData = {
          summary: `${novoServico?.nome} - ${nome_cliente}`,
          description: `Cliente: ${nome_cliente}\nTelefone: ${telefone}\nServiço: ${novoServico?.nome}\nValor: R$ ${novoServico?.preco}\nObservações: ${observacoes || 'Nenhuma'}`,
          start: startDateTime,
          end: endDateTime,
          attendees: telefone ? [{ email: `${telefone}@cliente.com` }] : undefined
        }

        await updateCalendarEvent(
          novoProfissional?.id_agenda || agendamentoExistente.profissionais.id_agenda,
          agendamentoExistente.google_calendar_event_id,
          eventData
        )
      }
    } catch (calendarError) {
      console.error('Erro ao atualizar Google Calendar:', calendarError)
    }

    return NextResponse.json(agendamentoAtualizado)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório' }, { status: 400 })
    }

    // Buscar agendamento para pegar dados do Google Calendar
    const { data: agendamento } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais (id_agenda)
      `)
      .eq('id', id)
      .single()

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Deletar do Supabase
    const { error: supabaseError } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id)

    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message }, { status: 500 })
    }

    // Deletar do Google Calendar
    try {
      if (agendamento.google_calendar_event_id && agendamento.profissionais.id_agenda) {
        await deleteCalendarEvent(
          agendamento.profissionais.id_agenda,
          agendamento.google_calendar_event_id
        )
      }
    } catch (calendarError) {
      console.error('Erro ao deletar do Google Calendar:', calendarError)
    }

    return NextResponse.json({ message: 'Agendamento deletado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}