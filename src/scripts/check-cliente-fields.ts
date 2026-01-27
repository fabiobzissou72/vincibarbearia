import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nypuvicehlmllhbudghf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHV2aWNlaGxtbGxoYnVkZ2hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMjE5OCwiZXhwIjoyMDczNDA4MTk4fQ.o0Q-2TIoiwyQ5gWljEwL7ZQwqjzVgavpkYblzFMctjA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFields() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Erro:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Campos disponíveis na tabela clientes:')
    console.log(Object.keys(data[0]).sort().join('\n'))
  }
}

checkFields()
