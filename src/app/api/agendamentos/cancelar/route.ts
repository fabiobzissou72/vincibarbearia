import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'
import { salvarCancelamentoNoRedis } from '@/lib/redis-history'

export const dynamic = 'force-dynamic'

const BRASILIA_TZ = 'America/Sao_Paulo'

/**
 * DELETE /api/agendamentos/cancelar
 *
 * Cancela um agendamento com validação de prazo (2h antes por padrão)
 *
 * Body: {
 *   agendamento_id: string (UUID) (obrigatório)
 *   motivo: string (opcional)
 *   cancelado_por: string (opcional) - cliente, barbeiro, admin, sistema
 *   forcar: boolean (opcional) - Ignora validação de prazo (apenas admin)
 * }
 *
 * Regras:
 * - Cliente pode cancelar até 2h antes (configurável)
 * - Admin/Barbeiro podem cancelar a qualquer momento
 * - Sistema registra o cancelamento no histórico
 */
export async function DELETE(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO (permite requisições internas do dashboard sem token)
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      return NextResponse.json({
        success: false,
        message: 'Não autorizado',
        errors: [erro || 'Acesso negado']
      }, { status: 401 })
    }

    const body = await request.json()
    const { agendamento_id, motivo, cancelado_por = 'cliente', forcar = false } = body

    // Validações
    if (!agendamento_id) {
      return NextResponse.json({
        success: false,
        message: 'agendamento_id é obrigatório',
        errors: ['ID do agendamento não fornecido']
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

    // Verificar se já foi cancelado
    if (agendamento.status === 'cancelado') {
      return NextResponse.json({
        success: false,
        message: 'Agendamento já está cancelado',
        errors: ['Status atual: cancelado']
      }, { status: 400 })
    }

    // Verificar se já foi concluído
    if (agendamento.status === 'concluido') {
      return NextResponse.json({
        success: false,
        message: 'Não é possível cancelar um agendamento já concluído',
        errors: ['Status atual: concluído']
      }, { status: 400 })
    }

    // Buscar configurações (prazo de cancelamento)
    const { data: config } = await supabase
      .from('configuracoes')
      .select('prazo_cancelamento_horas')
      .single()

    const prazoCancelamento = config?.prazo_cancelamento_horas || 2 // Padrão: 2h

    // Calcular tempo até o agendamento (usando timezone de Brasília)
    // Converter data DD/MM/YYYY para formato ISO
    const [day, month, year] = agendamento.data_agendamento.split('/')

    // Criar data/hora no timezone de Brasília (UTC-3 ou UTC-2 dependendo do horário de verão)
    // Primeiro, criar string no formato que especifica o horário como de Brasília
    const brasiliaDateString = `${year}-${month}-${day}T${agendamento.hora_inicio}:00-03:00`
    const dataAgendamento = new Date(brasiliaDateString)

    // Obter timestamp atual
    const agora = new Date()

    // Calcular diferença em horas
    const horasAntecedencia = (dataAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60)

    // Validar prazo (apenas para clientes, se não forçado)
    let permitido = true
    if (cancelado_por === 'cliente' && !forcar) {
      if (horasAntecedencia < prazoCancelamento) {
        return NextResponse.json({
          success: false,
          message: `Cancelamento não permitido. É necessário cancelar com pelo menos ${prazoCancelamento}h de antecedência`,
          errors: [`Faltam apenas ${horasAntecedencia.toFixed(1)}h para o agendamento`],
          data: {
            prazo_minimo: prazoCancelamento,
            horas_restantes: horasAntecedencia,
            data_agendamento: agendamento.data_agendamento,
            hora_agendamento: agendamento.hora_inicio
          }
        }, { status: 400 })
      }
    }

    // Se for admin/barbeiro/sistema, permite sempre
    if (['admin', 'barbeiro', 'sistema'].includes(cancelado_por)) {
      permitido = true
    }

    // Registrar cancelamento no histórico
    const { error: cancelamentoError } = await supabase
      .from('agendamentos_cancelamentos')
      .insert({
        agendamento_id: agendamento_id,
        cancelado_por: cancelado_por,
        motivo: motivo || 'Sem motivo informado',
        horas_antecedencia: Math.max(0, horasAntecedencia),
        permitido: permitido,
        cliente_nome: agendamento.nome_cliente,
        cliente_telefone: agendamento.telefone,
        barbeiro_nome: agendamento.Barbeiro,
        data_agendamento: agendamento.data_agendamento,
        hora_inicio: agendamento.hora_inicio,
        valor: agendamento.valor
      })

    if (cancelamentoError) {
      console.error('Erro ao registrar cancelamento:', cancelamentoError)
    }

    // Atualizar status do agendamento
    const { data: agendamentoAtualizado, error: updateError } = await supabase
      .from('agendamentos')
      .update({
        status: 'cancelado',
        compareceu: false, // Cliente não compareceu pois foi cancelado
        observacoes: `CANCELADO: ${motivo || 'Sem motivo'} (${cancelado_por})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', agendamento_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao cancelar agendamento',
        errors: [updateError.message]
      }, { status: 500 })
    }

    // Disparar webhooks (sistema global + webhook personalizado do barbeiro)
    // IMPORTANTE: Executar de forma assíncrona mas sem bloquear a resposta
    const dispararWebhooks = async () => {
      try {
        const payload = {
          tipo: 'cancelamento',
          agendamento_id: agendamento_id,
          cliente: {
            nome: agendamento.nome_cliente,
            telefone: agendamento.telefone
          },
          agendamento: {
            data: agendamento.data_agendamento,
            hora: agendamento.hora_inicio,
            barbeiro: agendamento.Barbeiro,
            valor_total: agendamento.valor
          },
          cancelamento: {
            cancelado_por: cancelado_por,
            motivo: motivo,
            horas_antecedencia: horasAntecedencia.toFixed(1)
          }
        }

        console.log('🔔 Iniciando disparo de webhooks de cancelamento:', agendamento_id)

        // 1. Webhook global do sistema (se configurado)
        const { data: configNotif, error: configError } = await supabase
          .from('configuracoes')
          .select('webhook_url, notif_cancelamento')
          .single()

        console.log('📊 Config webhook cancelamento:', {
          existe: !!configNotif,
          url: configNotif?.webhook_url,
          ativo: configNotif?.notif_cancelamento,
          erro: configError?.message
        })

        if (configNotif?.webhook_url && configNotif?.notif_cancelamento) {
          try {
            console.log('🌐 Disparando webhook global de cancelamento para:', configNotif.webhook_url)
            const response = await fetch(configNotif.webhook_url, {
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

            console.log(`✅ Webhook global cancelamento ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: agendamento_id,
              tipo: 'cancelado',
              status: response.ok ? 'enviado' : 'falhou',
              payload: payload,
              resposta: responseData,
              erro: response.ok ? null : `HTTP ${response.status}`,
              webhook_url: configNotif.webhook_url
            })
          } catch (error) {
            console.error('❌ Erro ao disparar webhook global de cancelamento:', error)
            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: agendamento_id,
              tipo: 'cancelado',
              status: 'falhou',
              payload: payload,
              erro: error instanceof Error ? error.message : String(error),
              webhook_url: configNotif.webhook_url
            })
          }
        } else {
          console.log('⚠️ Webhook global de cancelamento não configurado ou inativo')
        }

        // 2. Webhook personalizado do barbeiro (se configurado)
        const { data: webhookBarbeiro, error: webhookError } = await supabase
          .from('webhooks_barbeiros')
          .select('*')
          .eq('profissional_id', agendamento.profissional_id)
          .eq('ativo', true)
          .single()

        console.log('👨‍💼 Webhook barbeiro cancelamento:', {
          existe: !!webhookBarbeiro,
          url: webhookBarbeiro?.webhook_url,
          eventos: webhookBarbeiro?.eventos,
          erro: webhookError?.message
        })

        if (webhookBarbeiro && webhookBarbeiro.eventos?.includes('cancelamento')) {
          try {
            console.log('🌐 Disparando webhook do barbeiro de cancelamento para:', webhookBarbeiro.webhook_url)
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

            console.log(`✅ Webhook barbeiro cancelamento ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: agendamento_id,
              tipo: 'cancelamento_barbeiro',
              status: response.ok ? 'enviado' : 'falhou',
              payload: payload,
              resposta: responseData,
              erro: response.ok ? null : `HTTP ${response.status}`,
              webhook_url: webhookBarbeiro.webhook_url
            })
          } catch (error) {
            console.error('❌ Erro ao disparar webhook do barbeiro de cancelamento:', error)
            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: agendamento_id,
              tipo: 'cancelamento_barbeiro',
              status: 'falhou',
              payload: payload,
              erro: error instanceof Error ? error.message : String(error),
              webhook_url: webhookBarbeiro.webhook_url
            })
          }
        } else {
          console.log('⚠️ Webhook do barbeiro de cancelamento não configurado ou inativo')
        }

        console.log('🏁 Webhooks de cancelamento processados:', agendamento_id)
      } catch (webhookError) {
        console.error('💥 Erro geral no processamento do webhook de cancelamento:', webhookError)
      }
    }

    // Disparar webhooks e AGUARDAR conclusão (crítico para garantir que webhooks sejam enviados)
    // IMPORTANTE: Sem await, o Vercel mata a função antes do webhook ser disparado
    await dispararWebhooks()

    // Salvar no Redis para histórico do cliente (WhatsApp)
    // Executa de forma assíncrona, não bloqueia a resposta
    salvarCancelamentoNoRedis({
      cliente_nome: agendamento.nome_cliente,
      telefone: agendamento.telefone,
      data: agendamento.data_agendamento,
      hora: agendamento.hora_inicio,
      barbeiro: agendamento.Barbeiro,
      motivo: motivo || 'Sem motivo informado',
      cancelado_por: cancelado_por,
      horas_antecedencia: Math.max(0, horasAntecedencia)
    }, 'dashboard').catch(error => {
      console.error('⚠️ Erro ao salvar cancelamento no Redis (não crítico):', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Agendamento cancelado com sucesso!',
      data: {
        agendamento_id: agendamento_id,
        status: 'cancelado',
        cancelado_por: cancelado_por,
        motivo: motivo,
        horas_antecedencia: horasAntecedencia.toFixed(1),
        cliente: agendamento.nome_cliente,
        barbeiro: agendamento.Barbeiro,
        data: agendamento.data_agendamento,
        hora: agendamento.hora_inicio,
        valor_liberado: agendamento.valor
      }
    })

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }, { status: 500 })
  }
}
