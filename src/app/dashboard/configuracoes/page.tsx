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
