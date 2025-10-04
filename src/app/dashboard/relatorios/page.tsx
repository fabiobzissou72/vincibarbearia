'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3, DollarSign, Users, Calendar, TrendingUp, Award,
  Scissors, Package, ShoppingBag, Star, Trophy, Download, Mail, FileText, Printer
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RelatorioData {
  agendamentos: any[]
  vendas: any[]
  profissionais: any[]
  servicos: any[]
  produtos: any[]
  clientes: any[]
}

export default function RelatoriosPage() {
  const router = useRouter()
  const [data, setData] = useState<RelatorioData>({
    agendamentos: [],
    vendas: [],
    profissionais: [],
    servicos: [],
    produtos: [],
    clientes: []
  })
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('todos')

  useEffect(() => {
    loadData()
  }, [periodo])

  const loadData = async () => {
    try {
      setLoading(true)

      // Calcular datas do período
      const hoje = new Date()
      let dataInicio = new Date()

      switch (periodo) {
        case 'hoje':
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0))
          break
        case 'semana':
          dataInicio = new Date(hoje.setDate(hoje.getDate() - 7))
          break
        case 'mes':
          dataInicio = new Date(hoje.setMonth(hoje.getMonth() - 1))
          break
        case 'ano':
          dataInicio = new Date(hoje.setFullYear(hoje.getFullYear() - 1))
          break
      }

      // Carregar TODOS os agendamentos (sem joins que podem falhar)
      const { data: todosAgendamentos, error: errAgendamentos } = await supabase
        .from('agendamentos')
        .select('*')
        .order('data_agendamento', { ascending: false })

      if (errAgendamentos) {
        console.error('Erro ao carregar agendamentos:', errAgendamentos)
      } else {
        console.log('Agendamentos carregados do banco:', todosAgendamentos)
      }

      console.log('=== DEBUG RELATÓRIOS ===')
      console.log('Todos agendamentos carregados:', todosAgendamentos?.length)
      console.log('Período selecionado:', periodo)

      // Filtrar agendamentos por período no JavaScript
      let agendamentos = todosAgendamentos || []
      if (periodo !== 'todos' && agendamentos.length > 0) {
        agendamentos = agendamentos.filter(a => {
          if (!a.data_agendamento) return false
          const [dia, mes, ano] = a.data_agendamento.split('/')
          const dataAgendamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
          return dataAgendamento >= dataInicio
        })
      }

      console.log('Agendamentos após filtro:', agendamentos?.length)
      console.log('Exemplo agendamento:', agendamentos?.[0])

      // Carregar TODAS as vendas
      const { data: todasVendas, error: errVendas } = await supabase
        .from('vendas')
        .select(`
          *,
          produtos (nome, preco),
          profissionais (nome),
          clientes (nome_completo)
        `)
        .order('data_venda', { ascending: false })

      if (errVendas) {
        console.error('Erro ao carregar vendas:', errVendas)
      }

      // Filtrar vendas por período no JavaScript
      let vendas = todasVendas || []
      if (periodo !== 'todos' && vendas.length > 0) {
        vendas = vendas.filter(v => {
          if (!v.data_venda) return false
          const dataVenda = new Date(v.data_venda)
          return dataVenda >= dataInicio
        })
      }

      // Carregar profissionais
      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)

      // Carregar serviços
      const { data: servicos } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)

      // Carregar produtos
      const { data: produtos } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)

      // Carregar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')

      setData({
        agendamentos: agendamentos || [],
        vendas: vendas || [],
        profissionais: profissionais || [],
        servicos: servicos || [],
        produtos: produtos || [],
        clientes: clientes || []
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar apenas agendamentos onde cliente COMPARECEU (ou não foi marcado ainda)
  const agendamentosComparecidos = data.agendamentos.filter(a => a.compareceu !== false)

  // Cálculos
  const totalAgendamentos = agendamentosComparecidos.length
  const totalVendas = data.vendas.length
  const faturamentoAgendamentos = agendamentosComparecidos.reduce((sum, a) => sum + (a.valor || 0), 0)
  const faturamentoVendas = data.vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0)
  const faturamentoTotal = faturamentoAgendamentos + faturamentoVendas

  // Ranking de barbeiros - APENAS agendamentos onde cliente compareceu
  const rankingBarbeiros = data.profissionais.map(prof => {
    const agendamentosProfissional = agendamentosComparecidos.filter(a => a.profissional_id === prof.id)
    const vendasProfissional = data.vendas.filter(v => v.profissional_id === prof.id)

    const faturamento =
      agendamentosProfissional.reduce((sum, a) => sum + (a.valor || 0), 0) +
      vendasProfissional.reduce((sum, v) => sum + (v.valor_total || 0), 0)

    const atendimentos = agendamentosProfissional.length

    return {
      nome: prof.nome,
      faturamento,
      atendimentos,
      vendas: vendasProfissional.length
    }
  }).sort((a, b) => b.faturamento - a.faturamento)

  // Serviços mais vendidos - APENAS de clientes que compareceram
  const servicosMaisVendidos = data.servicos.map(servico => {
    const quantidade = agendamentosComparecidos.filter(a => a.servico_id === servico.id).length
    const faturamento = quantidade * servico.preco
    return { nome: servico.nome, quantidade, faturamento }
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)

  // Produtos mais vendidos
  const produtosMaisVendidos = data.produtos.map(produto => {
    const vendasProduto = data.vendas.filter(v => v.produto_id === produto.id)
    const quantidade = vendasProduto.reduce((sum, v) => sum + v.quantidade, 0)
    const faturamento = vendasProduto.reduce((sum, v) => sum + v.valor_total, 0)
    return { nome: produto.nome, quantidade, faturamento }
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)

  // Clientes VIP - APENAS atendimentos onde compareceram
  const clientesVIP = data.clientes.map(cliente => {
    const atendimentos = agendamentosComparecidos.filter(a => a.cliente_id === cliente.id).length
    const totalGasto = agendamentosComparecidos
      .filter(a => a.cliente_id === cliente.id)
      .reduce((sum, a) => sum + (a.valor || 0), 0)

    return {
      nome: cliente.nome_completo,
      atendimentos,
      totalGasto
    }
  }).filter(c => c.atendimentos > 0)
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 10)

  // Status dos agendamentos
  const agendamentosPorStatus = {
    agendado: data.agendamentos.filter(a => a.status === 'agendado').length,
    confirmado: data.agendamentos.filter(a => a.status === 'confirmado').length,
    concluido: data.agendamentos.filter(a => a.status === 'concluido').length,
    cancelado: data.agendamentos.filter(a => a.status === 'cancelado').length
  }

  // Funções de exportação
  const exportarCSV = () => {
    const csv = [
      ['Relatório Vince Barbearia'],
      ['Período:', periodo],
      [''],
      ['Resumo Geral'],
      ['Faturamento Total', formatCurrency(faturamentoTotal)],
      ['Agendamentos', totalAgendamentos],
      ['Vendas', totalVendas],
      [''],
      ['Ranking Barbeiros'],
      ['Nome', 'Faturamento', 'Atendimentos', 'Vendas'],
      ...rankingBarbeiros.map(b => [b.nome, b.faturamento, b.atendimentos, b.vendas])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${periodo}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const imprimir = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando relatórios...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header com Filtros e Ações */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-purple-300">Análise completa do desempenho da barbearia</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Filtros de Período */}
          <div className="flex space-x-2">
            <button
              onClick={() => setPeriodo('todos')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                periodo === 'todos' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setPeriodo('hoje')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                periodo === 'hoje' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                periodo === 'semana' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                periodo === 'mes' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                periodo === 'ano' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Ano
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex space-x-2">
            <button
              onClick={exportarCSV}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={imprimir}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo - CLICÁVEIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="bg-gradient-to-br from-green-800/30 to-emerald-800/30 border-green-700/50 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.push('/dashboard')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-300">Faturamento Total</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(faturamentoTotal)}</div>
                <div className="text-xs text-green-400 mt-1">Clique para ver dashboard</div>
              </div>
              <DollarSign className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-blue-800/30 to-cyan-800/30 border-blue-700/50 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.push('/dashboard/agendamentos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-300">Agendamentos</div>
                <div className="text-2xl font-bold text-white">{totalAgendamentos}</div>
                <div className="text-xs text-blue-400 mt-1">Clique para ver agendamentos</div>
              </div>
              <Calendar className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-purple-800/30 to-pink-800/30 border-purple-700/50 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.push('/dashboard/vendas')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-300">Vendas de Produtos</div>
                <div className="text-2xl font-bold text-white">{totalVendas}</div>
                <div className="text-xs text-purple-400 mt-1">Clique para ver vendas</div>
              </div>
              <ShoppingBag className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-800/30 to-orange-800/30 border-yellow-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-300">Ticket Médio</div>
                <div className="text-2xl font-bold text-white">
                  {totalAgendamentos > 0 ? formatCurrency(faturamentoTotal / totalAgendamentos) : 'R$ 0'}
                </div>
              </div>
              <TrendingUp className="w-10 h-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Barbeiros - O Rei da Tesoura 👑 */}
      <Card className="bg-gradient-to-r from-yellow-800/30 to-orange-800/30 border-yellow-600/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>👑 Ranking dos Barbeiros - Os Reis da Tesoura</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankingBarbeiros.map((barbeiro, index) => (
              <div key={barbeiro.nome} className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-slate-700'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{barbeiro.nome}</div>
                    <div className="text-sm text-yellow-300">
                      {barbeiro.atendimentos} atendimentos • {barbeiro.vendas} vendas
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(barbeiro.faturamento)}</div>
                  <div className="text-xs text-yellow-300">Faturamento Total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Serviços Mais Vendidos - CLICÁVEL */}
        <Card
          className="bg-purple-800/30 border-purple-700/50 cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => router.push('/dashboard/servicos')}
        >
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-purple-400" />
              <span>Serviços Mais Populares</span>
              <span className="text-xs text-purple-400">(clique para ver serviços)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servicosMaisVendidos.map((servico, index) => (
                <div key={servico.nome} className="flex items-center justify-between p-3 bg-purple-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{servico.nome}</div>
                      <div className="text-sm text-purple-300">{servico.quantidade} vezes</div>
                    </div>
                  </div>
                  <div className="text-green-400 font-bold">{formatCurrency(servico.faturamento)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos - CLICÁVEL */}
        <Card
          className="bg-purple-800/30 border-purple-700/50 cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => router.push('/dashboard/produtos')}
        >
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-purple-400" />
              <span>Produtos Mais Vendidos</span>
              <span className="text-xs text-purple-400">(clique para ver produtos)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {produtosMaisVendidos.length > 0 ? (
                produtosMaisVendidos.map((produto, index) => (
                  <div key={produto.nome} className="flex items-center justify-between p-3 bg-purple-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{produto.nome}</div>
                        <div className="text-sm text-purple-300">{produto.quantidade} unidades</div>
                      </div>
                    </div>
                    <div className="text-green-400 font-bold">{formatCurrency(produto.faturamento)}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-purple-300">
                  Nenhuma venda de produto registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes VIP - CLICÁVEL */}
      <Card
        className="bg-gradient-to-r from-pink-800/30 to-purple-800/30 border-pink-700/50 cursor-pointer hover:border-pink-500 transition-colors"
        onClick={() => router.push('/dashboard/clientes')}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Star className="w-6 h-6 text-pink-400" />
            <span>⭐ Clientes VIP - Os Fiéis da Casa</span>
            <span className="text-xs text-pink-400">(clique para ver clientes)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clientesVIP.map((cliente) => (
              <div key={cliente.nome} className="flex items-center justify-between p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{cliente.nome}</div>
                    <div className="text-sm text-pink-300">{cliente.atendimentos} visitas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{formatCurrency(cliente.totalGasto)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status dos Agendamentos */}
      <Card className="bg-purple-800/30 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span>Status dos Agendamentos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-700/30 p-4 rounded-lg border border-blue-600/50">
              <div className="text-3xl font-bold text-blue-400">{agendamentosPorStatus.agendado}</div>
              <div className="text-sm text-blue-300">Agendado</div>
            </div>
            <div className="bg-green-700/30 p-4 rounded-lg border border-green-600/50">
              <div className="text-3xl font-bold text-green-400">{agendamentosPorStatus.confirmado}</div>
              <div className="text-sm text-green-300">Confirmado</div>
            </div>
            <div className="bg-purple-700/30 p-4 rounded-lg border border-purple-600/50">
              <div className="text-3xl font-bold text-purple-400">{agendamentosPorStatus.concluido}</div>
              <div className="text-sm text-purple-300">Concluído</div>
            </div>
            <div className="bg-red-700/30 p-4 rounded-lg border border-red-600/50">
              <div className="text-3xl font-bold text-red-400">{agendamentosPorStatus.cancelado}</div>
              <div className="text-sm text-red-300">Cancelado</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-800/30 border-green-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Scissors className="w-5 h-5 text-green-400" />
              <div className="text-sm text-green-300">Faturamento Serviços</div>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(faturamentoAgendamentos)}</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-800/30 border-blue-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <div className="text-sm text-blue-300">Faturamento Produtos</div>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(faturamentoVendas)}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-800/30 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <div className="text-sm text-purple-300">Total de Clientes</div>
            </div>
            <div className="text-2xl font-bold text-white">{data.clientes.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
