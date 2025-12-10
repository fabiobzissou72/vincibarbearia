/**
 * Funções de validação e normalização
 */

import { parsePhoneNumber, CountryCode } from 'libphonenumber-js'

/**
 * Normaliza telefone brasileiro para formato E.164
 * @param telefone - Telefone em qualquer formato
 * @returns Telefone normalizado (+5511999999999)
 * @throws Error se telefone inválido
 * 
 * @example
 * normalizarTelefone('(11) 99999-9999') // '+5511999999999'
 * normalizarTelefone('11999999999')     // '+5511999999999'
 * normalizarTelefone('5511999999999')   // '+5511999999999'
 */
export function normalizarTelefone(telefone: string): string {
  try {
    // Remove tudo que não é número
    const apenasNumeros = telefone.replace(/\D/g, '')
    
    // Adiciona código do país se necessário
    let numeroCompleto = apenasNumeros
    if (apenasNumeros.length === 11) {
      numeroCompleto = '55' + apenasNumeros // Brasil
    } else if (apenasNumeros.length === 10) {
      numeroCompleto = '55' + apenasNumeros // Brasil (fixo)
    }
    
    const phoneNumber = parsePhoneNumber('+' + numeroCompleto, 'BR' as CountryCode)
    
    if (!phoneNumber.isValid()) {
      throw new Error('Número de telefone inválido')
    }
    
    return phoneNumber.format('E.164')
  } catch (error) {
    throw new Error(`Telefone inválido: ${telefone}`)
  }
}

/**
 * Valida se telefone é brasileiro válido
 * @param telefone - Telefone para validar
 * @returns true se válido
 */
export function validarTelefoneBrasileiro(telefone: string): boolean {
  try {
    normalizarTelefone(telefone)
    return true
  } catch {
    return false
  }
}

/**
 * Formata data do formato brasileiro (DD/MM/YYYY) para Date
 * @param dataBR - Data no formato DD/MM/YYYY
 * @returns Objeto Date
 * @throws Error se data inválida
 */
export function formatarDataBR(dataBR: string): Date {
  const partes = dataBR.split('/')
  if (partes.length !== 3) {
    throw new Error('Data deve estar no formato DD/MM/YYYY')
  }
  
  const [dia, mes, ano] = partes.map(Number)
  
  if (!dia || !mes || !ano) {
    throw new Error('Data inválida')
  }
  
  const data = new Date(ano, mes - 1, dia)
  
  // Valida se a data é real (ex: 31/02/2024 seria inválida)
  if (
    data.getDate() !== dia ||
    data.getMonth() !== mes - 1 ||
    data.getFullYear() !== ano
  ) {
    throw new Error('Data inválida')
  }
  
  return data
}

/**
 * Converte Date para formato brasileiro (DD/MM/YYYY)
 * @param data - Objeto Date
 * @returns String no formato DD/MM/YYYY
 */
export function converterParaDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/**
 * Valida se data/hora está no passado
 * @param dataBR - Data no formato DD/MM/YYYY
 * @param hora - Hora no formato HH:mm
 * @returns true se está no passado
 */
export function estaNoPassado(dataBR: string, hora: string): boolean {
  try {
    const data = formatarDataBR(dataBR)
    const [horas, minutos] = hora.split(':').map(Number)
    
    data.setHours(horas, minutos, 0, 0)
    
    return data <= new Date()
  } catch {
    return false
  }
}

/**
 * Valida horário no formato HH:mm
 * @param hora - Horário para validar
 * @returns true se válido
 */
export function validarHorario(hora: string): boolean {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  if (!regex.test(hora)) {
    return false
  }
  
  const [horas, minutos] = hora.split(':').map(Number)
  return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59
}
