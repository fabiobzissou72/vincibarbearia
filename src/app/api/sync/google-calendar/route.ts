import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCalendarEvents, CALENDAR_IDS } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando sincronização bidirecional com Google Calendar...')

    // Buscar todos os profissionais
    const { data: profissionais } = await supabase
      .from('profissionais')
      .select('*')

    if (!profissionais) {
      return NextResponse.json({ error: 'Nenhum profissional encontrado' }, { status: 404 })
    }

    const syncResults = []

    for (const profissional of profissionais) {
      if (!profissional.id_agenda) {
        console.log(`Profissional ${profissional.nome} não possui ID de agenda`)
        continue
      }

      try {
        console.log(`Sincronizando agenda de ${profissional.nome}...`)

        // Buscar eventos do Google Calendar
        const hoje = new Date()
        const proximaSemana = new Date(hoje)
        proximaSemana.setDate(hoje.getDate() + 7)

        const googleEvents = await getCalendarEvents(
          profissional.id_agenda,
          hoje.toISOString(),
          proximaSemana.toISOString()
        )

        console.log(`Encontrados ${googleEvents.length} eventos no Google Calendar para ${profissional.nome}`)

        // Buscar agendamentos existentes no Supabase
        const { data: agendamentosExistentes } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('profissional_id', profissional.id)
          .gte('data_agendamento', hoje.toISOString().split('T')[0])
          .lte('data_agendamento', proximaSemana.toISOString().split('T')[0])

        const agendamentosMap = new Map()
        agendamentosExistentes?.forEach(agendamento => {
          if (agendamento.google_calendar_event_id) {
            agendamentosMap.set(agendamento.google_calendar_event_id, agendamento)
          }
        })

        let novosAgendamentos = 0
        let agendamentosAtualizados = 0

        // Processar eventos do Google Calendar
        for (const googleEvent of googleEvents) {
          if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
            continue // Pular eventos de dia inteiro
          }

          const startDateTime = new Date(googleEvent.start.dateTime)
          const endDateTime = new Date(googleEvent.end.dateTime)
          const dataAgendamento = startDateTime.toISOString().split('T')[0]
          const horaInicio = startDateTime.toTimeString().slice(0, 5)

          const agendamentoExistente = agendamentosMap.get(googleEvent.id)

          if (agendamentoExistente) {
            // Verificar se precisa atualizar
            const dataExistente = agendamentoExistente.data_agendamento
            const horaExistente = agendamentoExistente.hora_inicio

            if (dataExistente !== dataAgendamento || horaExistente !== horaInicio) {
              // Atualizar agendamento existente
              await supabase
                .from('agendamentos')
                .update({
                  data_agendamento: dataAgendamento,
                  hora_inicio: horaInicio,
                  observacoes: googleEvent.description || agendamentoExistente.observacoes
                })
                .eq('id', agendamentoExistente.id)

              agendamentosAtualizados++
              console.log(`Agendamento atualizado: ${googleEvent.summary}`)
            }
          } else {
            // Criar novo agendamento se não existe
            const nomeCliente = googleEvent.summary?.split(' - ')[1] || googleEvent.summary || 'Cliente não identificado'

            // Tentar encontrar serviço baseado no título
            const nomeServico = googleEvent.summary?.split(' - ')[0] || 'Serviço não identificado'
            const { data: servico } = await supabase
              .from('servicos')
              .select('*')
              .ilike('nome', `%${nomeServico}%`)
              .limit(1)
              .single()

            const duracaoMinutos = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))

            await supabase
              .from('agendamentos')
              .insert({
                profissional_id: profissional.id,
                servico_id: servico?.id || null,
                data_agendamento: dataAgendamento,
                hora_inicio: horaInicio,
                nome_cliente: nomeCliente,
                valor: servico?.preco || 0,
                status: 'agendado',
                google_calendar_event_id: googleEvent.id,
                observacoes: `Importado do Google Calendar: ${googleEvent.description || ''}`
              })

            novosAgendamentos++
            console.log(`Novo agendamento criado: ${googleEvent.summary}`)
          }
        }

        syncResults.push({
          profissional: profissional.nome,
          eventosEncontrados: googleEvents.length,
          novosAgendamentos,
          agendamentosAtualizados
        })

      } catch (error) {
        console.error(`Erro ao sincronizar ${profissional.nome}:`, error)
        syncResults.push({
          profissional: profissional.nome,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    console.log('Sincronização concluída:', syncResults)

    return NextResponse.json({
      message: 'Sincronização concluída',
      resultados: syncResults
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json({
      error: 'Erro na sincronização',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Retornar status da última sincronização
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('google_calendar_event_id, data_criacao')
      .not('google_calendar_event_id', 'is', null)
      .order('data_criacao', { ascending: false })
      .limit(10)

    return NextResponse.json({
      message: 'API de sincronização ativa',
      ultimosAgendamentosSincronizados: agendamentos?.length || 0,
      ultimaAtualizacao: agendamentos?.[0]?.data_criacao || null
    })

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}