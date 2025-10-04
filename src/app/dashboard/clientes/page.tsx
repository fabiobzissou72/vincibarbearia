'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Search, Phone, Mail, Calendar, Star, Edit, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

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
}

interface Profissional {
  id: string
  nome: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarbeiro, setSelectedBarbeiro] = useState('')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
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
    ultimo_servico: ''
  })
  const itemsPerPage = 20
  const searchParams = useSearchParams()

  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      setSearchTerm(searchQuery)
    }
    loadProfissionais()
    loadClientes(searchQuery || '', '', 1)
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

  const loadClientes = async (search: string = '', barbeiro: string = '', page: number = 1) => {
    try {
      setLoading(true)

      // Contar total de clientes
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

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
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
      menory_long: cliente.menory_long || '',
      tratamento: cliente.tratamento || '',
      ultimo_servico: cliente.ultimo_servico || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingCliente) return

    try {
      const { error } = await supabase
        .from('clientes')
        .update(editForm)
        .eq('id', editingCliente.id)

      if (error) throw error

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
      const { error } = await supabase
        .from('clientes')
        .insert([editForm])

      if (error) throw error

      alert('Cliente adicionado com sucesso!')
      setShowAddForm(false)
      setEditForm({
        nome_completo: '',
        telefone: '',
        email: '',
        profissional_preferido: '',
        observacoes: '',
        is_vip: false
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-purple-300">Total: {totalClientes} clientes cadastrados</p>
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
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500"
                />
              </div>

              <select
                value={selectedBarbeiro}
                onChange={(e) => {
                  setSelectedBarbeiro(e.target.value)
                  setCurrentPage(1)
                  loadClientes(searchTerm, e.target.value, 1)
                }}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white"
              >
                <option value="">Todos os Barbeiros</option>
                {profissionais.map(prof => (
                  <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-400">
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {cliente.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white text-lg">{cliente.nome_completo || 'Nome não informado'}</span>
                        {cliente.is_vip && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-purple-300">
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
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="p-2 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-400">Dados Pessoais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={editForm.nome_completo}
                      onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
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
                      type="date"
                      value={editForm.data_nascimento}
                      onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
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
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-purple-400">Preferências de Serviço</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Histórico e Memória */}
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-purple-400">Histórico e Memória</h3>

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
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-purple-400">Observações Gerais</h3>

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

            <div className="flex space-x-3 mt-6 border-t border-slate-700 pt-4">
              <button
                onClick={editingCliente ? handleSaveEdit : handleAddCliente}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingCliente ? 'Salvar Alterações' : 'Adicionar Cliente'}
              </button>
              <button
                onClick={() => {
                  setEditingCliente(null)
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
