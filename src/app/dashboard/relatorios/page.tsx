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
  agendamentos: Array<Record<string, unknown>>
  agendamentoServicos: Array<Record<string, unknown>>
  movimentosFinanceiros: Array<Record<string, unknown>>
  vendas: Array<Record<string, unknown>>
  profissionais: Array<Record<string, unknown>>
  servicos: Array<Record<string, unknown>>
  produtos: Array<Record<string, unknown>>
  clientes: Array<Record<string, unknown>>
  totalClientesCount: number
}

export default function RelatoriosPage() {
  const router = useRouter()
  const [data, setData] = useState<RelatorioData>({
    agendamentos: [],
    agendamentoServicos: [],
    movimentosFinanceiros: [],
    vendas: [],
    profissionais: [],
    servicos: [],
    produtos: [],
    clientes: [],
    totalClientesCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('todos')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Carregar relacionamentos de serviços dos agendamentos
      const { data: agendamentoServicos } = await supabase
        .from('agendamento_servicos')
        .select('agendamento_id, servico_id, preco, duracao_minutos')

      console.log('Agendamento_servicos carregados:', agendamentoServicos?.length)

      // Carregar movimentos financeiros
      const { data: movimentosFinanceiros, error: errMovimentos } = await supabase
        .from('movimentos_financeiros')
        .select('*')
        .order('data_movimento', { ascending: false })
        .order('hora_movimento', { ascending: false })

      if (errMovimentos) {
        console.log('Tabela movimentos_financeiros ainda não existe:', errMovimentos.message)
      } else {
        console.log('Movimentos financeiros carregados:', movimentosFinanceiros?.length)
      }

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

      // Carregar CONTAGEM TOTAL de clientes (mais eficiente)
      const { count: totalClientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })

      console.log('=== DEBUG TOTAL CLIENTES ===')
      console.log('Total de clientes (count):', totalClientesCount)

      // Carregar clientes (para cálculo de VIP)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')

      console.log('Clientes carregados para VIP:', clientes?.length)

      // Filtrar movimentos por período
      let movimentos = movimentosFinanceiros || []
      if (periodo !== 'todos' && movimentos.length > 0) {
        movimentos = movimentos.filter(m => {
          if (!m.data_movimento) return false
          const dataMovimento = new Date(m.data_movimento)
          return dataMovimento >= dataInicio
        })
      }

      setData({
        agendamentos: agendamentos || [],
        agendamentoServicos: agendamentoServicos || [],
        movimentosFinanceiros: movimentos || [],
        vendas: vendas || [],
        profissionais: profissionais || [],
        servicos: servicos || [],
        produtos: produtos || [],
        clientes: clientes || [],
        totalClientesCount: totalClientesCount || 0
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar apenas agendamentos CONCLUÍDOS (só conta como faturamento se foi concluído)
  const agendamentosComparecidos = data.agendamentos.filter(a => a.status === 'concluido')

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
    // IDs dos agendamentos onde o cliente compareceu
    const idsAgendamentosComparecidos = agendamentosComparecidos.map(a => a.id)

    // Contar quantas vezes esse serviço aparece na tabela agendamento_servicos
    // filtrando apenas por agendamentos onde o cliente compareceu
    const servicosDesteAgendamento = data.agendamentoServicos.filter(
      as => as.servico_id === servico.id && idsAgendamentosComparecidos.includes(as.agendamento_id)
    )

    const quantidade = servicosDesteAgendamento.length
    const faturamento = servicosDesteAgendamento.reduce((sum, as) => sum + (parseFloat(as.preco) || 0), 0)

    return { nome: servico.nome, quantidade, faturamento }
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)

  // Produtos mais vendidos
  const produtosMaisVendidos = data.produtos.map(produto => {
    const vendasProduto = data.vendas.filter(v => v.produto_id === produto.id)
    const quantidade = vendasProduto.reduce((sum, v) => sum + v.quantidade, 0)
    const faturamento = vendasProduto.reduce((sum, v) => sum + v.valor_total, 0)
    return { nome: produto.nome, quantidade, faturamento }
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)

  // Clientes VIP - is_vip = true OU 5+ atendimentos onde compareceram
  console.log('=== DEBUG RELATÓRIOS VIP ===')
  console.log('Total de clientes:', data.clientes.length)
  console.log('Agendamentos onde compareceu:', agendamentosComparecidos.length)

  const clientesVIP = data.clientes.map(cliente => {
    const atendimentos = agendamentosComparecidos.filter(a => a.cliente_id === cliente.id).length
    const totalGasto = agendamentosComparecidos
      .filter(a => a.cliente_id === cliente.id)
      .reduce((sum, a) => sum + (a.valor || 0), 0)

    const isVIPManual = cliente.is_vip === true
    const isVIPPorVisitas = atendimentos >= 5
    const isVIP = isVIPManual || isVIPPorVisitas

    if (isVIP) {
      console.log(`Cliente ${cliente.nome_completo}: ${atendimentos} atendimentos, is_vip=${isVIPManual}, VIP=${isVIP}`)
    }

    return {
      nome: cliente.nome_completo,
      atendimentos,
      totalGasto,
      isVIPManual,
      isVIP
    }
  }).filter(c => c.isVIP)  // Clientes com is_vip = true OU 5+ visitas
    .sort((a, b) => b.atendimentos - a.atendimentos)
    // Removido .slice(0, 10) para mostrar TODOS os VIPs

  console.log('Clientes VIP (manual OU 5+ visitas):', clientesVIP.length)

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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-sm md:text-base text-purple-300">Análise completa do desempenho da barbearia</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Filtros de Período */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setPeriodo('todos')}
              className={`px-3 py-2 rounded text-xs md:text-sm transition-colors ${
                periodo === 'todos' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setPeriodo('hoje')}
              className={`px-3 py-2 rounded text-xs md:text-sm transition-colors ${
                periodo === 'hoje' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3 py-2 rounded text-xs md:text-sm transition-colors ${
                periodo === 'semana' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-2 rounded text-xs md:text-sm transition-colors ${
                periodo === 'mes' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-2 rounded text-xs md:text-sm transition-colors ${
                periodo === 'ano' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Ano
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={exportarCSV}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs md:text-sm transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={imprimir}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs md:text-sm transition-colors"
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
        onClick={() => router.push('/dashboard/clientes?filter=vip')}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Star className="w-6 h-6 text-pink-400" />
            <span>⭐ Clientes VIP - Os Fiéis da Casa</span>
            <span className="text-xs text-pink-400">(clique para ver apenas VIPs)</span>
          </CardTitle>
          <p className="text-sm text-pink-300 mt-2">Marcados manualmente ou com 5+ visitas confirmadas</p>
        </CardHeader>
        <CardContent>
          {clientesVIP.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientesVIP.map((cliente) => (
                <div key={cliente.nome} className="flex items-center justify-between p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium flex items-center gap-2">
                        {cliente.nome}
                        {cliente.isVIPManual && (
                          <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded">Manual</span>
                        )}
                      </div>
                      <div className="text-sm text-pink-300">{cliente.atendimentos} visitas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{formatCurrency(cliente.totalGasto)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-pink-300">
              <Star className="w-12 h-12 text-pink-400 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente VIP ainda</p>
              <p className="text-sm text-pink-400 mt-2">Marque clientes como VIP ou eles se tornarão VIP com 5+ visitas</p>
            </div>
          )}
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

      {/* Movimentos Financeiros - Tabela do Banco de Dados */}
      {data.movimentosFinanceiros.length > 0 && (
        <Card className="bg-gradient-to-r from-green-800/30 to-emerald-800/30 border-green-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span>💰 Movimentos Financeiros (Banco de Dados)</span>
            </CardTitle>
            <p className="text-sm text-green-300 mt-2">
              Registros permanentes de todos os movimentos financeiros
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-700/30 border-b border-green-600/50">
                  <tr>
                    <th className="text-left p-3 text-green-300">Data</th>
                    <th className="text-left p-3 text-green-300">Hora</th>
                    <th className="text-left p-3 text-green-300">Tipo</th>
                    <th className="text-left p-3 text-green-300">Cliente</th>
                    <th className="text-left p-3 text-green-300">Profissional</th>
                    <th className="text-left p-3 text-green-300">Descrição</th>
                    <th className="text-right p-3 text-green-300">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimentosFinanceiros.map((mov) => (
                    <tr key={mov.id} className="border-b border-green-700/30 hover:bg-green-700/20">
                      <td className="p-3 text-white">
                        {new Date(mov.data_movimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-green-200">
                        {mov.hora_movimento ? mov.hora_movimento.substring(0, 5) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          mov.tipo === 'servico'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {mov.tipo === 'servico' ? '✂️ Serviço' : '📦 Produto'}
                        </span>
                      </td>
                      <td className="p-3 text-white">{mov.cliente_nome || '-'}</td>
                      <td className="p-3 text-green-300">{mov.profissional_nome || '-'}</td>
                      <td className="p-3 text-green-200">
                        {mov.tipo === 'servico' ? mov.servico_nome : mov.produto_nome}
                        {mov.quantidade > 1 && ` (${mov.quantidade}x)`}
                      </td>
                      <td className="p-3 text-right text-green-400 font-bold">
                        {formatCurrency(parseFloat(mov.valor_total) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-green-700/30 border-t border-green-600/50">
                  <tr>
                    <td colSpan={6} className="p-3 text-right text-white font-bold">Total:</td>
                    <td className="p-3 text-right text-green-400 font-bold text-lg">
                      {formatCurrency(
                        data.movimentosFinanceiros.reduce(
                          (sum, m) => sum + (parseFloat(m.valor_total) || 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movimentos do Dia - Tabela Detalhada (Fallback se não tiver movimentos_financeiros) */}
      <Card className="bg-purple-800/30 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>Movimentos do Período - Serviços Detalhados</span>
            {data.movimentosFinanceiros.length === 0 && (
              <span className="text-xs text-yellow-400 ml-2">
                (Configure a tabela de movimentos para dados permanentes)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agendamentosComparecidos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-700/30 border-b border-purple-600/50">
                  <tr>
                    <th className="text-left p-3 text-purple-300">Data</th>
                    <th className="text-left p-3 text-purple-300">Cliente</th>
                    <th className="text-left p-3 text-purple-300">Barbeiro</th>
                    <th className="text-left p-3 text-purple-300">Serviços</th>
                    <th className="text-right p-3 text-purple-300">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentosComparecidos.map((agendamento) => {
                    // Buscar serviços deste agendamento
                    const servicosAgendamento = data.agendamentoServicos
                      .filter(as => as.agendamento_id === agendamento.id)
                      .map(as => {
                        const servico = data.servicos.find(s => s.id === as.servico_id)
                        return servico ? servico.nome : 'Serviço'
                      })

                    const barbeiro = data.profissionais.find(p => p.id === agendamento.profissional_id)

                    return (
                      <tr key={agendamento.id} className="border-b border-purple-700/30 hover:bg-purple-700/20">
                        <td className="p-3 text-white">{agendamento.data_agendamento}</td>
                        <td className="p-3 text-white">{agendamento.nome_cliente}</td>
                        <td className="p-3 text-purple-300">{barbeiro?.nome || agendamento.Barbeiro || '-'}</td>
                        <td className="p-3 text-purple-200">
                          {servicosAgendamento.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {servicosAgendamento.map((servico, idx) => (
                                <span key={idx} className="bg-purple-600/30 px-2 py-0.5 rounded text-xs">
                                  {servico}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sem serviços</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-green-400 font-bold">
                          {formatCurrency(agendamento.valor || 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-purple-700/30 border-t border-purple-600/50">
                  <tr>
                    <td colSpan={4} className="p-3 text-right text-white font-bold">Total:</td>
                    <td className="p-3 text-right text-green-400 font-bold text-lg">
                      {formatCurrency(faturamentoAgendamentos)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-purple-300">
              Nenhum agendamento no período selecionado
            </div>
          )}
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
            <div className="text-2xl font-bold text-white">{data.totalClientesCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
