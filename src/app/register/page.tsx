'use client'

import { useState } from 'react'
import { registrarProfissional } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    especialidades: [] as string[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const especialidadesDisponiveis = [
    'Corte', 'Barba', 'Coloração', 'Tratamentos', 'Estética', 'Acabamento'
  ]

  const handleEspecialidadeChange = (especialidade: string) => {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(especialidade)
        ? prev.especialidades.filter(e => e !== especialidade)
        : [...prev.especialidades, especialidade]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não conferem')
      setLoading(false)
      return
    }

    if (formData.especialidades.length === 0) {
      setError('Selecione pelo menos uma especialidade')
      setLoading(false)
      return
    }

    try {
      const resultado = await registrarProfissional(
        {
          nome: formData.nome,
          telefone: formData.telefone,
          especialidades: formData.especialidades
        },
        {
          email: formData.email,
          senha: formData.senha
        }
      )

      if (!resultado.success) {
        setError(resultado.error || 'Erro ao realizar cadastro')
        setLoading(false)
        return
      }

      setSuccess('Cadastro realizado com sucesso! Redirecionando...')

      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (err) {
      setError('Erro ao realizar cadastro. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-24 h-24 bg-white rounded-xl flex items-center justify-center mb-4">
              <div className="text-slate-900 font-bold text-2xl">V</div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">VINCE</h1>
            <p className="text-cyan-400 text-sm font-medium">BARBEARIA</p>
            <p className="text-slate-400 text-xs mt-2">Cadastro de Profissional</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Especialidades
              </label>
              <div className="grid grid-cols-2 gap-2">
                {especialidadesDisponiveis.map((esp) => (
                  <label key={esp} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.especialidades.includes(esp)}
                      onChange={() => handleEspecialidadeChange(esp)}
                      className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-slate-300">{esp}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={formData.confirmarSenha}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
              Já tem uma conta? Fazer login
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-slate-400 text-xs">
              Sistema de cadastro • Vince Barbearia
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}