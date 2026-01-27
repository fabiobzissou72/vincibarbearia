import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { dispararWebhooks } from '@/lib/webhooks'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/barbeiros/cancelar-meu-agendamento
 *
 * 🔐 REQUER AUTENTICAÇÃO: Header Authorization: Bearer SEU_TOKEN
 *
 * Permite barbeiro cancelar um agendamento via WhatsApp
 *
 * FORMA 1 (RECOMENDADA):
 * Body: {
 *   agendamento_id: "uuid-do-agendamento"
 * }
 *
 * FORMA 2 (COMPATIBILIDADE):
 * Body: {
 *   barbeiro_nome: "Hiago" ou "uuid-do-barbeiro",
 *   cliente_nome: "Fabio",
 *   hora: "13:00",
 *   data: "11/12/2025" (opcional, padrão: hoje)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO OBRIGATÓRIA
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        message: erro || 'Token de autorização inválido'
      }, { status: 403 })
    }

    const body = await request.json()
    const { barbeiro_nome, cliente_nome, hora, data, agendamento_id } = body

    // FORMA 1: Cancelar pelo ID do agendamento (mais fácil e recomendado)
    if (agendamento_id) {
      // Buscar agendamento pelo ID
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .select('*, profissionais(nome)')
        .eq('id', agendamento_id)
        .in('status', ['agendado', 'confirmado'])
        .single()

      if (agendamentoError || !agendamento) {
        return NextResponse.json({
          success: false,
          message: `Agendamento "${agendamento_id}" não encontrado ou já cancelado`
        }, { status: 404 })
      }

      // Cancelar agendamento
      const { error: cancelError } = await supabase
        .from('agendamentos')
        .update({
          status: 'cancelado',
          observacoes: `${agendamento.observacoes ? agendamento.observacoes + '\n\n' : ''}CANCELADO: Cancelado via WhatsApp em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        })
        .eq('id', agendamento.id)

      if (cancelError) {
        console.error('Erro ao cancelar agendamento:', cancelError)
        return NextResponse.json({
          success: false,
          message: 'Erro ao cancelar agendamento'
        }, { status: 500 })
      }

      // Disparar webhooks (global + barbeiro) e AGUARDAR conclusão
      await dispararWebhooks(
        agendamento.profissional_id,
        {
          tipo: 'cancelamento',
          agendamento_id: agendamento.id,
          cliente: {
            nome: agendamento.nome_cliente,
            telefone: agendamento.telefone
          },
          agendamento: {
            data: agendamento.data_agendamento,
            hora: agendamento.hora_inicio,
            barbeiro: agendamento.profissionais?.nome || 'Barbeiro',
            valor_total: agendamento.valor
          },
          cancelamento: {
            cancelado_por: 'barbeiro',
            motivo: 'Cancelado via WhatsApp'
          }
        },
        'cancelamento'
      )

      // Mensagem de sucesso
      const mensagemWhatsApp = `✅ *Agendamento cancelado com sucesso!*\n\n` +
        `📅 *Data:* ${agendamento.data_agendamento}\n` +
        `🕐 *Hora:* ${agendamento.hora_inicio}\n` +
        `👤 *Cliente:* ${agendamento.nome_cliente}\n` +
        `📞 *Telefone:* ${agendamento.telefone}\n` +
        `💵 *Valor:* R$ ${agendamento.valor.toFixed(2)}\n\n` +
        `O cliente será notificado sobre o cancelamento.`

      return NextResponse.json({
        success: true,
        message: 'Agendamento cancelado com sucesso!',
        data: {
          agendamento_id: agendamento.id,
          cliente: agendamento.nome_cliente,
          data: agendamento.data_agendamento,
          hora: agendamento.hora_inicio,
          valor: agendamento.valor,
          mensagem_whatsapp: mensagemWhatsApp
        }
      })
    }

    // FORMA 2: Cancelar pelo nome do cliente e hora (método antigo)
    // Validações
    if (!barbeiro_nome) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro barbeiro_nome é obrigatório (pode ser nome ou UUID). Ou use agendamento_id para cancelar direto.'
      }, { status: 400 })
    }

    if (!cliente_nome) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro cliente_nome é obrigatório. Ou use agendamento_id para cancelar direto.'
      }, { status: 400 })
    }

    if (!hora) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro hora é obrigatório. Ou use agendamento_id para cancelar direto.'
      }, { status: 400 })
    }

    // Detectar se é UUID ou nome
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barbeiro_nome)

    // Buscar barbeiro pelo UUID ou nome
    let barbeiro
    let barbeiroError

    if (isUUID) {
      // Buscar por UUID
      const result = await supabase
        .from('profissionais')
        .select('*')
        .eq('id', barbeiro_nome)
        .eq('ativo', true)
        .single()
      barbeiro = result.data
      barbeiroError = result.error
    } else {
      // Buscar por nome
      const result = await supabase
        .from('profissionais')
        .select('*')
        .ilike('nome', barbeiro_nome)
        .eq('ativo', true)
        .single()
      barbeiro = result.data
      barbeiroError = result.error
    }

    if (barbeiroError || !barbeiro) {
      return NextResponse.json({
        success: false,
        message: `Barbeiro "${barbeiro_nome}" não encontrado`
      }, { status: 404 })
    }

    // Determinar data
    let dataBusca: string
    if (data) {
      dataBusca = data
    } else {
      // Usar data de hoje
      const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const [year, month, day] = hoje.toISOString().split('T')[0].split('-')
      dataBusca = `${day}/${month}/${year}`
    }

    console.log('🔍 Buscando agendamento:', {
      barbeiro: barbeiro.nome,
      cliente: cliente_nome,
      data: dataBusca,
      hora: hora
    })

    // Buscar agendamento
    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('profissional_id', barbeiro.id)
      .eq('data_agendamento', dataBusca)
      .eq('hora_inicio', hora)
      .ilike('nome_cliente', `%${cliente_nome}%`)
      .in('status', ['agendado', 'confirmado'])

    if (agendamentosError) {
      console.error('Erro ao buscar agendamento:', agendamentosError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar agendamento'
      }, { status: 500 })
    }

    if (!agendamentos || agendamentos.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Agendamento não encontrado.\n\nBusquei por:\n- Cliente: ${cliente_nome}\n- Data: ${dataBusca}\n- Hora: ${hora}\n- Barbeiro: ${barbeiro.nome}\n\nVerifique se o nome do cliente e horário estão corretos.`
      }, { status: 404 })
    }

    // Se encontrou múltiplos, pegar o primeiro
    const agendamento = agendamentos[0]

    // Cancelar agendamento
    const { error: cancelError } = await supabase
      .from('agendamentos')
      .update({
        status: 'cancelado',
        observacoes: `${agendamento.observacoes ? agendamento.observacoes + '\n\n' : ''}CANCELADO: Cancelado pelo barbeiro ${barbeiro.nome} via WhatsApp em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
      })
      .eq('id', agendamento.id)

    if (cancelError) {
      console.error('Erro ao cancelar agendamento:', cancelError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao cancelar agendamento'
      }, { status: 500 })
    }

    // Disparar webhooks (global + barbeiro) e AGUARDAR conclusão
    await dispararWebhooks(
      barbeiro.id,
      {
        tipo: 'cancelamento',
        agendamento_id: agendamento.id,
        cliente: {
          nome: agendamento.nome_cliente,
          telefone: agendamento.telefone
        },
        agendamento: {
          data: agendamento.data_agendamento,
          hora: agendamento.hora_inicio,
          barbeiro: barbeiro.nome,
          valor_total: agendamento.valor
        },
        cancelamento: {
          cancelado_por: `barbeiro (${barbeiro.nome})`,
          motivo: 'Cancelado pelo barbeiro via WhatsApp'
        }
      },
      'cancelamento'
    )

    // Mensagem de sucesso para WhatsApp
    const mensagemWhatsApp = `✅ *Agendamento cancelado com sucesso!*\n\n` +
      `📅 *Data:* ${agendamento.data_agendamento}\n` +
      `🕐 *Hora:* ${agendamento.hora_inicio}\n` +
      `👤 *Cliente:* ${agendamento.nome_cliente}\n` +
      `📞 *Telefone:* ${agendamento.telefone}\n` +
      `💵 *Valor:* R$ ${agendamento.valor.toFixed(2)}\n\n` +
      `O cliente será notificado sobre o cancelamento.`

    return NextResponse.json({
      success: true,
      message: 'Agendamento cancelado com sucesso!',
      data: {
        agendamento_id: agendamento.id,
        cliente: agendamento.nome_cliente,
        data: agendamento.data_agendamento,
        hora: agendamento.hora_inicio,
        valor: agendamento.valor,
        mensagem_whatsapp: mensagemWhatsApp
      }
    })

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
