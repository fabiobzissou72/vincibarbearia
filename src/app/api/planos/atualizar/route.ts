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
    const { plano_id, ...dadosAtualizacaoRaw } = body

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

    // Processar e validar dados de atualização
    const dadosAtualizacao: any = { ...dadosAtualizacaoRaw }

    // Validar e converter valor_original se fornecido
    if (dadosAtualizacao.valor_original !== undefined) {
      const valorOriginal = typeof dadosAtualizacao.valor_original === 'string'
        ? parseFloat(dadosAtualizacao.valor_original)
        : dadosAtualizacao.valor_original

      if (isNaN(valorOriginal) || valorOriginal < 0) {
        return NextResponse.json({
          success: false,
          error: 'valor_original deve ser um número positivo'
        }, { status: 400 })
      }

      dadosAtualizacao.valor_original = valorOriginal
    }

    // Validar e converter valor_total se fornecido
    if (dadosAtualizacao.valor_total !== undefined) {
      const valorTotal = typeof dadosAtualizacao.valor_total === 'string'
        ? parseFloat(dadosAtualizacao.valor_total)
        : dadosAtualizacao.valor_total

      if (isNaN(valorTotal) || valorTotal < 0) {
        return NextResponse.json({
          success: false,
          error: 'valor_total deve ser um número positivo'
        }, { status: 400 })
      }

      dadosAtualizacao.valor_total = valorTotal
    }

    // Converter quantidade_servicos se fornecido
    if (dadosAtualizacao.quantidade_servicos !== undefined) {
      const qtd = typeof dadosAtualizacao.quantidade_servicos === 'string'
        ? parseInt(dadosAtualizacao.quantidade_servicos)
        : dadosAtualizacao.quantidade_servicos

      if (!isNaN(qtd)) {
        dadosAtualizacao.quantidade_servicos = qtd
      }
    }

    // Converter validade_dias se fornecido
    if (dadosAtualizacao.validade_dias !== undefined) {
      const dias = typeof dadosAtualizacao.validade_dias === 'string'
        ? parseInt(dadosAtualizacao.validade_dias)
        : dadosAtualizacao.validade_dias

      if (!isNaN(dias)) {
        dadosAtualizacao.validade_dias = dias
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
