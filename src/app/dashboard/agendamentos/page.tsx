'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Plus, Edit, Trash2, Clock, User, DollarSign, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'

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

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [editForm, setEditForm] = useState({
    nome_cliente: '',
    telefone: '',
    observacoes: '',
    status: 'agendado',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    profissional_id: '',
    servico_ids: [] as string[],
    cliente_id: ''
  })

  useEffect(() => {
    loadAgendamentos()
    loadProfissionais()
    loadServicos()
  }, [selectedDate])

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

    const { data } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone, profissional_preferido')
      .eq('telefone', telefone)
      .single()

    if (data) {
      setEditForm({
        ...editForm,
        cliente_id: data.id,
        nome_cliente: data.nome_completo,
        telefone: data.telefone,
        profissional_id: profissionais.find(p => p.nome === data.profissional_preferido)?.id || editForm.profissional_id
      })
      alert(`Cliente encontrado: ${data.nome_completo}`)
    }
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

      // Aplicar filtro de data somente se houver uma data selecionada
      if (selectedDate) {
        // Converter de YYYY-MM-DD para DD/MM/YYYY
        const [year, month, day] = selectedDate.split('-')
        const dataBR = `${day}/${month}/${year}`
        query = query.eq('data_agendamento', dataBR)
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

      console.log('Agendamentos carregados:', data)
      console.log('Data filtrada:', selectedDate)
      setAgendamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const marcarComparecimento = async (id: string, compareceu: boolean) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          compareceu,
          checkin_at: new Date().toISOString(),
          status: compareceu ? 'concluido' : 'cancelado'
        })
        .eq('id', id)

      if (error) throw error

      alert(compareceu ? 'Cliente marcado como presente!' : 'Cliente marcado como faltou')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao marcar comparecimento:', error)
      alert('Erro ao marcar comparecimento')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Agendamento excluído com sucesso!')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
      alert('Erro ao excluir agendamento')
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
      if (!editForm.profissional_id || editForm.servico_ids.length === 0) {
        alert('Selecione o profissional e pelo menos um serviço')
        return
      }

      const profissional = profissionais.find(p => p.id === editForm.profissional_id)
      const servicosSelecionados = servicos.filter(s => editForm.servico_ids.includes(s.id))
      const valorTotal = servicosSelecionados.reduce((sum, s) => sum + s.preco, 0)

      // Converter data para formato DD/MM/YYYY
      const [year, month, day] = editForm.data_agendamento.split('-')
      const dataBR = `${day}/${month}/${year}`

      // Criar agendamento
      const { data: agendamentoData, error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert([{
          nome_cliente: editForm.nome_cliente,
          telefone: editForm.telefone,
          data_agendamento: dataBR,
          hora_inicio: editForm.hora_inicio,
          profissional_id: editForm.profissional_id,
          servico_id: editForm.servico_ids[0], // compatibilidade
          cliente_id: editForm.cliente_id || null,
          observacoes: editForm.observacoes,
          valor: valorTotal,
          status: 'agendado',
          Barbeiro: profissional?.nome || ''
        }])
        .select()
        .single()

      if (agendamentoError) throw agendamentoError

      // Tentar inserir serviços na tabela de relacionamento (se existir)
      if (agendamentoData && editForm.servico_ids.length > 0) {
        try {
          const agendamentoServicos = servicosSelecionados.map(servico => ({
            agendamento_id: agendamentoData.id,
            servico_id: servico.id,
            preco: servico.preco,
            duracao_minutos: servico.duracao_minutos
          }))

          await supabase
            .from('agendamento_servicos')
            .insert(agendamentoServicos)
        } catch (err) {
          // Tabela não existe, ignorar (agendamento já foi criado)
          console.log('Tabela agendamento_servicos não existe, usando apenas servico_id')
        }
      }

      alert('Agendamento criado com sucesso!')
      setShowForm(false)
      setEditForm({
        nome_cliente: '',
        telefone: '',
        observacoes: '',
        status: 'agendado',
        data_agendamento: new Date().toISOString().split('T')[0],
        hora_inicio: '',
        profissional_id: '',
        servico_ids: [],
        cliente_id: ''
      })
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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
              />
            </div>
            <button
              onClick={() => setSelectedDate('')}
              className="mt-5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              Mostrar Todos
            </button>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{agendamentos.length} agendamentos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
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
            <Card key={agendamento.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-purple-400 mb-1">{agendamento.data_agendamento}</div>
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

                      {/* Status de Comparecimento */}
                      {agendamento.compareceu === true && (
                        <div className="text-xs font-medium mt-1 text-green-400">
                          ✓ Compareceu
                        </div>
                      )}
                      {agendamento.compareceu === false && (
                        <div className="text-xs font-medium mt-1 text-red-400">
                          ✗ Não compareceu
                        </div>
                      )}
                    </div>

                    {/* Botões de Check-in - SEMPRE APARECEM */}
                    <div className="flex flex-col space-y-1">
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

                    <div className="flex space-x-2">
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
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                >
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
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
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hora *</label>
                  <input
                    type="time"
                    value={editForm.hora_inicio}
                    onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              {/* Profissional */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Profissional *</label>
                <select
                  value={editForm.profissional_id}
                  onChange={(e) => setEditForm({ ...editForm, profissional_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  required
                >
                  <option value="">Selecione...</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.nome}</option>
                  ))}
                </select>
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
                    data_agendamento: new Date().toISOString().split('T')[0],
                    hora_inicio: '',
                    profissional_id: '',
                    servico_ids: [],
                    cliente_id: ''
                  })
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Dia */}
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
                  {formatCurrency(agendamentos.reduce((sum, a) => sum + a.valor, 0))}
                </div>
                <div className="text-sm text-purple-300">Receita do Dia</div>
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
                  {agendamentos.reduce((sum, a) => sum + (a.servicos?.duracao_minutos || 30), 0)}min
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
                  {new Set(agendamentos.map(a => a.nome_cliente)).size}
                </div>
                <div className="text-sm text-purple-300">Clientes Únicos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}