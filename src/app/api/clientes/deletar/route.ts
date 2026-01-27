import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/clientes/deletar
 *
 * Deleta um cliente do sistema (incluindo leads frios).
 *
 * **ATENÇÃO:** Esta operação é irreversível!
 *
 * **Validações:**
 * - Se o cliente possuir agendamentos futuros, a deleção será bloqueada
 * - Se o cliente possuir apenas histórico, será deletado normalmente
 * - Ideal para uso por IA para remover leads frios automaticamente
 *
 * **Exemplo de uso:**
 * ```bash
 * curl -X DELETE 'https://vincebarbearia.vercel.app/api/clientes/deletar' \
 *   -H 'Authorization: Bearer SEU_TOKEN' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "cliente_id": "uuid-cliente"
 *   }'
 * ```
 *
 * **Ou usando telefone:**
 * ```bash
 * curl -X DELETE 'https://vincebarbearia.vercel.app/api/clientes/deletar' \
 *   -H 'Authorization: Bearer SEU_TOKEN' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "telefone": "11999999999"
 *   }'
 * ```
 */
export async function DELETE(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
        },
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
    const { cliente_id, telefone } = body

    // Validar que pelo menos um identificador foi fornecido
    if (!cliente_id && !telefone) {
      return NextResponse.json(
        {
          success: false,
          error: 'cliente_id ou telefone é obrigatório'
        },
        { status: 400 }
      )
    }

    // Buscar cliente por ID ou telefone
    let query = supabase.from('clientes').select('*')

    if (cliente_id) {
      query = query.eq('id', cliente_id)
    } else if (telefone) {
      query = query.eq('telefone', telefone)
    }

    const { data: clienteExistente, error: erroBusca } = await query.single()

    if (erroBusca || !clienteExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cliente não encontrado'
        },
        { status: 404 }
      )
    }

    // Verificar se o cliente possui agendamentos futuros
    const { data: agendamentosFuturos, error: erroAgendamentos } = await supabase
      .from('agendamentos')
      .select('id, data_agendamento, hora_inicio')
      .eq('cliente_id', clienteExistente.id)
      .in('status', ['agendado', 'confirmado'])
      .gte('data_agendamento', new Date().toISOString().split('T')[0])

    if (erroAgendamentos) {
      console.error('Erro ao verificar agendamentos futuros:', erroAgendamentos)
    }

    // Se houver agendamentos futuros, bloquear a deleção
    if (agendamentosFuturos && agendamentosFuturos.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não é possível deletar este cliente',
          motivo: 'Cliente possui agendamentos futuros agendados',
          agendamentos_futuros: agendamentosFuturos.length,
          detalhes: 'Cancele ou conclua todos os agendamentos antes de deletar o cliente'
        },
        { status: 400 }
      )
    }

    // Deletar o cliente
    const { error: erroDelete } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteExistente.id)

    if (erroDelete) {
      console.error('Erro ao deletar cliente:', erroDelete)
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao deletar cliente',
          detalhes: erroDelete.message
        },
        { status: 500 }
      )
    }

    // Retornar sucesso com informações do cliente deletado
    return NextResponse.json({
      success: true,
      message: 'Cliente deletado com sucesso!',
      data: {
        cliente_id: clienteExistente.id,
        nome: clienteExistente.nome_completo,
        telefone: clienteExistente.telefone,
        deletado_em: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
