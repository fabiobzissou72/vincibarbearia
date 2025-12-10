/**
 * Clientes Supabase
 *
 * IMPORTANTE:
 * - supabase: Cliente público com ANON_KEY (respeita RLS)
 *   Usar em: Rotas públicas de clientes, operações com RLS
 *
 * - supabaseAdmin: Cliente admin com SERVICE_ROLE_KEY (bypassa RLS)
 *   Usar em: Cron jobs, operações administrativas protegidas
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Cliente público - Respeita Row Level Security (RLS)
 * Use este para operações normais da API
 * IMPORTANTE: Agendamentos usam este cliente (RLS deve permitir INSERT/UPDATE)
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

/**
 * Cliente admin - Bypassa Row Level Security (RLS)
 * ATENÇÃO: Use apenas em rotas protegidas (cron, admin)
 * Nunca exponha este cliente em rotas públicas!
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
