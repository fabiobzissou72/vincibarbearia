import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    // Calcular tempo até o agendamento
    // Converter data DD/MM/YYYY para formato ISO
    const [day, month, year] = agendamento.data_agendamento.split('/')
    const dataISO = `${year}-${month}-${day}`
    const dataAgendamento = new Date(`${dataISO}T${agendamento.hora_inicio}`)
    const agora = new Date()
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

    // Disparar webhook de cancelamento (se configurado)
    try {
      const { data: configNotif } = await supabase
        .from('configuracoes')
        .select('webhook_url, notif_cancelamento')
        .single()

      if (configNotif?.webhook_url && configNotif?.notif_cancelamento) {
        const payload = {
          tipo: 'cancelado',
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

        // Disparar webhook (não bloqueia)
        fetch(configNotif.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(async (response) => {
          await supabase
            .from('notificacoes_enviadas')
            .insert({
              agendamento_id: agendamento_id,
              tipo: 'cancelado',
              status: response.ok ? 'enviado' : 'falhou',
              payload: payload,
              resposta: response.ok ? await response.json().catch(() => null) : null,
              erro: response.ok ? null : `HTTP ${response.status}`,
              webhook_url: configNotif.webhook_url
            })
        }).catch((error) => {
          console.error('Erro ao disparar webhook de cancelamento:', error)
        })
      }
    } catch (webhookError) {
      console.error('Erro no processamento do webhook:', webhookError)
    }

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
