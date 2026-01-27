'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Calendar, Users, TrendingUp, DollarSign, Clock, Award, Settings,
  Search, User, BarChart3, PieChart, Home, UserCheck, Scissors,
  ShoppingBag, FileText, LogOut, Menu, Package, Gift
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkUser()
  }, [])

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const checkUser = () => {
    const profissionalData = localStorage.getItem('profissional')
    if (!profissionalData) {
      router.push('/login')
    } else {
      const loginData = JSON.parse(profissionalData)
      setUser(loginData.profissional)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('profissional')
    router.push('/login')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: Home, path: '/dashboard' },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, path: '/dashboard/agendamentos' },
    { id: 'clientes', label: 'Clientes', icon: Users, path: '/dashboard/clientes' },
    { id: 'servicos', label: 'Serviços', icon: Scissors, path: '/dashboard/servicos' },
    { id: 'produtos', label: 'Produtos', icon: Package, path: '/dashboard/produtos' },
    { id: 'planos', label: 'Planos', icon: Gift, path: '/dashboard/planos' },
    { id: 'profissionais', label: 'Profissionais', icon: UserCheck, path: '/dashboard/profissionais' },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag, path: '/dashboard/vendas' },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, path: '/dashboard/relatorios' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/dashboard/configuracoes' }
  ]

  const getActiveMenu = () => {
    if (pathname === '/dashboard') return 'dashboard'
    return pathname.split('/').pop() || 'dashboard'
  }

  return (
    <div className="min-h-screen" style={{ background: '#1c283c' }}>
      {/* Overlay mobile - clica para fechar sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-16'} md:block ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
        <div className="p-4">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Vince Barbearia" className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">Vince</h1>
                <p className="text-cyan-400 text-sm">Barbearia</p>
                <p className="text-slate-400 text-xs">Dashboard</p>
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  getActiveMenu() === item.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* User Info */}
          {sidebarOpen && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user?.nome || 'Admin'}</p>
                    <p className="text-slate-400 text-xs">Vince Barbearia</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 flex items-center justify-center space-x-1 text-slate-400 hover:text-white text-xs transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ml-0 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        {/* Top Header */}
        <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
          <div className="px-3 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar clientes, agendamentos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/dashboard/clientes?search=${encodeURIComponent(searchQuery)}`)
                      }
                    }}
                    className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-64 lg:w-80"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="text-sm text-slate-400 hidden lg:block">
                  {currentTime.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })} • {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center space-x-1 text-slate-400 hidden md:flex">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Online</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen" style={{ background: '#1c283c' }}>
          {children}
        </main>
      </div>
    </div>
  )
}