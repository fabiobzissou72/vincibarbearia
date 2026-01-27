import { NextResponse } from 'next/server'
import { resetarSenhaProfissional } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    const resultado = await resetarSenhaProfissional(email)

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      novaSenha: resultado.novaSenha,
      mensagem: 'Senha resetada com sucesso! Anote a nova senha temporária.'
    })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
