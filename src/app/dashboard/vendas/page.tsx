'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, Plus, DollarSign, TrendingUp, Package, User, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Venda {
  id: string
  cliente_id: string | null
  profissional_id: string | null
  produto_id: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  forma_pagamento: string
  observacoes: string
  data_venda: string
  clientes: { nome_completo: string } | null
  profissionais: { nome: string } | null
  produtos: { nome: string; categoria: string }
}

interface Produto {
  id: string
  nome: string
  preco: number
  estoque: number
  categoria: string
}

interface Cliente {
  id: string
  nome_completo: string
  telefone: string
}

interface Profissional {
  id: string
  nome: string
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchCliente, setSearchCliente] = useState('')
  const [editForm, setEditForm] = useState({
    cliente_id: '',
    profissional_id: '',
    produto_id: '',
    quantidade: 1,
    forma_pagamento: 'dinheiro',
    observacoes: ''
  })

  useEffect(() => {
    loadVendas()
    loadProdutos()
    loadProfissionais()
  }, [])

  const loadVendas = async () => {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          clientes (nome_completo),
          profissionais (nome),
          produtos (nome, categoria)
        `)
        .order('data_venda', { ascending: false })
        .limit(50)

      if (error) throw error
      setVendas(data || [])
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco, estoque, categoria')
      .eq('ativo', true)
      .order('nome')
    setProdutos(data || [])
  }

  const loadProfissionais = async () => {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setProfissionais(data || [])
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

  const handleAddVenda = async () => {
    try {
      if (!editForm.produto_id) {
        alert('Selecione um produto')
        return
      }

      const produto = produtos.find(p => p.id === editForm.produto_id)
      if (!produto) return

      if (produto.estoque < editForm.quantidade) {
        alert(`Estoque insuficiente! Disponível: ${produto.estoque} unidades`)
        return
      }

      const valorUnitario = produto.preco
      const valorTotal = valorUnitario * editForm.quantidade

      const { error } = await supabase
        .from('vendas')
        .insert([{
          cliente_id: editForm.cliente_id || null,
          profissional_id: editForm.profissional_id || null,
          produto_id: editForm.produto_id,
          quantidade: editForm.quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          forma_pagamento: editForm.forma_pagamento,
          observacoes: editForm.observacoes
        }])

      if (error) throw error

      alert('Venda registrada com sucesso!')
      setShowForm(false)
      setEditForm({
        cliente_id: '',
        profissional_id: '',
        produto_id: '',
        quantidade: 1,
        forma_pagamento: 'dinheiro',
        observacoes: ''
      })
      setSearchCliente('')
      loadVendas()
      loadProdutos() // Atualizar estoque
    } catch (error) {
      console.error('Erro ao registrar venda:', error)
      alert('Erro ao registrar venda')
    }
  }

  const getFormaPagamentoIcon = (forma: string) => {
    switch (forma) {
      case 'dinheiro': return '💵'
      case 'cartao_debito': return '💳'
      case 'cartao_credito': return '💳'
      case 'pix': return '📱'
      default: return '💰'
    }
  }

  const getFormaPagamentoLabel = (forma: string) => {
    switch (forma) {
      case 'dinheiro': return 'Dinheiro'
      case 'cartao_debito': return 'Cartão Débito'
      case 'cartao_credito': return 'Cartão Crédito'
      case 'pix': return 'PIX'
      default: return forma
    }
  }

  const totalVendas = vendas.reduce((sum, v) => sum + v.valor_total, 0)
  const totalProdutosVendidos = vendas.reduce((sum, v) => sum + v.quantidade, 0)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando vendas...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vendas</h1>
          <p className="text-purple-300">Registre e acompanhe vendas de produtos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda</span>
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{vendas.length}</div>
                <div className="text-sm text-purple-300">Total de Vendas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold text-white">{formatCurrency(totalVendas)}</div>
                <div className="text-sm text-purple-300">Faturamento</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">{totalProdutosVendidos}</div>
                <div className="text-sm text-purple-300">Produtos Vendidos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {vendas.length > 0 ? formatCurrency(totalVendas / vendas.length) : 'R$ 0'}
                </div>
                <div className="text-sm text-purple-300">Ticket Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendas */}
      <Card className="bg-purple-800/30 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white">Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vendas.map((venda) => (
              <div key={venda.id} className="flex items-center justify-between p-4 bg-purple-700/30 rounded-lg hover:bg-purple-700/40 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-white font-medium">{venda.produtos.nome}</h3>
                      <span className="text-xs px-2 py-1 bg-purple-600/50 text-purple-200 rounded">
                        {venda.produtos.categoria}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-purple-300">
                      <span>Qtd: {venda.quantidade}</span>
                      {venda.clientes && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{venda.clientes.nome_completo}</span>
                        </span>
                      )}
                      {venda.profissionais && (
                        <span>Vendedor: {venda.profissionais.nome}</span>
                      )}
                      <span>{getFormaPagamentoIcon(venda.forma_pagamento)} {getFormaPagamentoLabel(venda.forma_pagamento)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">{formatCurrency(venda.valor_total)}</div>
                  <div className="text-xs text-purple-300">
                    {new Date(venda.data_venda).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(venda.data_venda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {vendas.length === 0 && (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Nenhuma venda registrada</h3>
                <p className="text-purple-300">Registre a primeira venda clicando no botão acima.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Nova Venda */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nova Venda</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditForm({
                    cliente_id: '',
                    profissional_id: '',
                    produto_id: '',
                    quantidade: 1,
                    forma_pagamento: 'dinheiro',
                    observacoes: ''
                  })
                  setSearchCliente('')
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Produto */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Produto *</label>
                <select
                  value={editForm.produto_id}
                  onChange={(e) => setEditForm({ ...editForm, produto_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                >
                  <option value="">Selecione o produto...</option>
                  {produtos.map(produto => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} - {formatCurrency(produto.preco)} (Estoque: {produto.estoque})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Quantidade *</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.quantidade}
                  onChange={(e) => setEditForm({ ...editForm, quantidade: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cliente (opcional)</label>
                <input
                  type="text"
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value)
                    searchClientes(e.target.value)
                  }}
                  placeholder="Buscar cliente por nome ou telefone..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
                {clientes.length > 0 && (
                  <div className="mt-2 bg-slate-700 rounded border border-slate-600 max-h-40 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setEditForm({ ...editForm, cliente_id: cliente.id })
                          setSearchCliente(`${cliente.nome_completo} - ${cliente.telefone}`)
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

              {/* Profissional */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Vendedor (opcional)</label>
                <select
                  value={editForm.profissional_id}
                  onChange={(e) => setEditForm({ ...editForm, profissional_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                >
                  <option value="">Selecione...</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.nome}</option>
                  ))}
                </select>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Forma de Pagamento *</label>
                <select
                  value={editForm.forma_pagamento}
                  onChange={(e) => setEditForm({ ...editForm, forma_pagamento: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="cartao_debito">💳 Cartão Débito</option>
                  <option value="cartao_credito">💳 Cartão Crédito</option>
                  <option value="pix">📱 PIX</option>
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  placeholder="Observações sobre a venda..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white h-20"
                />
              </div>

              {/* Resumo */}
              {editForm.produto_id && (
                <div className="bg-green-700/30 p-4 rounded-lg">
                  <div className="text-green-300 text-sm mb-1">Valor Total</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency((produtos.find(p => p.id === editForm.produto_id)?.preco || 0) * editForm.quantidade)}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAddVenda}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Registrar Venda
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditForm({
                      cliente_id: '',
                      profissional_id: '',
                      produto_id: '',
                      quantidade: 1,
                      forma_pagamento: 'dinheiro',
                      observacoes: ''
                    })
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
    </div>
  )
}
