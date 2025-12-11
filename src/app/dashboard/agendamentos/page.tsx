'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Plus, Edit, Trash2, Clock, User, DollarSign, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import { formatCurrency, formatTime, formatDateTimeBR, convertISOtoBR } from '@/lib/utils'

interface Agendamento {
  id: string
  data_agendamento: string
  hora_inicio: string
  nome_cliente: string
  telefone: string
  valor: number
  status: string
  observacoes: string
  compareceu: boolean | null
  checkin_at: string | null
  servicos: { nome: string; preco: number; duracao_minutos: number } | null
  profissionais: { nome: string }
  agendamento_servicos: Array<{
    servicos: { nome: string; preco: number; duracao_minutos: number }
  }>
}

interface Profissional {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
}

interface Cliente {
  id: string
  nome_completo: string
  telefone: string
}

type FiltroTemporal = 'hoje' | 'amanha' | 'semana' | 'proximos7' | 'passados' | 'todos' | 'personalizado'
type FiltroStatus = 'todos' | 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'

type VisualizacaoMode = 'lista' | 'calendario'

export default function AgendamentosPage() {
  // Função auxiliar para obter data no timezone de Brasília
  const getDataBrasilia = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  }

  const getDataBrasiliaISO = () => {
    return getDataBrasilia().toISOString().split('T')[0]
  }

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getDataBrasiliaISO())
  const [filtroTemporal, setFiltroTemporal] = useState<FiltroTemporal>('hoje')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [dataPersonalizada, setDataPersonalizada] = useState('')
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<Agendamento | null>(null)
  const [visualizacao, setVisualizacao] = useState<VisualizacaoMode>('lista')
  const [currentMonth, setCurrentMonth] = useState(getDataBrasilia())
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [barbeiroRodizio, setBarbeiroRodizio] = useState<{ nome: string; atendimentos: number } | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [editForm, setEditForm] = useState({
    nome_cliente: '',
    telefone: '',
    observacoes: '',
    status: 'agendado',
    data_agendamento: getDataBrasiliaISO(),
    hora_inicio: '',
    profissional_id: '',
    servico_ids: [] as string[],
    cliente_id: ''
  })

  useEffect(() => {
    loadAgendamentos()
    loadProfissionais()
    loadServicos()
  }, [filtroTemporal, filtroStatus, dataPersonalizada])

  // Atualização automática a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Atualizando agendamentos automaticamente...')
      loadAgendamentos()
    }, 10000) // 10 segundos

    return () => clearInterval(interval)
  }, [filtroTemporal, filtroStatus, dataPersonalizada])

  const loadProfissionais = async () => {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('ativo', true)
    setProfissionais(data || [])
  }

  const loadServicos = async () => {
    const { data } = await supabase
      .from('servicos')
      .select('id, nome, preco, duracao_minutos')
      .eq('ativo', true)
    setServicos(data || [])
  }

  const searchClientes = async (search: string) => {
    if (search.length < 2) {
      setClientes([])
      return
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone')
      .or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%`)
      .limit(10)
    setClientes(data || [])
  }

  const buscarClientePorTelefone = async (telefone: string) => {
    if (telefone.length < 8) return

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone, profissional_preferido')
      .eq('telefone', telefone)
      .maybeSingle()

    if (data) {
      setEditForm({
        ...editForm,
        cliente_id: data.id,
        nome_cliente: data.nome_completo,
        telefone: data.telefone,
        profissional_id: profissionais.find(p => p.nome === data.profissional_preferido)?.id || editForm.profissional_id
      })
      alert(`Cliente encontrado: ${data.nome_completo}`)
    } else if (!error) {
      console.log('Cliente não encontrado com este telefone')
    }
  }

  const checkHorariosDisponiveis = async () => {
    if (!editForm.data_agendamento || editForm.servico_ids.length === 0) return

    setCheckingAvailability(true)
    try {
      const barbeiroNome = editForm.profissional_id
        ? profissionais.find(p => p.id === editForm.profissional_id)?.nome
        : null

      const params = new URLSearchParams({
        data: editForm.data_agendamento,
        servico_ids: editForm.servico_ids.join(','),
        ...(barbeiroNome && { barbeiro: barbeiroNome })
      })

      const response = await fetch(`/api/agendamentos/horarios-disponiveis?${params}`)
      const result = await response.json()

      if (result.success) {
        setHorariosDisponiveis(result.data.horarios || [])
      } else {
        setHorariosDisponiveis([])
      }
    } catch (error) {
      console.error('Erro ao verificar horários:', error)
      setHorariosDisponiveis([])
    } finally {
      setCheckingAvailability(false)
    }
  }

  const checkBarbeiroRodizio = async () => {
    if (!editForm.data_agendamento || !editForm.hora_inicio || editForm.servico_ids.length === 0) return
    if (editForm.profissional_id) {
      setBarbeiroRodizio(null)
      return
    }

    try {
      const duracaoTotal = servicos
        .filter(s => editForm.servico_ids.includes(s.id))
        .reduce((sum, s) => sum + s.duracao_minutos, 0)

      const params = new URLSearchParams({
        data: editForm.data_agendamento,
        hora: editForm.hora_inicio,
        duracao: duracaoTotal.toString()
      })

      const response = await fetch(`/api/agendamentos/buscar-barbeiro-rodizio?${params}`)
      const result = await response.json()

      if (result.success && result.data.disponivel) {
        setBarbeiroRodizio({
          nome: result.data.barbeiro_nome,
          atendimentos: result.data.total_atendimentos_hoje
        })
      } else {
        setBarbeiroRodizio(null)
        if (!result.success) {
          alert(result.message || 'Nenhum barbeiro disponível neste horário')
        }
      }
    } catch (error) {
      console.error('Erro ao verificar barbeiro do rodízio:', error)
      setBarbeiroRodizio(null)
    }
  }

  // Verificar horários quando data ou serviços mudarem
  useEffect(() => {
    if (showForm) {
      checkHorariosDisponiveis()
    }
  }, [editForm.data_agendamento, editForm.servico_ids, editForm.profissional_id, showForm])

  // Verificar barbeiro do rodízio quando hora for selecionada
  useEffect(() => {
    if (showForm && editForm.hora_inicio) {
      checkBarbeiroRodizio()
    }
  }, [editForm.hora_inicio, showForm])

  // Funções auxiliares para o calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days = []

    // Dias do mês anterior
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -i)
      days.unshift({
        date: prevMonthDay,
        isCurrentMonth: false,
        dateStr: prevMonthDay.toISOString().split('T')[0]
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day)
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        dateStr: currentDay.toISOString().split('T')[0]
      })
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(year, month + 1, i)
      days.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        dateStr: nextMonthDay.toISOString().split('T')[0]
      })
    }

    return days
  }

  const getAgendamentosPorData = (dateStr: string) => {
    // Converter dateStr YYYY-MM-DD para DD/MM/YYYY
    const [year, month, day] = dateStr.split('-')
    const dataBR = `${day}/${month}/${year}`

    // Filtrar agendamentos que correspondem à data
    const agendsDoDia = agendamentos.filter(ag => {
      const dataAg = ag.data_agendamento

      // Se já está em formato DD/MM/YYYY
      if (dataAg.includes('/')) {
        return dataAg === dataBR
      }

      // Se está em formato YYYY-MM-DD
      if (dataAg.includes('-')) {
        return dataAg === dateStr
      }

      return false
    })

    // Log para debug
    if (agendsDoDia.length > 0) {
      console.log(`📅 Dia ${dataBR}: ${agendsDoDia.length} agendamento(s)`, agendsDoDia)
    }

    return agendsDoDia
  }

  const loadAgendamentos = async () => {
    try {
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          servicos (nome, preco, duracao_minutos),
          profissionais (nome)
        `)
        .order('hora_inicio')

      // Calcular datas baseado no filtro temporal
      // IMPORTANTE: Usar timezone de Brasília (America/Sao_Paulo)
      const hoje = getDataBrasilia()
      const hojeStr = getDataBrasiliaISO()

      console.log('🕐 Data atual (Brasília):', hoje.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
      console.log('🕐 Data string (YYYY-MM-DD):', hojeStr)

      let dataFiltro = ''

      switch (filtroTemporal) {
        case 'hoje':
          const [yearH, monthH, dayH] = hojeStr.split('-')
          dataFiltro = `${dayH}/${monthH}/${yearH}`
          console.log('📅 Filtrando por HOJE:', dataFiltro)
          query = query.eq('data_agendamento', dataFiltro)
          break

        case 'amanha':
          const amanha = new Date(hoje)
          amanha.setDate(hoje.getDate() + 1)
          const amanhaStr = amanha.toISOString().split('T')[0]
          const [yearA, monthA, dayA] = amanhaStr.split('-')
          dataFiltro = `${dayA}/${monthA}/${yearA}`
          console.log('📅 Filtrando por AMANHÃ:', dataFiltro)
          query = query.eq('data_agendamento', dataFiltro)
          break

        case 'semana':
          // Domingo até sábado da semana atual
          const inicioSemana = new Date(hoje)
          inicioSemana.setDate(hoje.getDate() - hoje.getDay())
          const fimSemana = new Date(inicioSemana)
          fimSemana.setDate(inicioSemana.getDate() + 6)
          // Para filtro de semana, vamos buscar todos e filtrar em memória
          break

        case 'proximos7':
          // Próximos 7 dias a partir de hoje
          break

        case 'passados':
          // Últimos 30 dias
          break

        case 'personalizado':
          if (dataPersonalizada) {
            const [yearP, monthP, dayP] = dataPersonalizada.split('-')
            dataFiltro = `${dayP}/${monthP}/${yearP}`
            console.log('📅 Filtrando por DATA PERSONALIZADA:', dataFiltro)
            query = query.eq('data_agendamento', dataFiltro)
          }
          break

        case 'todos':
          // Sem filtro de data
          break
      }

      // Aplicar filtro de status
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query

      if (error) throw error

      // Tentar carregar serviços da tabela de relacionamento (se existir)
      if (data && data.length > 0) {
        for (const agendamento of data) {
          try {
            const { data: servicosData } = await supabase
              .from('agendamento_servicos')
              .select('servicos (nome, preco, duracao_minutos)')
              .eq('agendamento_id', agendamento.id)

            agendamento.agendamento_servicos = servicosData || []
          } catch (err) {
            // Tabela não existe ainda, ignorar
            agendamento.agendamento_servicos = []
          }
        }
      }

      // Filtrar em memória para casos de range de datas
      let agendamentosFiltrados = data || []

      if (filtroTemporal === 'semana' || filtroTemporal === 'proximos7' || filtroTemporal === 'passados') {
        agendamentosFiltrados = agendamentosFiltrados.filter(agendamento => {
          // Converter data DD/MM/YYYY para Date
          const [day, month, year] = agendamento.data_agendamento.split('/')
          const dataAgend = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

          if (filtroTemporal === 'semana') {
            const inicioSemana = new Date(hoje)
            inicioSemana.setDate(hoje.getDate() - hoje.getDay())
            inicioSemana.setHours(0, 0, 0, 0)
            const fimSemana = new Date(inicioSemana)
            fimSemana.setDate(inicioSemana.getDate() + 6)
            fimSemana.setHours(23, 59, 59, 999)
            return dataAgend >= inicioSemana && dataAgend <= fimSemana
          } else if (filtroTemporal === 'proximos7') {
            const hojeInicio = new Date(hoje)
            hojeInicio.setHours(0, 0, 0, 0)
            const proximos7 = new Date(hoje)
            proximos7.setDate(hoje.getDate() + 7)
            proximos7.setHours(23, 59, 59, 999)
            return dataAgend >= hojeInicio && dataAgend <= proximos7
          } else if (filtroTemporal === 'passados') {
            const passados30 = new Date(hoje)
            passados30.setDate(hoje.getDate() - 30)
            passados30.setHours(0, 0, 0, 0)
            const hojeInicio = new Date(hoje)
            hojeInicio.setHours(0, 0, 0, 0)
            return dataAgend >= passados30 && dataAgend < hojeInicio
          }
          return true
        })
      }

      console.log('Agendamentos carregados:', agendamentosFiltrados)

      // Debug: mostrar formato da primeira data
      if (agendamentosFiltrados.length > 0) {
        console.log('🔍 Formato da data do primeiro agendamento:', agendamentosFiltrados[0].data_agendamento)
        console.log('🔍 Tipo:', typeof agendamentosFiltrados[0].data_agendamento)
      }

      setAgendamentos(agendamentosFiltrados)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const marcarComparecimento = async (id: string, compareceu: boolean) => {
    try {
      // Usar a API de confirmação de comparecimento
      const response = await fetch('/api/agendamentos/confirmar-comparecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamento_id: id,
          compareceu: compareceu
        })
      })

      const result = await response.json()

      if (!result.success) {
        alert(result.message || 'Erro ao marcar comparecimento')
        return
      }

      alert(compareceu ? 'Cliente marcado como presente!' : 'Cliente marcado como faltou')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao marcar comparecimento:', error)
      alert('Erro ao marcar comparecimento')
    }
  }

  const handleDelete = async (id: string) => {
    const motivo = prompt('Motivo do cancelamento:')
    if (!motivo) return

    try {
      // Usar a API de cancelamento com validação de 2h
      const response = await fetch('/api/agendamentos/cancelar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamento_id: id,
          motivo: motivo,
          cancelado_por: 'admin',
          forcar: true // Admin pode cancelar a qualquer momento
        })
      })

      const result = await response.json()

      if (!result.success) {
        // Se falhou e tem aviso sobre prazo, perguntar se quer forçar
        if (result.message?.includes('2h')) {
          const confirmarForca = confirm(
            `${result.message}\n\n` +
            `Como administrador, você pode cancelar mesmo assim.\n` +
            `Deseja continuar?`
          )

          if (!confirmarForca) return

          // Tentar novamente forçando
          const responseForca = await fetch('/api/agendamentos/cancelar', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agendamento_id: id,
              motivo: motivo,
              cancelado_por: 'admin',
              forcar: true
            })
          })

          const resultForca = await responseForca.json()
          if (!resultForca.success) {
            alert(resultForca.message || 'Erro ao cancelar agendamento')
            return
          }
        } else {
          alert(result.message || 'Erro ao cancelar agendamento')
          return
        }
      }

      alert(`Agendamento cancelado!\n${result.data?.webhook_enviado ? '✅ Cliente notificado' : ''}`)

      // Remover da lista imediatamente (sem precisar recarregar)
      setAgendamentos(prev => prev.filter(ag => ag.id !== id))

      // Também recarregar para garantir sincronização
      setTimeout(() => loadAgendamentos(), 500)
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      alert('Erro ao cancelar agendamento')
    }
  }

  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento)
    setEditForm({
      nome_cliente: agendamento.nome_cliente,
      telefone: agendamento.telefone || '',
      observacoes: agendamento.observacoes || '',
      status: agendamento.status,
      data_agendamento: agendamento.data_agendamento,
      hora_inicio: agendamento.hora_inicio,
      profissional_id: '',
      servico_ids: [],
      cliente_id: ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAgendamento) return

    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          nome_cliente: editForm.nome_cliente,
          telefone: editForm.telefone,
          observacoes: editForm.observacoes,
          status: editForm.status
        })
        .eq('id', editingAgendamento.id)

      if (error) throw error

      alert('Agendamento atualizado com sucesso!')
      setEditingAgendamento(null)
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      alert('Erro ao atualizar agendamento')
    }
  }

  const handleAddAgendamento = async () => {
    try {
      if (editForm.servico_ids.length === 0) {
        alert('Selecione pelo menos um serviço')
        return
      }

      if (!editForm.nome_cliente || !editForm.data_agendamento || !editForm.hora_inicio) {
        alert('Preencha nome, data e hora')
        return
      }

      // Usar a API de criação de agendamentos com rodízio
      const response = await fetch('/api/agendamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: editForm.nome_cliente,
          telefone: editForm.telefone,
          data: editForm.data_agendamento,
          hora: editForm.hora_inicio,
          servico_ids: editForm.servico_ids,
          barbeiro_preferido: editForm.profissional_id || null,
          observacoes: editForm.observacoes,
          cliente_id: editForm.cliente_id || null
        })
      })

      const result = await response.json()

      if (!result.success) {
        alert(result.message || 'Erro ao criar agendamento')
        return
      }

      alert(`Agendamento criado com sucesso!\n\n` +
        `Barbeiro: ${result.data.barbeiro_atribuido}\n` +
        `${result.data.mensagem_rodizio || ''}\n` +
        `${result.data.webhook_enviado ? '✅ Notificação enviada!' : ''}`
      )

      setShowForm(false)
      setEditForm({
        nome_cliente: '',
        telefone: '',
        observacoes: '',
        status: 'agendado',
        data_agendamento: getDataBrasiliaISO(),
        hora_inicio: '',
        profissional_id: '',
        servico_ids: [],
        cliente_id: ''
      })
      setHorariosDisponiveis([])
      setBarbeiroRodizio(null)
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      alert('Erro ao criar agendamento: ' + (error as any).message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-500'
      case 'confirmado': return 'bg-green-500'
      case 'em_andamento': return 'bg-yellow-500'
      case 'concluido': return 'bg-purple-500'
      case 'cancelado': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando agendamentos...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agendamentos</h1>
          <p className="text-purple-300">Gerencie todos os agendamentos da barbearia</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Botões de Visualização */}
          <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={() => setVisualizacao('lista')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                visualizacao === 'lista'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>Lista</span>
            </button>
            <button
              onClick={() => {
                setVisualizacao('calendario')
                setFiltroTemporal('todos') // Carregar todos ao abrir calendário
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                visualizacao === 'calendario'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendário</span>
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Filtros - Apenas em modo lista */}
      {visualizacao === 'lista' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Filtro Temporal */}
              <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">Período</label>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTemporal('hoje')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'hoje'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Hoje
                </button>

                <button
                  onClick={() => setFiltroTemporal('amanha')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'amanha'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Amanhã
                </button>

                <button
                  onClick={() => setFiltroTemporal('semana')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'semana'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Esta Semana
                </button>

                <button
                  onClick={() => setFiltroTemporal('proximos7')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'proximos7'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Próximos 7 dias
                </button>

                <button
                  onClick={() => setFiltroTemporal('passados')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'passados'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Passados (30 dias)
                </button>

                <button
                  onClick={() => setFiltroTemporal('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'todos'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setFiltroTemporal('personalizado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filtroTemporal === 'personalizado'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Personalizado
                </button>
              </div>

              {/* Data Personalizada */}
              {filtroTemporal === 'personalizado' && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={dataPersonalizada}
                    onChange={(e) => setDataPersonalizada(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>

            {/* Filtro de Status */}
            <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">Status</label>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setFiltroStatus('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'todos'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setFiltroStatus('agendado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'agendado'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Agendado
                </button>

                <button
                  onClick={() => setFiltroStatus('confirmado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'confirmado'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Confirmado
                </button>

                <button
                  onClick={() => setFiltroStatus('em_andamento')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'em_andamento'
                      ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Em Andamento
                </button>

                <button
                  onClick={() => setFiltroStatus('concluido')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'concluido'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Concluído
                </button>

                <button
                  onClick={() => setFiltroStatus('cancelado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'cancelado'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Cancelado
                </button>
              </div>
            </div>

              {/* Contador */}
              <div className="flex items-center space-x-2 text-sm text-slate-400 pt-2 border-t border-slate-700">
                <Calendar className="w-4 h-4" />
                <span>{agendamentos.length} agendamentos encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualização de Calendário */}
      {visualizacao === 'calendario' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white"
              >
                ←
              </button>
              <h3 className="text-xl font-bold text-white">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white"
              >
                →
              </button>
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-2">
              {/* Cabeçalho com dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                <div key={dia} className="text-center text-sm font-medium text-slate-400 py-2">
                  {dia}
                </div>
              ))}

              {/* Dias do mês */}
              {getDaysInMonth(currentMonth).map((day, idx) => {
                const agendsDoDia = getAgendamentosPorData(day.dateStr)
                const isToday = day.dateStr === new Date().toISOString().split('T')[0]

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                      day.isCurrentMonth
                        ? 'bg-slate-700/30 border-slate-600/50'
                        : 'bg-slate-800/20 border-slate-700/30 opacity-50'
                    } ${
                      isToday ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-white' : 'text-slate-500'
                    } ${
                      isToday ? 'text-purple-400 font-bold' : ''
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {/* Agendamentos do dia */}
                    <div className="space-y-1">
                      {agendsDoDia.slice(0, 3).map(ag => (
                        <div
                          key={ag.id}
                          onClick={() => setDetalhesAgendamento(ag)}
                          className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(ag.status)} text-white truncate`}
                          title={`${ag.hora_inicio} - ${ag.nome_cliente}`}
                        >
                          {ag.hora_inicio} {ag.nome_cliente}
                        </div>
                      ))}
                      {agendsDoDia.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Abrir modal com todos os agendamentos do dia
                            setDetalhesAgendamento({
                              ...agendsDoDia[0],
                              // Flag especial para mostrar todos do dia
                              _mostrarTodosDia: true,
                              _agendamentosDia: agendsDoDia
                            } as any)
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 text-center w-full py-1 hover:bg-slate-600/30 rounded transition-colors cursor-pointer"
                        >
                          +{agendsDoDia.length - 3} mais
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Agendamentos */}
      {visualizacao === 'lista' && (
        <div className="grid gap-4">
        {agendamentos.length === 0 ? (
          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum agendamento</h3>
              <p className="text-purple-300">Não há agendamentos para esta data.</p>
            </CardContent>
          </Card>
        ) : (
          agendamentos.map((agendamento) => (
            <Card
              key={agendamento.id}
              className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-colors cursor-pointer"
              onClick={() => setDetalhesAgendamento(agendamento)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-purple-400 mb-1">{convertISOtoBR(agendamento.data_agendamento)}</div>
                      <div className="text-2xl font-bold text-white">{formatTime(agendamento.hora_inicio)}</div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">{agendamento.nome_cliente}</span>
                        <span className="text-purple-300 text-sm">({agendamento.telefone})</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-purple-300">
                          <span>✂️ {agendamento.profissionais?.nome || 'Profissional não definido'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-purple-300">
                          <span>📋 Serviços:</span>
                          {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {agendamento.agendamento_servicos.map((as, idx) => (
                                <span key={idx} className="bg-purple-700/30 px-2 py-0.5 rounded text-xs">
                                  {as.servicos.nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{agendamento.servicos?.nome || 'Não definido'}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-purple-300">
                          <Clock className="w-3 h-3" />
                          <span>
                            {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0
                              ? agendamento.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                              : agendamento.servicos?.duracao_minutos || 30}min
                          </span>
                        </div>
                      </div>

                      {agendamento.observacoes && (
                        <div className="mt-2 text-sm text-purple-300">
                          💬 {agendamento.observacoes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-green-400 font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(agendamento.valor)}</span>
                      </div>
                      <div className="text-xs text-purple-300 capitalize">{agendamento.status.replace('_', ' ')}</div>

                      {/* Status de Comparecimento - NÃO mostrar se cancelado */}
                      {agendamento.status !== 'cancelado' && agendamento.compareceu === true && (
                        <div className="text-xs font-medium mt-1 text-green-400">
                          ✓ Compareceu
                        </div>
                      )}
                      {agendamento.status !== 'cancelado' && agendamento.compareceu === false && (
                        <div className="text-xs font-medium mt-1 text-red-400">
                          ✗ Não compareceu
                        </div>
                      )}
                    </div>

                    {/* Botões de Check-in - NÃO mostrar se cancelado */}
                    {agendamento.status !== 'cancelado' && (
                      <div className="flex flex-col space-y-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, true)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-colors ${
                            agendamento.compareceu === true
                              ? 'bg-green-600 text-white'
                              : 'text-green-300 hover:text-white hover:bg-green-700/50'
                          }`}
                          title="Marcar como presente"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Compareceu</span>
                        </button>
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, false)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-colors ${
                            agendamento.compareceu === false
                              ? 'bg-red-600 text-white'
                              : 'text-red-300 hover:text-white hover:bg-red-700/50'
                          }`}
                          title="Marcar como faltou"
                        >
                        <XCircle className="w-4 h-4" />
                        <span>Faltou</span>
                      </button>
                    </div>
                    )}

                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(agendamento)}
                        className="p-2 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded-lg transition-colors"
                        title="Editar agendamento"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agendamento.id)}
                        className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      )}

      {/* Resumo do Dia - Apenas em modo lista */}
      {visualizacao === 'lista' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-lg font-bold text-white">{agendamentos.length}</div>
                  <div className="text-sm text-purple-300">Total Agendamentos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(agendamentos.filter(a => a.status !== 'cancelado').reduce((sum, a) => sum + a.valor, 0))}
                  </div>
                  <div className="text-sm text-purple-300">Receita</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-lg font-bold text-white">
                    {agendamentos.filter(a => a.status !== 'cancelado').reduce((sum, a) => sum + (a.servicos?.duracao_minutos || 30), 0)}min
                  </div>
                  <div className="text-sm text-purple-300">Tempo Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-800/30 border-purple-700/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-lg font-bold text-white">
                    {new Set(agendamentos.filter(a => a.status !== 'cancelado').map(a => a.nome_cliente)).size}
                  </div>
                  <div className="text-sm text-purple-300">Clientes Únicos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popup de Detalhes do Agendamento */}
      {detalhesAgendamento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setDetalhesAgendamento(null)}>
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full border border-purple-500/50 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {(detalhesAgendamento as any)._mostrarTodosDia
                    ? `Agendamentos do dia ${convertISOtoBR(detalhesAgendamento.data_agendamento)}`
                    : 'Detalhes do Agendamento'
                  }
                </h2>
                {!(detalhesAgendamento as any)._mostrarTodosDia && (
                  <p className="text-sm text-slate-400">ID: {detalhesAgendamento.id.slice(0, 8)}...</p>
                )}
              </div>
              <button
                onClick={() => setDetalhesAgendamento(null)}
                className="text-slate-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Se for mostrar todos do dia */}
            {(detalhesAgendamento as any)._mostrarTodosDia ? (
              <div className="space-y-3">
                {((detalhesAgendamento as any)._agendamentosDia || []).map((ag: Agendamento) => (
                  <div
                    key={ag.id}
                    onClick={() => setDetalhesAgendamento(ag)}
                    className="bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 cursor-pointer transition-colors border border-slate-600/30 hover:border-purple-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{formatTime(ag.hora_inicio)}</div>
                          <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${getStatusColor(ag.status)}`}></div>
                        </div>
                        <div>
                          <div className="font-medium text-white">{ag.nome_cliente}</div>
                          <div className="text-sm text-purple-300">✂️ {ag.profissionais?.nome || 'Não definido'}</div>
                          <div className="text-sm text-slate-400">{ag.telefone}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-medium">{formatCurrency(ag.valor)}</div>
                        <div className="text-xs text-slate-400 capitalize">{ag.status.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Modal normal de detalhes de um agendamento
              <div>

            <div className="space-y-6">
              {/* Status e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Status</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(detalhesAgendamento.status)}`}></div>
                    <span className="text-white font-medium capitalize">{detalhesAgendamento.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Data e Hora</div>
                  <div className="text-white font-medium">{formatDateTimeBR(detalhesAgendamento.data_agendamento, detalhesAgendamento.hora_inicio)}</div>
                </div>
              </div>

              {/* Cliente */}
              <div className="bg-purple-700/20 border border-purple-600/30 rounded-lg p-4">
                <div className="text-sm text-purple-300 mb-2 font-medium">Cliente</div>
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-5 h-5 text-purple-400" />
                  <span className="text-white text-lg font-medium">{detalhesAgendamento.nome_cliente}</span>
                </div>
                {detalhesAgendamento.telefone && (
                  <div className="text-purple-200">📞 {detalhesAgendamento.telefone}</div>
                )}
              </div>

              {/* Barbeiro e Serviços */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Barbeiro</div>
                  <div className="text-white font-medium">✂️ {detalhesAgendamento.profissionais?.nome || 'Não definido'}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Duração</div>
                  <div className="text-white font-medium">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {detalhesAgendamento.agendamento_servicos && detalhesAgendamento.agendamento_servicos.length > 0
                      ? detalhesAgendamento.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                      : detalhesAgendamento.servicos?.duracao_minutos || 30}min
                  </div>
                </div>
              </div>

              {/* Serviços */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-3">Serviços</div>
                <div className="space-y-2">
                  {detalhesAgendamento.agendamento_servicos && detalhesAgendamento.agendamento_servicos.length > 0 ? (
                    detalhesAgendamento.agendamento_servicos.map((as, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-600/30 rounded px-3 py-2">
                        <span className="text-white">{as.servicos.nome}</span>
                        <span className="text-green-400 font-medium">{formatCurrency(as.servicos.preco)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center bg-slate-600/30 rounded px-3 py-2">
                      <span className="text-white">{detalhesAgendamento.servicos?.nome || 'Não definido'}</span>
                      <span className="text-green-400 font-medium">{formatCurrency(detalhesAgendamento.servicos?.preco || 0)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-600 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-white font-bold">Valor Total</span>
                  <span className="text-2xl font-bold text-green-400">{formatCurrency(detalhesAgendamento.valor)}</span>
                </div>
              </div>

              {/* Observações */}
              {detalhesAgendamento.observacoes && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Observações</div>
                  <div className="text-white">{detalhesAgendamento.observacoes}</div>
                </div>
              )}

              {/* Comparecimento */}
              {/* Só mostrar "Cliente compareceu" se NÃO for cancelado */}
              {detalhesAgendamento.compareceu !== null && detalhesAgendamento.status !== 'cancelado' && (
                <div className={`rounded-lg p-4 ${
                  detalhesAgendamento.compareceu
                    ? 'bg-green-700/20 border border-green-600/30'
                    : 'bg-red-700/20 border border-red-600/30'
                }`}>
                  <div className="flex items-center space-x-2">
                    {detalhesAgendamento.compareceu ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-200 font-medium">Cliente compareceu</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-200 font-medium">Cliente não compareceu</span>
                      </>
                    )}
                  </div>
                  {detalhesAgendamento.checkin_at && (
                    <div className="text-xs text-slate-400 mt-1">
                      Check-in: {new Date(detalhesAgendamento.checkin_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex space-x-3 pt-4 border-t border-slate-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(detalhesAgendamento)
                    setDetalhesAgendamento(null)
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(detalhesAgendamento.id)
                    setDetalhesAgendamento(null)
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={() => setDetalhesAgendamento(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingAgendamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Editar Agendamento</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={editForm.nome_cliente}
                  onChange={(e) => setEditForm({ ...editForm, nome_cliente: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white [&>option]:bg-slate-700 [&>option]:text-white"
                >
                  <option value="agendado" className="bg-slate-700 text-white">Agendado</option>
                  <option value="confirmado" className="bg-slate-700 text-white">Confirmado</option>
                  <option value="em_andamento" className="bg-slate-700 text-white">Em Andamento</option>
                  <option value="concluido" className="bg-slate-700 text-white">Concluído</option>
                  <option value="cancelado" className="bg-slate-700 text-white">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-24"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingAgendamento(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">Novo Agendamento</h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Buscar Cliente */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Buscar Cliente (opcional)</label>
                <input
                  type="text"
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value)
                    searchClientes(e.target.value)
                  }}
                  placeholder="Digite nome ou telefone..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
                {clientes.length > 0 && (
                  <div className="mt-2 bg-slate-700 rounded border border-slate-600 max-h-40 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setEditForm({
                            ...editForm,
                            cliente_id: cliente.id,
                            nome_cliente: cliente.nome_completo,
                            telefone: cliente.telefone
                          })
                          setSearchCliente('')
                          setClientes([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-600 text-white text-sm"
                      >
                        {cliente.nome_completo} - {cliente.telefone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dados do Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    value={editForm.nome_cliente}
                    onChange={(e) => setEditForm({ ...editForm, nome_cliente: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Telefone (busca automática)</label>
                  <input
                    type="text"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                    onBlur={(e) => buscarClientePorTelefone(e.target.value)}
                    placeholder="Digite o telefone..."
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Digite o telefone e clique fora para buscar o cliente</p>
                </div>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Data *</label>
                  <input
                    type="date"
                    value={editForm.data_agendamento}
                    onChange={(e) => setEditForm({ ...editForm, data_agendamento: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Hora *
                    {checkingAvailability && <span className="ml-2 text-xs text-purple-400">Verificando...</span>}
                  </label>
                  {horariosDisponiveis.length > 0 ? (
                    <select
                      value={editForm.hora_inicio}
                      onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white [&>option]:bg-slate-700 [&>option]:text-white"
                      required
                    >
                      <option value="" className="bg-slate-700 text-white">Selecione um horário disponível...</option>
                      {horariosDisponiveis.map(hora => (
                        <option key={hora} value={hora} className="bg-slate-700 text-white">{hora}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="time"
                      value={editForm.hora_inicio}
                      onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      required
                    />
                  )}
                  {horariosDisponiveis.length === 0 && editForm.data_agendamento && editForm.servico_ids.length > 0 && !checkingAvailability && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠ Nenhum horário disponível. Selecione outra data ou barbeiro.
                    </p>
                  )}
                </div>
              </div>

              {/* Profissional */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Profissional (opcional - deixe vazio para rodízio automático)
                </label>
                <select
                  value={editForm.profissional_id}
                  onChange={(e) => setEditForm({ ...editForm, profissional_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white [&>option]:bg-slate-700 [&>option]:text-white"
                >
                  <option value="" className="bg-slate-700 text-white">🔄 Rodízio Automático (barbeiro com menos atendimentos)</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.id} className="bg-slate-700 text-white">{prof.nome}</option>
                  ))}
                </select>

                {/* Informação do Rodízio */}
                {!editForm.profissional_id && barbeiroRodizio && (
                  <div className="mt-2 bg-purple-700/30 border border-purple-600/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium">Barbeiro do Rodízio:</span>
                      <span className="text-purple-200">{barbeiroRodizio.nome}</span>
                    </div>
                    <div className="text-xs text-purple-300 mt-1">
                      {barbeiroRodizio.atendimentos} atendimento(s) hoje
                    </div>
                  </div>
                )}

                {!editForm.profissional_id && !barbeiroRodizio && editForm.hora_inicio && (
                  <div className="mt-2 text-xs text-slate-400">
                    ℹ️ Selecione data, hora e serviços para ver qual barbeiro será atribuído
                  </div>
                )}
              </div>

              {/* Serviços (seleção múltipla) */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Serviços * (pode selecionar múltiplos)</label>
                <div className="space-y-2 bg-slate-700/30 p-3 rounded-lg max-h-64 overflow-y-auto">
                  {servicos.map(servico => (
                    <label
                      key={servico.id}
                      className="flex items-center space-x-3 p-2 bg-slate-700/50 rounded hover:bg-slate-600/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.servico_ids.includes(servico.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({
                              ...editForm,
                              servico_ids: [...editForm.servico_ids, servico.id]
                            })
                          } else {
                            setEditForm({
                              ...editForm,
                              servico_ids: editForm.servico_ids.filter(id => id !== servico.id)
                            })
                          }
                        }}
                        className="w-4 h-4 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">{servico.nome}</div>
                        <div className="text-sm text-slate-400">
                          R$ {servico.preco.toFixed(2)} • {servico.duracao_minutos}min
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-24"
                />
              </div>

              {/* Resumo dos serviços selecionados */}
              {editForm.servico_ids.length > 0 && (
                <div className="bg-purple-700/30 p-4 rounded-lg space-y-2">
                  <div className="text-purple-300 text-sm mb-2">Serviços Selecionados</div>
                  {servicos.filter(s => editForm.servico_ids.includes(s.id)).map(servico => (
                    <div key={servico.id} className="flex justify-between text-sm text-white">
                      <span>{servico.nome}</span>
                      <span className="text-green-400">{formatCurrency(servico.preco)}</span>
                    </div>
                  ))}
                  <div className="border-t border-purple-600 pt-2 mt-2 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-2xl font-bold text-green-400">
                      {formatCurrency(
                        servicos
                          .filter(s => editForm.servico_ids.includes(s.id))
                          .reduce((sum, s) => sum + s.preco, 0)
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-purple-300">
                    Duração total: {servicos
                      .filter(s => editForm.servico_ids.includes(s.id))
                      .reduce((sum, s) => sum + s.duracao_minutos, 0)} minutos
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6 border-t border-slate-700 pt-4">
              <button
                onClick={handleAddAgendamento}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Criar Agendamento
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditForm({
                    nome_cliente: '',
                    telefone: '',
                    observacoes: '',
                    status: 'agendado',
                    data_agendamento: getDataBrasiliaISO(),
                    hora_inicio: '',
                    profissional_id: '',
                    servico_ids: [],
                    cliente_id: ''
                  })
                  setHorariosDisponiveis([])
                  setBarbeiroRodizio(null)
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}