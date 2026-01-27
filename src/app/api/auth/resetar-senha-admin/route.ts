import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashSenha } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profissionalId, novaSenha } = body

    if (!profissionalId || !novaSenha) {
      return NextResponse.json(
        { success: false, error: 'ID do profissional e nova senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar login do profissional
    const { data: loginData, error: loginError } = await supabase
      .from('profissionais_login')
      .select('id')
      .eq('profissional_id', profissionalId)
      .single()

    if (loginError || !loginData) {
      return NextResponse.json(
        { success: false, error: 'Profissional não encontrado ou sem credenciais de acesso' },
        { status: 404 }
      )
    }

    // Hash da nova senha
    const senhaHash = await hashSenha(novaSenha)

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('profissionais_login')
      .update({ senha: senhaHash })
      .eq('id', loginData.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Senha alterada com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
