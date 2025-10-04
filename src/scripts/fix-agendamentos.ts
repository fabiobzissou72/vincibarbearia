import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nypuvicehlmllhbudghf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHV2aWNlaGxtbGxoYnVkZ2hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMjE5OCwiZXhwIjoyMDczNDA4MTk4fQ.o0Q-2TIoiwyQ5gWljEwL7ZQwqjzVgavpkYblzFMctjA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAgendamentos() {
  console.log('🔍 Verificando agendamentos...\n')

  // Buscar todos os agendamentos
  const { data: agendamentos, error: agendamentosError } = await supabase
    .from('agendamentos')
    .select('*')
    .order('data_agendamento', { ascending: false })

  if (agendamentosError) {
    console.error('❌ Erro ao buscar agendamentos:', agendamentosError)
    return
  }

  console.log(`📊 Total de agendamentos: ${agendamentos?.length || 0}\n`)

  // Buscar profissionais e serviços disponíveis
  const { data: profissionais } = await supabase
    .from('profissionais')
    .select('*')
    .eq('ativo', true)

  const { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .eq('ativo', true)

  console.log(`👥 Profissionais disponíveis: ${profissionais?.length || 0}`)
  profissionais?.forEach(p => console.log(`   - ${p.nome} (ID: ${p.id})`))

  console.log(`\n💈 Serviços disponíveis: ${servicos?.length || 0}`)
  servicos?.forEach(s => console.log(`   - ${s.nome} - R$ ${s.preco} (ID: ${s.id})`))

  console.log('\n📋 Agendamentos atuais:')
  agendamentos?.forEach(a => {
    console.log(`\n  Data: ${a.data_agendamento} ${a.hora_inicio}`)
    console.log(`  Cliente: ${a.nome_cliente || 'Não informado'}`)
    console.log(`  Telefone: ${a.telefone || 'Não informado'}`)
    console.log(`  Profissional ID: ${a.profissional_id || '❌ NULL'}`)
    console.log(`  Serviço ID: ${a.servico_id || '❌ NULL'}`)
    console.log(`  Barbeiro (campo texto): ${a.Barbeiro || 'Não informado'}`)
    console.log(`  Valor: R$ ${a.valor || 0}`)
  })

  // Corrigir agendamentos sem profissional_id ou servico_id
  console.log('\n\n🔧 Corrigindo agendamentos...\n')

  for (const agendamento of agendamentos || []) {
    const updates: any = {}
    let needsUpdate = false

    // Se não tem profissional_id, tentar encontrar pelo nome no campo "Barbeiro"
    if (!agendamento.profissional_id && agendamento.Barbeiro && profissionais) {
      const prof = profissionais.find(p =>
        p.nome.toLowerCase().includes(agendamento.Barbeiro.toLowerCase()) ||
        agendamento.Barbeiro.toLowerCase().includes(p.nome.toLowerCase())
      )
      if (prof) {
        updates.profissional_id = prof.id
        needsUpdate = true
        console.log(`✅ Agendamento ${agendamento.id}: Profissional "${agendamento.Barbeiro}" → ${prof.nome} (${prof.id})`)
      } else {
        // Se não encontrou, usar o primeiro profissional
        updates.profissional_id = profissionais[0].id
        needsUpdate = true
        console.log(`⚠️  Agendamento ${agendamento.id}: Profissional padrão → ${profissionais[0].nome}`)
      }
    }

    // Se não tem servico_id, usar serviço padrão (primeiro da lista ou criar um)
    if (!agendamento.servico_id && servicos && servicos.length > 0) {
      updates.servico_id = servicos[0].id
      updates.valor = servicos[0].preco
      needsUpdate = true
      console.log(`✅ Agendamento ${agendamento.id}: Serviço → ${servicos[0].nome} (R$ ${servicos[0].preco})`)
    }

    // Se não tem valor mas tem servico
    if (!agendamento.valor && updates.servico_id && servicos) {
      const servico = servicos.find(s => s.id === updates.servico_id)
      if (servico) {
        updates.valor = servico.preco
      }
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', agendamento.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar agendamento ${agendamento.id}:`, updateError)
      }
    }
  }

  console.log('\n✨ Verificação e correção concluídas!')
}

fixAgendamentos()
