'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Plus, Edit, Trash2, Phone, Mail, Star, Award, X, Calendar } from 'lucide-react'

interface Profissional {
  id: string
  nome: string
  email: string
  telefone: string
  especialidade: string
  ativo: boolean
  data_cadastro: string
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null)
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    especialidade: '',
    ativo: true
  })

  useEffect(() => {
    loadProfissionais()
  }, [])

  const loadProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setProfissionais(data || [])
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProfissional = async () => {
    try {
      const { error } = await supabase
        .from('profissionais')
        .insert([{
          ...editForm,
          data_cadastro: new Date().toISOString()
        }])

      if (error) throw error

      alert('Profissional cadastrado com sucesso!')
      setShowForm(false)
      setEditForm({
        nome: '',
        email: '',
        telefone: '',
        especialidade: '',
        ativo: true
      })
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao cadastrar profissional:', error)
      alert('Erro ao cadastrar profissional')
    }
  }

  const handleEditProfissional = async () => {
    if (!editingProfissional) return

    try {
      const { error } = await supabase
        .from('profissionais')
        .update(editForm)
        .eq('id', editingProfissional.id)

      if (error) throw error

      alert('Profissional atualizado com sucesso!')
      setEditingProfissional(null)
      setShowForm(false)
      setEditForm({
        nome: '',
        email: '',
        telefone: '',
        especialidade: '',
        ativo: true
      })
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error)
      alert('Erro ao atualizar profissional')
    }
  }

  const handleDeleteProfissional = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este profissional?')) return

    try {
      const { error } = await supabase
        .from('profissionais')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      alert('Profissional desativado com sucesso!')
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao desativar profissional:', error)
      alert('Erro ao desativar profissional')
    }
  }

  const openEditModal = (profissional: Profissional) => {
    setEditingProfissional(profissional)
    setEditForm({
      nome: profissional.nome,
      email: profissional.email,
      telefone: profissional.telefone,
      especialidade: profissional.especialidade || '',
      ativo: profissional.ativo
    })
    setShowForm(true)
  }

  const getEspecialidadeIcon = (especialidade: string) => {
    if (!especialidade) return '✂️'
    if (especialidade.toLowerCase().includes('barba')) return '🧔'
    if (especialidade.toLowerCase().includes('corte')) return '✂️'
    if (especialidade.toLowerCase().includes('coloração')) return '🎨'
    return '💈'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando profissionais...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profissionais</h1>
          <p className="text-purple-300">Gerencie a equipe da barbearia</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Profissional</span>
        </button>
      </div>

      {/* Grid de Profissionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profissionais.map((profissional) => (
          <Card key={profissional.id} className="bg-purple-800/30 border-purple-700/50 hover:bg-purple-800/40 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {getEspecialidadeIcon(profissional.especialidade)}
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{profissional.nome}</CardTitle>
                    {profissional.especialidade && (
                      <p className="text-purple-300 text-sm">{profissional.especialidade}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => openEditModal(profissional)}
                    className="p-1 text-purple-300 hover:text-white hover:bg-purple-700/50 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProfissional(profissional.id)}
                    className="p-1 text-red-300 hover:text-white hover:bg-red-700/50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {/* Contatos */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-200">{profissional.telefone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-200">{profissional.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-200">
                    Desde {new Date(profissional.data_cadastro).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="pt-3 border-t border-purple-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-300">Status</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    profissional.ativo
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {profissional.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profissionais.length === 0 && (
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-8 text-center">
            <UserCheck className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum profissional cadastrado</h3>
            <p className="text-purple-300">Cadastre o primeiro profissional clicando no botão acima.</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Novo/Editar Profissional */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingProfissional(null)
                  setEditForm({
                    nome: '',
                    email: '',
                    telefone: '',
                    especialidade: '',
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
                <label className="block text-sm text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Ex: joao@vincebarbearia.com"
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Telefone *</label>
                  <input
                    type="text"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Especialidade</label>
                <select
                  value={editForm.especialidade}
                  onChange={(e) => setEditForm({ ...editForm, especialidade: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Barbeiro">Barbeiro</option>
                  <option value="Barbeiro Especialista em Barba">Barbeiro Especialista em Barba</option>
                  <option value="Barbeiro Especialista em Corte">Barbeiro Especialista em Corte</option>
                  <option value="Barbeiro e Coloração">Barbeiro e Coloração</option>
                  <option value="Barbeiro Master">Barbeiro Master</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={editingProfissional ? handleEditProfissional : handleAddProfissional}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingProfissional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingProfissional(null)
                    setEditForm({
                      nome: '',
                      email: '',
                      telefone: '',
                      especialidade: '',
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{profissionais.length}</div>
                <div className="text-sm text-purple-300">Total de Profissionais</div>
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
                  {profissionais.filter(p => p.especialidade?.includes('Master') || p.especialidade?.includes('Especialista')).length}
                </div>
                <div className="text-sm text-purple-300">Especialistas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {profissionais.filter(p => p.ativo).length}
                </div>
                <div className="text-sm text-purple-300">Profissionais Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
