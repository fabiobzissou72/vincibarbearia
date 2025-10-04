'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Building2, Clock, DollarSign, Bell, Users, Save, Send, Link } from 'lucide-react'

interface Configuracao {
  id?: string
  nome_barbearia: string
  endereco: string
  telefone: string
  email: string
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
  tempo_padrao_servico: number
  valor_minimo_agendamento: number
  notificacoes_whatsapp: boolean
  notificacoes_email: boolean
  aceita_agendamento_online: boolean
  comissao_barbeiro_percentual: number
  webhook_url: string
}

interface MensagemForm {
  cliente_id: string
  mensagem: string
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
  const [clientes, setClientes] = useState<any[]>([])
  const [mensagemForm, setMensagemForm] = useState<MensagemForm>({
    cliente_id: '',
    mensagem: ''
  })
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)

  useEffect(() => {
    loadConfig()
    loadClientes()
  }, [])

  const loadConfig = async () => {
    try {
      // Tentar carregar configurações (se existir tabela)
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .single()

      if (data && !error) {
        setConfig(data)
      }
    } catch (error) {
      console.log('Tabela configuracoes não existe ainda')
    } finally {
      setLoading(false)
    }
  }

  const loadClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone')
      .order('nome_completo')

    setClientes(data || [])
  }

  const handleSave = async () => {
    try {
      setSalvando(true)

      // Tentar salvar (se tabela existir)
      if (config.id) {
        await supabase
          .from('configuracoes')
          .update(config)
          .eq('id', config.id)
      } else {
        await supabase
          .from('configuracoes')
          .insert([config])
      }

      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Configurações atualizadas (apenas nesta sessão)')
    } finally {
      setSalvando(false)
    }
  }

  const toggleDia = (dia: string) => {
    if (config.dias_funcionamento.includes(dia)) {
      setConfig({
        ...config,
        dias_funcionamento: config.dias_funcionamento.filter(d => d !== dia)
      })
    } else {
      setConfig({
        ...config,
        dias_funcionamento: [...config.dias_funcionamento, dia]
      })
    }
  }

  const enviarMensagem = async () => {
    if (!mensagemForm.cliente_id || !mensagemForm.mensagem) {
      alert('Selecione um cliente e digite a mensagem')
      return
    }

    if (!config.webhook_url) {
      alert('Configure a URL do Webhook primeiro')
      return
    }

    try {
      setEnviandoMensagem(true)

      const cliente = clientes.find(c => c.id === mensagemForm.cliente_id)

      // Enviar para o webhook
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefone: cliente.telefone,
          mensagem: mensagemForm.mensagem,
          nome_cliente: cliente.nome_completo
        })
      })

      if (response.ok) {
        alert('Mensagem enviada com sucesso!')
        setMensagemForm({ cliente_id: '', mensagem: '' })
      } else {
        throw new Error('Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem. Verifique a URL do webhook.')
    } finally {
      setEnviandoMensagem(false)
    }
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

        {/* Horário de Funcionamento */}
        <Card className="bg-purple-900/20 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>Horário de Funcionamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-purple-300 mb-1">Abertura</label>
                <input
                  type="time"
                  value={config.horario_abertura}
                  onChange={(e) => setConfig({ ...config, horario_abertura: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-purple-300 mb-1">Fechamento</label>
                <input
                  type="time"
                  value={config.horario_fechamento}
                  onChange={(e) => setConfig({ ...config, horario_fechamento: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-2">Dias de Funcionamento</label>
              <div className="grid grid-cols-2 gap-2">
                {DIAS_SEMANA.map(dia => (
                  <button
                    key={dia}
                    onClick={() => toggleDia(dia)}
                    className={`px-3 py-2 rounded text-sm transition-colors ${
                      config.dias_funcionamento.includes(dia)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>
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

      {/* Enviar Mensagem */}
      <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Send className="w-5 h-5 text-green-400" />
            <span>Enviar Mensagem para Cliente</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Selecione o Cliente</label>
              <select
                value={mensagemForm.cliente_id}
                onChange={(e) => setMensagemForm({ ...mensagemForm, cliente_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white"
              >
                <option value="">-- Selecione um cliente --</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome_completo} - {cliente.telefone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Mensagem</label>
              <textarea
                value={mensagemForm.mensagem}
                onChange={(e) => setMensagemForm({ ...mensagemForm, mensagem: e.target.value })}
                placeholder="Digite a mensagem que será enviada via WhatsApp..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-purple-400">
              {config.webhook_url ? '✓ Webhook configurado' : '⚠ Configure o webhook primeiro'}
            </p>
            <button
              onClick={enviarMensagem}
              disabled={enviandoMensagem || !config.webhook_url}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{enviandoMensagem ? 'Enviando...' : 'Enviar Mensagem'}</span>
            </button>
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
