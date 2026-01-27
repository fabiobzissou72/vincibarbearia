'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Plus, Edit, Trash2, Phone, Mail, Star, Award, X, Calendar, Lock, Eye, EyeOff } from 'lucide-react'

interface Profissional {
  id: string
  nome: string
  email: string
  telefone: string
  especialidades: string[] | string | null
  ativo: boolean
  data_cadastro: string
  foto_url?: string | null
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null)
  const [modoEspecialidade, setModoEspecialidade] = useState<'selecionar' | 'criar'>('selecionar')
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [especialidadesSelecionadas, setEspecialidadesSelecionadas] = useState<string[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    especialidade: '',
    ativo: true
  })

  // Estados para alteração de senha
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [alterandoSenha, setAlterandoSenha] = useState(false)

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
      // Validação
      if (!editForm.nome || !editForm.email || !editForm.telefone) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, Email e Telefone)')
        return
      }

      if (especialidadesSelecionadas.length === 0) {
        alert('Por favor, adicione pelo menos uma especialidade')
        return
      }

      // 1. Verificar se email já existe
      const { data: emailExiste } = await supabase
        .from('profissionais_login')
        .select('email')
        .eq('email', editForm.email)
        .maybeSingle()

      if (emailExiste) {
        alert('Este email já está cadastrado!')
        return
      }

      // 2. Criar profissional
      const { data: novoProfissional, error: profissionalError } = await supabase
        .from('profissionais')
        .insert([{
          nome: editForm.nome,
          telefone: editForm.telefone,
          especialidades: especialidadesSelecionadas,
          ativo: editForm.ativo,
          data_cadastro: new Date().toISOString()
        }])
        .select()
        .single()

      if (profissionalError || !novoProfissional) {
        console.error('Erro ao criar profissional:', profissionalError)
        throw profissionalError || new Error('Erro ao criar profissional')
      }

      // 2.5. Upload da foto (se houver)
      let fotoUrl = null
      if (fotoFile) {
        console.log('📸 Fazendo upload da foto...')
        fotoUrl = await uploadFoto(novoProfissional.id)
        if (fotoUrl) {
          console.log('💾 Salvando URL da foto no banco:', fotoUrl)
          // Atualizar profissional com a URL da foto
          const { error: updateFotoError } = await supabase
            .from('profissionais')
            .update({ foto_url: fotoUrl })
            .eq('id', novoProfissional.id)

          if (updateFotoError) {
            console.error('❌ Erro ao salvar URL da foto:', updateFotoError)
            alert('Foto foi enviada, mas houve erro ao salvar no banco de dados')
          } else {
            console.log('✅ URL da foto salva com sucesso!')
          }
        } else {
          console.warn('⚠️ Upload de foto falhou')
        }
      }

      // 3. Criar login (senha padrão: 123456)
      const { error: loginError } = await supabase
        .from('profissionais_login')
        .insert({
          profissional_id: novoProfissional.id,
          email: editForm.email,
          senha: '123456', // Senha padrão
          ativo: true
        })

      if (loginError) {
        // Se falhou ao criar login, deletar profissional
        await supabase
          .from('profissionais')
          .delete()
          .eq('id', novoProfissional.id)

        console.error('Erro ao criar login:', loginError)
        throw new Error('Erro ao criar credenciais de acesso')
      }

      alert('Profissional cadastrado com sucesso!\n\nSenha padrão: 123456\nOriente o profissional a alterar a senha no primeiro acesso.')
      resetForm()
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao cadastrar profissional:', error)
      alert('Erro ao cadastrar profissional: ' + (error as Error).message)
    }
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem')
        return
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB')
        return
      }

      setFotoFile(file)

      // Criar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFoto = async (profissionalId: string): Promise<string | null> => {
    if (!fotoFile) return null

    try {
      setUploadingFoto(true)
      console.log('🔄 Iniciando upload de foto para profissional:', profissionalId)

      // Nome único para o arquivo
      const fileExt = fotoFile.name.split('.').pop()
      const fileName = `${profissionalId}.${fileExt}`
      const filePath = `profissionais/${fileName}`

      console.log('📁 Caminho do arquivo:', filePath)

      // Fazer upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, fotoFile, {
          cacheControl: '3600',
          upsert: true // Substitui se já existir
        })

      if (uploadError) {
        console.error('❌ Erro ao fazer upload:', uploadError)
        alert(`Erro ao fazer upload da foto: ${uploadError.message}\n\nVerifique se o bucket 'fotos' existe e tem permissões públicas.`)
        throw uploadError
      }

      console.log('✅ Upload realizado:', uploadData)

      // Obter URL pública
      const { data } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath)

      console.log('🔗 URL pública gerada:', data.publicUrl)

      if (!data.publicUrl) {
        throw new Error('Não foi possível gerar URL pública')
      }

      return data.publicUrl
    } catch (error: any) {
      console.error('❌ Erro no upload da foto:', error)
      alert(`Erro ao salvar foto: ${error.message}`)
      return null
    } finally {
      setUploadingFoto(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingProfissional(null)
    setModoEspecialidade('selecionar')
    setNovaEspecialidade('')
    setEspecialidadesSelecionadas([])
    setFotoFile(null)
    setFotoPreview(null)
    setNovaSenha('')
    setConfirmarSenha('')
    setMostrarSenha(false)
    setEditForm({
      nome: '',
      email: '',
      telefone: '',
      especialidade: '',
      ativo: true
    })
  }

  const handleAlterarSenha = async () => {
    if (!editingProfissional) return

    if (!novaSenha) {
      alert('Digite a nova senha')
      return
    }

    if (novaSenha !== confirmarSenha) {
      alert('As senhas não conferem')
      return
    }

    if (novaSenha.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setAlterandoSenha(true)

      const response = await fetch('/api/auth/resetar-senha-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: editingProfissional.id,
          novaSenha
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || 'Erro ao alterar senha')
      } else {
        alert('Senha alterada com sucesso!')
        setNovaSenha('')
        setConfirmarSenha('')
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      alert('Erro ao conectar com o servidor')
    } finally {
      setAlterandoSenha(false)
    }
  }

  const handleEditProfissional = async () => {
    if (!editingProfissional) return

    try {
      // Validação
      if (!editForm.nome || !editForm.email || !editForm.telefone) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, Email e Telefone)')
        return
      }

      if (especialidadesSelecionadas.length === 0) {
        alert('Por favor, adicione pelo menos uma especialidade')
        return
      }

      // Verificar se email mudou e se já existe
      const { data: profissionalAtual } = await supabase
        .from('profissionais')
        .select('email')
        .eq('id', editingProfissional.id)
        .single()

      if (profissionalAtual && profissionalAtual.email !== editForm.email) {
        const { data: emailExiste } = await supabase
          .from('profissionais_login')
          .select('email')
          .eq('email', editForm.email)
          .maybeSingle()

        if (emailExiste) {
          alert('Este email já está sendo usado por outro profissional!')
          return
        }

        // Atualizar email na tabela de login
        await supabase
          .from('profissionais_login')
          .update({ email: editForm.email })
          .eq('profissional_id', editingProfissional.id)
      }

      // Upload da foto (se houver)
      let fotoUrl = editingProfissional.foto_url
      if (fotoFile) {
        console.log('📸 Fazendo upload da nova foto...')
        const novaFotoUrl = await uploadFoto(editingProfissional.id)
        if (novaFotoUrl) {
          console.log('✅ Nova foto enviada:', novaFotoUrl)
          fotoUrl = novaFotoUrl
        } else {
          console.warn('⚠️ Upload de nova foto falhou, mantendo foto anterior')
        }
      }

      console.log('💾 Atualizando profissional com foto_url:', fotoUrl)

      // Atualizar profissional
      const { error } = await supabase
        .from('profissionais')
        .update({
          nome: editForm.nome,
          email: editForm.email,
          telefone: editForm.telefone,
          especialidades: especialidadesSelecionadas,
          ativo: editForm.ativo,
          foto_url: fotoUrl
        })
        .eq('id', editingProfissional.id)

      if (error) {
        console.error('❌ Erro ao atualizar profissional:', error)
        throw error
      }

      console.log('✅ Profissional atualizado com sucesso!')
      alert('Profissional atualizado com sucesso!')
      resetForm()
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error)
      alert('Erro ao atualizar profissional: ' + (error as Error).message)
    }
  }

  const handleDeleteProfissional = async (id: string) => {
    if (!confirm('⚠️ ATENÇÃO!\n\nIsso vai DELETAR PERMANENTEMENTE o profissional do sistema.\n\nEssa ação NÃO pode ser desfeita!\n\nDeseja continuar?')) return

    try {
      // 1. Deletar webhooks do barbeiro primeiro (foreign key)
      const { error: errorWebhooks } = await supabase
        .from('webhooks_barbeiros')
        .delete()
        .eq('profissional_id', id)

      if (errorWebhooks) {
        console.warn('Aviso ao deletar webhooks:', errorWebhooks.message)
        // Continua mesmo se não tinha webhooks
      }

      // 2. Deletar login do profissional (foreign key)
      const { error: errorLogin } = await supabase
        .from('profissionais_login')
        .delete()
        .eq('profissional_id', id)

      if (errorLogin) {
        console.warn('Aviso ao deletar login:', errorLogin.message)
        // Continua mesmo se não tinha login
      }

      // 3. Atualizar agendamentos para remover referência (não deletar histórico)
      const { error: errorAgendamentos } = await supabase
        .from('agendamentos')
        .update({ profissional_id: null })
        .eq('profissional_id', id)

      if (errorAgendamentos) {
        console.warn('Aviso ao atualizar agendamentos:', errorAgendamentos.message)
      }

      // 4. Agora sim deletar o profissional
      const { error } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Profissional deletado com sucesso!')
      loadProfissionais()
    } catch (error) {
      console.error('Erro ao deletar profissional:', error)
      alert('❌ Erro ao deletar profissional: ' + (error as Error).message)
    }
  }

  const openEditModal = (profissional: Profissional) => {
    // Pegar todas especialidades existentes do profissional
    const especialidadesExistentes = Array.isArray(profissional.especialidades)
      ? profissional.especialidades
      : (profissional.especialidades ? [profissional.especialidades] : [])

    setEditingProfissional(profissional)
    setEspecialidadesSelecionadas(especialidadesExistentes)
    setFotoPreview(profissional.foto_url || null)
    setFotoFile(null)
    setEditForm({
      nome: profissional.nome || '',
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      especialidade: '',
      ativo: profissional.ativo
    })
    setModoEspecialidade('selecionar')
    setNovaEspecialidade('')
    setShowForm(true)
  }

  const getEspecialidadeIcon = (especialidade: string | null | undefined) => {
    if (!especialidade || typeof especialidade !== 'string') return '✂️'
    const esp = especialidade.toLowerCase()
    if (esp.includes('barba')) return '🧔'
    if (esp.includes('corte')) return '✂️'
    if (esp.includes('coloração')) return '🎨'
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
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
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
                  {profissional.foto_url ? (
                    <img
                      src={profissional.foto_url}
                      alt={profissional.nome}
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                    />
                  ) : (
                    <div className="text-3xl">
                      {getEspecialidadeIcon(
                        Array.isArray(profissional.especialidades)
                          ? profissional.especialidades[0]
                          : profissional.especialidades
                      )}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-white text-lg">{profissional.nome}</CardTitle>
                    {profissional.especialidades && (
                      <p className="text-purple-300 text-sm">
                        {Array.isArray(profissional.especialidades)
                          ? profissional.especialidades.join(', ')
                          : profissional.especialidades}
                      </p>
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
                onClick={resetForm}
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
                <label className="block text-sm text-slate-400 mb-1">Foto do Profissional</label>
                <div className="flex items-center space-x-4">
                  {fotoPreview && (
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-purple-500"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-1">Máximo 5MB - JPG, PNG, WEBP</p>
                  </div>
                  {fotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoFile(null)
                        setFotoPreview(null)
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Especialidades *</label>

                {/* Especialidades Selecionadas (Chips) */}
                {especialidadesSelecionadas.length > 0 && (
                  <div className="mb-3 p-3 bg-slate-700/30 rounded border border-slate-600/50">
                    <div className="text-xs text-slate-400 mb-2">Especialidades atuais:</div>
                    <div className="flex flex-wrap gap-2">
                      {especialidadesSelecionadas.map((esp, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-1 bg-purple-600/80 text-white px-3 py-1 rounded-full text-sm"
                        >
                          <span>{esp}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEspecialidadesSelecionadas(
                                especialidadesSelecionadas.filter((_, i) => i !== index)
                              )
                            }}
                            className="hover:bg-purple-700/50 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de modo */}
                <div className="flex space-x-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModoEspecialidade('selecionar')
                      setNovaEspecialidade('')
                    }}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      modoEspecialidade === 'selecionar'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                    }`}
                  >
                    Selecionar Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoEspecialidade('criar')
                      setEditForm({ ...editForm, especialidade: '' })
                    }}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      modoEspecialidade === 'criar'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                    }`}
                  >
                    Criar Nova
                  </button>
                </div>

                {/* Campo de seleção ou criação com botão Adicionar */}
                <div className="flex space-x-2">
                  {modoEspecialidade === 'selecionar' ? (
                    <select
                      value={editForm.especialidade}
                      onChange={(e) => setEditForm({ ...editForm, especialidade: e.target.value })}
                      className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Barbeiro">Barbeiro</option>
                      <option value="Barbeiro Especialista em Barba">Barbeiro Especialista em Barba</option>
                      <option value="Barbeiro Especialista em Corte">Barbeiro Especialista em Corte</option>
                      <option value="Barbeiro e Coloração">Barbeiro e Coloração</option>
                      <option value="Barbeiro Master">Barbeiro Master</option>
                    </select>
                  ) : (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={novaEspecialidade}
                        onChange={(e) => setNovaEspecialidade(e.target.value)}
                        placeholder="Ex: Barbeiro Especialista em Design de Sobrancelhas"
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const especialidadeParaAdicionar = modoEspecialidade === 'selecionar'
                        ? editForm.especialidade
                        : novaEspecialidade

                      if (!especialidadeParaAdicionar || especialidadeParaAdicionar.trim() === '') {
                        alert('Por favor, selecione ou digite uma especialidade')
                        return
                      }

                      // Verificar se já existe
                      if (especialidadesSelecionadas.includes(especialidadeParaAdicionar)) {
                        alert('Esta especialidade já foi adicionada')
                        return
                      }

                      // Adicionar à lista
                      setEspecialidadesSelecionadas([...especialidadesSelecionadas, especialidadeParaAdicionar])

                      // Limpar campos
                      setEditForm({ ...editForm, especialidade: '' })
                      setNovaEspecialidade('')
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {modoEspecialidade === 'criar' && (
                  <p className="text-xs text-slate-500 mt-1">Digite o nome da nova especialidade e clique em Adicionar</p>
                )}
              </div>

              {/* Seção de Alterar Senha - Apenas na edição */}
              {editingProfissional && (
                <div className="border-t border-slate-600 pt-4 mt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-medium">Alterar Senha de Acesso</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Nova Senha</label>
                      <div className="flex gap-2">
                        <input
                          type={mostrarSenha ? "text" : "password"}
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
                        >
                          {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Confirmar Senha</label>
                      <input
                        type={mostrarSenha ? "text" : "password"}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {confirmarSenha && novaSenha !== confirmarSenha && (
                    <p className="text-red-400 text-xs mt-1">As senhas não conferem</p>
                  )}

                  <button
                    type="button"
                    onClick={handleAlterarSenha}
                    disabled={alterandoSenha || !novaSenha || novaSenha !== confirmarSenha || novaSenha.length < 6}
                    className="mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded transition-colors disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{alterandoSenha ? 'Alterando...' : 'Alterar Senha'}</span>
                  </button>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={editingProfissional ? handleEditProfissional : handleAddProfissional}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingProfissional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                </button>
                <button
                  onClick={resetForm}
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
                  {profissionais.filter(p => {
                    const esp = Array.isArray(p.especialidades)
                      ? p.especialidades.join(' ')
                      : (p.especialidades || '')
                    return esp.includes('Master') || esp.includes('Especialista')
                  }).length}
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
