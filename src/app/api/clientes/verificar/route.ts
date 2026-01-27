import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/clientes/verificar
 * Verifica se um cliente ainda existe no banco de dados
 */
export async function POST(request: NextRequest) {
  try {
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      return NextResponse.json({ existe: false, error: erro }, { status: 401 })
    }

    const body = await request.json()
    const { cliente_id } = body

    if (!cliente_id) {
      return NextResponse.json({ existe: false })
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('id, ativo')
      .eq('id', cliente_id)
      .single()

    if (error || !cliente) {
      return NextResponse.json({ existe: false })
    }

    // Verificar se está ativo
    if (!cliente.ativo) {
      return NextResponse.json({ existe: false, motivo: 'Cliente inativo' })
    }

    return NextResponse.json({ existe: true })
  } catch (error) {
    console.error('Erro ao verificar cliente:', error)
    return NextResponse.json({ existe: false, error: 'Erro interno' }, { status: 500 })
  }
}
