'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Search, Phone, Mail, Calendar, Star, Edit, Trash2, Plus, ChevronLeft, ChevronRight, Send, X } from 'lucide-react'

interface Cliente {
  id: string
  telefone: string
  nome_completo: string
  email: string
  data_nascimento: string
  profissao: string
  estado_civil: string
  tem_filhos: string
  nomes_filhos: string[]
  idades_filhos: string[]
  estilo_cabelo: string
  preferencias_corte: string
  tipo_bebida: string
  alergias: string
  frequencia_retorno: string
  profissional_preferido: string
  observacoes: string
  is_vip: boolean
  data_cadastro: string
  como_soube: string
  gosta_conversar: string
  menory_long: string
  tratamento: string
  ultimo_servico: string
  plano_id: string | null
}

interface Profissional {
  id: string
  nome: string
}

interface Plano {
  id: string
  nome: string
  valor_total: number
  valor_original: number
  ativo: boolean
}

function ClientesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarbeiro, setSelectedBarbeiro] = useState('')
  const [filtroVIP, setFiltroVIP] = useState(searchParams.get('filter') === 'vip')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [clientesVisitas, setClientesVisitas] = useState<Record<string, number>>({})
  const [clienteParaMensagem, setClienteParaMensagem] = useState<Cliente | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [editForm, setEditForm] = useState({
    nome_completo: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    profissao: '',
    estado_civil: '',
    tem_filhos: '',
    nomes_filhos: [] as string[],
    idades_filhos: [] as string[],
    estilo_cabelo: '',
    preferencias_corte: '',
    tipo_bebida: '',
    alergias: '',
    frequencia_retorno: '',
    profissional_preferido: '',
    observacoes: '',
    is_vip: false,
    como_soube: '',
    gosta_conversar: '',
    menory_long: '',
    tratamento: '',
    ultimo_servico: '',
    data_ultimo_servico: '',
    plano_id: '' as string | null
  })
  const itemsPerPage = 20

  useEffect(() => {
    loadProfissionais()
    loadPlanos()
    loadClientesVisitas()
    loadClientes('', '', 1)
    loadWebhookUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Atualizar filtro VIP quando o parâmetro da URL mudar
    const isVIPFilter = searchParams.get('filter') === 'vip'
    setFiltroVIP(isVIPFilter)
    setCurrentPage(1)
    loadClientes(searchTerm, selectedBarbeiro, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    // Abrir perfil do cliente automaticamente quando vier da URL
    const clienteId = searchParams.get('id')
    if (clienteId) {
      loadClienteById(clienteId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    loadClientes(searchTerm, selectedBarbeiro, currentPage)
  }, [currentPage])

  const loadProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setProfissionais(data || [])
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error)
    }
  }

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, valor_total, valor_original, ativo')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      console.log('Planos carregados:', data)
      setPlanos(data || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    }
  }

  const loadClientesVisitas = async () => {
    try {
      // Carregar todos os agendamentos onde cliente compareceu
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('cliente_id, compareceu')

      if (error) throw error

      console.log('=== DEBUG VISITAS ===')
      console.log('Total de agendamentos:', agendamentos?.length)
      console.log('Primeiros 5 agendamentos:', agendamentos?.slice(0, 5))

      // Contar visitas por cliente (apenas onde compareceu ou não foi marcado)
      const visitasPorCliente: Record<string, number> = {}
      agendamentos?.forEach(ag => {
        if (ag.cliente_id && ag.compareceu !== false) {
          visitasPorCliente[ag.cliente_id] = (visitasPorCliente[ag.cliente_id] || 0) + 1
        }
      })

      setClientesVisitas(visitasPorCliente)
      console.log('Visitas por cliente carregadas:', visitasPorCliente)
      console.log('Clientes com 5+ visitas:', Object.entries(visitasPorCliente).filter(([_, count]) => count >= 5))
    } catch (error) {
      console.error('Erro ao carregar visitas dos clientes:', error)
    }
  }

  const loadWebhookUrl = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('webhook_url')
        .single()

      if (data && data.webhook_url) {
        setWebhookUrl(data.webhook_url)
      }
    } catch (error) {
      console.log('Erro ao carregar webhook URL:', error)
    }
  }

  const handleEnviarMensagem = async () => {
    if (!clienteParaMensagem || !mensagem) {
      alert('Por favor, digite a mensagem')
      return
    }

    if (!webhookUrl) {
      alert('Webhook não configurado. Configure em Configurações primeiro.')
      return
    }

    try {
      setEnviandoMensagem(true)

      const payload = {
        telefone: clienteParaMensagem.telefone,
        mensagem: mensagem,
        nome_cliente: clienteParaMensagem.nome_completo
      }

      console.log('📤 Enviando mensagem para webhook:', webhookUrl)
      console.log('📦 Payload:', payload)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log('📥 Response status:', response.status)
      const responseText = await response.text()
      console.log('📥 Response body:', responseText)

      if (response.ok) {
        alert('Mensagem enviada com sucesso!')
        setClienteParaMensagem(null)
        setMensagem('')
      } else {
        throw new Error(`Erro ${response.status}: ${responseText}`)
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nWebhook: ${webhookUrl}`)
    } finally {
      setEnviandoMensagem(false)
    }
  }

  const loadClientes = async (search: string = '', barbeiro: string = '', page: number = 1) => {
    try {
      setLoading(true)

      // Para filtro VIP, precisamos carregar TODOS os clientes primeiro para filtrar por visitas
      if (filtroVIP) {
        let query = supabase
          .from('clientes')
          .select('*')
          .order('data_cadastro', { ascending: false })

        if (search) {
          query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        if (barbeiro) {
          query = query.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { data: todosClientes, error } = await query

        if (error) throw error

        console.log('=== DEBUG FILTRO VIP ===')
        console.log('Total de clientes no banco:', todosClientes?.length)
        console.log('ClientesVisitas state:', clientesVisitas)

        // Filtrar clientes VIP (is_vip = true OU 5+ visitas)
        const clientesVIP = (todosClientes || []).filter(cliente => {
          const visitas = clientesVisitas[cliente.id] || 0
          const isVIPManual = cliente.is_vip === true
          const isVIPPorVisitas = visitas >= 5
          const isVIP = isVIPManual || isVIPPorVisitas

          console.log(`Cliente ${cliente.nome_completo}: ${visitas} visitas, is_vip=${isVIPManual}, VIP=${isVIP}`)
          return isVIP
        })

        console.log(`Clientes VIP encontrados (manual OU 5+ visitas): ${clientesVIP.length}`)

        // Aplicar paginação manualmente
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage
        const clientesPaginados = clientesVIP.slice(from, to)

        setTotalClientes(clientesVIP.length)
        setClientes(clientesPaginados)
        console.log(`Clientes VIP carregados: ${clientesPaginados.length} de ${clientesVIP.length} (página ${page})`)
      } else {
        // Modo normal (sem filtro VIP)
        let countQuery = supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })

        if (search) {
          countQuery = countQuery.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        if (barbeiro) {
          countQuery = countQuery.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { count } = await countQuery
        setTotalClientes(count || 0)

        // Buscar clientes com paginação
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        let query = supabase
          .from('clientes')
          .select('*')
          .order('data_cadastro', { ascending: false })
          .range(from, to)

        if (search) {
          query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        if (barbeiro) {
          query = query.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { data, error } = await query

        if (error) throw error
        console.log(`Clientes carregados: ${data?.length} de ${count} (página ${page})`)
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadClientes(searchTerm, selectedBarbeiro, 1)
  }

  const totalPages = Math.ceil(totalClientes / itemsPerPage)

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Cliente excluído com sucesso!')
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente')
    }
  }

  const loadClienteById = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single()

      if (error) throw error
      if (data) {
        // Abre o modal de edição com os dados do cliente
        handleEdit(data as Cliente)
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
      alert('Cliente não encontrado')
    }
  }

  const handleEdit = async (cliente: Cliente) => {
    console.log('Editando cliente:', cliente)
    console.log('Plano ID do cliente:', cliente.plano_id)
    setEditingCliente(cliente)

    // Buscar último agendamento concluído do cliente
    let ultimoServico = cliente.ultimo_servico || ''
    let dataUltimoServico = ''

    try {
      const { data: ultimoAgendamento } = await supabase
        .from('agendamentos')
        .select(`
          data_agendamento,
          agendamento_servicos (
            servicos (nome)
          )
        `)
        .eq('cliente_id', cliente.id)
        .eq('status', 'concluido')
        .order('data_agendamento', { ascending: false })
        .order('hora_inicio', { ascending: false })
        .limit(1)
        .single()

      if (ultimoAgendamento) {
        dataUltimoServico = ultimoAgendamento.data_agendamento
        const servicos = ultimoAgendamento.agendamento_servicos
          ?.map((as: any) => as.servicos.nome)
          .join(', ') || ''
        if (servicos) {
          ultimoServico = servicos
        }
      }
    } catch (error) {
      console.log('Nenhum agendamento concluído encontrado')
    }

    // Buscar memória longa do Redis
    let memoriaLongaRedis = cliente.menory_long || ''
    try {
      const redisResponse = await fetch(`/api/redis/memoria-longa?telefone=${cliente.telefone}`)
      if (redisResponse.ok) {
        const redisData = await redisResponse.json()
        if (redisData.from_redis && redisData.memoria_longa) {
          memoriaLongaRedis = redisData.memoria_longa
          console.log('✅ Memória longa carregada do Redis:', memoriaLongaRedis.substring(0, 100) + '...')
        }
      }
    } catch (error) {
      console.log('⚠️ Não foi possível carregar memória longa do Redis, usando do banco')
    }

    setEditForm({
      nome_completo: cliente.nome_completo || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data_nascimento: cliente.data_nascimento || '',
      profissao: cliente.profissao || '',
      estado_civil: cliente.estado_civil || '',
      tem_filhos: cliente.tem_filhos || '',
      nomes_filhos: cliente.nomes_filhos || [],
      idades_filhos: cliente.idades_filhos || [],
      estilo_cabelo: cliente.estilo_cabelo || '',
      preferencias_corte: cliente.preferencias_corte || '',
      tipo_bebida: cliente.tipo_bebida || '',
      alergias: cliente.alergias || '',
      frequencia_retorno: cliente.frequencia_retorno || '',
      profissional_preferido: cliente.profissional_preferido || '',
      observacoes: cliente.observacoes || '',
      is_vip: cliente.is_vip || false,
      como_soube: cliente.como_soube || '',
      gosta_conversar: cliente.gosta_conversar || '',
      menory_long: memoriaLongaRedis,
      tratamento: cliente.tratamento || '',
      ultimo_servico: ultimoServico,
      data_ultimo_servico: dataUltimoServico,
      plano_id: cliente.plano_id || null
    })
  }

  const handleSaveEdit = async () => {
    if (!editingCliente) return

    try {
      console.log('Salvando editForm:', editForm)
      console.log('Plano ID sendo salvo:', editForm.plano_id)

      // Remover campos que não existem na tabela clientes
      const { data_ultimo_servico, ultimo_servico, menory_long, ...dadosParaSalvar } = editForm

      const { error } = await supabase
        .from('clientes')
        .update(dadosParaSalvar)
        .eq('id', editingCliente.id)

      if (error) throw error

      // Salvar memória longa no Redis (assíncrono, não bloqueia)
      if (editForm.menory_long && editForm.telefone) {
        fetch('/api/redis/memoria-longa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefone: editForm.telefone,
            memoria_longa: editForm.menory_long
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log('✅ Memória longa salva no Redis com sucesso!')
            } else {
              console.warn('⚠️ Erro ao salvar memória longa no Redis:', data.error)
            }
          })
          .catch(err => {
            console.error('❌ Erro ao conectar com Redis:', err)
          })
      }

      alert('Cliente atualizado com sucesso!')
      setEditingCliente(null)
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      alert('Erro ao atualizar cliente')
    }
  }

  const handleAddCliente = async () => {
    try {
      // Remover campos que não existem na tabela clientes
      const { data_ultimo_servico, ultimo_servico, menory_long, ...dadosParaSalvar } = editForm

      const { error } = await supabase
        .from('clientes')
        .insert([dadosParaSalvar])

      if (error) throw error

      alert('Cliente adicionado com sucesso!')
      setShowAddForm(false)
      setEditForm({
        nome_completo: '',
        telefone: '',
        email: '',
        data_nascimento: '',
        profissao: '',
        estado_civil: '',
        tem_filhos: '',
        nomes_filhos: [] as string[],
        idades_filhos: [] as string[],
        estilo_cabelo: '',
        preferencias_corte: '',
        tipo_bebida: '',
        alergias: '',
        frequencia_retorno: '',
        profissional_preferido: '',
        observacoes: '',
        is_vip: false,
        como_soube: '',
        gosta_conversar: '',
        menory_long: '',
        tratamento: '',
        ultimo_servico: '',
        data_ultimo_servico: '',
        plano_id: null
      })
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error)
      alert('Erro ao adicionar cliente')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando clientes...</div>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Clientes</h1>
          <p className="text-sm md:text-base text-purple-300">Total: {totalClientes} clientes cadastrados</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditForm({
              nome_completo: '',
              telefone: '',
              email: '',
              profissional_preferido: '',
              observacoes: '',
              is_vip: false
            })
          }}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-3 md:p-4">
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm md:text-base"
                />
              </div>

              <select
                value={selectedBarbeiro}
                onChange={(e) => {
                  setSelectedBarbeiro(e.target.value)
                  setCurrentPage(1)
                  loadClientes(searchTerm, e.target.value, 1)
                }}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm md:text-base"
              >
                <option value="">Todos os Barbeiros</option>
                {profissionais.map(prof => (
                  <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm md:text-base"
              >
                Buscar
              </button>
            </div>

            {/* Filtros VIP / Todos */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    setFiltroVIP(false)
                    setCurrentPage(1)
                    router.push('/dashboard/clientes')
                  }}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
                    !filtroVIP
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Todos</span>
                </button>

                <button
                  onClick={() => {
                    setFiltroVIP(true)
                    setCurrentPage(1)
                    router.push('/dashboard/clientes?filter=vip')
                  }}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
                    filtroVIP
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>VIPs</span>
                </button>
              </div>

              <div className="text-xs md:text-sm text-slate-400">
                {filtroVIP && <span className="text-yellow-400">Mostrando clientes VIP (marcados manualmente ou com 5+ visitas)</span>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Mostrando {clientes.length} de {totalClientes} clientes</span>
              </div>
              <span>Página {currentPage} de {totalPages}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <div className="grid gap-4">
        {clientes.length === 0 ? (
          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
              <p className="text-purple-300">Tente ajustar os filtros de busca.</p>
            </CardContent>
          </Card>
        ) : (
          clientes.map((cliente) => (
            <Card key={cliente.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-colors">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1 w-full">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base md:text-lg">
                        {cliente.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <span className="font-medium text-white text-base md:text-lg break-words">{cliente.nome_completo || 'Nome não informado'}</span>
                        {cliente.is_vip && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-purple-300">
                        {cliente.telefone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{cliente.telefone}</span>
                          </span>
                        )}
                        {cliente.email && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{cliente.email}</span>
                          </span>
                        )}
                        {cliente.data_cadastro && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Desde {new Date(cliente.data_cadastro).toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                      </div>

                      {cliente.profissional_preferido && (
                        <div className="mt-1 text-sm text-purple-300">
                          ✂️ Preferência: {cliente.profissional_preferido}
                        </div>
                      )}

                      {/* Mostrar número de visitas e tipo de VIP */}
                      <div className="mt-1 text-xs md:text-sm flex flex-wrap items-center gap-2 md:gap-3">
                        {clientesVisitas[cliente.id] !== undefined && (
                          <span className={`${
                            clientesVisitas[cliente.id] >= 5
                              ? 'text-yellow-400 font-semibold'
                              : 'text-slate-400'
                          }`}>
                            📊 {clientesVisitas[cliente.id]} {clientesVisitas[cliente.id] === 1 ? 'visita' : 'visitas'}
                          </span>
                        )}
                        {cliente.is_vip && (
                          <span className="text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded text-xs">
                            ⭐ VIP Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        setClienteParaMensagem(cliente)
                        setMensagem('')
                      }}
                      className="flex-1 sm:flex-none p-2 text-green-300 hover:text-white hover:bg-green-700/50 rounded-lg transition-colors"
                      title="Enviar mensagem"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="flex-1 sm:flex-none p-2 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="flex-1 sm:flex-none p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center space-x-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição/Adicionar */}
      {(editingCliente || showAddForm) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-4 md:p-6 max-w-2xl w-full border border-slate-700 my-4 md:my-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Dados Pessoais */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-purple-400">Dados Pessoais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm text-slate-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={editForm.nome_completo}
                      onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm md:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Telefone *</label>
                    <input
                      type="text"
                      value={editForm.telefone}
                      onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Data de Nascimento</label>
                    <input
                      type="text"
                      value={editForm.data_nascimento}
                      onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Profissão</label>
                    <input
                      type="text"
                      value={editForm.profissao}
                      onChange={(e) => setEditForm({ ...editForm, profissao: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Estado Civil</label>
                    <select
                      value={editForm.estado_civil}
                      onChange={(e) => setEditForm({ ...editForm, estado_civil: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Tem Filhos?</label>
                    <select
                      value={editForm.tem_filhos}
                      onChange={(e) => setEditForm({ ...editForm, tem_filhos: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Como Conheceu a Barbearia?</label>
                    <select
                      value={editForm.como_soube}
                      onChange={(e) => setEditForm({ ...editForm, como_soube: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Google">Google</option>
                      <option value="Indicação">Indicação de Amigo</option>
                      <option value="Passando na Rua">Passando na Rua</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Gosta de Conversar?</label>
                    <select
                      value={editForm.gosta_conversar}
                      onChange={(e) => setEditForm({ ...editForm, gosta_conversar: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim, gosta de conversar</option>
                      <option value="Não">Prefere silêncio</option>
                      <option value="Às vezes">Depende do dia</option>
                    </select>
                  </div>
                </div>

                {editForm.tem_filhos === 'Sim' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Nomes dos Filhos (separados por vírgula)</label>
                      <input
                        type="text"
                        value={editForm.nomes_filhos.join(', ')}
                        onChange={(e) => setEditForm({ ...editForm, nomes_filhos: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Idades dos Filhos (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={editForm.idades_filhos.join(', ')}
                        onChange={(e) => setEditForm({ ...editForm, idades_filhos: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preferências de Serviço */}
              <div className="space-y-3 md:space-y-4 border-t border-slate-700 pt-3 md:pt-4">
                <h3 className="text-base md:text-lg font-semibold text-purple-400">Preferências de Serviço</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Estilo de Cabelo</label>
                    <input
                      type="text"
                      value={editForm.estilo_cabelo}
                      onChange={(e) => setEditForm({ ...editForm, estilo_cabelo: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Preferências de Corte</label>
                    <input
                      type="text"
                      value={editForm.preferencias_corte}
                      onChange={(e) => setEditForm({ ...editForm, preferencias_corte: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Barbeiro Preferido</label>
                    <select
                      value={editForm.profissional_preferido}
                      onChange={(e) => setEditForm({ ...editForm, profissional_preferido: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Nenhum</option>
                      {profissionais.map(prof => (
                        <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Plano de Pacote</label>
                    <select
                      value={editForm.plano_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, plano_id: e.target.value || null })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Nenhum plano</option>
                      {planos.map(plano => (
                        <option key={plano.id} value={plano.id}>
                          {plano.nome} - R$ {plano.valor_total.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Selecione um plano de pacote ativo para o cliente</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Frequência de Retorno</label>
                    <select
                      value={editForm.frequencia_retorno}
                      onChange={(e) => setEditForm({ ...editForm, frequencia_retorno: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Bimestral">Bimestral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Tipo de Bebida Preferida</label>
                    <input
                      type="text"
                      value={editForm.tipo_bebida}
                      onChange={(e) => setEditForm({ ...editForm, tipo_bebida: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Café, Whisky, Água..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Alergias</label>
                    <input
                      type="text"
                      value={editForm.alergias}
                      onChange={(e) => setEditForm({ ...editForm, alergias: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Pomada X, Produto Y..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Tratamento Preferido</label>
                    <input
                      type="text"
                      value={editForm.tratamento}
                      onChange={(e) => setEditForm({ ...editForm, tratamento: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Hidratação, Relaxamento..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Último Serviço</label>
                    <input
                      type="text"
                      value={editForm.ultimo_servico}
                      onChange={(e) => setEditForm({ ...editForm, ultimo_servico: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Corte + Barba"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Data do Último Serviço</label>
                    <input
                      type="text"
                      value={editForm.data_ultimo_servico}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      placeholder="Carregado automaticamente..."
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Histórico e Memória */}
              <div className="space-y-3 md:space-y-4 border-t border-slate-700 pt-3 md:pt-4">
                <h3 className="text-base md:text-lg font-semibold text-purple-400">Histórico e Memória</h3>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Memória de Longo Prazo</label>
                  <textarea
                    value={editForm.menory_long}
                    onChange={(e) => setEditForm({ ...editForm, menory_long: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-32"
                    placeholder="Histórico de conversas, preferências detalhadas, informações importantes sobre o cliente..."
                  />
                  <p className="text-xs text-slate-500 mt-1">Este campo é usado pelo agente IA para lembrar de detalhes importantes sobre o cliente</p>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-3 md:space-y-4 border-t border-slate-700 pt-3 md:pt-4">
                <h3 className="text-base md:text-lg font-semibold text-purple-400">Observações Gerais</h3>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Observações</label>
                  <textarea
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-24"
                    placeholder="Anotações sobre o cliente..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_vip"
                    checked={editForm.is_vip}
                    onChange={(e) => setEditForm({ ...editForm, is_vip: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_vip" className="text-sm text-slate-400 flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>Cliente VIP</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-6 border-t border-slate-700 pt-3 md:pt-4">
              <button
                onClick={editingCliente ? handleSaveEdit : handleAddCliente}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                {editingCliente ? 'Salvar Alterações' : 'Adicionar Cliente'}
              </button>
              <button
                onClick={() => {
                  setEditingCliente(null)
                  setShowAddForm(false)
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Mensagem */}
      {clienteParaMensagem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Send className="w-6 h-6 text-green-400" />
                <span>Enviar Mensagem</span>
              </h2>
              <button
                onClick={() => {
                  setClienteParaMensagem(null)
                  setMensagem('')
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Info do Cliente */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {clienteParaMensagem.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{clienteParaMensagem.nome_completo}</div>
                    <div className="text-sm text-slate-400 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{clienteParaMensagem.telefone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo de Mensagem */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Mensagem</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite a mensagem que será enviada via WhatsApp..."
                  rows={5}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white resize-none placeholder-slate-500"
                  autoFocus
                />
              </div>

              {/* Status do Webhook */}
              <div className="space-y-2">
                {webhookUrl ? (
                  <>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-green-400">✓ Webhook configurado</span>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-3 py-2 font-mono break-all">
                      {webhookUrl}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-yellow-400">⚠ Configure o webhook em Configurações primeiro</span>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleEnviarMensagem}
                  disabled={enviandoMensagem || !webhookUrl || !mensagem}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{enviandoMensagem ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>
                <button
                  onClick={() => {
                    setClienteParaMensagem(null)
                    setMensagem('')
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">{clientes.length}</div>
                <div className="text-sm text-purple-300">Total de Clientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {clientes.filter(c => c.is_vip).length}
                </div>
                <div className="text-sm text-purple-300">Clientes VIP</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {clientes.filter(c => {
                    const cadastro = new Date(c.data_cadastro)
                    const umMesAtras = new Date()
                    umMesAtras.setMonth(umMesAtras.getMonth() - 1)
                    return cadastro >= umMesAtras
                  }).length}
                </div>
                <div className="text-sm text-purple-300">Novos (30 dias)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-white">Carregando clientes...</div>
      </div>
    }>
      <ClientesPageContent />
    </Suspense>
  )
}
