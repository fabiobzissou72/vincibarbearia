import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/barbeiros/configurar-webhook
 *
 * Configura webhook personalizado para um barbeiro específico
 * O barbeiro receberá notificações sobre seus próprios agendamentos
 *
 * Body: {
 *   barbeiro_id: string (UUID) (obrigatório)
 *   webhook_url: string (URL) (obrigatório)
 *   eventos: string[] (opcional) - Array com: 'novo_agendamento', 'cancelamento', 'confirmacao'
 *   ativo: boolean (opcional, padrão: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        error: erro
      }, { status: 403 })
    }

    const body = await request.json()
    const { barbeiro_id, webhook_url, eventos, ativo } = body

    // Validações
    if (!barbeiro_id || !webhook_url) {
      return NextResponse.json({
        success: false,
        error: 'barbeiro_id e webhook_url são obrigatórios'
      }, { status: 400 })
    }

    // Validar URL
    try {
      new URL(webhook_url)
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'webhook_url deve ser uma URL válida'
      }, { status: 400 })
    }

    // Verificar se barbeiro existe
    const { data: barbeiro, error: erroBarbeiro } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('id', barbeiro_id)
      .eq('ativo', true)
      .single()

    if (erroBarbeiro || !barbeiro) {
      return NextResponse.json({
        success: false,
        error: 'Barbeiro não encontrado ou inativo'
      }, { status: 404 })
    }

    // Validar eventos
    const eventosValidos = ['novo_agendamento', 'cancelamento', 'confirmacao']
    const eventosConfiguracao = eventos && eventos.length > 0
      ? eventos.filter((e: string) => eventosValidos.includes(e))
      : eventosValidos

    // Verificar se já existe webhook para este barbeiro
    const { data: webhookExistente } = await supabase
      .from('webhooks_barbeiros')
      .select('id')
      .eq('profissional_id', barbeiro_id)
      .single()

    let resultado

    if (webhookExistente) {
      // Atualizar webhook existente
      resultado = await supabase
        .from('webhooks_barbeiros')
        .update({
          webhook_url,
          eventos: eventosConfiguracao,
          ativo: ativo !== undefined ? ativo : true
        })
        .eq('id', webhookExistente.id)
        .select()
        .single()
    } else {
      // Criar novo webhook
      resultado = await supabase
        .from('webhooks_barbeiros')
        .insert([{
          profissional_id: barbeiro_id,
          webhook_url,
          eventos: eventosConfiguracao,
          ativo: ativo !== undefined ? ativo : true
        }])
        .select()
        .single()
    }

    if (resultado.error) {
      console.error('Erro ao configurar webhook:', resultado.error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao configurar webhook'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: webhookExistente ? 'Webhook atualizado com sucesso!' : 'Webhook configurado com sucesso!',
      webhook: {
        id: resultado.data.id,
        barbeiro: barbeiro.nome,
        webhook_url: resultado.data.webhook_url,
        eventos: resultado.data.eventos,
        ativo: resultado.data.ativo
      }
    }, { status: webhookExistente ? 200 : 201 })

  } catch (error) {
    console.error('Erro ao configurar webhook:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
