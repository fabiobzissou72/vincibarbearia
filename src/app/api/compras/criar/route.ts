import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'
import { toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const BRASILIA_TZ = 'America/Sao_Paulo'

/**
 * POST /api/compras/criar
 *
 * Cria uma compra de produtos/pacotes SEM necessidade de barbeiro ou horário
 *
 * Body: {
 *   cliente_nome: string (obrigatório)
 *   telefone: string (obrigatório)
 *   produto_ids: string[] (array de UUIDs) (opcional)
 *   plano_ids: string[] (array de UUIDs) (opcional)
 *   cliente_id: string (opcional) - UUID do cliente existente
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🛒 [CRIAR COMPRA] Iniciando...')

    // 🔐 AUTENTICAÇÃO
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      console.error('❌ [CRIAR COMPRA] Autenticação falhou:', erro)
      return NextResponse.json({
        success: false,
        message: 'Não autorizado',
        errors: [erro || 'Acesso negado']
      }, { status: 401 })
    }

    console.log('✅ [CRIAR COMPRA] Autenticado')

    const body = await request.json()
    console.log('📦 [CRIAR COMPRA] Body recebido:', JSON.stringify(body, null, 2))
    const {
      cliente_nome,
      telefone,
      produto_ids = [],
      plano_ids = [],
      cliente_id
    } = body

    // Validações
    if (!cliente_nome || !telefone) {
      return NextResponse.json({
        success: false,
        message: 'Dados incompletos',
        errors: ['cliente_nome e telefone são obrigatórios']
      }, { status: 400 })
    }

    if (produto_ids.length === 0 && plano_ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Selecione pelo menos um produto ou pacote',
        errors: ['produto_ids ou plano_ids devem ser informados']
      }, { status: 400 })
    }

    let valorTotal = 0
    let itensCompra: string[] = []

    // Buscar produtos selecionados
    if (produto_ids.length > 0) {
      const { data: produtos, error: produtoError } = await supabase
        .from('produtos')
        .select('*')
        .in('id', produto_ids)
        .eq('ativo', true)

      if (produtoError) {
        console.error('Erro ao buscar produtos:', produtoError)
        return NextResponse.json({
          success: false,
          message: 'Erro ao buscar produtos',
          errors: [produtoError.message]
        }, { status: 500 })
      }

      if (!produtos || produtos.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Produtos não encontrados ou inativos',
          errors: ['Um ou mais produtos inválidos']
        }, { status: 400 })
      }

      valorTotal += produtos.reduce((sum, p) => sum + (parseFloat(p.preco) || 0), 0)
      itensCompra.push(...produtos.map(p => p.nome))
    }

    // Buscar pacotes selecionados
    if (plano_ids.length > 0) {
      const { data: planos, error: planoError } = await supabase
        .from('planos')
        .select('*')
        .in('id', plano_ids)
        .eq('ativo', true)

      if (planoError) {
        console.error('Erro ao buscar pacotes:', planoError)
        return NextResponse.json({
          success: false,
          message: 'Erro ao buscar pacotes',
          errors: [planoError.message]
        }, { status: 500 })
      }

      if (!planos || planos.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Pacotes não encontrados ou inativos',
          errors: ['Um ou mais pacotes inválidos']
        }, { status: 400 })
      }

      valorTotal += planos.reduce((sum, p) => sum + (parseFloat(p.valor_total) || 0), 0)
      itensCompra.push(...planos.map(p => p.nome))
    }

    // Data e hora ATUAL em Brasília (UTC-3)
    const agoraUTC = new Date()
    const agoraBrasilia = toZonedTime(agoraUTC, BRASILIA_TZ)

    const dia = String(agoraBrasilia.getDate()).padStart(2, '0')
    const mes = String(agoraBrasilia.getMonth() + 1).padStart(2, '0')
    const ano = agoraBrasilia.getFullYear()
    const dataBR = `${dia}/${mes}/${ano}`

    const hora = String(agoraBrasilia.getHours()).padStart(2, '0')
    const minuto = String(agoraBrasilia.getMinutes()).padStart(2, '0')
    const horaBR = `${hora}:${minuto}`

    // Criar registro de compra na tabela agendamentos
    // Usamos agendamentos pois já tem estrutura, mas sem barbeiro e horário
    const { data: novaCompra, error: compraError } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: cliente_id || null,
        profissional_id: null, // SEM BARBEIRO
        data_agendamento: dataBR,
        hora_inicio: horaBR, // Hora ATUAL de Brasília
        nome_cliente: cliente_nome,
        telefone: telefone,
        valor: valorTotal,
        status: 'pendente_retirada', // Status especial para compras
        observacoes: `COMPRA: ${itensCompra.join(', ')}`,
        Barbeiro: 'Loja' // Indica que é compra na loja
      })
      .select()
      .single()

    if (compraError || !novaCompra) {
      console.error('Erro ao criar compra:', compraError)
      return NextResponse.json({
        success: false,
        message: 'Erro ao criar compra',
        errors: [compraError?.message || 'Erro desconhecido']
      }, { status: 500 })
    }

    console.log('✅ Compra criada:', novaCompra.id)

    // TODO: Criar relações com produtos e planos em tabelas específicas quando disponíveis
    // Por enquanto, armazenamos na coluna observacoes

    return NextResponse.json({
      success: true,
      message: 'Compra realizada com sucesso! Retire na barbearia.',
      data: {
        compra_id: novaCompra.id,
        data: dataBR,
        valor_total: valorTotal,
        itens: itensCompra,
        status: 'pendente_retirada'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao criar compra:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }, { status: 500 })
  }
}
