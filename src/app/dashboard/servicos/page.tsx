'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, Plus, Edit, Trash2, Clock, DollarSign, User } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Servico {
  id: string
  nome: string
  descricao: string
  preco: number
  duracao_minutos: number
  categoria: string
  executor: string
  ativo: boolean
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    duracao_minutos: 30,
    categoria: '',
    executor: '',
    ativo: true
  })

  useEffect(() => {
    loadServicos()
  }, [])

  const loadServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('categoria')
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico)
    setEditForm({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco,
      duracao_minutos: servico.duracao_minutos,
      categoria: servico.categoria,
      executor: servico.executor || '',
      ativo: servico.ativo
    })
  }

  const handleSaveEdit = async () => {
    if (!editingServico) return

    try {
      const { error } = await supabase
        .from('servicos')
        .update(editForm)
        .eq('id', editingServico.id)

      if (error) throw error

      alert('Serviço atualizado com sucesso!')
      setEditingServico(null)
      loadServicos()
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error)
      alert('Erro ao atualizar serviço')
    }
  }

  const handleAddServico = async () => {
    try {
      const { error } = await supabase
        .from('servicos')
        .insert([editForm])

      if (error) throw error

      alert('Serviço adicionado com sucesso!')
      setShowAddForm(false)
      setEditForm({
        nome: '',
        descricao: '',
        preco: 0,
        duracao_minutos: 30,
        categoria: '',
        executor: '',
        ativo: true
      })
      loadServicos()
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error)
      alert('Erro ao adicionar serviço')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este serviço?')) return

    try {
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      alert('Serviço desativado com sucesso!')
      loadServicos()
    } catch (error) {
      console.error('Erro ao desativar serviço:', error)
      alert('Erro ao desativar serviço')
    }
  }

  const categorias = [...new Set(servicos.map(s => s.categoria))].filter(Boolean)
  const servicosFiltrados = categoriaFiltro === 'todas'
    ? servicos
    : servicos.filter(s => s.categoria === categoriaFiltro)

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria?.toLowerCase()) {
      case 'cabelo': return '💇‍♂️'
      case 'barba': return '🧔'
      case 'coloração': return '🎨'
      case 'tratamento': return '💆‍♂️'
      case 'estética': return '✨'
      case 'depilação': return '🪒'
      case 'acabamento': return '✂️'
      case 'finalização': return '🎯'
      default: return '⭐'
    }
  }

  const getExecutorColor = (executor: string) => {
    switch (executor?.toLowerCase()) {
      case 'barbeiro': return 'text-blue-400'
      case 'auxiliar': return 'text-green-400'
      default: return 'text-purple-400'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando serviços...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Serviços</h1>
          <p className="text-purple-300">Gerencie os serviços oferecidos pela barbearia</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditForm({
              nome: '',
              descricao: '',
              preco: 0,
              duracao_minutos: 30,
              categoria: '',
              executor: '',
              ativo: true
            })
          }}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Serviço</span>
        </button>
      </div>

      {/* Filtros */}
      <Card className="bg-purple-800/30 border-purple-700/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <span className="text-purple-300 text-sm">Categoria:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoriaFiltro('todas')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  categoriaFiltro === 'todas'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                }`}
              >
                Todas ({servicos.length})
              </button>
              {categorias.map(categoria => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaFiltro(categoria)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    categoriaFiltro === categoria
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                  }`}
                >
                  {getCategoriaIcon(categoria)} {categoria} ({servicos.filter(s => s.categoria === categoria).length})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicosFiltrados.map((servico) => (
          <Card key={servico.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoriaIcon(servico.categoria)}</span>
                  <div>
                    <CardTitle className="text-white text-lg">{servico.nome}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-purple-700/50 text-purple-300 rounded">
                        {servico.categoria}
                      </span>
                      <span className={`text-xs ${getExecutorColor(servico.executor)}`}>
                        {servico.executor}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(servico)}
                    className="p-1 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(servico.id)}
                    className="p-1 text-red-300 hover:text-white hover:bg-red-700/50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-purple-200 text-sm mb-4 line-clamp-3">
                {servico.descricao}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-lg font-bold text-white">{formatCurrency(servico.preco)}</div>
                    <div className="text-xs text-purple-300">Preço</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-lg font-bold text-white">{servico.duracao_minutos}min</div>
                    <div className="text-xs text-purple-300">Duração</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-300">{servico.executor}</span>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Edição/Adicionar */}
      {(editingServico || showAddForm) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    value={editForm.preco}
                    onChange={(e) => setEditForm({ ...editForm, preco: parseFloat(e.target.value) })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Duração (min) *</label>
                  <input
                    type="number"
                    value={editForm.duracao_minutos}
                    onChange={(e) => setEditForm({ ...editForm, duracao_minutos: parseInt(e.target.value) })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Categoria *</label>
                <select
                  value={editForm.categoria}
                  onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Cabelo">Cabelo</option>
                  <option value="Barba">Barba</option>
                  <option value="Coloração">Coloração</option>
                  <option value="Tratamento">Tratamento</option>
                  <option value="Estética">Estética</option>
                  <option value="Depilação">Depilação</option>
                  <option value="Acabamento">Acabamento</option>
                  <option value="Finalização">Finalização</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Executor *</label>
                <select
                  value={editForm.executor}
                  onChange={(e) => setEditForm({ ...editForm, executor: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Barbeiro">Barbeiro</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Manicure">Manicure</option>
                  <option value="Qualquer">Qualquer</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingServico ? handleSaveEdit : handleAddServico}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingServico ? 'Salvar' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setEditingServico(null)
                  setShowAddForm(false)
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{servicos.length}</div>
                <div className="text-sm text-purple-300">Total Serviços</div>
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
                  {formatCurrency(Math.round(servicos.reduce((sum, s) => sum + s.preco, 0) / servicos.length))}
                </div>
                <div className="text-sm text-purple-300">Preço Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {Math.round(servicos.reduce((sum, s) => sum + s.duracao_minutos, 0) / servicos.length)}min
                </div>
                <div className="text-sm text-purple-300">Duração Média</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">{categorias.length}</div>
                <div className="text-sm text-purple-300">Categorias</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Serviços Mais Caros */}
      <Card className="bg-purple-800/30 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white">Top 5 - Serviços Mais Valorizados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {servicos
              .sort((a, b) => b.preco - a.preco)
              .slice(0, 5)
              .map((servico, index) => (
                <div key={servico.id} className="flex items-center justify-between p-3 bg-purple-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{servico.nome}</div>
                      <div className="text-purple-300 text-sm">{servico.categoria} • {servico.duracao_minutos}min</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{formatCurrency(servico.preco)}</div>
                    <div className="text-xs text-purple-300">{servico.executor}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
