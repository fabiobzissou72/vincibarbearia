const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://nypuvicehlmllhbudghf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHV2aWNlaGxtbGxoYnVkZ2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzIxOTgsImV4cCI6MjA3MzQwODE5OH0.USnNrsn-NtwQA04Qd8GkV_d0AyhLVhYgqvzGk7XlTek'
)

async function debug() {
  console.log('=== DEBUG RELATÓRIO ===\n')

  // Verificar agendamentos
  const { data: agendamentos, error: errAgendamentos } = await supabase
    .from('agendamentos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('AGENDAMENTOS (últimos 5):')
  if (errAgendamentos) {
    console.log('ERRO:', errAgendamentos.message)
    console.log('Detalhes:', errAgendamentos)
  }
  console.log('Total:', agendamentos?.length)
  if (agendamentos && agendamentos.length > 0) {
    console.log('Exemplo:', {
      id: agendamentos[0].id,
      data_agendamento: agendamentos[0].data_agendamento,
      created_at: agendamentos[0].created_at,
      status: agendamentos[0].status,
      profissional_id: agendamentos[0].profissional_id,
      cliente_id: agendamentos[0].cliente_id,
      valor: agendamentos[0].valor
    })
  }

  // Testar filtro de data
  const hoje = new Date()
  const umMesAtras = new Date(hoje.setMonth(hoje.getMonth() - 1))

  const { data: agendamentosFiltered } = await supabase
    .from('agendamentos')
    .select('*')
    .gte('created_at', umMesAtras.toISOString())

  console.log('\nAGENDAMENTOS COM FILTRO (último mês):')
  console.log('Total:', agendamentosFiltered?.length)

  // Verificar vendas
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .limit(5)

  console.log('\nVENDAS (últimas 5):')
  console.log('Total:', vendas?.length)

  // Verificar profissionais
  const { data: profissionais } = await supabase
    .from('profissionais')
    .select('*')

  console.log('\nPROFISSIONAIS:')
  console.log('Total:', profissionais?.length)
  profissionais?.forEach(p => {
    console.log(`- ${p.nome} (id: ${p.id})`)
  })

  // Verificar estrutura de agendamentos sem filtro
  const { data: todosAgendamentos } = await supabase
    .from('agendamentos')
    .select('*')

  console.log('\nTODOS AGENDAMENTOS (sem filtro):')
  console.log('Total:', todosAgendamentos?.length)
  if (todosAgendamentos && todosAgendamentos.length > 0) {
    console.log('Exemplo 1:', {
      id: todosAgendamentos[0].id,
      Barbeiro: todosAgendamentos[0].Barbeiro,
      profissional_id: todosAgendamentos[0].profissional_id,
      cliente_id: todosAgendamentos[0].cliente_id,
      valor: todosAgendamentos[0].valor
    })
  }

  // Contar por barbeiro
  if (todosAgendamentos && profissionais) {
    console.log('\nCONTAGEM POR BARBEIRO:')
    profissionais.forEach(prof => {
      const porId = todosAgendamentos.filter(a => a.profissional_id === prof.id).length
      const porNome = todosAgendamentos.filter(a => a.Barbeiro === prof.nome).length
      console.log(`${prof.nome}: ${porId} por ID, ${porNome} por nome`)
    })

    // Mostrar valores dos agendamentos
    console.log('\nVALORES DOS AGENDAMENTOS:')
    let totalValor = 0
    todosAgendamentos.forEach((a, i) => {
      console.log(`${i+1}. Barbeiro: ${a.Barbeiro}, Valor: R$ ${a.valor}, Serviço ID: ${a.servico_id}`)
      totalValor += (a.valor || 0)
    })
    console.log(`TOTAL: R$ ${totalValor}`)
  }

  // Verificar clientes
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .limit(5)

  console.log('\nCLIENTES (primeiros 5):')
  console.log('Total:', clientes?.length)
  if (clientes && clientes.length > 0) {
    console.log('Exemplo:', {
      id: clientes[0].id,
      nome_completo: clientes[0].nome_completo
    })
  }
}

debug()
