'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, Plus, Edit, Trash2, DollarSign, Calendar, TrendingDown, Star, User, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Plano {
  id: string
  nome: string
  itens_inclusos: string
  valor_total: number
  valor_original: number
  economia: number
  validade_dias: number
  ativo: boolean
}

interface Cliente {
  id: string
  nome_completo: string
  telefone: string
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showContratarModal, setShowContratarModal] = useState(false)
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null)
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [editForm, setEditForm] = useState({
    nome: '',
    itens_inclusos: '',
    valor_total: 0,
    valor_original: 0,
    validade_dias: 30,
    ativo: true
  })
  const [contratarForm, setContratarForm] = useState({
    cliente_id: '',
    observacoes: ''
  })

  useEffect(() => {
    loadPlanos()
  }, [])

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('economia', { ascending: false })

      if (error) throw error
      setPlanos(data || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    } finally {
      setLoading(false)
    }
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

  const handleAddPlano = async () => {
    try {
      const economia = editForm.valor_original - editForm.valor_total

      const { error } = await supabase
        .from('planos')
        .insert([{
          ...editForm,
          economia
        }])

      if (error) throw error

      alert('Plano criado com sucesso!')
      setShowForm(false)
      setEditForm({
        nome: '',
        itens_inclusos: '',
        valor_total: 0,
        valor_original: 0,
        validade_dias: 30,
        ativo: true
      })
      loadPlanos()
    } catch (error) {
      console.error('Erro ao criar plano:', error)
      alert('Erro ao criar plano')
    }
  }

  const handleEditPlano = async () => {
    if (!editingPlano) return

    try {
      const economia = editForm.valor_original - editForm.valor_total

      const { error } = await supabase
        .from('planos')
        .update({
          ...editForm,
          economia
        })
        .eq('id', editingPlano.id)

      if (error) throw error

      alert('Plano atualizado com sucesso!')
      setEditingPlano(null)
      setShowForm(false)
      setEditForm({
        nome: '',
        itens_inclusos: '',
        valor_total: 0,
        valor_original: 0,
        validade_dias: 30,
        ativo: true
      })
      loadPlanos()
    } catch (error) {
      console.error('Erro ao atualizar plano:', error)
      alert('Erro ao atualizar plano')
    }
  }

  const handleDeletePlano = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este plano?')) return

    try {
      const { error } = await supabase
        .from('planos')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      alert('Plano desativado com sucesso!')
      loadPlanos()
    } catch (error) {
      console.error('Erro ao desativar plano:', error)
      alert('Erro ao desativar plano')
    }
  }

  const handleContratarPlano = async () => {
    if (!planoSelecionado || !contratarForm.cliente_id) {
      alert('Selecione um cliente')
      return
    }

    try {
      const dataExpiracao = new Date()
      dataExpiracao.setDate(dataExpiracao.getDate() + planoSelecionado.validade_dias)

      const { error } = await supabase
        .from('cliente_planos')
        .insert([{
          cliente_id: contratarForm.cliente_id,
          plano_id: planoSelecionado.id,
          data_expiracao: dataExpiracao.toISOString(),
          valor_pago: planoSelecionado.valor_total,
          status: 'ativo',
          observacoes: contratarForm.observacoes
        }])

      if (error) throw error

      alert('Plano contratado com sucesso!')
      setShowContratarModal(false)
      setPlanoSelecionado(null)
      setContratarForm({ cliente_id: '', observacoes: '' })
      setSearchCliente('')
    } catch (error) {
      console.error('Erro ao contratar plano:', error)
      alert('Erro ao contratar plano')
    }
  }

  const openEditModal = (plano: Plano) => {
    setEditingPlano(plano)
    setEditForm({
      nome: plano.nome,
      itens_inclusos: plano.itens_inclusos,
      valor_total: plano.valor_total,
      valor_original: plano.valor_original,
      validade_dias: plano.validade_dias,
      ativo: plano.ativo
    })
    setShowForm(true)
  }

  const openContratarModal = (plano: Plano) => {
    setPlanoSelecionado(plano)
    setShowContratarModal(true)
  }

  const getEconomiaPercent = (economia: number, valorOriginal: number) => {
    return Math.round((economia / valorOriginal) * 100)
  }

  const getPlanoPrioridade = (economia: number) => {
    if (economia >= 100) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Premium' }
    if (economia >= 50) return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Popular' }
    if (economia >= 20) return { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Básico' }
    return { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Simples' }
  }

  const getPlanoIcon = (nome: string) => {
    if (nome.toLowerCase().includes('corte') && nome.toLowerCase().includes('barba')) return '👑'
    if (nome.toLowerCase().includes('hidrata')) return '💧'
    if (nome.toLowerCase().includes('barba')) return '🧔'
    if (nome.toLowerCase().includes('corte')) return '✂️'
    if (nome.toLowerCase().includes('sobrancelha')) return '👁️'
    if (nome.toLowerCase().includes('barboterapia')) return '💆‍♂️'
    return '📦'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando planos...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Planos & Pacotes</h1>
          <p className="text-purple-300">Gerencie os pacotes promocionais da barbearia</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Destaque - Melhor Plano */}
      {planos.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-800/30 to-orange-800/30 border-yellow-600/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-6 h-6 text-yellow-400" />
                <CardTitle className="text-white text-xl">🔥 Plano Mais Vantajoso</CardTitle>
              </div>
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                <TrendingDown className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {getEconomiaPercent(planos[0].economia, planos[0].valor_original)}% OFF
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{getPlanoIcon(planos[0].nome)}</span>
                <div>
                  <h3 className="text-2xl font-bold text-white">{planos[0].nome}</h3>
                  <p className="text-yellow-300">{planos[0].itens_inclusos}</p>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-white">{formatCurrency(planos[0].valor_total)}</div>
                <div className="text-yellow-300 line-through text-sm">{formatCurrency(planos[0].valor_original)}</div>
                <div className="text-green-400 font-medium">Economia: {formatCurrency(planos[0].economia)}</div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={() => openContratarModal(planos[0])}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Escolher Plano
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => {
          const prioridade = getPlanoPrioridade(plano.economia)
          const economiaPercent = getEconomiaPercent(plano.economia, plano.valor_original)

          return (
            <Card key={plano.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-all duration-200 relative overflow-hidden">
              {/* Badge de Economia */}
              {economiaPercent >= 20 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  -{economiaPercent}%
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl">{getPlanoIcon(plano.nome)}</span>
                    <div>
                      <CardTitle className="text-white text-lg">{plano.nome}</CardTitle>
                      <div className={`text-xs px-2 py-1 rounded mt-1 ${prioridade.bg} ${prioridade.color}`}>
                        {prioridade.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditModal(plano)}
                      className="p-1 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlano(plano.id)}
                      className="p-1 text-red-300 hover:text-white hover:bg-red-700/50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Itens Inclusos */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-purple-300 mb-2">📋 Inclui:</h4>
                  <p className="text-purple-200 text-sm">{plano.itens_inclusos}</p>
                </div>

                {/* Preços */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-300">Preço Normal</span>
                    <span className="text-sm text-purple-300 line-through">{formatCurrency(plano.valor_original)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-300">Preço do Plano</span>
                    <span className="text-xl font-bold text-green-400">{formatCurrency(plano.valor_total)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-purple-700/50 pt-2">
                    <span className="text-sm font-medium text-green-400">Sua Economia</span>
                    <span className="text-lg font-bold text-green-400">{formatCurrency(plano.economia)}</span>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{plano.validade_dias} dias</div>
                      <div className="text-xs text-purple-300">Validade</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{economiaPercent}%</div>
                      <div className="text-xs text-purple-300">Desconto</div>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={() => openContratarModal(plano)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  Contratar Plano
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Novo/Editar Plano */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingPlano ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingPlano(null)
                  setEditForm({
                    nome: '',
                    itens_inclusos: '',
                    valor_total: 0,
                    valor_original: 0,
                    validade_dias: 30,
                    ativo: true
                  })
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome do Plano *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  placeholder="Ex: Corte + Barba Premium"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Itens Inclusos *</label>
                <textarea
                  value={editForm.itens_inclusos}
                  onChange={(e) => setEditForm({ ...editForm, itens_inclusos: e.target.value })}
                  placeholder="Ex: Corte, Barba, Hidratação, Sobrancelha"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valor Original *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.valor_original}
                    onChange={(e) => setEditForm({ ...editForm, valor_original: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valor do Plano *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.valor_total}
                    onChange={(e) => setEditForm({ ...editForm, valor_total: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Validade (dias) *</label>
                <input
                  type="number"
                  value={editForm.validade_dias}
                  onChange={(e) => setEditForm({ ...editForm, validade_dias: parseInt(e.target.value) || 30 })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              {editForm.valor_original > 0 && editForm.valor_total > 0 && (
                <div className="bg-green-700/30 p-4 rounded-lg">
                  <div className="text-green-300 text-sm mb-1">Economia</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(editForm.valor_original - editForm.valor_total)}
                    ({getEconomiaPercent(editForm.valor_original - editForm.valor_total, editForm.valor_original)}% OFF)
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={editingPlano ? handleEditPlano : handleAddPlano}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingPlano ? 'Salvar Alterações' : 'Criar Plano'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingPlano(null)
                    setEditForm({
                      nome: '',
                      itens_inclusos: '',
                      valor_total: 0,
                      valor_original: 0,
                      validade_dias: 30,
                      ativo: true
                    })
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

      {/* Modal de Contratar Plano */}
      {showContratarModal && planoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Contratar Plano</h2>
              <button
                onClick={() => {
                  setShowContratarModal(false)
                  setPlanoSelecionado(null)
                  setContratarForm({ cliente_id: '', observacoes: '' })
                  setSearchCliente('')
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Info do Plano */}
            <div className="bg-purple-700/30 p-4 rounded-lg mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-3xl">{getPlanoIcon(planoSelecionado.nome)}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{planoSelecionado.nome}</h3>
                  <p className="text-purple-300 text-sm">{planoSelecionado.itens_inclusos}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-sm text-purple-300">Valor</div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(planoSelecionado.valor_total)}</div>
                </div>
                <div>
                  <div className="text-sm text-purple-300">Economia</div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(planoSelecionado.economia)}</div>
                </div>
                <div>
                  <div className="text-sm text-purple-300">Validade</div>
                  <div className="text-xl font-bold text-white">{planoSelecionado.validade_dias} dias</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Buscar Cliente */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Buscar Cliente *</label>
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
                          setContratarForm({ ...contratarForm, cliente_id: cliente.id })
                          setSearchCliente(`${cliente.nome_completo} - ${cliente.telefone}`)
                          setClientes([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-600 text-white text-sm flex items-center space-x-2"
                      >
                        <User className="w-4 h-4 text-purple-400" />
                        <span>{cliente.nome_completo} - {cliente.telefone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Observações</label>
                <textarea
                  value={contratarForm.observacoes}
                  onChange={(e) => setContratarForm({ ...contratarForm, observacoes: e.target.value })}
                  placeholder="Ex: Cliente novo, indicação, etc..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleContratarPlano}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Confirmar Contratação
                </button>
                <button
                  onClick={() => {
                    setShowContratarModal(false)
                    setPlanoSelecionado(null)
                    setContratarForm({ cliente_id: '', observacoes: '' })
                    setSearchCliente('')
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Gift className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{planos.length}</div>
                <div className="text-sm text-purple-300">Total Planos</div>
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
                  {planos.length > 0 ? formatCurrency(Math.round(planos.reduce((sum, p) => sum + p.valor_total, 0) / planos.length)) : 'R$ 0'}
                </div>
                <div className="text-sm text-purple-300">Preço Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {planos.length > 0 ? formatCurrency(Math.round(planos.reduce((sum, p) => sum + p.economia, 0) / planos.length)) : 'R$ 0'}
                </div>
                <div className="text-sm text-purple-300">Economia Média</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {planos.length > 0 ? Math.round(planos.reduce((sum, p) => sum + p.validade_dias, 0) / planos.length) : 0}
                </div>
                <div className="text-sm text-purple-300">Dias Validade Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
