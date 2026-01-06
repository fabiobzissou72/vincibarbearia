/**
 * Sistema centralizado de disparo de webhooks
 * Garante que webhooks sejam disparados de forma consistente em todas as APIs
 */

import { supabase } from '@/lib/supabase'

interface WebhookPayload {
  tipo: 'novo_agendamento' | 'cancelamento' | 'reagendamento' | 'confirmacao'
  agendamento_id: string
  cliente: {
    nome: string
    telefone: string
  }
  agendamento: {
    data: string
    hora: string
    barbeiro: string
    servicos?: string[]
    valor_total?: number
    duracao_total?: number
  }
  cancelamento?: {
    cancelado_por?: string
    motivo?: string
    horas_antecedencia?: string
  }
  reagendamento?: {
    data_anterior: string
    hora_anterior: string
  }
}

/**
 * Dispara webhooks global e do barbeiro para um agendamento
 * @param profissionalId - ID do profissional (barbeiro)
 * @param payload - Dados do evento
 * @param tipoEvento - Tipo de evento (usado para filtrar webhooks do barbeiro)
 */
export async function dispararWebhooks(
  profissionalId: string,
  payload: WebhookPayload,
  tipoEvento: 'novo_agendamento' | 'cancelamento' | 'reagendamento' | 'confirmacao'
): Promise<void> {
  try {
    console.log('🔔 Iniciando disparo de webhooks:', payload.tipo, 'Agendamento:', payload.agendamento_id)

    // 1. Webhook GLOBAL do sistema (se configurado)
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('webhook_url, notif_confirmacao, notif_cancelamento')
      .single()

    console.log('📊 Config webhook global:', {
      existe: !!config,
      url: config?.webhook_url,
      notif_confirmacao: config?.notif_confirmacao,
      notif_cancelamento: config?.notif_cancelamento,
      erro: configError?.message
    })

    // Determinar se webhook global está ativo baseado no tipo
    const webhookGlobalAtivo =
      (tipoEvento === 'novo_agendamento' && config?.notif_confirmacao) ||
      (tipoEvento === 'cancelamento' && config?.notif_cancelamento) ||
      (tipoEvento === 'reagendamento' && config?.notif_confirmacao) ||
      (tipoEvento === 'confirmacao' && config?.notif_confirmacao)

    if (config?.webhook_url && webhookGlobalAtivo) {
      try {
        console.log('🌐 Disparando webhook global para:', config.webhook_url)
        const response = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000) // 10s timeout
        })

        const responseText = await response.text()
        let responseData = null
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        console.log(`✅ Webhook global ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

        // Salvar log
        await supabase.from('notificacoes_enviadas').insert({
          agendamento_id: payload.agendamento_id,
          tipo: tipoEvento === 'cancelamento' ? 'cancelado' : tipoEvento,
          status: response.ok ? 'enviado' : 'falhou',
          payload: payload,
          resposta: responseData,
          erro: response.ok ? null : `HTTP ${response.status}`,
          webhook_url: config.webhook_url
        })
      } catch (error) {
        console.error('❌ Erro ao disparar webhook global:', error)
        await supabase.from('notificacoes_enviadas').insert({
          agendamento_id: payload.agendamento_id,
          tipo: tipoEvento === 'cancelamento' ? 'cancelado' : tipoEvento,
          status: 'falhou',
          payload: payload,
          erro: error instanceof Error ? error.message : String(error),
          webhook_url: config.webhook_url
        })
      }
    } else {
      console.log('⚠️ Webhook global não configurado ou inativo para tipo:', tipoEvento)
    }

    // 2. Webhook PERSONALIZADO do barbeiro (se configurado)
    const { data: webhookBarbeiro, error: webhookError } = await supabase
      .from('webhooks_barbeiros')
      .select('*')
      .eq('profissional_id', profissionalId)
      .eq('ativo', true)
      .single()

    console.log('👨‍💼 Webhook barbeiro:', {
      existe: !!webhookBarbeiro,
      url: webhookBarbeiro?.webhook_url,
      eventos: webhookBarbeiro?.eventos,
      erro: webhookError?.message
    })

    if (webhookBarbeiro && webhookBarbeiro.eventos?.includes(tipoEvento)) {
      try {
        console.log('🌐 Disparando webhook do barbeiro para:', webhookBarbeiro.webhook_url)
        const response = await fetch(webhookBarbeiro.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000) // 10s timeout
        })

        const responseText = await response.text()
        let responseData = null
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        console.log(`✅ Webhook barbeiro ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

        // Salvar log
        await supabase.from('notificacoes_enviadas').insert({
          agendamento_id: payload.agendamento_id,
          tipo: `${tipoEvento}_barbeiro`,
          status: response.ok ? 'enviado' : 'falhou',
          payload: payload,
          resposta: responseData,
          erro: response.ok ? null : `HTTP ${response.status}`,
          webhook_url: webhookBarbeiro.webhook_url
        })
      } catch (error) {
        console.error('❌ Erro ao disparar webhook do barbeiro:', error)
        await supabase.from('notificacoes_enviadas').insert({
          agendamento_id: payload.agendamento_id,
          tipo: `${tipoEvento}_barbeiro`,
          status: 'falhou',
          payload: payload,
          erro: error instanceof Error ? error.message : String(error),
          webhook_url: webhookBarbeiro.webhook_url
        })
      }
    } else {
      console.log('⚠️ Webhook do barbeiro não configurado ou inativo para evento:', tipoEvento)
    }

    console.log('🏁 Webhooks processados para agendamento:', payload.agendamento_id)
  } catch (webhookError) {
    console.error('💥 Erro geral no processamento de webhooks:', webhookError)
  }
}
