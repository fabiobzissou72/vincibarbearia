import { supabase } from './supabase'

export interface Profissional {
  id: string
  nome: string
  telefone: string
  especialidades: string[]
  ativo: boolean
  id_agenda?: string
}

export interface LoginData {
  profissional: Profissional
  email: string
}

// Mock data para modo de desenvolvimento
const MOCK_USERS = [
  {
    email: 'admin@vince.com',
    senha: '123456',
    profissional: {
      id: '1',
      nome: 'Admin Vince',
      telefone: '(11) 99999-9999',
      especialidades: ['Corte', 'Barba'],
      ativo: true
    }
  },
  {
    email: 'barbeiro@vince.com',
    senha: '123456',
    profissional: {
      id: '2',
      nome: 'João Silva',
      telefone: '(11) 98888-8888',
      especialidades: ['Corte', 'Barba', 'Coloração'],
      ativo: true
    }
  }
]

// Detectar se está em modo de desenvolvimento (sem Supabase configurado)
const isDevelopmentMode = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
         !process.env.NEXT_PUBLIC_SUPABASE_URL
}

export async function loginProfissional(email: string, senha: string): Promise<LoginData | null> {
  try {
    // Modo de desenvolvimento - usar mock data
    if (isDevelopmentMode()) {
      console.log('🔧 Modo de desenvolvimento ativado - usando credenciais mock')
      const mockUser = MOCK_USERS.find(u => u.email === email && u.senha === senha)

      if (mockUser) {
        return {
          profissional: mockUser.profissional,
          email: mockUser.email
        }
      }
      return null
    }

    // Modo de produção - usar Supabase
    const { data: loginData, error: loginError } = await supabase
      .from('profissionais_login')
      .select(`
        *,
        profissionais (
          id,
          nome,
          telefone,
          especialidades,
          ativo,
          id_agenda
        )
      `)
      .eq('email', email)
      .eq('ativo', true)
      .single()

    if (loginError || !loginData || !loginData.profissionais) {
      return null
    }

    // Verificar senha (simples por enquanto, em produção usar hash)
    if (loginData.senha === senha) {
      // Atualizar último login
      await supabase
        .from('profissionais_login')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', loginData.id)

      return {
        profissional: loginData.profissionais as Profissional,
        email: loginData.email
      }
    }

    return null
  } catch (error) {
    console.error('Erro no login:', error)
    return null
  }
}

export async function registrarProfissional(
  dadosProfissional: {
    nome: string
    telefone: string
    especialidades: string[]
  },
  dadosLogin: {
    email: string
    senha: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se email já existe
    const { data: emailExiste } = await supabase
      .from('profissionais_login')
      .select('email')
      .eq('email', dadosLogin.email)
      .single()

    if (emailExiste) {
      return { success: false, error: 'Este email já está cadastrado' }
    }

    // Criar profissional
    const { data: novoProfissional, error: profissionalError } = await supabase
      .from('profissionais')
      .insert({
        nome: dadosProfissional.nome,
        telefone: dadosProfissional.telefone,
        especialidades: dadosProfissional.especialidades,
        ativo: true
      })
      .select()
      .single()

    if (profissionalError || !novoProfissional) {
      return { success: false, error: 'Erro ao criar profissional' }
    }

    // Criar login
    const { error: loginError } = await supabase
      .from('profissionais_login')
      .insert({
        profissional_id: novoProfissional.id,
        email: dadosLogin.email,
        senha: dadosLogin.senha, // Em produção, usar hash
        ativo: true
      })

    if (loginError) {
      // Deletar profissional se falhou ao criar login
      await supabase
        .from('profissionais')
        .delete()
        .eq('id', novoProfissional.id)

      return { success: false, error: 'Erro ao criar login' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro no registro:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}

export async function getProfissionais(): Promise<Profissional[]> {
  try {
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (error) {
      console.error('Erro ao buscar profissionais:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error)
    return []
  }
}

// ============================================
// AUTENTICAÇÃO POR TOKEN API
// ============================================

/**
 * Gera um token API aleatório seguro
 */
export function gerarTokenAPI(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'vinci_'
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Verifica se o token API fornecido é válido
 */
export async function verificarTokenAPI(token: string): Promise<{ valido: boolean; erro?: string }> {
  if (!token) {
    return {
      valido: false,
      erro: 'Token de autorização não fornecido. Use o header: Authorization: Bearer SEU_TOKEN'
    }
  }

  try {
    // Buscar token nas configurações
    const { data: config, error } = await supabase
      .from('configuracoes')
      .select('api_token')
      .single()

    if (error || !config) {
      return { valido: false, erro: 'Erro ao verificar token' }
    }

    if (!config.api_token) {
      return {
        valido: false,
        erro: 'Sistema sem token configurado. Configure um token em Configurações.'
      }
    }

    if (token !== config.api_token) {
      return { valido: false, erro: 'Token inválido ou expirado' }
    }

    return { valido: true }
  } catch (err) {
    console.error('Erro ao verificar token:', err)
    return { valido: false, erro: 'Erro interno ao verificar token' }
  }
}

/**
 * Extrai o token do header Authorization de uma request
 */
export function extrairTokenDaRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return null
  }

  // Formato esperado: "Bearer TOKEN"
  const token = authHeader.replace('Bearer ', '').trim()

  return token || null
}

/**
 * Verifica se a requisição é interna (vem do próprio Next.js)
 * Requisições internas não precisam de token
 */
export function isRequisicaoInterna(request: Request): boolean {
  // Verificar se é uma requisição server-side do Next.js
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // Se não tem referer, pode ser uma chamada server-side interna
  if (!referer) {
    // Verificar se tem o header x-middleware-subrequest (Next.js interno)
    const isMiddlewareSubrequest = request.headers.get('x-middleware-subrequest')
    if (isMiddlewareSubrequest) {
      return true
    }
  }

  // Se tem referer, verificar se vem do mesmo domínio
  if (referer && host) {
    try {
      const refererUrl = new URL(referer)
      return refererUrl.host === host
    } catch {
      return false
    }
  }

  return false
}

/**
 * Verifica autenticação considerando requisições internas
 * Retorna { autorizado: true } se:
 * - For requisição interna (do próprio dashboard)
 * - Ou se tiver token válido
 */
export async function verificarAutenticacao(request: Request): Promise<{ autorizado: boolean; erro?: string }> {
  // 1. Verificar se é requisição interna (do próprio sistema)
  if (isRequisicaoInterna(request)) {
    return { autorizado: true }
  }

  // 2. Se não é interna, exigir token
  const token = extrairTokenDaRequest(request)

  if (!token) {
    return {
      autorizado: false,
      erro: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN'
    }
  }

  // 3. Validar token
  const { valido, erro } = await verificarTokenAPI(token)

  return {
    autorizado: valido,
    erro: erro
  }
}