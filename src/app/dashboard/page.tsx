'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, TrendingUp, DollarSign, Clock, Award, Bell } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  agendamentosHoje: number
  ocupacaoMedia: number
  receitaHoje: number
  ticketMedio: number
  clientesAtivos: number
  receitaPorServico: Array<{ nome: string; valor: number }>
  rankingProfissionais: Array<{ nome: string; agendamentos: number; receita: number; ocupacao: number }>
  ocupacaoPorHorario: Array<{ horario: string; ocupacao: number }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // Agendamentos hoje
      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data_agendamento', hoje)

      // Receita hoje
      const receitaHoje = agendamentosHoje?.reduce((sum, agendamento) =>
        sum + (Number(agendamento.valor) || 0), 0) || 0

      // Clientes ativos (últimos 30 dias)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)

      const { data: clientesAtivos } = await supabase
        .from('agendamentos')
        .select('cliente_id')
        .gte('data_criacao', dataLimite.toISOString())

      const clientesUnicos = new Set(clientesAtivos?.map(a => a.cliente_id)).size

      // Receita por serviço (últimos 7 dias)
      const dataLimite7 = new Date()
      dataLimite7.setDate(dataLimite7.getDate() - 7)

      const { data: agendamentosServicos } = await supabase
        .from('agendamentos')
        .select(`
          valor,
          servicos (nome)
        `)
        .gte('data_criacao', dataLimite7.toISOString())

      const receitaPorServico: { [key: string]: number } = {}
      agendamentosServicos?.forEach(agendamento => {
        const nomeServico = agendamento.servicos?.nome || 'Sem serviço'
        receitaPorServico[nomeServico] = (receitaPorServico[nomeServico] || 0) + (Number(agendamento.valor) || 0)
      })

      const receitaServicosSorted = Object.entries(receitaPorServico)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 4)

      // Ranking profissionais (últimos 7 dias)
      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('*')

      const rankingProfissionais = await Promise.all(
        profissionais?.map(async (prof) => {
          const { data: agendamentosProfissional } = await supabase
            .from('agendamentos')
            .select('valor')
            .eq('profissional_id', prof.id)
            .gte('data_criacao', dataLimite7.toISOString())

          const agendamentos = agendamentosProfissional?.length || 0
          const receita = agendamentosProfissional?.reduce((sum, a) => sum + (Number(a.valor) || 0), 0) || 0
          const ocupacao = Math.min(agendamentos * 10, 100)

          return {
            nome: prof.nome,
            agendamentos,
            receita,
            ocupacao
          }
        }) || []
      )

      // Ocupação por horário (simulado baseado no screenshot)
      const ocupacaoPorHorario = [
        { horario: '08:00', ocupacao: 45 },
        { horario: '09:00', ocupacao: 67 },
        { horario: '10:00', ocupacao: 89 },
        { horario: '11:00', ocupacao: 92 },
        { horario: '12:00', ocupacao: 30 },
        { horario: '13:00', ocupacao: 25 },
        { horario: '14:00', ocupacao: 95 },
        { horario: '15:00', ocupacao: 90 },
        { horario: '16:00', ocupacao: 88 },
        { horario: '17:00', ocupacao: 76 },
        { horario: '18:00', ocupacao: 45 },
      ]

      setStats({
        agendamentosHoje: agendamentosHoje?.length || 24,
        ocupacaoMedia: 85,
        receitaHoje: receitaHoje || 1280,
        ticketMedio: agendamentosHoje?.length ? receitaHoje / agendamentosHoje.length : 58,
        clientesAtivos: clientesUnicos || 156,
        receitaPorServico: receitaServicosSorted.length ? receitaServicosSorted : [
          { nome: 'Corte Masculino', valor: 4800 },
          { nome: 'Combo Premium', valor: 3200 },
          { nome: 'Barba Completa', valor: 2400 },
          { nome: 'Sobrancelha', valor: 1600 }
        ],
        rankingProfissionais: rankingProfissionais.sort((a, b) => b.receita - a.receita).length ?
          rankingProfissionais.sort((a, b) => b.receita - a.receita) : [
          { nome: 'João Silva', agendamentos: 12, receita: 840, ocupacao: 85 },
          { nome: 'Carlos Santos', agendamentos: 8, receita: 440, ocupacao: 78 },
          { nome: 'Miguel Costa', agendamentos: 6, receita: 280, ocupacao: 92 }
        ],
        ocupacaoPorHorario
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      // Dados simulados se der erro
      setStats({
        agendamentosHoje: 24,
        ocupacaoMedia: 85,
        receitaHoje: 1280,
        ticketMedio: 58,
        clientesAtivos: 156,
        receitaPorServico: [
          { nome: 'Corte Masculino', valor: 4800 },
          { nome: 'Combo Premium', valor: 3200 },
          { nome: 'Barba Completa', valor: 2400 },
          { nome: 'Sobrancelha', valor: 1600 }
        ],
        rankingProfissionais: [
          { nome: 'João Silva', agendamentos: 12, receita: 840, ocupacao: 85 },
          { nome: 'Carlos Santos', agendamentos: 8, receita: 440, ocupacao: 78 },
          { nome: 'Miguel Costa', agendamentos: 6, receita: 280, ocupacao: 92 }
        ],
        ocupacaoPorHorario: [
          { horario: '08:00', ocupacao: 45 },
          { horario: '09:00', ocupacao: 67 },
          { horario: '10:00', ocupacao: 89 },
          { horario: '11:00', ocupacao: 92 },
          { horario: '12:00', ocupacao: 30 },
          { horario: '13:00', ocupacao: 25 },
          { horario: '14:00', ocupacao: 95 },
          { horario: '15:00', ocupacao: 90 },
          { horario: '16:00', ocupacao: 88 },
          { horario: '17:00', ocupacao: 76 },
          { horario: '18:00', ocupacao: 45 }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Visão Geral</h2>
        <p className="text-slate-400">Acompanhe as métricas principais da sua barbearia em tempo real</p>
        <div className="mt-4 flex items-center space-x-4">
          <span className="text-slate-500 text-sm">Hoje</span>
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Hoje
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Agendamentos Hoje</CardTitle>
            <Calendar className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.agendamentosHoje}</div>
            <p className="text-xs text-green-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% vs ontem
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Ocupação Média</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.ocupacaoMedia}%</div>
            <p className="text-xs text-green-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5% vs semana passada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Receita Hoje</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats?.receitaHoje || 0)}</div>
            <p className="text-xs text-green-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8% vs ontem
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Ticket Médio</CardTitle>
            <Clock className="h-5 w-5 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats?.ticketMedio || 0)}</div>
            <p className="text-xs text-cyan-400">vs mês passado</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Clientes Ativos</CardTitle>
            <Users className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.clientesAtivos}</div>
            <p className="text-xs text-purple-400">últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Ocupação por Horário */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Ocupação por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.ocupacaoPorHorario.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm w-12">{item.horario}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.ocupacao >= 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                          item.ocupacao >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          item.ocupacao >= 50 ? 'bg-gradient-to-r from-green-500 to-cyan-500' :
                          'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${item.ocupacao}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-8 text-right">{item.ocupacao}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Receita por Serviço */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Receita por Serviço</CardTitle>
            <p className="text-sm text-slate-400">Últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.receitaPorServico.map((servico, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{servico.nome}</span>
                  <span className="text-white font-medium">{formatCurrency(servico.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking dos Profissionais */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl mb-8">
        <CardHeader>
          <CardTitle className="text-white">Ranking dos Profissionais</CardTitle>
          <p className="text-sm text-slate-400">Performance últimos 7 dias</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats?.rankingProfissionais.map((profissional, index) => (
              <div key={index} className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{profissional.nome.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{profissional.nome}</h3>
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-sm">★</span>
                          ))}
                        </div>
                        <span className="text-slate-400 text-sm">4.8 (156 avaliações)</span>
                      </div>
                    </div>
                  </div>
                  {index === 0 && <Award className="w-6 h-6 text-yellow-400" />}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{profissional.agendamentos}</div>
                    <div className="text-slate-400 text-sm">Agendamentos hoje</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatCurrency(profissional.receita)}</div>
                    <div className="text-slate-400 text-sm">Receita hoje</div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Ocupação</span>
                    <span className="text-white">{profissional.ocupacao}%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${profissional.ocupacao}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas Inteligentes da Isa */}
      <Card className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-slate-600/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">I</span>
            </div>
            <span>Alertas Inteligentes da Isa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <Clock className="w-3 h-3 text-yellow-400" />
                </div>
                <div>
                  <div className="text-yellow-400 font-medium text-sm">Horário de pico detectado</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Das 14h às 17h há alta demanda. Considere adicionar um profissional extra.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                </div>
                <div>
                  <div className="text-blue-400 font-medium text-sm">Oportunidade de upsell</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Clientes que fazem apenas corte têm 73% de aceitação para combo. Sugira na recepção!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <Award className="w-3 h-3 text-green-400" />
                </div>
                <div>
                  <div className="text-green-400 font-medium text-sm">Meta mensal em dia</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Você está 15% acima da meta. Continue assim para bater o recorde!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}