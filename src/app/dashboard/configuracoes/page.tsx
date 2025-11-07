'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Building2, Clock, DollarSign, Bell, Users, Save, Link } from 'lucide-react'

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
    webhook_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    loadConfig()
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
        setConfig(data)
      }
    } catch (error) {
      console.log('Tabela configuracoes não existe ainda')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSalvando(true)

      let result
      // Tentar salvar (se tabela existir)
      if (config.id) {
        result = await supabase
          .from('configuracoes')
          .update(config)
          .eq('id', config.id)
      } else {
        result = await supabase
          .from('configuracoes')
          .insert([config])
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      // Se for inserção, atualizar com o novo ID retornado
      if (!config.id && result.data) {
        setConfig({ ...config, id: result.data.id })
      }

      alert('Configurações salvas com sucesso!')
      // Recarregar configurações para garantir sincronização
      await loadConfig()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar configurações: ' + (error as any).message)
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando configurações...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-purple-300">Gerencie as configurações da barbearia</p>
        </div>
        <button
          onClick={handleSave}
          disabled={salvando}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
            <CardTitle className="text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>Horário de Funcionamento por Dia</span>
            </CardTitle>
            <p className="text-sm text-purple-300 mt-1">Configure os horários individuais para cada dia da semana</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {DIAS_SEMANA.map(dia => {
              const horario = config.horarios_por_dia[dia]
              const isAtivo = horario?.ativo ?? false

              return (
                <div key={dia} className={`p-4 rounded-lg border transition-all ${
                  isAtivo
                    ? 'bg-purple-700/20 border-purple-600/50'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    {/* Checkbox e Nome do Dia */}
                    <div className="flex items-center space-x-3 min-w-[120px]">
                      <button
                        onClick={() => toggleDia(dia)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
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
                      <span className={`font-medium ${isAtivo ? 'text-white' : 'text-slate-400'}`}>
                        {dia}
                      </span>
                    </div>

                    {/* Horários */}
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center space-x-2 flex-1">
                        <label className={`text-sm whitespace-nowrap ${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>
                          Abertura:
                        </label>
                        <input
                          type="time"
                          value={horario?.abertura || '09:00'}
                          onChange={(e) => updateHorarioDia(dia, 'abertura', e.target.value)}
                          disabled={!isAtivo}
                          className={`px-3 py-2 rounded text-sm ${
                            isAtivo
                              ? 'bg-slate-800 border border-purple-600/50 text-white'
                              : 'bg-slate-700/50 border border-slate-600/50 text-slate-500'
                          }`}
                        />
                      </div>

                      <span className={`${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>às</span>

                      <div className="flex items-center space-x-2 flex-1">
                        <label className={`text-sm whitespace-nowrap ${isAtivo ? 'text-purple-300' : 'text-slate-500'}`}>
                          Fechamento:
                        </label>
                        <input
                          type="time"
                          value={horario?.fechamento || '19:00'}
                          onChange={(e) => updateHorarioDia(dia, 'fechamento', e.target.value)}
                          disabled={!isAtivo}
                          className={`px-3 py-2 rounded text-sm ${
                            isAtivo
                              ? 'bg-slate-800 border border-purple-600/50 text-white'
                              : 'bg-slate-700/50 border border-slate-600/50 text-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="min-w-[80px] text-right">
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
              <label className="block text-sm text-purple-300 mb-1">URL do Webhook (N8N)</label>
              <input
                type="url"
                value={config.webhook_url}
                onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                placeholder="https://seu-n8n.com/webhook/..."
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white text-sm"
              />
              <p className="text-xs text-purple-400 mt-1">
                Cole aqui a URL do webhook do N8N para enviar notificações WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-purple-400" />
              <span>Configurações de Notificação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
              <div>
                <div className="text-white font-medium">WhatsApp</div>
                <div className="text-sm text-purple-300">Enviar notificações via WhatsApp</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notificacoes_whatsapp: !config.notificacoes_whatsapp })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.notificacoes_whatsapp ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notificacoes_whatsapp ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
              <div>
                <div className="text-white font-medium">Email</div>
                <div className="text-sm text-purple-300">Enviar notificações por email</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notificacoes_email: !config.notificacoes_email })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.notificacoes_email ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notificacoes_email ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

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
