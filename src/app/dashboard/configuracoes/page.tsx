'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Building2, Clock, DollarSign, Bell, Users, Save, Link, Key, Eye, EyeOff, Copy, RefreshCw, AlertTriangle, Lock } from 'lucide-react'
import { gerarTokenAPI } from '@/lib/auth'

interface HorarioDia {
  abertura: string
  fechamento: string
  ativo: boolean
}

interface Configuracao {
  id?: string
  nome_barbearia: string
  endereco: string
  telefone: string
  email: string
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
  horarios_por_dia: Record<string, HorarioDia>
  tempo_padrao_servico: number
  valor_minimo_agendamento: number
  notificacoes_whatsapp: boolean
  notificacoes_email: boolean
  aceita_agendamento_online: boolean
  comissao_barbeiro_percentual: number
  webhook_url: string
  webhook_senha_url?: string
  api_token?: string
  prazo_cancelamento_horas?: number
  notif_confirmacao?: boolean
  notif_lembrete_24h?: boolean
  notif_lembrete_2h?: boolean
  notif_followup_3d?: boolean
  notif_followup_21d?: boolean
  notif_cancelamento?: boolean
}

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracao>({
    nome_barbearia: 'Vince Barbearia',
    endereco: '',
    telefone: '',
    email: '',
    horario_abertura: '09:00',
    horario_fechamento: '19:00',
    dias_funcionamento: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    horarios_por_dia: {
      'Segunda': { abertura: '09:00', fechamento: '19:00', ativo: true },
      'Terça': { abertura: '09:00', fechamento: '19:00', ativo: true },
      'Quarta': { abertura: '09:00', fechamento: '19:00', ativo: true },
      'Quinta': { abertura: '09:00', fechamento: '19:00', ativo: true },
      'Sexta': { abertura: '09:00', fechamento: '19:00', ativo: true },
      'Sábado': { abertura: '09:00', fechamento: '18:00', ativo: true },
      'Domingo': { abertura: '09:00', fechamento: '18:00', ativo: false }
    },
    tempo_padrao_servico: 30,
    valor_minimo_agendamento: 0,
    notificacoes_whatsapp: true,
    notificacoes_email: false,
    aceita_agendamento_online: true,
    comissao_barbeiro_percentual: 50,
    webhook_url: '',
    webhook_senha_url: '',
    prazo_cancelamento_horas: 2,
    notif_confirmacao: true,
    notif_lembrete_24h: true,
    notif_lembrete_2h: true,
    notif_followup_3d: false,
    notif_followup_21d: false,
    notif_cancelamento: true
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarToken, setMostrarToken] = useState(false)
  const [barbeiros, setBarbeiros] = useState<any[]>([])
  const [webhooksBarbeiros, setWebhooksBarbeiros] = useState<any[]>([])
  const [editandoWebhook, setEditandoWebhook] = useState<string | null>(null)
  const [webhookTemp, setWebhookTemp] = useState({ url: '', eventos: ['novo_agendamento', 'cancelamento', 'confirmacao'], ativo: true })

  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)

  useEffect(() => {
    loadConfig()
    loadBarbeiros()
  }, [])

  const loadConfig = async () => {
    try {
      // Tentar carregar configurações (se existir tabela)
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .single()

      if (data && !error) {
        // Se não existir horarios_por_dia, criar baseado nos dados antigos
        if (!data.horarios_por_dia) {
          const horariosPorDia: Record<string, HorarioDia> = {}
          DIAS_SEMANA.forEach(dia => {
            horariosPorDia[dia] = {
              abertura: data.horario_abertura || '09:00',
              fechamento: data.horario_fechamento || '19:00',
              ativo: data.dias_funcionamento?.includes(dia) ?? false
            }
          })
          data.horarios_por_dia = horariosPorDia
        }

        // Garantir que os campos de notificação existam com valores padrão
        setConfig({
          ...data,
          prazo_cancelamento_horas: data.prazo_cancelamento_horas ?? 2,
          notif_confirmacao: data.notif_confirmacao ?? true,
          notif_lembrete_24h: data.notif_lembrete_24h ?? true,
          notif_lembrete_2h: data.notif_lembrete_2h ?? true,
          notif_followup_3d: data.notif_followup_3d ?? false,
          notif_followup_21d: data.notif_followup_21d ?? false,
          notif_cancelamento: data.notif_cancelamento ?? true
        })
      }
    } catch (error) {
      console.log('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSalvando(true)
      console.log('💾 Salvando configurações...', config)

      let result
      // Tentar salvar (se tabela existir)
      if (config.id) {
        console.log('📝 Atualizando registro existente, ID:', config.id)
        result = await supabase
          .from('configuracoes')
          .update(config)
          .eq('id', config.id)
      } else {
        console.log('➕ Criando novo registro')
        result = await supabase
          .from('configuracoes')
          .insert([config])
          .select()
          .single()
      }

      console.log('📊 Resultado:', result)

      if (result.error) {
        console.error('❌ Erro do Supabase:', result.error)
        throw result.error
      }

      // Se for inserção, atualizar com o novo ID retornado
      if (!config.id && result.data) {
        setConfig({ ...config, id: result.data.id })
      }

      alert('✅ Configurações salvas com sucesso!')
      console.log('✅ Salvo com sucesso!')

      // Recarregar configurações para garantir sincronização
      await loadConfig()
    } catch (error) {
      console.error('❌ Erro ao salvar:', error)
      alert('❌ Erro ao salvar configurações: ' + (error as any).message)
    } finally {
      setSalvando(false)
    }
  }

  const toggleDia = (dia: string) => {
    const novoAtivo = !config.horarios_por_dia[dia].ativo
    setConfig({
      ...config,
      horarios_por_dia: {
        ...config.horarios_por_dia,
        [dia]: {
          ...config.horarios_por_dia[dia],
          ativo: novoAtivo
        }
      },
      dias_funcionamento: novoAtivo
        ? [...config.dias_funcionamento, dia]
        : config.dias_funcionamento.filter(d => d !== dia)
    })
  }

  const updateHorarioDia = (dia: string, field: 'abertura' | 'fechamento', value: string) => {
    setConfig({
      ...config,
      horarios_por_dia: {
        ...config.horarios_por_dia,
        [dia]: {
          ...config.horarios_por_dia[dia],
          [field]: value
        }
      }
    })
  }

  const gerarNovoToken = async () => {
    if (!confirm('⚠️ Isso vai revogar o token anterior. Todas as integrações precisarão ser atualizadas. Confirma?')) {
      return
    }

    const novoToken = gerarTokenAPI()
    setConfig({ ...config, api_token: novoToken })
    alert('✅ Novo token gerado! Clique em Salvar Alterações para ativar.')
  }

  const copiarToken = () => {
    if (config.api_token) {
      navigator.clipboard.writeText(config.api_token)
      alert('✅ Token copiado!')
    } else {
      alert('⚠️ Nenhum token gerado ainda. Clique em "Gerar Novo Token" primeiro.')
    }
  }

  const loadBarbeiros = async () => {
    try {
      const { data: barbeirosList, error } = await supabase
        .from('profissionais')
        .select('id, nome, telefone')
        .eq('ativo', true)
        .order('nome')

      if (barbeirosList && !error) {
        setBarbeiros(barbeirosList)

        // Carregar webhooks de cada barbeiro
        const { data: webhooks } = await supabase
          .from('webhooks_barbeiros')
          .select('*')

        setWebhooksBarbeiros(webhooks || [])
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    }
  }

  const salvarWebhookBarbeiro = async (barbeiroId: string) => {
    try {
      const webhookExistente = webhooksBarbeiros.find(w => w.profissional_id === barbeiroId)

      if (webhookTemp.url) {
        if (webhookExistente) {
          // Atualizar
          const { error } = await supabase
            .from('webhooks_barbeiros')
            .update({
              webhook_url: webhookTemp.url,
              eventos: webhookTemp.eventos,
              ativo: webhookTemp.ativo
            })
            .eq('id', webhookExistente.id)

          if (!error) {
            alert('✅ Webhook atualizado com sucesso!')
          }
        } else {
          // Criar novo
          const { error } = await supabase
            .from('webhooks_barbeiros')
            .insert([{
              profissional_id: barbeiroId,
              webhook_url: webhookTemp.url,
              eventos: webhookTemp.eventos,
              ativo: webhookTemp.ativo
            }])

          if (!error) {
            alert('✅ Webhook configurado com sucesso!')
          }
        }
      } else {
        // Deletar se existir e URL vazia
        if (webhookExistente) {
          await supabase
            .from('webhooks_barbeiros')
            .delete()
            .eq('id', webhookExistente.id)

          alert('✅ Webhook removido!')
        }
      }

      setEditandoWebhook(null)
      setWebhookTemp({ url: '', eventos: ['novo_agendamento', 'cancelamento', 'confirmacao'], ativo: true })
      loadBarbeiros()
    } catch (error) {
      console.error('Erro ao salvar webhook:', error)
      alert('❌ Erro ao salvar webhook')
    }
  }

  const handleAlterarSenha = async () => {
    if (!novaSenha || !senhaAtual) {
      alert('Preencha todos os campos')
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

      // Buscar ID do profissional logado
      const profissionalStr = localStorage.getItem('profissional')
      if (!profissionalStr) {
        alert('Sessão expirada. Faça login novamente.')
        return
      }

      const profissional = JSON.parse(profissionalStr)

      const response = await fetch('/api/auth/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: profissional.profissional.id,
          senhaAtual,
          novaSenha
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || 'Erro ao alterar senha')
      } else {
        alert('Senha alterada com sucesso!')
        setSenhaAtual('')
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

  const iniciarEdicaoWebhook = (barbeiroId: string) => {
    const webhook = webhooksBarbeiros.find(w => w.profissional_id === barbeiroId)
    if (webhook) {
      setWebhookTemp({
        url: webhook.webhook_url,
        eventos: webhook.eventos,
        ativo: webhook.ativo
      })
    } else {
      setWebhookTemp({ url: '', eventos: ['novo_agendamento', 'cancelamento', 'confirmacao'], ativo: true })
    }
    setEditandoWebhook(barbeiroId)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando configurações...</div>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Configurações</h1>
          <p className="text-sm md:text-base text-purple-300">Gerencie as configurações da barbearia</p>
        </div>
        <button
          onClick={handleSave}
          disabled={salvando}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
        >
          <Save className="w-4 h-4" />
          <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Barbearia */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <span>Informações da Barbearia</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Nome da Barbearia</label>
              <input
                type="text"
                value={config.nome_barbearia}
                onChange={(e) => setConfig({ ...config, nome_barbearia: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Endereço</label>
              <input
                type="text"
                value={config.endereco}
                onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Telefone</label>
              <input
                type="text"
                value={config.telefone}
                onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Email</label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento - Ocupação Total */}
        <Card className="bg-purple-900/20 border-purple-700/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2 text-base md:text-lg">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>Horário de Funcionamento por Dia</span>
            </CardTitle>
            <p className="text-xs md:text-sm text-purple-300 mt-1">Configure os horários individuais para cada dia da semana</p>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            {DIAS_SEMANA.map(dia => {
              const horario = config.horarios_por_dia[dia]
              const isAtivo = horario?.ativo ?? false

              return (
                <div key={dia} className={`p-3 md:p-4 rounded-lg border transition-all ${
                  isAtivo
                    ? 'bg-purple-700/20 border-purple-600/50'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                    {/* Checkbox e Nome do Dia */}
                    <div className="flex items-center space-x-3 w-full md:min-w-[120px] md:w-auto">
                      <button
                        onClick={() => toggleDia(dia)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          isAtivo
                            ? 'bg-purple-600 border-purple-600'
                            : 'bg-slate-700 border-slate-600'
                        }`}
                      >
                        {isAtivo && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`font-medium text-sm md:text-base ${isAtivo ? 'text-white' : 'text-slate-400'}`}>
                        {dia}
                      </span>
                      {/* Status mobile */}
                      <div className="ml-auto md:hidden">
                        <span className={`text-xs px-2 py-1 rounded ${
                          isAtivo
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isAtivo ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>
                    </div>

                    {/* Horários */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1 w-full">
                      <div className="flex items-center gap-2 flex-1">
                        <label className={`text-xs md:text-sm whitespace-nowrap ${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>
                          Abertura:
                        </label>
                        <input
                          type="time"
                          value={horario?.abertura || '09:00'}
                          onChange={(e) => updateHorarioDia(dia, 'abertura', e.target.value)}
                          disabled={!isAtivo}
                          className={`flex-1 px-2 md:px-3 py-2 rounded text-xs md:text-sm ${
                            isAtivo
                              ? 'bg-slate-800 border border-purple-600/50 text-white'
                              : 'bg-slate-700/50 border border-slate-600/50 text-slate-500'
                          }`}
                        />
                      </div>

                      <span className={`hidden sm:inline ${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>às</span>

                      <div className="flex items-center gap-2 flex-1">
                        <label className={`text-xs md:text-sm whitespace-nowrap ${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>
                          Fechamento:
                        </label>
                        <input
                          type="time"
                          value={horario?.fechamento || '19:00'}
                          onChange={(e) => updateHorarioDia(dia, 'fechamento', e.target.value)}
                          disabled={!isAtivo}
                          className={`flex-1 px-2 md:px-3 py-2 rounded text-xs md:text-sm ${
                            isAtivo
                              ? 'bg-slate-800 border border-purple-600/50 text-white'
                              : 'bg-slate-700/50 border border-slate-600/50 text-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status desktop */}
                    <div className="hidden md:block min-w-[80px] text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        isAtivo
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isAtivo ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Configurações de Agendamento */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              <span>Agendamento e Valores</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Tempo Padrão por Serviço (min)</label>
              <input
                type="number"
                value={config.tempo_padrao_servico}
                onChange={(e) => setConfig({ ...config, tempo_padrao_servico: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Valor Mínimo Agendamento (R$)</label>
              <input
                type="number"
                value={config.valor_minimo_agendamento}
                onChange={(e) => setConfig({ ...config, valor_minimo_agendamento: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Comissão Barbeiro (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.comissao_barbeiro_percentual}
                onChange={(e) => setConfig({ ...config, comissao_barbeiro_percentual: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
              <span className="text-purple-300">Aceitar Agendamento Online</span>
              <button
                onClick={() => setConfig({ ...config, aceita_agendamento_online: !config.aceita_agendamento_online })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.aceita_agendamento_online ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.aceita_agendamento_online ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Link className="w-5 h-5 text-purple-400" />
              <span>Webhook de Notificações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">URL do Webhook (N8N) - Agendamentos</label>
              <input
                type="url"
                value={config.webhook_url}
                onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                placeholder="https://seu-n8n.com/webhook/..."
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white text-sm"
              />
              <p className="text-xs text-purple-400 mt-1">
                Webhook para notificações de agendamentos, cancelamentos e confirmações
              </p>
            </div>

            <div>
              <label className="block text-sm text-purple-300 mb-1">URL do Webhook - Senha Temporária</label>
              <input
                type="url"
                value={config.webhook_senha_url || ''}
                onChange={(e) => setConfig({ ...config, webhook_senha_url: e.target.value })}
                placeholder="https://seu-n8n.com/webhook/senha-temporaria"
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white text-sm"
              />
              <p className="text-xs text-purple-400 mt-1">
                🔐 Webhook separado para envio de senhas temporárias via WhatsApp (não interfere nas automações)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Cancelamento */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>Sistema de Cancelamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Prazo Mínimo para Cancelamento (horas)</label>
              <input
                type="number"
                min="0"
                max="48"
                value={config.prazo_cancelamento_horas || 2}
                onChange={(e) => setConfig({ ...config, prazo_cancelamento_horas: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
              <p className="text-xs text-purple-400 mt-1">
                Cliente deve cancelar com pelo menos {config.prazo_cancelamento_horas || 2}h de antecedência
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Segurança da API */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-purple-400" />
              <span>Segurança da API</span>
            </CardTitle>
            <p className="text-sm text-purple-300 mt-1">
              Token de autenticação para acesso às APIs externas
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Token API</label>
              <div className="flex gap-2">
                <input
                  type={mostrarToken ? "text" : "password"}
                  value={config.api_token || 'Nenhum token gerado'}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white font-mono text-sm"
                />
                <button
                  onClick={() => setMostrarToken(!mostrarToken)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  title={mostrarToken ? "Ocultar token" : "Mostrar token"}
                >
                  {mostrarToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copiarToken}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  title="Copiar token"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={gerarNovoToken}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Gerar Novo Token (Revoga o anterior)</span>
            </button>

            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">⚠️ Importante:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Guarde este token em local seguro</li>
                    <li>Todas as APIs externas precisam deste token</li>
                    <li>Use no header: <code className="bg-slate-800 px-1 rounded">Authorization: Bearer SEU_TOKEN</code></li>
                    <li>Gerar novo token revoga o anterior imediatamente</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minha Conta - Alterar Senha */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <span>Minha Conta</span>
            </CardTitle>
            <p className="text-sm text-purple-300 mt-1">
              Altere sua senha de acesso ao sistema
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Senha Atual</label>
              <div className="flex gap-2">
                <input
                  type={mostrarSenhaAtual ? "text" : "password"}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  {mostrarSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-purple-300 mb-1">Nova Senha</label>
              <div className="flex gap-2">
                <input
                  type={mostrarNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  {mostrarNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-purple-300 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite novamente a nova senha"
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-red-400 text-xs mt-1">As senhas não conferem</p>
              )}
            </div>

            <button
              onClick={handleAlterarSenha}
              disabled={alterandoSenha || !senhaAtual || !novaSenha || novaSenha !== confirmarSenha}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>{alterandoSenha ? 'Alterando...' : 'Alterar Senha'}</span>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Notificações Automáticas N8N */}
      <Card className="bg-purple-900/20 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <span>Notificações Automáticas (N8N)</span>
          </CardTitle>
          <p className="text-sm text-purple-300 mt-1">
            Configure quais notificações serão enviadas automaticamente via webhook N8N
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Confirmação Imediata */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>✅</span>
                  <span>Confirmação Imediata</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">Após criar agendamento</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_confirmacao: !config.notif_confirmacao })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_confirmacao ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_confirmacao ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Lembrete 24h */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>⏰</span>
                  <span>Lembrete 24h Antes</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">1 dia antes do horário</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_lembrete_24h: !config.notif_lembrete_24h })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_lembrete_24h ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_lembrete_24h ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Lembrete 2h */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>🔔</span>
                  <span>Lembrete 2h Antes</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">2 horas antes do horário</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_lembrete_2h: !config.notif_lembrete_2h })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_lembrete_2h ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_lembrete_2h ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Follow-up 3 dias */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>💬</span>
                  <span>Follow-up 3 Dias</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">Pedir feedback (3 dias após)</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_followup_3d: !config.notif_followup_3d })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_followup_3d ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_followup_3d ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Follow-up 21 dias */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>📅</span>
                  <span>Follow-up 21 Dias</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">Lembrete para reagendar</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_followup_21d: !config.notif_followup_21d })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_followup_21d ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_followup_21d ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Cancelamento */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-purple-600/30">
              <div className="flex-1">
                <div className="text-white font-medium flex items-center space-x-2">
                  <span>❌</span>
                  <span>Cancelamentos</span>
                </div>
                <div className="text-xs text-purple-300 mt-1">Notificar ao cancelar</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notif_cancelamento: !config.notif_cancelamento })}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  config.notif_cancelamento ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notif_cancelamento ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <div className="text-blue-300 font-medium mb-1">Como Funciona</div>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• Notificações são enviadas automaticamente via webhook N8N</li>
                  <li>• Configure a URL do webhook acima na seção "Webhook de Notificações"</li>
                  <li>• Configure um workflow no N8N para chamar: <code className="bg-slate-800 px-1 rounded">/api/cron/lembretes</code></li>
                  <li>• Sugestão: Execute a cada hora entre 8h-20h</li>
                  <li>• Todas as notificações são registradas no banco de dados</li>
                  <li>• Veja o guia <strong>N8N-CRON-FOLLOWUP.md</strong> no GitHub para detalhes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks por Barbeiro */}
      <Card className="bg-purple-900/20 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <span>Webhooks Personalizados por Barbeiro</span>
          </CardTitle>
          <p className="text-sm text-purple-300 mt-1">
            Configure webhooks individuais para cada barbeiro receber notificações de seus próprios agendamentos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {barbeiros.map(barbeiro => {
              const webhook = webhooksBarbeiros.find(w => w.profissional_id === barbeiro.id)
              const estaEditando = editandoWebhook === barbeiro.id

              return (
                <div key={barbeiro.id} className="p-4 bg-slate-800 rounded-lg border border-purple-600/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-medium">{barbeiro.nome}</div>
                      <div className="text-xs text-purple-300">{barbeiro.telefone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {webhook && (
                        <span className={`text-xs px-2 py-1 rounded ${webhook.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {webhook.ativo ? '● Ativo' : '○ Inativo'}
                        </span>
                      )}
                      <button
                        onClick={() => iniciarEdicaoWebhook(barbeiro.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                      >
                        {webhook ? 'Editar' : 'Configurar'}
                      </button>
                    </div>
                  </div>

                  {estaEditando && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-slate-700">
                      <div>
                        <label className="block text-sm text-purple-300 mb-1">URL do Webhook</label>
                        <input
                          type="url"
                          value={webhookTemp.url}
                          onChange={(e) => setWebhookTemp({ ...webhookTemp, url: e.target.value })}
                          placeholder="https://seu-n8n.com/webhook/barbeiro-notif"
                          className="w-full px-3 py-2 bg-slate-700 border border-purple-600/50 rounded text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-300 mb-2">Eventos</label>
                        <div className="flex flex-wrap gap-2">
                          {['novo_agendamento', 'cancelamento', 'confirmacao'].map(evento => (
                            <label key={evento} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={webhookTemp.eventos.includes(evento)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setWebhookTemp({ ...webhookTemp, eventos: [...webhookTemp.eventos, evento] })
                                  } else {
                                    setWebhookTemp({ ...webhookTemp, eventos: webhookTemp.eventos.filter(ev => ev !== evento) })
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="capitalize">{evento.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhookTemp.ativo}
                            onChange={(e) => setWebhookTemp({ ...webhookTemp, ativo: e.target.checked })}
                            className="rounded"
                          />
                          <span>Webhook ativo</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => salvarWebhookBarbeiro(barbeiro.id)}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          💾 Salvar Webhook
                        </button>
                        <button
                          onClick={() => {
                            setEditandoWebhook(null)
                            setWebhookTemp({ url: '', eventos: ['novo_agendamento', 'cancelamento', 'confirmacao'], ativo: true })
                          }}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {webhook && !estaEditando && (
                    <div className="mt-2 text-xs text-slate-400">
                      <div className="truncate">🔗 {webhook.webhook_url}</div>
                      <div>📋 Eventos: {webhook.eventos.join(', ')}</div>
                    </div>
                  )}
                </div>
              )
            })}

            {barbeiros.length === 0 && (
              <div className="text-center py-8 text-purple-300">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum barbeiro cadastrado</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <div className="text-blue-300 font-medium mb-1">Como Funciona</div>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• Cada barbeiro pode ter seu próprio webhook personalizado</li>
                  <li>• Webhooks são disparados apenas para agendamentos daquele barbeiro</li>
                  <li>• Configure no N8N para enviar notificações WhatsApp individuais</li>
                  <li>• Escolha quais eventos cada barbeiro quer receber</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="bg-purple-900/20 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Informações do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-800 rounded">
              <div className="text-purple-300">Versão do Sistema</div>
              <div className="text-white font-bold">v1.0.0</div>
            </div>
            <div className="p-4 bg-slate-800 rounded">
              <div className="text-purple-300">Integração N8N</div>
              <div className="text-green-400 font-bold">● Ativo</div>
            </div>
            <div className="p-4 bg-slate-800 rounded">
              <div className="text-purple-300">Google Calendar</div>
              <div className="text-green-400 font-bold">● Conectado</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
