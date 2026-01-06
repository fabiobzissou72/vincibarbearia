import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/agendamentos/criar
 *
 * Cria um novo agendamento com sistema de rodízio automático
 *
 * Body: {
 *   cliente_nome: string (obrigatório)
 *   telefone: string (obrigatório)
 *   data: string (YYYY-MM-DD) (obrigatório)
 *   hora: string (HH:MM) (obrigatório)
 *   servico_ids: string[] (array de UUIDs) (obrigatório)
 *   barbeiro_preferido: string (opcional) - Nome do barbeiro
 *   observacoes: string (opcional)
 *   cliente_id: string (opcional) - UUID do cliente existente
 * }
 *
 * Sistema de Rodízio:
 * - Se barbeiro_preferido informado: Agenda com ele (se disponível)
 * - Se não informado: Usa rodízio balanceado (menos agendamentos do dia)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [CRIAR AGENDAMENTO] Iniciando...')

    // 🔐 AUTENTICAÇÃO (permite requisições internas do dashboard sem token)
    const { autorizado, erro } = await verificarAutenticacao(request)
    if (!autorizado) {
      console.error('❌ [CRIAR AGENDAMENTO] Autenticação falhou:', erro)
      return NextResponse.json({
        success: false,
        message: 'Não autorizado',
        errors: [erro || 'Acesso negado']
      }, { status: 401 })
    }

    console.log('✅ [CRIAR AGENDAMENTO] Autenticado')

    const body = await request.json()
    console.log('📦 [CRIAR AGENDAMENTO] Body recebido:', JSON.stringify(body, null, 2))
    const {
      cliente_nome,
      telefone,
      data,
      hora,
      servico_ids = [],
      produto_ids = [],
      plano_ids = [],
      barbeiro_preferido,
      barbeiro_id, // App cliente envia barbeiro_id
      observacoes,
      cliente_id
    } = body

    // Aceita tanto barbeiro_preferido (N8N) quanto barbeiro_id (app cliente)
    const barbeiroEscolhido = barbeiro_preferido || barbeiro_id

    // Validações - precisa ter pelo menos serviços OU planos
    if (!cliente_nome || !telefone || !data || !hora) {
      return NextResponse.json({
        success: false,
        message: 'Dados incompletos',
        errors: ['cliente_nome, telefone, data e hora são obrigatórios']
      }, { status: 400 })
    }

    if (servico_ids.length === 0 && plano_ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Selecione pelo menos um serviço ou pacote',
        errors: ['servico_ids ou plano_ids são obrigatórios']
      }, { status: 400 })
    }

    // Buscar serviços (se houver)
    let servicos = []
    if (servico_ids.length > 0) {
      const { data: servicosData, error: servicoError } = await supabase
        .from('servicos')
        .select('*')
        .in('id', servico_ids)
        .eq('ativo', true)

      if (servicoError) {
        console.error('Erro ao buscar serviços:', servicoError)
        return NextResponse.json({
          success: false,
          message: 'Erro ao buscar serviços no banco de dados',
          errors: [servicoError.message]
        }, { status: 500 })
      }

      if (!servicosData || servicosData.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Serviços não encontrados ou inativos',
          errors: ['Um ou mais serviços inválidos']
        }, { status: 400 })
      }

      servicos = servicosData
    }

    // Buscar planos/pacotes (se houver)
    let planos = []
    if (plano_ids.length > 0) {
      const { data: planosData, error: planoError } = await supabase
        .from('planos')
        .select('*')
        .in('id', plano_ids)
        .eq('ativo', true)

      if (planoError) {
        console.error('Erro ao buscar planos:', planoError)
        return NextResponse.json({
          success: false,
          message: 'Erro ao buscar pacotes',
          errors: [planoError.message]
        }, { status: 500 })
      }

      if (!planosData || planosData.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Pacotes não encontrados ou inativos',
          errors: ['Um ou mais pacotes inválidos']
        }, { status: 400 })
      }

      planos = planosData
    }

    const duracaoTotal = servicos.reduce((sum, s) => sum + (s.duracao_minutos || 30), 0)
    const valorTotal = servicos.reduce((sum, s) => sum + (parseFloat(s.preco) || 0), 0) +
                       planos.reduce((sum, p) => sum + (parseFloat(p.valor_total) || 0), 0)

    // Converter data para formato brasileiro DD/MM/YYYY
    // Aceita: DD-MM-YYYY (11-12-2025) OU YYYY-MM-DD (2025-12-11)
    let dataBR: string
    const partes = data.split('-')

    if (partes[0].length === 4) {
      // Formato YYYY-MM-DD (ex: 2025-12-11)
      const [year, month, day] = partes
      dataBR = `${day}/${month}/${year}`
    } else {
      // Formato DD-MM-YYYY (ex: 11-12-2025)
      const [day, month, year] = partes
      dataBR = `${day}/${month}/${year}`
    }

    // Determinar qual barbeiro vai atender
    let profissionalSelecionado: any = null

    if (barbeiroEscolhido) {
      // Buscar barbeiro por UUID (dashboard/app) ou nome (N8N)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barbeiroEscolhido)

      console.log('🔍 [BARBEIRO] Procurando:', barbeiroEscolhido, 'isUUID:', isUUID)

      let prof = null
      let profError = null

      if (isUUID) {
        // Dashboard/App envia UUID
        console.log('📍 [BARBEIRO] Buscando por UUID:', barbeiroEscolhido)
        const result = await supabase
          .from('profissionais')
          .select('*')
          .eq('id', barbeiroEscolhido)
          .eq('ativo', true)
          .single()
        prof = result.data
        profError = result.error
        console.log('✅ [BARBEIRO] Resultado UUID:', prof?.nome, 'Erro:', profError?.message)
      } else {
        // N8N envia nome
        console.log('📍 [BARBEIRO] Buscando por nome:', barbeiroEscolhido)
        const result = await supabase
          .from('profissionais')
          .select('*')
          .ilike('nome', `%${barbeiroEscolhido}%`)
          .eq('ativo', true)
          .single()
        prof = result.data
        profError = result.error
        console.log('✅ [BARBEIRO] Resultado nome:', prof?.nome, 'Erro:', profError?.message)
      }

      if (profError || !prof) {
        console.error('❌ [BARBEIRO] Não encontrado:', barbeiroEscolhido, profError)
        return NextResponse.json({
          success: false,
          message: `Barbeiro "${barbeiroEscolhido}" não encontrado ou inativo`,
          errors: ['Barbeiro não disponível'],
          debug: { barbeiroEscolhido, isUUID, erro: profError }
        }, { status: 404 })
      }

      console.log('🎯 [BARBEIRO] Selecionado:', prof.nome)
      profissionalSelecionado = prof
    } else {
      // RODÍZIO AUTOMÁTICO: Buscar barbeiro com menos agendamentos do dia
      console.log('🔄 Iniciando rodízio automático...')

      // Primeiro, buscar TODOS os barbeiros ativos
      const { data: todosBarbeiros } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)

      console.log('👥 Barbeiros ativos:', todosBarbeiros?.map(b => b.nome).join(', '))

      // Buscar agendamentos de HOJE para cada barbeiro
      const hoje = dataBR // Data já formatada em DD/MM/YYYY
      console.log('📅 Buscando agendamentos de:', hoje)

      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('profissional_id, profissionais(nome)')
        .eq('data_agendamento', hoje)
        .in('status', ['agendado', 'confirmado', 'em_andamento'])

      console.log('📊 Agendamentos hoje:', agendamentosHoje)

      // Contar agendamentos por barbeiro
      const contagemPorBarbeiro: { [key: string]: number } = {}
      todosBarbeiros?.forEach(barbeiro => {
        contagemPorBarbeiro[barbeiro.id] = 0
      })

      agendamentosHoje?.forEach(ag => {
        if (contagemPorBarbeiro[ag.profissional_id] !== undefined) {
          contagemPorBarbeiro[ag.profissional_id]++
        }
      })

      console.log('🔢 Contagem de agendamentos por barbeiro:', contagemPorBarbeiro)

      // Encontrar barbeiro com MENOS agendamentos
      let barbeiroEscolhido = todosBarbeiros?.[0]
      let menorContagem = Infinity

      todosBarbeiros?.forEach(barbeiro => {
        const contagem = contagemPorBarbeiro[barbeiro.id] || 0
        console.log(`  ${barbeiro.nome}: ${contagem} agendamentos`)

        if (contagem < menorContagem) {
          menorContagem = contagem
          barbeiroEscolhido = barbeiro
        }
      })

      if (!barbeiroEscolhido) {
        return NextResponse.json({
          success: false,
          message: 'Nenhum barbeiro disponível',
          errors: ['Sistema de rodízio não configurado']
        }, { status: 500 })
      }

      console.log(`✅ Barbeiro escolhido: ${barbeiroEscolhido.nome} (${menorContagem} agendamentos hoje)`)
      profissionalSelecionado = barbeiroEscolhido
    }

    // Verificar conflito de horário
    const { data: conflitos } = await supabase
      .from('agendamentos')
      .select(`
        id,
        hora_inicio,
        agendamento_servicos (duracao_minutos)
      `)
      .eq('profissional_id', profissionalSelecionado.id)
      .eq('data_agendamento', dataBR)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])

    if (conflitos && conflitos.length > 0) {
      const [horaReq, minReq] = hora.split(':').map(Number)
      const inicioReq = horaReq * 60 + minReq
      const fimReq = inicioReq + duracaoTotal

      for (const conflito of conflitos) {
        const [horaConf, minConf] = conflito.hora_inicio.split(':').map(Number)
        const duracaoConflito = conflito.agendamento_servicos?.reduce((sum: number, s: any) =>
          sum + (s.duracao_minutos || 30), 0) || 30

        const inicioConf = horaConf * 60 + minConf
        const fimConf = inicioConf + duracaoConflito

        // Verifica sobreposição
        if (inicioReq < fimConf && fimReq > inicioConf) {
          // Sugerir próximos horários disponíveis
          const proximosHorarios: string[] = []
          let horaProx = Math.floor(fimConf / 60)
          let minProx = fimConf % 60

          // Arredondar para próximo slot de 30min
          if (minProx > 0 && minProx <= 30) {
            minProx = 30
          } else if (minProx > 30) {
            minProx = 0
            horaProx += 1
          }

          for (let i = 0; i < 6; i++) {
            proximosHorarios.push(`${String(horaProx).padStart(2, '0')}:${String(minProx).padStart(2, '0')}`)
            minProx += 30
            if (minProx >= 60) {
              minProx = 0
              horaProx += 1
            }
            if (horaProx >= 19) break // Limite de horário
          }

          return NextResponse.json({
            success: false,
            message: `Horário ${hora} já está ocupado para ${profissionalSelecionado.nome}`,
            errors: ['Conflito de horário'],
            data: {
              barbeiro: profissionalSelecionado.nome,
              horario_solicitado: hora,
              sugestoes: proximosHorarios
            }
          }, { status: 409 })
        }
      }
    }

    // Criar observações incluindo pacotes se houver
    let observacoesCompletas = observacoes || ''
    if (planos.length > 0) {
      const nomesPlanos = planos.map(p => p.nome).join(', ')
      const obsPlanos = `PACOTE: ${nomesPlanos} (1ª sessão)`
      observacoesCompletas = observacoesCompletas
        ? `${observacoesCompletas}\n${obsPlanos}`
        : obsPlanos
    }

    // Criar agendamento
    const { data: novoAgendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: cliente_id || null,
        profissional_id: profissionalSelecionado.id,
        data_agendamento: dataBR,  // Salvar no formato brasileiro DD/MM/YYYY
        hora_inicio: hora,
        nome_cliente: cliente_nome,
        telefone: telefone,
        valor: valorTotal,
        status: 'agendado',
        observacoes: observacoesCompletas || null,
        Barbeiro: profissionalSelecionado.nome  // Nome do barbeiro
      })
      .select()
      .single()

    if (agendamentoError || !novoAgendamento) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao criar agendamento',
        errors: [agendamentoError?.message || 'Erro desconhecido']
      }, { status: 500 })
    }

    // Criar relação com serviços (tabela agendamento_servicos)
    const servicosRelacao = servicos.map(s => ({
      agendamento_id: novoAgendamento.id,
      servico_id: s.id,
      preco: s.preco,
      duracao_minutos: s.duracao_minutos
    }))

    const { error: servicosError } = await supabase
      .from('agendamento_servicos')
      .insert(servicosRelacao)

    if (servicosError) {
      console.error('Erro ao vincular serviços:', servicosError)
    }

    // Disparar webhooks (sistema global + webhook personalizado do barbeiro)
    // IMPORTANTE: Executar de forma assíncrona mas sem bloquear a resposta
    const dispararWebhooks = async () => {
      try {
        const payload = {
          tipo: 'novo_agendamento',
          agendamento_id: novoAgendamento.id,
          cliente: {
            nome: cliente_nome,
            telefone: telefone
          },
          agendamento: {
            data: dataBR,
            hora: hora,
            barbeiro: profissionalSelecionado.nome,
            servicos: servicos.map(s => s.nome),
            valor_total: valorTotal,
            duracao_total: duracaoTotal
          }
        }

        console.log('🔔 Iniciando disparo de webhooks para agendamento:', novoAgendamento.id)

        // 1. Webhook global do sistema (se configurado)
        const { data: config, error: configError } = await supabase
          .from('configuracoes')
          .select('webhook_url, notif_confirmacao')
          .single()

        console.log('📊 Config webhook:', {
          existe: !!config,
          url: config?.webhook_url,
          ativo: config?.notif_confirmacao,
          erro: configError?.message
        })

        if (config?.webhook_url && config?.notif_confirmacao) {
          try {
            console.log('🌐 Disparando webhook global para:', config.webhook_url)
            const response = await fetch(config.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(10000) // 10s timeout
            })

            const responseText = await response.text()
            let responseData = null
            try {
              responseData = JSON.parse(responseText)
            } catch {
              responseData = responseText
            }

            console.log(`✅ Webhook global ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: novoAgendamento.id,
              tipo: 'confirmacao',
              status: response.ok ? 'enviado' : 'falhou',
              payload: payload,
              resposta: responseData,
              erro: response.ok ? null : `HTTP ${response.status}`,
              webhook_url: config.webhook_url
            })
          } catch (error) {
            console.error('❌ Erro ao disparar webhook global:', error)
            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: novoAgendamento.id,
              tipo: 'confirmacao',
              status: 'falhou',
              payload: payload,
              erro: error instanceof Error ? error.message : String(error),
              webhook_url: config.webhook_url
            })
          }
        } else {
          console.log('⚠️ Webhook global não configurado ou inativo')
        }

        // 2. Webhook personalizado do barbeiro (se configurado)
        const { data: webhookBarbeiro, error: webhookError } = await supabase
          .from('webhooks_barbeiros')
          .select('*')
          .eq('profissional_id', profissionalSelecionado.id)
          .eq('ativo', true)
          .single()

        console.log('👨‍💼 Webhook barbeiro:', {
          existe: !!webhookBarbeiro,
          url: webhookBarbeiro?.webhook_url,
          eventos: webhookBarbeiro?.eventos,
          erro: webhookError?.message
        })

        if (webhookBarbeiro && webhookBarbeiro.eventos?.includes('novo_agendamento')) {
          try {
            console.log('🌐 Disparando webhook do barbeiro para:', webhookBarbeiro.webhook_url)
            const response = await fetch(webhookBarbeiro.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(10000) // 10s timeout
            })

            const responseText = await response.text()
            let responseData = null
            try {
              responseData = JSON.parse(responseText)
            } catch {
              responseData = responseText
            }

            console.log(`✅ Webhook barbeiro ${response.ok ? 'SUCESSO' : 'FALHOU'}:`, response.status)

            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: novoAgendamento.id,
              tipo: 'novo_agendamento_barbeiro',
              status: response.ok ? 'enviado' : 'falhou',
              payload: payload,
              resposta: responseData,
              erro: response.ok ? null : `HTTP ${response.status}`,
              webhook_url: webhookBarbeiro.webhook_url
            })
          } catch (error) {
            console.error('❌ Erro ao disparar webhook do barbeiro:', error)
            await supabase.from('notificacoes_enviadas').insert({
              agendamento_id: novoAgendamento.id,
              tipo: 'novo_agendamento_barbeiro',
              status: 'falhou',
              payload: payload,
              erro: error instanceof Error ? error.message : String(error),
              webhook_url: webhookBarbeiro.webhook_url
            })
          }
        } else {
          console.log('⚠️ Webhook do barbeiro não configurado ou inativo')
        }

        console.log('🏁 Webhooks processados para agendamento:', novoAgendamento.id)
      } catch (webhookError) {
        console.error('💥 Erro geral no processamento do webhook:', webhookError)
      }
    }

    // Disparar webhooks e AGUARDAR conclusão (crítico para garantir que webhooks sejam enviados)
    // IMPORTANTE: Sem await, o Vercel mata a função antes do webhook ser disparado
    await dispararWebhooks()

    return NextResponse.json({
      success: true,
      message: 'Agendamento criado com sucesso!',
      data: {
        agendamento_id: novoAgendamento.id,
        barbeiro_atribuido: profissionalSelecionado.nome,
        data: dataBR,
        horario: hora,
        valor_total: valorTotal,
        duracao_total: duracaoTotal,
        servicos: servicos.map(s => ({ nome: s.nome, preco: s.preco })),
        status: 'agendado'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao criar agendamento:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
      debug: {
        error_type: error instanceof Error ? error.constructor.name : typeof error,
        error_message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      }
    }, { status: 500 })
  }
}
