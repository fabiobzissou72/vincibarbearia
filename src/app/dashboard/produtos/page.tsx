'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Plus, Edit, Trash2, DollarSign, AlertTriangle, TrendingUp, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Produto {
  id: string
  nome: string
  funcao: string
  descricao: string
  preco: number
  beneficios: string
  contra_indicacoes: string
  categoria: string
  ativo: boolean
  estoque: number
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [editForm, setEditForm] = useState({
    nome: '',
    funcao: '',
    descricao: '',
    preco: 0,
    beneficios: '',
    contra_indicacoes: '',
    categoria: '',
    estoque: 0,
    ativo: true
  })

  useEffect(() => {
    loadProdutos()
  }, [])

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('categoria')
        .order('nome')

      if (error) throw error
      setProdutos(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduto = async () => {
    try {
      const { error } = await supabase
        .from('produtos')
        .insert([editForm])

      if (error) throw error

      alert('Produto criado com sucesso!')
      setShowForm(false)
      setEditForm({
        nome: '',
        funcao: '',
        descricao: '',
        preco: 0,
        beneficios: '',
        contra_indicacoes: '',
        categoria: '',
        estoque: 0,
        ativo: true
      })
      loadProdutos()
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      alert('Erro ao criar produto')
    }
  }

  const handleEditProduto = async () => {
    if (!editingProduto) return

    try {
      const { error } = await supabase
        .from('produtos')
        .update(editForm)
        .eq('id', editingProduto.id)

      if (error) throw error

      alert('Produto atualizado com sucesso!')
      setEditingProduto(null)
      setShowForm(false)
      setEditForm({
        nome: '',
        funcao: '',
        descricao: '',
        preco: 0,
        beneficios: '',
        contra_indicacoes: '',
        categoria: '',
        estoque: 0,
        ativo: true
      })
      loadProdutos()
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      alert('Erro ao atualizar produto')
    }
  }

  const handleDeleteProduto = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este produto?')) return

    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      alert('Produto desativado com sucesso!')
      loadProdutos()
    } catch (error) {
      console.error('Erro ao desativar produto:', error)
      alert('Erro ao desativar produto')
    }
  }

  const openEditModal = (produto: Produto) => {
    setEditingProduto(produto)
    setEditForm({
      nome: produto.nome,
      funcao: produto.funcao,
      descricao: produto.descricao,
      preco: produto.preco,
      beneficios: produto.beneficios,
      contra_indicacoes: produto.contra_indicacoes || '',
      categoria: produto.categoria,
      estoque: produto.estoque,
      ativo: produto.ativo
    })
    setShowForm(true)
  }

  const categorias = [...new Set(produtos.map(p => p.categoria))].filter(Boolean)
  const produtosFiltrados = categoriaFiltro === 'todas'
    ? produtos
    : produtos.filter(p => p.categoria === categoriaFiltro)

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria?.toLowerCase()) {
      case 'finalização': return '🎯'
      case 'modelador': return '🎨'
      case 'hidratação': return '💧'
      case 'fixador': return '🔒'
      case 'ferramenta': return '🛠️'
      default: return '📦'
    }
  }

  const getEstoqueStatus = (estoque: number) => {
    if (estoque === 0) return { color: 'text-red-400', bg: 'bg-red-500/20', status: 'Sem estoque' }
    if (estoque <= 5) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', status: 'Estoque baixo' }
    if (estoque <= 15) return { color: 'text-blue-400', bg: 'bg-blue-500/20', status: 'Estoque médio' }
    return { color: 'text-green-400', bg: 'bg-green-500/20', status: 'Estoque alto' }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando produtos...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Produtos</h1>
          <p className="text-purple-300">Gerencie o catálogo e estoque de produtos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
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
                Todas ({produtos.length})
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
                  {getCategoriaIcon(categoria)} {categoria} ({produtos.filter(p => p.categoria === categoria).length})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {produtosFiltrados.map((produto) => {
          const estoqueStatus = getEstoqueStatus(produto.estoque)
          return (
            <Card key={produto.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoriaIcon(produto.categoria)}</span>
                    <div>
                      <CardTitle className="text-white text-lg">{produto.nome}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-purple-700/50 text-purple-300 rounded">
                          {produto.categoria}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${estoqueStatus.bg} ${estoqueStatus.color}`}>
                          {produto.estoque} un.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditModal(produto)}
                      className="p-1 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduto(produto.id)}
                      className="p-1 text-red-300 hover:text-white hover:bg-red-700/50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mb-3">
                  <p className="text-purple-300 text-sm font-medium mb-1">{produto.funcao}</p>
                  <p className="text-purple-200 text-xs line-clamp-2">{produto.descricao}</p>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-300">Preço</span>
                    <span className="text-lg font-bold text-green-400">{formatCurrency(produto.preco)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-300">Estoque</span>
                    <span className={`text-sm font-medium ${estoqueStatus.color}`}>
                      {produto.estoque} unidades
                    </span>
                  </div>
                </div>

                {/* Benefícios */}
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-green-400 mb-1">✅ Benefícios:</h4>
                  <p className="text-xs text-purple-200 line-clamp-2">{produto.beneficios}</p>
                </div>

                {/* Contraindicações */}
                {produto.contra_indicacoes && (
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-yellow-400 mb-1">⚠️ Contraindicações:</h4>
                    <p className="text-xs text-purple-200 line-clamp-2">{produto.contra_indicacoes}</p>
                  </div>
                )}

                {/* Status do Estoque */}
                <div className={`p-2 rounded-lg ${estoqueStatus.bg} border border-opacity-20`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${estoqueStatus.color}`}>
                      {estoqueStatus.status}
                    </span>
                    {produto.estoque <= 5 && (
                      <AlertTriangle className={`w-4 h-4 ${estoqueStatus.color}`} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Novo/Editar Produto */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingProduto(null)
                  setEditForm({
                    nome: '',
                    funcao: '',
                    descricao: '',
                    preco: 0,
                    beneficios: '',
                    contra_indicacoes: '',
                    categoria: '',
                    estoque: 0,
                    ativo: true
                  })
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    placeholder="Ex: Pomada Modeladora"
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Categoria *</label>
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Finalização">Finalização</option>
                    <option value="Modelador">Modelador</option>
                    <option value="Hidratação">Hidratação</option>
                    <option value="Fixador">Fixador</option>
                    <option value="Ferramenta">Ferramenta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Função *</label>
                <input
                  type="text"
                  value={editForm.funcao}
                  onChange={(e) => setEditForm({ ...editForm, funcao: e.target.value })}
                  placeholder="Ex: Modelar e fixar cabelo"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição *</label>
                <textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  placeholder="Descreva o produto..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Benefícios *</label>
                <textarea
                  value={editForm.beneficios}
                  onChange={(e) => setEditForm({ ...editForm, beneficios: e.target.value })}
                  placeholder="Liste os benefícios do produto..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Contraindicações</label>
                <textarea
                  value={editForm.contra_indicacoes}
                  onChange={(e) => setEditForm({ ...editForm, contra_indicacoes: e.target.value })}
                  placeholder="Liste as contraindicações (opcional)..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.preco}
                    onChange={(e) => setEditForm({ ...editForm, preco: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Estoque (unidades) *</label>
                  <input
                    type="number"
                    value={editForm.estoque}
                    onChange={(e) => setEditForm({ ...editForm, estoque: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={editingProduto ? handleEditProduto : handleAddProduto}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingProduto ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingProduto(null)
                    setEditForm({
                      nome: '',
                      funcao: '',
                      descricao: '',
                      preco: 0,
                      beneficios: '',
                      contra_indicacoes: '',
                      categoria: '',
                      estoque: 0,
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{produtos.length}</div>
                <div className="text-sm text-purple-300">Total Produtos</div>
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
                  {formatCurrency(produtos.reduce((sum, p) => sum + (p.preco * p.estoque), 0))}
                </div>
                <div className="text-sm text-purple-300">Valor Estoque</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {produtos.length > 0 ? formatCurrency(Math.round(produtos.reduce((sum, p) => sum + p.preco, 0) / produtos.length)) : 'R$ 0'}
                </div>
                <div className="text-sm text-purple-300">Preço Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {produtos.filter(p => p.estoque <= 5).length}
                </div>
                <div className="text-sm text-purple-300">Estoque Baixo</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos com Estoque Baixo */}
      {produtos.filter(p => p.estoque <= 5).length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-800/30 to-orange-800/30 border-yellow-600/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span>Atenção - Produtos com Estoque Baixo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {produtos
                .filter(p => p.estoque <= 5)
                .map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getCategoriaIcon(produto.categoria)}</span>
                      <div>
                        <div className="text-white font-medium">{produto.nome}</div>
                        <div className="text-yellow-300 text-sm">{produto.categoria}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400">{produto.estoque} un.</div>
                      <div className="text-xs text-yellow-300">{formatCurrency(produto.preco)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
