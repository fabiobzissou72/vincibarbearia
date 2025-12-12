import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/planos/criar
 *
 * Cria um novo plano
 *
 * Body: {
 *   nome: string (obrigatório)
 *   descricao: string (opcional)
 *   valor_original: number (obrigatório) - Valor se fosse comprar serviços separados
 *   valor_total: number (obrigatório) - Valor do plano (com desconto)
 *   quantidade_servicos: number (obrigatório) - Quantidade de serviços inclusos
 *   validade_dias: number (obrigatório) - Dias de validade do plano
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
    const {
      nome,
      descricao,
      valor_original,
      valor_total,
      quantidade_servicos,
      validade_dias,
      ativo
    } = body

    // Validações
    if (!nome || valor_original === undefined || valor_total === undefined || !quantidade_servicos || !validade_dias) {
      return NextResponse.json({
        success: false,
        error: 'nome, valor_original, valor_total, quantidade_servicos e validade_dias são obrigatórios'
      }, { status: 400 })
    }

    if (typeof valor_original !== 'number' || valor_original < 0) {
      return NextResponse.json({
        success: false,
        error: 'valor_original deve ser um número positivo'
      }, { status: 400 })
    }

    if (typeof valor_total !== 'number' || valor_total < 0) {
      return NextResponse.json({
        success: false,
        error: 'valor_total deve ser um número positivo'
      }, { status: 400 })
    }

    if (typeof quantidade_servicos !== 'number' || quantidade_servicos <= 0) {
      return NextResponse.json({
        success: false,
        error: 'quantidade_servicos deve ser um número positivo'
      }, { status: 400 })
    }

    if (typeof validade_dias !== 'number' || validade_dias <= 0) {
      return NextResponse.json({
        success: false,
        error: 'validade_dias deve ser um número positivo'
      }, { status: 400 })
    }

    // Calcular economia
    const economia = valor_original - valor_total
    const economiaPercentual = ((economia / valor_original) * 100).toFixed(0)

    // Criar plano
    const { data: novoPlano, error } = await supabase
      .from('planos')
      .insert([{
        nome,
        descricao: descricao || null,
        valor_original,
        valor_total,
        quantidade_servicos,
        validade_dias,
        economia,
        economia_percentual: parseInt(economiaPercentual),
        ativo: ativo !== undefined ? ativo : true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar plano:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar plano'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Plano criado com sucesso!',
      plano: novoPlano
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar plano:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
