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
    // Verificar se é chamada do Vercel Cron
    const authHeader = request.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET || 'development'

    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${CRON_SECRET}`) {
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

    const agora = new Date()
    const resultados = {
      lembrete_24h: 0,
      lembrete_2h: 0,
      followup_3d: 0,
      followup_21d: 0,
      erros: [] as string[]
    }

    // ==========================================
    // 1. LEMBRETE 24H ANTES
    // ==========================================
    if (config.notif_lembrete_24h) {
      const amanha = new Date(agora)
      amanha.setDate(amanha.getDate() + 1)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia = String(amanha.getDate()).padStart(2, '0')
      const mes = String(amanha.getMonth() + 1).padStart(2, '0')
      const ano = amanha.getFullYear()
      const dataAmanhaBR = `${dia}/${mes}/${ano}`

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
      const diaHoje = String(agora.getDate()).padStart(2, '0')
      const mesHoje = String(agora.getMonth() + 1).padStart(2, '0')
      const anoHoje = agora.getFullYear()
      const hojeBR = `${diaHoje}/${mesHoje}/${anoHoje}`

      const horaAtual = agora.getHours()
      const minutoAtual = agora.getMinutes()

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

      if (agendamentosHoje && agendamentosHoje.length > 0) {
        for (const agendamento of agendamentosHoje) {
          const [horaAg, minAg] = agendamento.hora_inicio.split(':').map(Number)
          const minutosAteAgendamento = (horaAg * 60 + minAg) - (horaAtual * 60 + minutoAtual)

          // Se faltam entre 120 e 130 minutos (janela de 10min)
          if (minutosAteAgendamento >= 120 && minutosAteAgendamento <= 130) {
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
      const tresDiasAtras = new Date(agora)
      tresDiasAtras.setDate(tresDiasAtras.getDate() - 3)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia3d = String(tresDiasAtras.getDate()).padStart(2, '0')
      const mes3d = String(tresDiasAtras.getMonth() + 1).padStart(2, '0')
      const ano3d = tresDiasAtras.getFullYear()
      const dataTresDiasBR = `${dia3d}/${mes3d}/${ano3d}`

      const { data: agendamentos3d } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_agendamento', dataTresDiasBR)
        .eq('status', 'concluido')
        .eq('compareceu', true)

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
            mensagem: 'Pedido de feedback sobre o atendimento'
          }

          try {
            await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            resultados.followup_3d++
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
      const vinteUmDiasAtras = new Date(agora)
      vinteUmDiasAtras.setDate(vinteUmDiasAtras.getDate() - 21)

      // Converter para formato brasileiro DD/MM/YYYY
      const dia21d = String(vinteUmDiasAtras.getDate()).padStart(2, '0')
      const mes21d = String(vinteUmDiasAtras.getMonth() + 1).padStart(2, '0')
      const ano21d = vinteUmDiasAtras.getFullYear()
      const data21dBR = `${dia21d}/${mes21d}/${ano21d}`

      const { data: agendamentos21d } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_agendamento', data21dBR)
        .eq('status', 'concluido')
        .eq('compareceu', true)

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
            barbeiro: agendamento.Barbeiro,
            mensagem: 'Lembrete para reagendar'
          }

          try {
            await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            resultados.followup_21d++
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
      timestamp: new Date().toISOString()
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
