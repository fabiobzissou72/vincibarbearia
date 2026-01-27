import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/produtos/atualizar
 *
 * Atualiza um produto existente
 *
 * Body: {
 *   produto_id: string (UUID) (obrigatório)
 *   nome: string (opcional)
 *   descricao: string (opcional)
 *   preco: number (opcional)
 *   categoria: string (opcional)
 *   estoque: number (opcional)
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
    const { produto_id, ...dadosAtualizacaoRaw } = body

    // Validações
    if (!produto_id) {
      return NextResponse.json({
        success: false,
        error: 'produto_id é obrigatório'
      }, { status: 400 })
    }

    // Verificar se produto existe
    const { data: produtoExistente, error: erroBusca } = await supabase
      .from('produtos')
      .select('id')
      .eq('id', produto_id)
      .single()

    if (erroBusca || !produtoExistente) {
      return NextResponse.json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 })
    }

    // Processar e validar dados de atualização
    const dadosAtualizacao: any = { ...dadosAtualizacaoRaw }

    // Validar e converter preço se fornecido
    if (dadosAtualizacao.preco !== undefined) {
      const preco = typeof dadosAtualizacao.preco === 'string'
        ? parseFloat(dadosAtualizacao.preco)
        : dadosAtualizacao.preco

      if (isNaN(preco) || preco < 0) {
        return NextResponse.json({
          success: false,
          error: 'preco deve ser um número positivo'
        }, { status: 400 })
      }

      dadosAtualizacao.preco = preco
    }

    // Converter estoque se fornecido
    if (dadosAtualizacao.estoque !== undefined) {
      const estoque = typeof dadosAtualizacao.estoque === 'string'
        ? parseInt(dadosAtualizacao.estoque)
        : dadosAtualizacao.estoque

      if (!isNaN(estoque)) {
        dadosAtualizacao.estoque = estoque
      }
    }

    // Atualizar produto
    const { data: produtoAtualizado, error } = await supabase
      .from('produtos')
      .update({
        ...dadosAtualizacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', produto_id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar produto:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar produto'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Produto atualizado com sucesso!',
      produto: produtoAtualizado
    })

  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
