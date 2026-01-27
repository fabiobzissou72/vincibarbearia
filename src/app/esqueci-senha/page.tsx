'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNovaSenha('')
    setSucesso(false)

    try {
      const response = await fetch('/api/auth/resetar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Erro ao resetar senha')
      } else {
        setNovaSenha(data.novaSenha)
        setSucesso(true)
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1c283c' }}>
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-24 h-24 flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Vince Barbearia" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
            <p className="text-slate-400 text-sm">Digite seu email para resetar a senha</p>
          </div>

          {sucesso ? (
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-400 text-sm mb-3">Senha resetada com sucesso!</p>
                <p className="text-white text-sm mb-2">Sua nova senha temporária é:</p>
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <code className="text-cyan-400 text-lg font-mono select-all">{novaSenha}</code>
                </div>
                <p className="text-yellow-400 text-xs mt-3">
                  Anote esta senha! Você pode alterá-la depois nas configurações.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 text-center"
              >
                Ir para Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email cadastrado
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetando...' : 'Resetar Senha'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
