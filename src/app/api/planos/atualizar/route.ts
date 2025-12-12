import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/planos/atualizar
 *
 * Atualiza um plano existente
 *
 * Body: {
 *   plano_id: string (UUID) (obrigatório)
 *   nome: string (opcional)
 *   descricao: string (opcional)
 *   valor_original: number (opcional)
 *   valor_total: number (opcional)
 *   quantidade_servicos: number (opcional)
 *   validade_dias: number (opcional)
 *   ativo: boolean (opcional)
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
    const { plano_id, ...dadosAtualizacao } = body

    // Validações
    if (!plano_id) {
      return NextResponse.json({
        success: false,
        error: 'plano_id é obrigatório'
      }, { status: 400 })
    }

    // Buscar plano existente para recalcular economia
    const { data: planoExistente, error: erroBusca } = await supabase
      .from('planos')
      .select('*')
      .eq('id', plano_id)
      .single()

    if (erroBusca || !planoExistente) {
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado'
      }, { status: 404 })
    }

    // Validar valores se fornecidos
    if (dadosAtualizacao.valor_original !== undefined) {
      if (typeof dadosAtualizacao.valor_original !== 'number' || dadosAtualizacao.valor_original < 0) {
        return NextResponse.json({
          success: false,
          error: 'valor_original deve ser um número positivo'
        }, { status: 400 })
      }
    }

    if (dadosAtualizacao.valor_total !== undefined) {
      if (typeof dadosAtualizacao.valor_total !== 'number' || dadosAtualizacao.valor_total < 0) {
        return NextResponse.json({
          success: false,
          error: 'valor_total deve ser um número positivo'
        }, { status: 400 })
      }
    }

    // Recalcular economia se valores mudaram
    const valorOriginal = dadosAtualizacao.valor_original !== undefined
      ? dadosAtualizacao.valor_original
      : planoExistente.valor_original

    const valorTotal = dadosAtualizacao.valor_total !== undefined
      ? dadosAtualizacao.valor_total
      : planoExistente.valor_total

    const economia = valorOriginal - valorTotal
    const economiaPercentual = ((economia / valorOriginal) * 100).toFixed(0)

    // Atualizar plano
    const { data: planoAtualizado, error } = await supabase
      .from('planos')
      .update({
        ...dadosAtualizacao,
        economia,
        economia_percentual: parseInt(economiaPercentual),
        updated_at: new Date().toISOString()
      })
      .eq('id', plano_id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar plano:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar plano'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso!',
      plano: planoAtualizado
    })

  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
