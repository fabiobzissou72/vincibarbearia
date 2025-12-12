import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/produtos/criar
 *
 * Cria um novo produto
 *
 * Body: {
 *   nome: string (obrigatório)
 *   descricao: string (opcional)
 *   preco: number (obrigatório)
 *   categoria: string (opcional)
 *   estoque: number (opcional, padrão: 0)
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
    const { nome, descricao, preco, categoria, estoque, ativo } = body

    // Validações
    if (!nome || preco === undefined) {
      return NextResponse.json({
        success: false,
        error: 'nome e preco são obrigatórios'
      }, { status: 400 })
    }

    if (typeof preco !== 'number' || preco < 0) {
      return NextResponse.json({
        success: false,
        error: 'preco deve ser um número positivo'
      }, { status: 400 })
    }

    // Criar produto
    const { data: novoProduto, error } = await supabase
      .from('produtos')
      .insert([{
        nome,
        descricao: descricao || null,
        preco,
        categoria: categoria || null,
        estoque: estoque || 0,
        ativo: ativo !== undefined ? ativo : true,
        data_cadastro: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar produto:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar produto'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Produto criado com sucesso!',
      produto: novoProduto
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
