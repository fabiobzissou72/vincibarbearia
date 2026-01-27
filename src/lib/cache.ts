/**
 * Funções de cache para otimização de performance
 */

import { cache } from 'react'
import { supabase } from './supabase'

/**
 * Interface para configurações do sistema
 */
export interface Configuracoes {
  id: string
  horario_abertura: string
  horario_fechamento: string
  intervalo_agendamento: number
  dias_funcionamento: string[]
  webhook_confirmacao?: string
  webhook_lembrete?: string
  webhook_cancelamento?: string
  tempo_antecedencia_minimo: number
  tempo_lembrete_horas: number
  created_at?: string
  updated_at?: string
}

/**
 * Busca configurações do sistema com cache
 * Cache é mantido durante a renderização (React cache)
 * 
 * IMPORTANTE: Para cache mais agressivo, considere usar Next.js revalidation
 * nas rotas que chamam esta função.
 */
export const getConfiguracoes = cache(async (): Promise<Configuracoes | null> => {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao buscar configurações:', error)
    return null
  }

  return data as Configuracoes
})

/**
 * Busca configurações com valor padrão em caso de erro
 * @param defaults - Valores padrão caso configurações não sejam encontradas
 * @returns Configurações ou valores padrão
 */
export async function getConfiguracoesComDefaults(
  defaults: Partial<Configuracoes>
): Promise<Configuracoes> {
  const config = await getConfiguracoes()
  
  if (!config) {
    return {
      id: 'default',
      horario_abertura: defaults.horario_abertura || '09:00',
      horario_fechamento: defaults.horario_fechamento || '19:00',
      intervalo_agendamento: defaults.intervalo_agendamento || 30,
      dias_funcionamento: defaults.dias_funcionamento || ['1', '2', '3', '4', '5', '6'],
      tempo_antecedencia_minimo: defaults.tempo_antecedencia_minimo || 60,
      tempo_lembrete_horas: defaults.tempo_lembrete_horas || 24,
      ...defaults
    } as Configuracoes
  }
  
  return config
}

/**
 * Helper para adicionar cache control headers nas respostas
 * @param seconds - Tempo em segundos para cache
 * @returns Headers object
 * 
 * @example
 * return NextResponse.json(data, {
 *   headers: getCacheHeaders(60) // 1 minuto
 * })
 */
export function getCacheHeaders(seconds: number): Record<string, string> {
  const staleWhileRevalidate = seconds * 2
  return {
    'Cache-Control': 'public, s-maxage=' + seconds + ', stale-while-revalidate=' + staleWhileRevalidate
  }
}
