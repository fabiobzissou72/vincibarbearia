/**
 * Funções utilitárias para manipulação de horários e agendamentos
 */

/**
 * Converte horário HH:mm para minutos desde meia-noite
 * @param hora - Horário no formato HH:mm
 * @returns Minutos desde 00:00
 * 
 * @example
 * horarioParaMinutos('14:30') // 870
 * horarioParaMinutos('09:00') // 540
 */
export function horarioParaMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

/**
 * Converte minutos desde meia-noite para formato HH:mm
 * @param minutos - Minutos desde 00:00
 * @returns Horário no formato HH:mm
 * 
 * @example
 * minutosParaHorario(870)  // '14:30'
 * minutosParaHorario(540)  // '09:00'
 */
export function minutosParaHorario(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  const horasStr = String(horas).padStart(2, '0')
  const minsStr = String(mins).padStart(2, '0')
  return horasStr + ':' + minsStr
}

/**
 * Verifica se dois horários têm conflito
 * @param inicio1 - Horário de início do primeiro agendamento (HH:mm)
 * @param duracao1 - Duração do primeiro agendamento em minutos
 * @param inicio2 - Horário de início do segundo agendamento (HH:mm)
 * @param duracao2 - Duração do segundo agendamento em minutos
 * @returns true se há conflito
 * 
 * @example
 * verificarConflito('14:00', 60, '14:30', 60) // true (conflito)
 * verificarConflito('14:00', 60, '15:00', 60) // false (sem conflito)
 */
export function verificarConflito(
  inicio1: string,
  duracao1: number,
  inicio2: string,
  duracao2: number
): boolean {
  const ini1 = horarioParaMinutos(inicio1)
  const fim1 = ini1 + duracao1
  const ini2 = horarioParaMinutos(inicio2)
  const fim2 = ini2 + duracao2

  // Conflito se: início1 < fim2 E fim1 > início2
  return ini1 < fim2 && fim1 > ini2
}

/**
 * Interface para agendamento
 */
export interface Agendamento {
  hora_inicio: string
  duracao_servico: number
}

/**
 * Verifica se um novo agendamento conflita com uma lista de agendamentos existentes
 * @param novoAgendamento - Novo agendamento a ser verificado
 * @param agendamentosExistentes - Lista de agendamentos já marcados
 * @returns true se há conflito com algum agendamento
 */
export function verificarConflitoComLista(
  novoAgendamento: Agendamento,
  agendamentosExistentes: Agendamento[]
): boolean {
  return agendamentosExistentes.some(agendamento =>
    verificarConflito(
      novoAgendamento.hora_inicio,
      novoAgendamento.duracao_servico,
      agendamento.hora_inicio,
      agendamento.duracao_servico
    )
  )
}

/**
 * Calcula o horário de término de um agendamento
 * @param horaInicio - Horário de início (HH:mm)
 * @param duracao - Duração em minutos
 * @returns Horário de término (HH:mm)
 * 
 * @example
 * calcularHorarioFim('14:00', 60) // '15:00'
 * calcularHorarioFim('14:30', 45) // '15:15'
 */
export function calcularHorarioFim(horaInicio: string, duracao: number): string {
  const minutos = horarioParaMinutos(horaInicio)
  return minutosParaHorario(minutos + duracao)
}

/**
 * Gera slots de horários disponíveis em um intervalo
 * @param inicio - Horário de início (HH:mm)
 * @param fim - Horário de fim (HH:mm)
 * @param intervalo - Intervalo entre slots em minutos
 * @returns Array de horários disponíveis
 * 
 * @example
 * gerarSlots('09:00', '12:00', 30)
 * // ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
 */
export function gerarSlots(inicio: string, fim: string, intervalo: number): string[] {
  const minInicio = horarioParaMinutos(inicio)
  const minFim = horarioParaMinutos(fim)
  const slots: string[] = []

  for (let min = minInicio; min < minFim; min += intervalo) {
    slots.push(minutosParaHorario(min))
  }

  return slots
}

/**
 * Filtra slots disponíveis removendo conflitos com agendamentos existentes
 * @param slots - Lista de slots possíveis
 * @param duracao - Duração do serviço em minutos
 * @param agendamentosExistentes - Agendamentos já marcados
 * @returns Slots sem conflito
 */
export function filtrarSlotsDisponiveis(
  slots: string[],
  duracao: number,
  agendamentosExistentes: Agendamento[]
): string[] {
  return slots.filter(slot => {
    const novoAgendamento = {
      hora_inicio: slot,
      duracao_servico: duracao
    }
    return !verificarConflitoComLista(novoAgendamento, agendamentosExistentes)
  })
}
