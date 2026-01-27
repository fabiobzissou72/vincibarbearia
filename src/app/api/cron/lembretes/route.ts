import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/lembretes
 *
 * Vercel Cron Job - Executa de hora em hora (8h-20h)
 *
 * Responsabilidades:
 * 1. Verificar agendamentos que precisam de lembrete 24h antes
 * 2. Verificar agendamentos que precisam de lembrete 2h antes
 * 3. Verificar agendamentos para follow-up 3 dias após
 * 4. Verificar agendamentos para follow-up 21 dias após (reagendar)
 * 5. Disparar webhooks N8N para cada notificação
 *
 * Segurança: Apenas Vercel Cron pode chamar (verificar headers)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se é chamada do Vercel Cron (OPCIONAL - apenas se CRON_SECRET estiver configurado)
    const authHeader = request.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    // Se CRON_SECRET estiver configurado, validar o token
    if (CRON_SECRET && process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({
        success: false,
        message: 'Não autorizado'
      }, { status: 401 })
    }

    console.log('[CRON] Iniciando verificação de lembretes...')

    // Buscar configurações
    const { data: config } = await supabase
      .from('configuracoes')
      .select('*')
      .single()

    if (!config?.webhook_url) {
      console.log('[CRON] Webhook URL não configurado')
      return NextResponse.json({
        success: false,
        message: 'Webhook URL não configurado'
      })
    }

    // FUSO HORÁRIO DO BRASIL (UTC-3) - forma DEFINITIVA e CORRETA
    const agoraUTC = new Date()
    const offsetBrasil = 3 * 60 * 60 * 1000 // 3 horas em milissegundos
    const agoraBR = new Date(agoraUTC.getTime() - offsetBrasil)

    console.log('[CRON] Horário UTC:', agoraUTC.toISOString())
    console.log('[CRON] Horário Brasil:', agoraBR.toISOString())
    const resultados = {
      lembrete_24h: 0,
      lembrete_2h: 0,
      followup_3d: 0,
      followup_21d: 0,
      detalhes: {
        lembretes_24h: [] as any[],
        lembretes_2h: [] as any[],
        followups_3d: [] as any[],
        followups_21d: [] as any[]
      },
      erros: [] as string[]
    }

    // ==========================================
    // 1. LEMBRETE 24H ANTES
    // ==========================================
    if (config.notif_lembrete_24h) {
      const amanha = new Date(agoraBR)
      amanha.setDate(amanha.getDate() + 1)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia = String(amanha.getDate()).padStart(2, '0')
      const mes = String(amanha.getMonth() + 1).padStart(2, '0')
      const ano = amanha.getFullYear()
      const dataAmanhaBR = `${dia}/${mes}/${ano}`

      console.log('[DEBUG 24h] Buscando agendamentos para:', dataAmanhaBR)
      console.log('[DEBUG 24h] notif_lembrete_24h:', config.notif_lembrete_24h)
      console.log('[DEBUG 24h] Horário atual BR:', agoraBR.toLocaleString('pt-BR'))

      // Buscar agendamentos de amanhã que ainda não receberam lembrete 24h
      const { data: agendamentos24h } = await supabase
        .from('agendamentos')
        .select(`
          id,
          nome_cliente,
          telefone,
          data_agendamento,
          hora_inicio,
          valor,
          Barbeiro,
          profissionais (nome),
          agendamento_servicos (servicos (nome, duracao_minutos))
        `)
        .eq('data_agendamento', dataAmanhaBR)
        .in('status', ['agendado', 'confirmado'])

      console.log('[DEBUG 24h] Agendamentos encontrados:', agendamentos24h?.length || 0)
      if (agendamentos24h && agendamentos24h.length > 0) {
        console.log('[DEBUG 24h] Primeiro agendamento:', JSON.stringify(agendamentos24h[0], null, 2))
      }

      if (agendamentos24h && agendamentos24h.length > 0) {
        for (const agendamento of agendamentos24h) {
          // Verificar se já enviou lembrete 24h
          const { data: jaEnviou } = await supabase
            .from('notificacoes_enviadas')
            .select('id')
            .eq('agendamento_id', agendamento.id)
            .eq('tipo', 'lembrete_24h')
            .eq('status', 'enviado')
            .single()

          if (jaEnviou) continue // Já enviou

          // Preparar payload
          const payload = {
            tipo: 'lembrete_24h',
            agendamento_id: agendamento.id,
            cliente: {
              nome: agendamento.nome_cliente,
              telefone: agendamento.telefone
            },
            agendamento: {
              data: agendamento.data_agendamento,
              hora: agendamento.hora_inicio,
              barbeiro: agendamento.Barbeiro || agendamento.profissionais?.nome,
              servicos: agendamento.agendamento_servicos?.map((as: any) => as.servicos?.nome) || [],
              valor_total: agendamento.valor,
              duracao_total: agendamento.agendamento_servicos?.reduce((sum: number, as: any) =>
                sum + (as.servicos?.duracao_minutos || 30), 0) || 30
            }
          }

          // Disparar webhook
          try {
            const response = await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })

            // Registrar notificação
            await supabase
              .from('notificacoes_enviadas')
              .insert({
                agendamento_id: agendamento.id,
                tipo: 'lembrete_24h',
                status: response.ok ? 'enviado' : 'falhou',
                payload: payload,
                resposta: response.ok ? await response.json().catch(() => null) : null,
                erro: response.ok ? null : `HTTP ${response.status}`,
                webhook_url: config.webhook_url
              })

            if (response.ok) {
              resultados.lembrete_24h++
            } else {
              resultados.erros.push(`Lembrete 24h falhou para ${agendamento.nome_cliente}`)
            }
          } catch (error) {
            console.error('[CRON] Erro ao enviar lembrete 24h:', error)
            resultados.erros.push(`Erro 24h: ${agendamento.nome_cliente}`)

            await supabase
              .from('notificacoes_enviadas')
              .insert({
                agendamento_id: agendamento.id,
                tipo: 'lembrete_24h',
                status: 'falhou',
                payload: payload,
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                webhook_url: config.webhook_url
              })
          }
        }
      }
    }

    // ==========================================
    // 2. LEMBRETE 2H ANTES
    // ==========================================
    if (config.notif_lembrete_2h) {
      // Converter hoje para formato brasileiro DD/MM/YYYY
      const diaHoje = String(agoraBR.getDate()).padStart(2, '0')
      const mesHoje = String(agoraBR.getMonth() + 1).padStart(2, '0')
      const anoHoje = agoraBR.getFullYear()
      const hojeBR = `${diaHoje}/${mesHoje}/${anoHoje}`

      const horaAtual = agoraBR.getHours()
      const minutoAtual = agoraBR.getMinutes()

      console.log('[DEBUG 2h] Buscando agendamentos para:', hojeBR)
      console.log('[DEBUG 2h] Horário atual BR:', `${horaAtual}:${minutoAtual}`)
      console.log('[DEBUG 2h] notif_lembrete_2h:', config.notif_lembrete_2h)
      console.log('[DEBUG 2h] Data/hora completa BR:', agoraBR.toLocaleString('pt-BR'))

      // Buscar agendamentos de hoje
      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select(`
          id,
          nome_cliente,
          telefone,
          data_agendamento,
          hora_inicio,
          valor,
          Barbeiro,
          profissionais (nome),
          agendamento_servicos (servicos (nome, duracao_minutos))
        `)
        .eq('data_agendamento', hojeBR)
        .in('status', ['agendado', 'confirmado'])

      console.log('[DEBUG 2h] Agendamentos encontrados:', agendamentosHoje?.length || 0)

      if (agendamentosHoje && agendamentosHoje.length > 0) {
        for (const agendamento of agendamentosHoje) {
          const [horaAg, minAg] = agendamento.hora_inicio.split(':').map(Number)
          const minutosAteAgendamento = (horaAg * 60 + minAg) - (horaAtual * 60 + minutoAtual)

          console.log('[DEBUG 2h] Agendamento:', agendamento.nome_cliente, '| Hora:', agendamento.hora_inicio, '| Minutos até:', minutosAteAgendamento)

          // Se faltam entre 120 e 130 minutos (janela de 10min)
          if (minutosAteAgendamento >= 120 && minutosAteAgendamento <= 130) {
            console.log('[DEBUG 2h] ✅ DENTRO DA JANELA! Enviando lembrete para:', agendamento.nome_cliente)
            // Verificar se já enviou
            const { data: jaEnviou } = await supabase
              .from('notificacoes_enviadas')
              .select('id')
              .eq('agendamento_id', agendamento.id)
              .eq('tipo', 'lembrete_2h')
              .eq('status', 'enviado')
              .single()

            if (jaEnviou) continue

            const payload = {
              tipo: 'lembrete_2h',
              agendamento_id: agendamento.id,
              cliente: {
                nome: agendamento.nome_cliente,
                telefone: agendamento.telefone
              },
              agendamento: {
                data: agendamento.data_agendamento,
                hora: agendamento.hora_inicio,
                barbeiro: agendamento.Barbeiro || agendamento.profissionais?.nome,
                servicos: agendamento.agendamento_servicos?.map((as: any) => as.servicos?.nome) || [],
                valor_total: agendamento.valor
              }
            }

            try {
              const response = await fetch(config.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })

              await supabase
                .from('notificacoes_enviadas')
                .insert({
                  agendamento_id: agendamento.id,
                  tipo: 'lembrete_2h',
                  status: response.ok ? 'enviado' : 'falhou',
                  payload: payload,
                  webhook_url: config.webhook_url
                })

              if (response.ok) resultados.lembrete_2h++
            } catch (error) {
              console.error('[CRON] Erro ao enviar lembrete 2h:', error)
              resultados.erros.push(`Erro 2h: ${agendamento.nome_cliente}`)
            }
          }
        }
      }
    }

    // ==========================================
    // 3. FOLLOW-UP 3 DIAS APÓS
    // ==========================================
    if (config.notif_followup_3d) {
      const tresDiasAtras = new Date(agoraBR)
      tresDiasAtras.setDate(tresDiasAtras.getDate() - 3)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia3d = String(tresDiasAtras.getDate()).padStart(2, '0')
      const mes3d = String(tresDiasAtras.getMonth() + 1).padStart(2, '0')
      const ano3d = tresDiasAtras.getFullYear()
      const dataTresDiasBR = `${dia3d}/${mes3d}/${ano3d}`

      // Data atual para mostrar no follow-up
      const diaHoje3d = String(agoraBR.getDate()).padStart(2, '0')
      const mesHoje3d = String(agoraBR.getMonth() + 1).padStart(2, '0')
      const anoHoje3d = agoraBR.getFullYear()
      const dataHojeBR3d = `${diaHoje3d}/${mesHoje3d}/${anoHoje3d}`

      console.log('[DEBUG Follow-up 3d] Buscando agendamentos de:', dataTresDiasBR)
      console.log('[DEBUG Follow-up 3d] Data atual (3 dias após):', dataHojeBR3d)

      const { data: agendamentos3d } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_agendamento', dataTresDiasBR)
        .eq('status', 'concluido')
        .eq('compareceu', true)

      console.log('[DEBUG Follow-up 3d] Agendamentos encontrados:', agendamentos3d?.length || 0)

      if (agendamentos3d && agendamentos3d.length > 0) {
        for (const agendamento of agendamentos3d) {
          const { data: jaEnviou } = await supabase
            .from('notificacoes_enviadas')
            .select('id')
            .eq('agendamento_id', agendamento.id)
            .eq('tipo', 'followup_3d')
            .single()

          if (jaEnviou) continue

          const payload = {
            tipo: 'followup_3d',
            agendamento_id: agendamento.id,
            cliente: {
              nome: agendamento.nome_cliente,
              telefone: agendamento.telefone
            },
            atendimento: {
              data: agendamento.data_agendamento,
              hora: agendamento.hora_inicio,
              barbeiro: agendamento.Barbeiro
            },
            follow_up: {
              enviado_em: dataHojeBR3d,
              dias_apos_atendimento: 3
            },
            mensagem: 'Pedido de feedback sobre o atendimento'
          }

          console.log('[DEBUG Follow-up 3d] ✅ Enviando para:', agendamento.nome_cliente, '| Atendimento:', agendamento.data_agendamento, '| Follow-up em:', dataHojeBR3d)

          try {
            await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            resultados.followup_3d++
            resultados.detalhes.followups_3d.push({
              cliente: agendamento.nome_cliente,
              telefone: agendamento.telefone,
              atendimento_data: agendamento.data_agendamento,
              atendimento_hora: agendamento.hora_inicio,
              barbeiro: agendamento.Barbeiro,
              follow_up_em: dataHojeBR3d,
              dias_apos: 3
            })
          } catch (error) {
            console.error('[CRON] Erro follow-up 3d:', error)
          }
        }
      }
    }

    // ==========================================
    // 4. FOLLOW-UP 21 DIAS (REAGENDAR)
    // ==========================================
    if (config.notif_followup_21d) {
      const vinteUmDiasAtras = new Date(agoraBR)
      vinteUmDiasAtras.setDate(vinteUmDiasAtras.getDate() - 21)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia21d = String(vinteUmDiasAtras.getDate()).padStart(2, '0')
      const mes21d = String(vinteUmDiasAtras.getMonth() + 1).padStart(2, '0')
      const ano21d = vinteUmDiasAtras.getFullYear()
      const data21dBR = `${dia21d}/${mes21d}/${ano21d}`

      // Data atual para mostrar no follow-up
      const diaHoje21d = String(agoraBR.getDate()).padStart(2, '0')
      const mesHoje21d = String(agoraBR.getMonth() + 1).padStart(2, '0')
      const anoHoje21d = agoraBR.getFullYear()
      const dataHojeBR21d = `${diaHoje21d}/${mesHoje21d}/${anoHoje21d}`

      console.log('[DEBUG Follow-up 21d] Buscando agendamentos de:', data21dBR)
      console.log('[DEBUG Follow-up 21d] Data atual (21 dias após):', dataHojeBR21d)

      const { data: agendamentos21d } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_agendamento', data21dBR)
        .eq('status', 'concluido')
        .eq('compareceu', true)

      console.log('[DEBUG Follow-up 21d] Agendamentos encontrados:', agendamentos21d?.length || 0)

      if (agendamentos21d && agendamentos21d.length > 0) {
        for (const agendamento of agendamentos21d) {
          const { data: jaEnviou } = await supabase
            .from('notificacoes_enviadas')
            .select('id')
            .eq('agendamento_id', agendamento.id)
            .eq('tipo', 'followup_21d')
            .single()

          if (jaEnviou) continue

          const payload = {
            tipo: 'followup_21d',
            agendamento_id: agendamento.id,
            cliente: {
              nome: agendamento.nome_cliente,
              telefone: agendamento.telefone
            },
            atendimento: {
              data: agendamento.data_agendamento,
              hora: agendamento.hora_inicio,
              barbeiro: agendamento.Barbeiro
            },
            follow_up: {
              enviado_em: dataHojeBR21d,
              dias_apos_atendimento: 21
            },
            mensagem: 'Lembrete para reagendar - já faz 21 dias!'
          }

          console.log('[DEBUG Follow-up 21d] ✅ Enviando para:', agendamento.nome_cliente, '| Atendimento:', agendamento.data_agendamento, '| Follow-up em:', dataHojeBR21d)

          try {
            await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            resultados.followup_21d++
            resultados.detalhes.followups_21d.push({
              cliente: agendamento.nome_cliente,
              telefone: agendamento.telefone,
              atendimento_data: agendamento.data_agendamento,
              atendimento_hora: agendamento.hora_inicio,
              barbeiro: agendamento.Barbeiro,
              follow_up_em: dataHojeBR21d,
              dias_apos: 21
            })
          } catch (error) {
            console.error('[CRON] Erro follow-up 21d:', error)
          }
        }
      }
    }

    console.log('[CRON] Finalizado:', resultados)

    return NextResponse.json({
      success: true,
      message: 'Cron executado com sucesso',
      data: resultados,
      timestamp: agoraBR.toISOString(),
      horario_utc: agoraUTC.toISOString(),
      horario_brasil: agoraBR.toISOString()
    })

  } catch (error) {
    console.error('[CRON] Erro geral:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar cron',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
