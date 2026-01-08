import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/barbeiros/listar
 *
 * Retorna a lista de TODOS os barbeiros cadastrados no sistema
 * Usado para o cliente escolher seu barbeiro preferido no agendamento via WhatsApp
 *
 * Query params:
 * - ativo: (Opcional) true/false - Filtra apenas barbeiros ativos. Padrão: true
 *
 * Exemplo: /api/barbeiros/listar
 * Exemplo: /api/barbeiros/listar?ativo=false (retorna todos, inclusive inativos)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')

    // Por padrão, retorna apenas barbeiros ativos
    const filtrarAtivo = ativoParam !== 'false'

    // 1. Buscar barbeiros do banco
    let query = supabase
      .from('profissionais')
      .select('id, nome, telefone, email, especialidades, ativo, foto_url')
      .order('nome', { ascending: true })

    // Filtrar apenas ativos se solicitado
    if (filtrarAtivo) {
      query = query.eq('ativo', true)
    }

    const { data: barbeiros, error: barbeirosError } = await query

    if (barbeirosError) {
      console.error('Erro ao buscar barbeiros:', barbeirosError)
      return NextResponse.json(
        { error: 'Erro ao buscar barbeiros' },
        { status: 500 }
      )
    }

    if (!barbeiros || barbeiros.length === 0) {
      return NextResponse.json({
        total: 0,
        barbeiros: [],
        message: 'Nenhum barbeiro cadastrado'
      })
    }

    // 2. Para cada barbeiro, buscar estatísticas de agendamentos
    const hoje = new Date()
    const dia = String(hoje.getDate()).padStart(2, '0')
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ano = hoje.getFullYear()
    const dataHoje = `${dia}/${mes}/${ano}`

    const barbeirosComEstatisticas = await Promise.all(
      barbeiros.map(async (barbeiro) => {
        // Buscar total de agendamentos (geral)
        const { count: totalGeral } = await supabase
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('profissional_id', barbeiro.id)
          .neq('status', 'cancelado')

        // Buscar agendamentos de hoje
        const { count: totalHoje } = await supabase
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('profissional_id', barbeiro.id)
          .eq('data_agendamento', dataHoje)
          .neq('status', 'cancelado')

        // Buscar agendamentos concluídos (para calcular avaliação média - futuro)
        const { count: totalConcluidos } = await supabase
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('profissional_id', barbeiro.id)
          .eq('status', 'concluido')

        return {
          id: barbeiro.id,
          nome: barbeiro.nome,
          telefone: barbeiro.telefone,
          email: barbeiro.email,
          especialidades: barbeiro.especialidades,
          ativo: barbeiro.ativo,
          foto_url: barbeiro.foto_url,
          estatisticas: {
            total_atendimentos: totalGeral || 0,
            atendimentos_hoje: totalHoje || 0,
            total_concluidos: totalConcluidos || 0
          }
        }
      })
    )

    // 3. Ordenar por quantidade de atendimentos hoje (rodízio)
    const barbeirosOrdenados = barbeirosComEstatisticas.sort(
      (a, b) => a.estatisticas.atendimentos_hoje - b.estatisticas.atendimentos_hoje
    )

    // 4. Identificar o próximo do rodízio
    const proximoRodizio = barbeirosOrdenados.length > 0 ? barbeirosOrdenados[0] : null

    return NextResponse.json({
      total: barbeirosOrdenados.length,
      proximo_rodizio: proximoRodizio ? {
        id: proximoRodizio.id,
        nome: proximoRodizio.nome,
        atendimentos_hoje: proximoRodizio.estatisticas.atendimentos_hoje
      } : null,
      barbeiros: barbeirosOrdenados,
      mensagem_para_cliente: barbeirosOrdenados.length > 0
        ? `Temos ${barbeirosOrdenados.length} barbeiro(s) disponível(is). Escolha seu preferido ou deixe em branco para rodízio automático.`
        : 'No momento não há barbeiros disponíveis.'
    })

  } catch (error) {
    console.error('Erro ao listar barbeiros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
