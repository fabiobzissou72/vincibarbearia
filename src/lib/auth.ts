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

export async function loginProfissional(email: string, senha: string): Promise<LoginData | null> {
  try {
    // Buscar na tabela de login
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