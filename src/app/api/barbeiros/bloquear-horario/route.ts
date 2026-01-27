import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/barbeiros/bloquear-horario
 *
 * Bloqueia um horário específico para um barbeiro
 * Cria um agendamento com status "bloqueado" para impedir novos agendamentos
 *
 * Body: {
 *   barbeiro_id: string (UUID) (obrigatório)
 *   data: string (DD-MM-YYYY ou YYYY-MM-DD) (obrigatório)
 *   hora_inicio: string (HH:MM) (obrigatório)
 *   hora_fim: string (HH:MM) (obrigatório)
 *   motivo: string (obrigatório) - ex: "Almoço", "Folga", "Compromisso"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
      }, { status: 401 })
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json({
        success: false,
        error: erro
      }, { status: 403 })
    }

    const body = await request.json()
    const { barbeiro_id, data, hora_inicio, hora_fim, motivo } = body

    // Validações
    if (!barbeiro_id || !data || !hora_inicio || !hora_fim || !motivo) {
      return NextResponse.json({
        success: false,
        error: 'barbeiro_id, data, hora_inicio, hora_fim e motivo são obrigatórios'
      }, { status: 400 })
    }

    // Verificar se barbeiro existe
    const { data: barbeiro, error: erroBarbeiro } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('id', barbeiro_id)
      .eq('ativo', true)
      .single()

    if (erroBarbeiro || !barbeiro) {
      return NextResponse.json({
        success: false,
        error: 'Barbeiro não encontrado ou inativo'
      }, { status: 404 })
    }

    // Formatar data para DD/MM/YYYY
    let dataFormatada: string
    if (data.includes('-')) {
      const partes = data.split('-')
      if (partes[0].length === 4) {
        // YYYY-MM-DD
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`
      } else {
        // DD-MM-YYYY
        dataFormatada = `${partes[0]}/${partes[1]}/${partes[2]}`
      }
    } else if (data.includes('/')) {
      dataFormatada = data
    } else {
      return NextResponse.json({
        success: false,
        error: 'Formato de data inválido. Use DD-MM-YYYY ou YYYY-MM-DD'
      }, { status: 400 })
    }

    // Validar horários
    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!horaRegex.test(hora_inicio) || !horaRegex.test(hora_fim)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de horário inválido. Use HH:MM'
      }, { status: 400 })
    }

    // Verificar se hora_fim > hora_inicio
    const [horaIni, minIni] = hora_inicio.split(':').map(Number)
    const [horaFim, minFim] = hora_fim.split(':').map(Number)
    const minutosInicio = horaIni * 60 + minIni
    const minutosFim = horaFim * 60 + minFim

    if (minutosFim <= minutosInicio) {
      return NextResponse.json({
        success: false,
        error: 'hora_fim deve ser maior que hora_inicio'
      }, { status: 400 })
    }

    // Verificar se já existe bloqueio ou agendamento neste horário
    const { data: conflitos } = await supabase
      .from('agendamentos')
      .select('id, status, hora_inicio, hora_fim, nome_cliente')
      .eq('profissional_id', barbeiro_id)
      .eq('data_agendamento', dataFormatada)
      .in('status', ['agendado', 'confirmado', 'bloqueado', 'em_andamento'])

    if (conflitos && conflitos.length > 0) {
      for (const conflito of conflitos) {
        const [horaConfIni, minConfIni] = conflito.hora_inicio.split(':').map(Number)
        const minutosConfInicio = horaConfIni * 60 + minConfIni

        let minutosConfFim = minutosConfInicio + 30 // Padrão 30 min
        if (conflito.hora_fim) {
          const [horaConfFim, minConfFim] = conflito.hora_fim.split(':').map(Number)
          minutosConfFim = horaConfFim * 60 + minConfFim
        }

        // Verificar sobreposição
        if (minutosInicio < minutosConfFim && minutosFim > minutosConfInicio) {
          return NextResponse.json({
            success: false,
            error: `Conflito de horário: ${conflito.status === 'bloqueado' ? 'Já bloqueado' : 'Agendamento existente'} às ${conflito.hora_inicio}`,
            conflito: {
              hora: conflito.hora_inicio,
              status: conflito.status,
              cliente: conflito.nome_cliente || 'Bloqueio'
            }
          }, { status: 409 })
        }
      }
    }

    // Criar bloqueio (agendamento com status "bloqueado")
    const { data: bloqueio, error: erroBloqueio } = await supabase
      .from('agendamentos')
      .insert([{
        profissional_id: barbeiro_id,
        data_agendamento: dataFormatada,
        hora_inicio: hora_inicio,
        hora_fim: hora_fim,
        nome_cliente: `BLOQUEADO: ${motivo}`,
        telefone: null,
        valor: 0,
        status: 'bloqueado',
        compareceu: null,
        observacoes: motivo,
        Barbeiro: barbeiro.nome
      }])
      .select()
      .single()

    if (erroBloqueio) {
      console.error('Erro ao criar bloqueio:', erroBloqueio)
      return NextResponse.json({
        success: false,
        error: 'Erro ao bloquear horário'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Horário bloqueado com sucesso!',
      bloqueio: {
        id: bloqueio.id,
        barbeiro: barbeiro.nome,
        data: dataFormatada,
        hora_inicio: hora_inicio,
        hora_fim: hora_fim,
        motivo: motivo,
        status: 'bloqueado'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao bloquear horário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
