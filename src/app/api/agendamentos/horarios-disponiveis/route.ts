import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agendamentos/horarios-disponiveis
 *
 * Retorna todos os horários disponíveis para um dia específico
 *
 * Query Params:
 * - data: string (YYYY-MM-DD) - Data para consultar
 * - barbeiro: string (opcional) - Nome do barbeiro específico
 * - servico_ids: string (opcional) - IDs dos serviços separados por vírgula (para calcular duração)
 *
 * Exemplo: /api/agendamentos/horarios-disponiveis?data=2025-12-20&barbeiro=Hiago
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data')
    const barbeiroNome = searchParams.get('barbeiro')
    const servicoIdsParam = searchParams.get('servico_ids')

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro "data" é obrigatório',
        errors: ['Data não fornecida']
      }, { status: 400 })
    }

    // Validar formato da data
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dataRegex.test(data)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de data inválido. Use YYYY-MM-DD',
        errors: ['Formato de data inválido']
      }, { status: 400 })
    }

    // Converter data de YYYY-MM-DD para DD/MM/YYYY (formato do banco)
    const [year, month, day] = data.split('-')
    const dataBR = `${day}/${month}/${year}`

    // Buscar configurações da barbearia
    const { data: config } = await supabase
      .from('configuracoes')
      .select('*')
      .single()

    if (!config) {
      return NextResponse.json({
        success: false,
        message: 'Configurações não encontradas',
        errors: ['Configure os horários de funcionamento']
      }, { status: 500 })
    }

    // Verificar dia da semana
    const dataParsed = new Date(data + 'T00:00:00')
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const diaSemana = diasSemana[dataParsed.getDay()]

    // Verificar se a barbearia funciona neste dia
    const horarioDia = config.horarios_por_dia?.[diaSemana]
    if (!horarioDia || !horarioDia.ativo) {
      return NextResponse.json({
        success: false,
        message: `Barbearia fechada em ${diaSemana}`,
        data: {
          horarios: [],
          dia_fechado: true,
          dia_semana: diaSemana
        }
      })
    }

    const horarioAbertura = horarioDia.abertura || '09:00'
    const horarioFechamento = horarioDia.fechamento || '19:00'

    // Calcular duração total dos serviços (se fornecido)
    let duracaoTotal = 30 // Padrão
    if (servicoIdsParam) {
      const servicoIds = servicoIdsParam.split(',')
      const { data: servicos } = await supabase
        .from('servicos')
        .select('duracao_minutos')
        .in('id', servicoIds)

      if (servicos && servicos.length > 0) {
        duracaoTotal = servicos.reduce((sum, s) => sum + (s.duracao_minutos || 30), 0)
      }
    }

    // Buscar barbeiro específico ou todos
    let profissionais: any[] = []
    if (barbeiroNome) {
      const { data: prof } = await supabase
        .from('profissionais')
        .select('*')
        .ilike('nome', `%${barbeiroNome}%`)
        .eq('ativo', true)
        .single()

      if (!prof) {
        return NextResponse.json({
          success: false,
          message: `Barbeiro "${barbeiroNome}" não encontrado ou inativo`,
          errors: ['Barbeiro não encontrado']
        }, { status: 404 })
      }
      profissionais = [prof]
    } else {
      const { data: profs } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)
      profissionais = profs || []
    }

    if (profissionais.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum barbeiro ativo encontrado',
        errors: ['Nenhum barbeiro disponível']
      }, { status: 404 })
    }

    // Buscar agendamentos existentes para este dia
    const { data: agendamentosExistentes, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        id,
        hora_inicio,
        profissional_id,
        profissionais (nome),
        agendamento_servicos (
          duracao_minutos,
          servicos (duracao_minutos)
        )
      `)
      .eq('data_agendamento', dataBR)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])

    if (agendamentosError) {
      console.error('Erro ao buscar agendamentos:', agendamentosError)
    }

    console.log('[DEBUG] Agendamentos encontrados:', agendamentosExistentes?.length || 0)
    console.log('[DEBUG] Data buscada:', dataBR)

    // Gerar slots de horário (intervalos de 30min)
    const slots: string[] = []
    const [horaIni, minIni] = horarioAbertura.split(':').map(Number)
    const [horaFim, minFim] = horarioFechamento.split(':').map(Number)

    let horaAtual = horaIni
    let minAtual = minIni

    while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
      const horarioFormatado = `${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`
      slots.push(horarioFormatado)

      // Incrementar 30 minutos
      minAtual += 30
      if (minAtual >= 60) {
        minAtual -= 60
        horaAtual += 1
      }
    }

    // Pegar horário atual para filtrar horários passados (apenas se for hoje)
    const agora = new Date()
    const dataAtual = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const isHoje = dataBR === dataAtual

    // REGRA: Agendamento novo precisa de 30 minutos de antecedência
    const ANTECEDENCIA_MINUTOS = 30

    console.log('[DEBUG] Verificando horários - Data solicitada:', dataBR, 'Data atual:', dataAtual, 'É hoje?', isHoje)
    if (isHoje) {
      console.log('[DEBUG] Hora atual:', agora.toLocaleTimeString('pt-BR'))
    }

    // Verificar disponibilidade de cada slot
    const horariosDisponiveis: string[] = []
    const horariosOcupados: any[] = []

    for (const slot of slots) {
      // Se for hoje, verificar se o horário já passou + antecedência mínima
      if (isHoje) {
        const [horaSlot, minSlot] = slot.split(':').map(Number)
        const horarioSlot = new Date()
        horarioSlot.setHours(horaSlot, minSlot, 0, 0)

        // Calcular horário mínimo permitido (agora + 30min)
        const horarioMinimoPermitido = new Date(agora.getTime() + ANTECEDENCIA_MINUTOS * 60 * 1000)

        if (horarioSlot < horarioMinimoPermitido) {
          console.log(`[DEBUG] Horário ${slot} descartado - já passou ou muito próximo`)
          horariosOcupados.push({
            horario: slot,
            motivo: 'Horário já passou ou muito próximo (mínimo 30min de antecedência)'
          })
          continue
        }
      }

      // Verificar se algum barbeiro está disponível neste horário
      let algumBarbeiroDisponivel = false

      for (const prof of profissionais) {
        const ocupado = agendamentosExistentes?.some(ag => {
          if (ag.profissional_id !== prof.id) return false

          const horaAgendamento = ag.hora_inicio

          // Calcular duração do agendamento existente
          let duracaoAgendamento = 30 // Padrão
          if (ag.agendamento_servicos && ag.agendamento_servicos.length > 0) {
            duracaoAgendamento = ag.agendamento_servicos.reduce((sum: number, s: any) => {
              // Tentar pegar duracao_minutos da relação ou do serviço
              const duracao = s.duracao_minutos || s.servicos?.duracao_minutos || 30
              return sum + duracao
            }, 0)
          }

          // Verificar conflito de horário
          const [horaAg, minAg] = horaAgendamento.split(':').map(Number)
          const [horaSlot, minSlot] = slot.split(':').map(Number)

          const inicioAg = horaAg * 60 + minAg
          const fimAg = inicioAg + duracaoAgendamento
          const inicioSlot = horaSlot * 60 + minSlot
          const fimSlot = inicioSlot + duracaoTotal

          // Conflito se houver sobreposição
          const temConflito = (inicioSlot < fimAg && fimSlot > inicioAg)

          if (temConflito) {
            console.log(`[DEBUG] Conflito detectado - Slot: ${slot}, Agendamento: ${horaAgendamento}, Profissional: ${prof.nome}`)
          }

          return temConflito
        })

        if (!ocupado) {
          algumBarbeiroDisponivel = true
          break
        }
      }

      if (algumBarbeiroDisponivel) {
        horariosDisponiveis.push(slot)
      } else {
        horariosOcupados.push({
          horario: slot,
          motivo: 'Todos os barbeiros ocupados'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${horariosDisponiveis.length} horários disponíveis encontrados`,
      data: {
        data: data,
        dia_semana: diaSemana,
        horario_abertura: horarioAbertura,
        horario_fechamento: horarioFechamento,
        duracao_estimada: duracaoTotal,
        barbeiros_disponiveis: profissionais.length,
        barbeiros: profissionais.map(p => ({ id: p.id, nome: p.nome })),
        horarios: horariosDisponiveis,
        horarios_ocupados: horariosOcupados,
        total_disponiveis: horariosDisponiveis.length,
        total_ocupados: horariosOcupados.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar horários disponíveis',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }, { status: 500 })
  }
}
