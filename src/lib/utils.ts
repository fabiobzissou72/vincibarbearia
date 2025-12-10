import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export function formatTime(time: string) {
  return time.slice(0, 5)
}

/**
 * Formata data no padrão brasileiro DD/MM/YYYY
 */
export function formatDateBR(date: string | Date): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Formata data e hora no padrão brasileiro: DD/MM/YYYY às HH:MM
 */
export function formatDateTimeBR(date: string, time: string): string {
  if (!date || !time) return ''

  // Se a data vier em formato ISO (YYYY-MM-DD), converter para DD/MM/YYYY
  let dataBR = date
  if (date.includes('-')) {
    const [year, month, day] = date.split('-')
    dataBR = `${day}/${month}/${year}`
  }

  const timeFormatted = time.slice(0, 5) // HH:MM

  return `${dataBR} às ${timeFormatted}`
}

/**
 * Converte data de YYYY-MM-DD para DD/MM/YYYY
 */
export function convertISOtoBR(dateISO: string): string {
  if (!dateISO) return ''
  if (!dateISO.includes('-')) return dateISO // Já está em formato brasileiro

  const [year, month, day] = dateISO.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Converte data de DD/MM/YYYY para YYYY-MM-DD
 */
export function convertBRtoISO(dateBR: string): string {
  if (!dateBR) return ''
  if (dateBR.includes('-')) return dateBR // Já está em formato ISO

  const [day, month, year] = dateBR.split('/')
  return `${year}-${month}-${day}`
}