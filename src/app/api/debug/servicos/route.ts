import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/servicos
 *
 * Endpoint de debug para listar TODOS os serviços
 * e verificar quais estão disponíveis
 */
export async function GET() {
  try {
    // Buscar TODOS os serviços (ativos e inativos)
    const { data: todosServicos, error: erroTodos } = await supabase
      .from('servicos')
      .select('*')
      .order('nome')

    if (erroTodos) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar serviços',
        error: erroTodos
      }, { status: 500 })
    }

    // Buscar apenas serviços ativos
    const { data: servicosAtivos, error: erroAtivos } = await supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (erroAtivos) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar serviços ativos',
        error: erroAtivos
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      resumo: {
        total_servicos: todosServicos?.length || 0,
        servicos_ativos: servicosAtivos?.length || 0,
        servicos_inativos: (todosServicos?.length || 0) - (servicosAtivos?.length || 0)
      },
      servicos_ativos: servicosAtivos?.map(s => ({
        id: s.id,
        nome: s.nome,
        preco: s.preco,
        duracao_minutos: s.duracao_minutos,
        ativo: s.ativo,
        categoria: s.categoria || 'Sem categoria'
      })),
      todos_servicos: todosServicos?.map(s => ({
        id: s.id,
        nome: s.nome,
        preco: s.preco,
        duracao_minutos: s.duracao_minutos,
        ativo: s.ativo,
        categoria: s.categoria || 'Sem categoria'
      })),
      instrucoes: {
        como_usar: 'Use os IDs da lista "servicos_ativos" para criar agendamentos',
        exemplo_curl: `curl -X POST https://seu-dominio.vercel.app/api/agendamentos/criar \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente_nome": "Teste",
    "telefone": "11999999999",
    "data": "2025-12-25",
    "hora": "10:00",
    "servico_ids": ["COLE_UM_ID_DAQUI"],
    "observacoes": "Teste"
  }'`
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Erro no endpoint de debug:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
