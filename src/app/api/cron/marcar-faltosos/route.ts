import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/marcar-faltosos
 *
 * Vercel Cron Job - Executa a cada hora
 *
 * Responsabilidades:
 * 1. Buscar agendamentos com status "agendado" ou "confirmado"
 * 2. Verificar se a data/hora já passou (+ 30 minutos de tolerância)
 * 3. Marcar automaticamente como "não compareceu"
 * 4. Atualizar campo compareceu = false
 *
 * Segurança: Opcional - apenas se CRON_SECRET estiver configurado
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (opcional)
    const authHeader = request.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    if (CRON_SECRET && process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({
        success: false,
        message: 'Não autorizado'
      }, { status: 401 })
    }

    console.log('[CRON FALTOSOS] Iniciando verificação de agendamentos vencidos...')

    // Obter data e hora atual em São Paulo
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

    // Subtrair 30 minutos de tolerância
    const limiteTolerancia = new Date(agora)
    limiteTolerancia.setMinutes(limiteTolerancia.getMinutes() - 30)

    // Formatar data atual para comparação (DD/MM/YYYY)
    const diaHoje = String(agora.getDate()).padStart(2, '0')
    const mesHoje = String(agora.getMonth() + 1).padStart(2, '0')
    const anoHoje = agora.getFullYear()
    const dataHojeBR = `${diaHoje}/${mesHoje}/${anoHoje}`

    const horaAtual = limiteTolerancia.getHours()
    const minutoAtual = limiteTolerancia.getMinutes()
    const horaAtualStr = `${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`

    console.log('[CRON FALTOSOS] Data/hora atual (SP):', dataHojeBR, horaAtualStr)

    let marcadosComoFaltosos = 0
    const erros: string[] = []

    // Buscar agendamentos de hoje e anteriores que ainda estão pendentes
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, nome_cliente, data_agendamento, hora_inicio, status')
      .in('status', ['agendado', 'confirmado'])
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (error) {
      console.error('[CRON FALTOSOS] Erro ao buscar agendamentos:', error)
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar agendamentos',
        error: error.message
      }, { status: 500 })
    }

    console.log(`[CRON FALTOSOS] Encontrados ${agendamentos?.length || 0} agendamentos pendentes`)

    if (!agendamentos || agendamentos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum agendamento pendente para verificar',
        marcados: 0
      })
    }

    // Processar cada agendamento
    for (const agendamento of agendamentos) {
      try {
        // Converter data brasileira DD/MM/YYYY para Date
        const [dia, mes, ano] = agendamento.data_agendamento.split('/')
        const dataAgendamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))

        // Converter hora HH:MM para minutos
        const [horaAg, minAg] = agendamento.hora_inicio.split(':').map(Number)

        // Criar data/hora completa do agendamento
        const dataHoraAgendamento = new Date(dataAgendamento)
        dataHoraAgendamento.setHours(horaAg, minAg, 0, 0)

        // Verificar se já passou do horário (com tolerância de 30min)
        if (limiteTolerancia > dataHoraAgendamento) {
          console.log(`[CRON FALTOSOS] Marcando como faltoso: ${agendamento.nome_cliente} - ${agendamento.data_agendamento} ${agendamento.hora_inicio}`)

          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({
              status: 'cancelado',
              compareceu: false,
              observacoes: 'Não compareceu'
            })
            .eq('id', agendamento.id)

          if (updateError) {
            console.error(`[CRON FALTOSOS] Erro ao marcar ${agendamento.id}:`, updateError)
            erros.push(`${agendamento.nome_cliente}: ${updateError.message}`)
          } else {
            marcadosComoFaltosos++
          }
        }
      } catch (processError) {
        console.error(`[CRON FALTOSOS] Erro ao processar agendamento ${agendamento.id}:`, processError)
        erros.push(`${agendamento.nome_cliente}: ${processError instanceof Error ? processError.message : 'Erro desconhecido'}`)
      }
    }

    console.log(`[CRON FALTOSOS] Finalizado. Marcados: ${marcadosComoFaltosos}, Erros: ${erros.length}`)

    return NextResponse.json({
      success: true,
      message: 'Verificação de faltosos concluída',
      data: {
        total_verificados: agendamentos.length,
        marcados_como_faltosos: marcadosComoFaltosos,
        erros: erros
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CRON FALTOSOS] Erro geral:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar cron de faltosos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
