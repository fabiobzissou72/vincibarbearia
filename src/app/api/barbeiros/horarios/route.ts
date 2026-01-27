import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/barbeiros/horarios
 *
 * 🔐 REQUER AUTENTICAÇÃO: Header Authorization: Bearer SEU_TOKEN
 *
 * Retorna os horários de todos os barbeiros de HOJE
 * Mostra quantos agendamentos cada um tem e quais horários estão livres
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO OBRIGATÓRIA
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        message: erro || 'Token de autorização inválido'
      }, { status: 403 })
    }

    // Obter data de hoje no timezone de Brasília
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const [year, month, day] = hoje.toISOString().split('T')[0].split('-')
    const dataBR = `${day}/${month}/${year}`

    console.log('📅 Buscando horários de:', dataBR)

    // Buscar todos os barbeiros ativos
    const { data: barbeiros, error: barbeirosError } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (barbeirosError) {
      console.error('Erro ao buscar barbeiros:', barbeirosError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar barbeiros',
        error: barbeirosError.message
      }, { status: 500 })
    }

    if (!barbeiros || barbeiros.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum barbeiro ativo encontrado'
      }, { status: 404 })
    }

    // Buscar agendamentos de HOJE
    const { data: agendamentosHoje, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        *,
        profissionais(nome)
      `)
      .eq('data_agendamento', dataBR)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])
      .order('hora_inicio')

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
    }

    console.log('📊 Agendamentos hoje:', agendamentosHoje?.length || 0)

    // Montar resposta com horários de cada barbeiro
    const horariosRestult = barbeiros.map(barbeiro => {
      // Filtrar agendamentos deste barbeiro
      const agendamentosDoBarbeiro = (agendamentosHoje || []).filter(
        ag => ag.profissional_id === barbeiro.id
      )

      // Horários ocupados
      const horariosOcupados = agendamentosDoBarbeiro.map(ag => ({
        hora: ag.hora_inicio,
        cliente: ag.nome_cliente,
        servico: ag.servicos?.nome || 'N/A',
        valor: ag.valor,
        status: ag.status
      }))

      // Horários de funcionamento (08:00 às 20:00)
      const todosHorarios: string[] = []
      for (let h = 8; h <= 19; h++) {
        todosHorarios.push(`${String(h).padStart(2, '0')}:00`)
        todosHorarios.push(`${String(h).padStart(2, '0')}:30`)
      }
      todosHorarios.push('20:00')

      // Horários livres (que não estão ocupados)
      const horariosOcupadosSet = new Set(horariosOcupados.map(h => h.hora))
      const horariosLivres = todosHorarios.filter(h => !horariosOcupadosSet.has(h))

      return {
        barbeiro_id: barbeiro.id,
        barbeiro_nome: barbeiro.nome,
        total_agendamentos: agendamentosDoBarbeiro.length,
        horarios_ocupados: horariosOcupados,
        horarios_livres: horariosLivres,
        proximos_livres: horariosLivres.slice(0, 5) // Próximos 5 horários livres
      }
    })

    // Calcular estatísticas gerais
    const totalAgendamentos = (agendamentosHoje || []).length
    const barbeiroMaisOcupado = horariosRestult.reduce((prev, current) =>
      current.total_agendamentos > prev.total_agendamentos ? current : prev
    )
    const barbeiroMenosOcupado = horariosRestult.reduce((prev, current) =>
      current.total_agendamentos < prev.total_agendamentos ? current : prev
    )

    return NextResponse.json({
      success: true,
      data: {
        data: dataBR,
        hora_consulta: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        total_agendamentos: totalAgendamentos,
        barbeiros: horariosRestult,
        estatisticas: {
          mais_ocupado: {
            nome: barbeiroMaisOcupado.barbeiro_nome,
            agendamentos: barbeiroMaisOcupado.total_agendamentos
          },
          menos_ocupado: {
            nome: barbeiroMenosOcupado.barbeiro_nome,
            agendamentos: barbeiroMenosOcupado.total_agendamentos
          }
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar horários:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
