import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiros/webhooks?barbeiro_id=UUID
 *
 * Lista os webhooks configurados para um barbeiro
 *
 * Query params:
 * - barbeiro_id: string (UUID) (obrigatório)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const barbeiro_id = searchParams.get('barbeiro_id')

    // Validações
    if (!barbeiro_id) {
      return NextResponse.json({
        success: false,
        error: 'barbeiro_id é obrigatório'
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

    // Buscar webhooks do barbeiro
    const { data: webhooks, error } = await supabase
      .from('webhooks_barbeiros')
      .select('*')
      .eq('profissional_id', barbeiro_id)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar webhooks:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar webhooks'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      barbeiro: {
        id: barbeiro.id,
        nome: barbeiro.nome
      },
      total: webhooks?.length || 0,
      webhooks: webhooks || []
    })

  } catch (error) {
    console.error('Erro ao listar webhooks:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
