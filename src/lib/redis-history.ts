/**
 * Serviço de integração com Redis para sincronizar histórico de clientes
 *
 * Este serviço mantém o histórico de agendamentos e cancelamentos no Redis,
 * permitindo que o agente do WhatsApp tenha contexto completo do cliente.
 *
 * Chave no Redis: número do cliente (DDD + número, sem código do país)
 * Exemplo: 11999887766
 */

interface RedisClientHistory {
  nome: string
  telefone: string
  agendamentos: RedisAgendamento[]
  cancelamentos: RedisCancelamento[]
  ultima_atualizacao: string
}

interface RedisAgendamento {
  data: string // DD/MM/YYYY
  hora: string // HH:MM
  barbeiro: string
  servicos: string[]
  valor: number
  status: string
  origem: 'whatsapp' | 'app' | 'dashboard'
  timestamp: string
}

interface RedisCancelamento {
  data: string
  hora: string
  barbeiro: string
  motivo: string
  cancelado_por: string
  horas_antecedencia: number
  origem: 'whatsapp' | 'app' | 'dashboard'
  timestamp: string
}

/**
 * Extrai o número do telefone limpo (DDD + número)
 * Remove código do país, espaços, parênteses, traços
 *
 * Exemplos:
 * - "+55 11 99988-7766" -> "11999887766"
 * - "(11) 99988-7766" -> "11999887766"
 * - "5511999887766" -> "11999887766"
 */
function extrairNumeroLimpo(telefone: string): string {
  // Remove tudo que não é número
  const apenasNumeros = telefone.replace(/\D/g, '')

  // Se começar com 55 (código do Brasil), remove
  if (apenasNumeros.startsWith('55') && apenasNumeros.length > 11) {
    return apenasNumeros.substring(2)
  }

  return apenasNumeros
}

/**
 * Obtém a URL do Redis das variáveis de ambiente
 */
function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL

  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL não configurada - histórico não será salvo')
    return ''
  }

  return redisUrl
}

/**
 * Obtém o histórico atual do cliente no Redis
 */
async function obterHistorico(numeroLimpo: string): Promise<RedisClientHistory | null> {
  const redisUrl = getRedisUrl()
  if (!redisUrl) return null

  try {
    const response = await fetch(`${redisUrl}/get/${numeroLimpo}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        // Cliente ainda não tem histórico
        return null
      }
      throw new Error(`Erro ao buscar histórico: ${response.status}`)
    }

    const data = await response.json()
    return data.value ? JSON.parse(data.value) : null
  } catch (error) {
    console.error('❌ Erro ao buscar histórico no Redis:', error)
    return null
  }
}

/**
 * Salva o histórico atualizado no Redis
 */
async function salvarHistorico(numeroLimpo: string, historico: RedisClientHistory): Promise<boolean> {
  const redisUrl = getRedisUrl()
  if (!redisUrl) return false

  try {
    const response = await fetch(`${redisUrl}/set/${numeroLimpo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(historico),
        // Expira em 1 ano (opcional - remova se quiser manter para sempre)
        ttl: 365 * 24 * 60 * 60
      })
    })

    if (!response.ok) {
      throw new Error(`Erro ao salvar histórico: ${response.status}`)
    }

    console.log(`✅ [REDIS] Histórico salvo para ${numeroLimpo}`)
    return true
  } catch (error) {
    console.error('❌ Erro ao salvar histórico no Redis:', error)
    return false
  }
}

/**
 * Salva um novo agendamento no histórico do cliente
 *
 * @param dados Dados do agendamento criado
 * @param origem Origem do agendamento (whatsapp, app, dashboard)
 */
export async function salvarAgendamentoNoRedis(dados: {
  cliente_nome: string
  telefone: string
  data: string
  hora: string
  barbeiro: string
  servicos: string[]
  valor: number
  status: string
}, origem: 'whatsapp' | 'app' | 'dashboard' = 'dashboard'): Promise<boolean> {
  try {
    console.log('📝 [REDIS] Salvando agendamento para:', dados.telefone)

    const numeroLimpo = extrairNumeroLimpo(dados.telefone)
    console.log('📞 [REDIS] Número limpo:', numeroLimpo)

    // Buscar histórico existente
    let historico = await obterHistorico(numeroLimpo)

    // Se não existe histórico, criar novo
    if (!historico) {
      console.log('🆕 [REDIS] Criando novo histórico para cliente')
      historico = {
        nome: dados.cliente_nome,
        telefone: dados.telefone,
        agendamentos: [],
        cancelamentos: [],
        ultima_atualizacao: new Date().toISOString()
      }
    }

    // Adicionar novo agendamento
    const novoAgendamento: RedisAgendamento = {
      data: dados.data,
      hora: dados.hora,
      barbeiro: dados.barbeiro,
      servicos: dados.servicos,
      valor: dados.valor,
      status: dados.status,
      origem,
      timestamp: new Date().toISOString()
    }

    historico.agendamentos.push(novoAgendamento)
    historico.ultima_atualizacao = new Date().toISOString()

    // Limitar a 50 últimos agendamentos (evitar histórico muito grande)
    if (historico.agendamentos.length > 50) {
      historico.agendamentos = historico.agendamentos.slice(-50)
    }

    console.log(`📊 [REDIS] Total de agendamentos no histórico: ${historico.agendamentos.length}`)

    // Salvar no Redis
    const sucesso = await salvarHistorico(numeroLimpo, historico)

    if (sucesso) {
      console.log(`✅ [REDIS] Agendamento salvo com sucesso! Cliente: ${dados.cliente_nome}`)
    }

    return sucesso
  } catch (error) {
    console.error('❌ [REDIS] Erro ao salvar agendamento:', error)
    return false
  }
}

/**
 * Salva um cancelamento no histórico do cliente
 *
 * @param dados Dados do cancelamento
 * @param origem Origem do cancelamento (whatsapp, app, dashboard)
 */
export async function salvarCancelamentoNoRedis(dados: {
  cliente_nome: string
  telefone: string
  data: string
  hora: string
  barbeiro: string
  motivo: string
  cancelado_por: string
  horas_antecedencia: number
}, origem: 'whatsapp' | 'app' | 'dashboard' = 'dashboard'): Promise<boolean> {
  try {
    console.log('📝 [REDIS] Salvando cancelamento para:', dados.telefone)

    const numeroLimpo = extrairNumeroLimpo(dados.telefone)
    console.log('📞 [REDIS] Número limpo:', numeroLimpo)

    // Buscar histórico existente
    let historico = await obterHistorico(numeroLimpo)

    // Se não existe histórico, criar novo (situação rara, mas possível)
    if (!historico) {
      console.log('🆕 [REDIS] Criando novo histórico para cliente (cancelamento)')
      historico = {
        nome: dados.cliente_nome,
        telefone: dados.telefone,
        agendamentos: [],
        cancelamentos: [],
        ultima_atualizacao: new Date().toISOString()
      }
    }

    // Adicionar cancelamento
    const novoCancelamento: RedisCancelamento = {
      data: dados.data,
      hora: dados.hora,
      barbeiro: dados.barbeiro,
      motivo: dados.motivo,
      cancelado_por: dados.cancelado_por,
      horas_antecedencia: dados.horas_antecedencia,
      origem,
      timestamp: new Date().toISOString()
    }

    historico.cancelamentos.push(novoCancelamento)
    historico.ultima_atualizacao = new Date().toISOString()

    // Limitar a 30 últimos cancelamentos
    if (historico.cancelamentos.length > 30) {
      historico.cancelamentos = historico.cancelamentos.slice(-30)
    }

    console.log(`📊 [REDIS] Total de cancelamentos no histórico: ${historico.cancelamentos.length}`)

    // Salvar no Redis
    const sucesso = await salvarHistorico(numeroLimpo, historico)

    if (sucesso) {
      console.log(`✅ [REDIS] Cancelamento salvo com sucesso! Cliente: ${dados.cliente_nome}`)
    }

    return sucesso
  } catch (error) {
    console.error('❌ [REDIS] Erro ao salvar cancelamento:', error)
    return false
  }
}

/**
 * Busca o histórico completo de um cliente pelo telefone
 * (Útil para debug e consultas futuras)
 */
export async function buscarHistoricoCliente(telefone: string): Promise<RedisClientHistory | null> {
  try {
    const numeroLimpo = extrairNumeroLimpo(telefone)
    console.log('🔍 [REDIS] Buscando histórico de:', numeroLimpo)

    const historico = await obterHistorico(numeroLimpo)

    if (historico) {
      console.log(`📊 [REDIS] Histórico encontrado:`)
      console.log(`   - Cliente: ${historico.nome}`)
      console.log(`   - Agendamentos: ${historico.agendamentos.length}`)
      console.log(`   - Cancelamentos: ${historico.cancelamentos.length}`)
      console.log(`   - Última atualização: ${historico.ultima_atualizacao}`)
    } else {
      console.log('📭 [REDIS] Nenhum histórico encontrado')
    }

    return historico
  } catch (error) {
    console.error('❌ [REDIS] Erro ao buscar histórico:', error)
    return null
  }
}
