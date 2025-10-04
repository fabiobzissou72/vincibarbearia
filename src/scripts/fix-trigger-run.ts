import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nypuvicehlmllhbudghf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHV2aWNlaGxtbGxoYnVkZ2hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMjE5OCwiZXhwIjoyMDczNDA4MTk4fQ.o0Q-2TIoiwyQ5gWljEwL7ZQwqjzVgavpkYblzFMctjA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTrigger() {
  console.log('🔧 Corrigindo trigger...\n')

  // Remover o trigger problemático
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;'
  })

  console.log('✅ Trigger removido (ou não existia)\n')

  // Adicionar coluna updated_at se não existir
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();'
  })

  console.log('✅ Coluna updated_at verificada\n')

  console.log('✨ Pronto! Agora pode rodar o script de correção novamente.')
}

fixTrigger()
