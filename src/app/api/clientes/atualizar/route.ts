import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN' },
        { status: 401 }
      )
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json(
        { success: false, error: erro },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { cliente_id, telefone, ...dadosAtualizacao } = body

    // Buscar por ID ou telefone
    if (!cliente_id && !telefone) {
      return NextResponse.json(
        { success: false, error: 'cliente_id ou telefone é obrigatório' },
        { status: 400 }
      )
    }

    let query = supabase.from('clientes').select('id')

    if (cliente_id) {
      query = query.eq('id', cliente_id)
    } else if (telefone) {
      query = query.eq('telefone', telefone)
    }

    const { data: clienteExistente, error: erroCliente } = await query.single()

    if (erroCliente || !clienteExistente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar cliente
    const { data: clienteAtualizado, error: erroUpdate } = await supabase
      .from('clientes')
      .update(dadosAtualizacao)
      .eq('id', clienteExistente.id)
      .select()
      .single()

    if (erroUpdate) {
      console.error('Erro ao atualizar cliente:', erroUpdate)
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente atualizado com sucesso!',
      cliente: clienteAtualizado
    })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
