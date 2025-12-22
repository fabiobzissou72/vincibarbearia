import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/clientes/enviar-senha-temporaria
 *
 * Gera senha temporária e envia via WhatsApp
 * Webhook separado para não interferir nas automações do sistema
 *
 * Body: {
 *   telefone: string (obrigatório)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [SENHA TEMPORÁRIA] Iniciando...')

    // Autenticação (permite app cliente)
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      console.error('❌ [SENHA TEMPORÁRIA] Autenticação falhou:', erro)
      return NextResponse.json({
        success: false,
        error: 'Não autorizado'
      }, { status: 401 })
    }

    const body = await request.json()
    const { telefone } = body

    if (!telefone) {
      return NextResponse.json({
        success: false,
        error: 'Telefone é obrigatório'
      }, { status: 400 })
    }

    const telefoneLimpo = telefone.replace(/\D/g, '')
    console.log('📞 [SENHA TEMPORÁRIA] Telefone:', telefoneLimpo)

    // Busca cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefoneLimpo)
      .single()

    if (clienteError || !cliente) {
      console.error('❌ [SENHA TEMPORÁRIA] Cliente não encontrado')
      return NextResponse.json({
        success: false,
        error: 'Cliente não encontrado'
      }, { status: 404 })
    }

    console.log('✅ [SENHA TEMPORÁRIA] Cliente encontrado:', cliente.nome_completo)

    // Gera senha temporária de 6 dígitos numéricos
    const senhaTemporaria = Math.floor(100000 + Math.random() * 900000).toString()
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10)

    console.log('🔢 [SENHA TEMPORÁRIA] Senha gerada:', senhaTemporaria)

    // Salva senha no banco
    const { error: erroUpdate } = await supabase
      .from('clientes')
      .update({ senha: senhaHash })
      .eq('id', cliente.id)

    if (erroUpdate) {
      console.error('❌ [SENHA TEMPORÁRIA] Erro ao salvar senha:', erroUpdate)
      return NextResponse.json({
        success: false,
        error: 'Erro ao gerar senha temporária'
      }, { status: 500 })
    }

    console.log('💾 [SENHA TEMPORÁRIA] Senha salva no banco')

    // Busca configuração de webhook (específico para senha)
    const { data: config } = await supabase
      .from('configuracoes')
      .select('webhook_senha_url, webhook_url')
      .single()

    // Usa webhook específico de senha, ou fallback para webhook geral
    const webhookUrl = config?.webhook_senha_url || config?.webhook_url

    // Prepara mensagem
    const mensagem = `🔐 *Vince Barbearia*\n\nOlá *${cliente.nome_completo}*!\n\nSua senha de acesso foi gerada:\n\n*${senhaTemporaria}*\n\nUse essa senha para fazer login no aplicativo.`

    const payload = {
      tipo: 'senha_temporaria',
      telefone: telefoneLimpo,
      mensagem: mensagem,
      cliente: {
        nome: cliente.nome_completo,
        telefone: telefoneLimpo
      },
      senha: senhaTemporaria
    }

    let webhookEnviado = false

    // Envia via WhatsApp (webhook)
    if (webhookUrl) {
      try {
        console.log('🌐 [SENHA TEMPORÁRIA] Disparando webhook:', webhookUrl)
        console.log('📋 [SENHA TEMPORÁRIA] Usando webhook:', config?.webhook_senha_url ? 'específico' : 'geral')

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000)
        })

        const responseText = await response.text()
        console.log('📨 [SENHA TEMPORÁRIA] Resposta webhook:', response.status, responseText)

        if (response.ok) {
          webhookEnviado = true
          console.log('✅ [SENHA TEMPORÁRIA] WhatsApp enviado com sucesso')

          // Registra notificação enviada
          await supabase.from('notificacoes_enviadas').insert({
            agendamento_id: null,
            tipo: 'senha_temporaria',
            status: 'enviado',
            payload: payload,
            webhook_url: webhookUrl
          })
        } else {
          console.error('❌ [SENHA TEMPORÁRIA] Webhook retornou erro:', response.status)

          await supabase.from('notificacoes_enviadas').insert({
            agendamento_id: null,
            tipo: 'senha_temporaria',
            status: 'falhou',
            payload: payload,
            erro: `HTTP ${response.status}: ${responseText}`,
            webhook_url: webhookUrl
          })
        }
      } catch (webhookError) {
        console.error('❌ [SENHA TEMPORÁRIA] Erro ao disparar webhook:', webhookError)

        await supabase.from('notificacoes_enviadas').insert({
          agendamento_id: null,
          tipo: 'senha_temporaria',
          status: 'falhou',
          payload: payload,
          erro: webhookError instanceof Error ? webhookError.message : String(webhookError),
          webhook_url: webhookUrl
        })
      }
    } else {
      console.log('⚠️ [SENHA TEMPORÁRIA] Nenhum webhook configurado (senha nem geral)')
    }

    return NextResponse.json({
      success: true,
      senhaTemporaria: senhaTemporaria, // Retorna para exibir no app
      webhookEnviado: webhookEnviado,
      message: webhookEnviado
        ? 'Senha gerada e enviada via WhatsApp'
        : 'Senha gerada (WhatsApp não configurado)'
    })

  } catch (error) {
    console.error('💥 [SENHA TEMPORÁRIA] Erro geral:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar solicitação'
    }, { status: 500 })
  }
}
