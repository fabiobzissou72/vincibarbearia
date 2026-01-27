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
    const { cliente_id, telefone, ...dadosRecebidos } = body

    // Lista de campos permitidos para atualização
    const CAMPOS_PERMITIDOS = [
      'nome_completo',
      'email',
      'data_nascimento',
      'profissao',
      'estado_civil',
      'tem_filhos',
      'nomes_filhos',
      'idades_filhos',
      'estilo_cabelo',
      'preferencias_corte',
      'tipo_bebida',
      'alergias',
      'frequencia_retorno',
      'profissional_preferido',
      'observacoes',
      'is_vip',
      'como_soube',
      'gosta_conversar',
      'tratamento',
      'ultimo_servico',
      'menory_long'
    ]

    // Filtrar apenas campos permitidos (SEGURANÇA: evita sobrescrever campos sensíveis)
    const dadosAtualizacao: Record<string, unknown> = {}
    for (const campo of CAMPOS_PERMITIDOS) {
      if (campo in dadosRecebidos && dadosRecebidos[campo] !== undefined) {
        // Sanitizar strings
        let valor = dadosRecebidos[campo]
        if (typeof valor === 'string') {
          valor = valor.trim()
          // Limitar tamanho de strings
          if (valor.length > 1000) {
            valor = valor.substring(0, 1000)
          }
        }
        dadosAtualizacao[campo] = valor
      }
    }

    // Verificar se há algo para atualizar
    if (Object.keys(dadosAtualizacao).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo válido para atualização fornecido' },
        { status: 400 }
      )
    }

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
