import { NextResponse } from 'next/server'
import { alterarSenhaProfissional } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profissionalId, senhaAtual, novaSenha } = body

    if (!profissionalId || !senhaAtual || !novaSenha) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const resultado = await alterarSenhaProfissional(profissionalId, senhaAtual, novaSenha)

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Senha alterada com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
