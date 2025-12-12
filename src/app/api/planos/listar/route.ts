import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/planos/listar
 *
 * Retorna todos os planos ativos da barbearia
 *
 * Query params (opcional):
 * - ativo: true | false (filtrar por status)
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
    const ativoParam = searchParams.get('ativo')

    // Construir query
    let query = supabase
      .from('planos')
      .select('*')
      .order('valor_total')

    // Filtrar por status ativo
    if (ativoParam !== null) {
      const ativo = ativoParam === 'true'
      query = query.eq('ativo', ativo)
    }

    const { data: planos, error } = await query

    if (error) {
      console.error('Erro ao buscar planos:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar planos'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total: planos?.length || 0,
      planos: planos || []
    })

  } catch (error) {
    console.error('Erro ao listar planos:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
