import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nypuvicehlmllhbudghf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHV2aWNlaGxtbGxoYnVkZ2hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMjE5OCwiZXhwIjoyMDczNDA4MTk4fQ.o0Q-2TIoiwyQ5gWljEwL7ZQwqjzVgavpkYblzFMctjA'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAgendamentos() {
  console.log('🔍 Verificando e corrigindo agendamentos...\n')

  // Buscar todos os agendamentos com problema
  const { data: agendamentos, error: agendamentosError } = await supabase
    .from('agendamentos')
    .select('*')
    .is('profissional_id', null)

  if (agendamentosError) {
    console.error('❌ Erro:', agendamentosError)
    return
  }

  console.log(`📊 Agendamentos sem profissional: ${agendamentos?.length || 0}\n`)

  // Buscar profissionais
  const { data: profissionais } = await supabase
    .from('profissionais')
    .select('*')
    .eq('ativo', true)

  // Buscar serviços
  const { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .eq('ativo', true)

  if (!profissionais || !servicos) {
    console.error('❌ Erro ao buscar profissionais ou serviços')
    return
  }

  console.log(`👥 Profissionais: ${profissionais.length}`)
  console.log(`💈 Serviços: ${servicos.length}\n`)

  // Corrigir cada agendamento
  for (const agendamento of agendamentos || []) {
    console.log(`\n📝 Agendamento: ${agendamento.nome_cliente} - ${agendamento.data_agendamento} ${agendamento.hora_inicio}`)
    console.log(`   Barbeiro (campo texto): ${agendamento.Barbeiro}`)

    // Encontrar profissional pelo nome
    let profissional = profissionais.find(p =>
      agendamento.Barbeiro &&
      (p.nome.toLowerCase().includes(agendamento.Barbeiro.toLowerCase()) ||
       agendamento.Barbeiro.toLowerCase().includes(p.nome.toLowerCase()))
    )

    if (!profissional) {
      profissional = profissionais[0]
    }

    // Pegar primeiro serviço como padrão
    const servico = servicos[0]

    console.log(`   → Profissional: ${profissional.nome}`)
    console.log(`   → Serviço: ${servico.nome} (R$ ${servico.preco})`)

    // Update usando SQL direto para evitar trigger
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({
        profissional_id: profissional.id,
        servico_id: servico.id,
        valor: servico.preco
      })
      .eq('id', agendamento.id)

    if (updateError) {
      console.error(`   ❌ Erro ao atualizar:`, updateError.message)
    } else {
      console.log(`   ✅ Atualizado com sucesso!`)
    }
  }

  console.log('\n✨ Concluído!')
}

fixAgendamentos().catch(console.error)
