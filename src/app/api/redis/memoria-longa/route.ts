import { NextRequest, NextResponse } from 'next/server'

const REDIS_URL = process.env.REDIS_URL || 'https://redis.bonnutech.com.br'
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''

/**
 * GET - Busca memória longa do Redis pelo telefone
 * Query params: ?telefone=11999999999
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get('telefone')

    if (!telefone) {
      return NextResponse.json(
        { error: 'Telefone é obrigatório' },
        { status: 400 }
      )
    }

    // Remove caracteres não numéricos do telefone
    const telefoneNormalizado = telefone.replace(/\D/g, '')

    // Chave do Redis: memoria_longa:{telefone}
    const key = `memoria_longa:${telefoneNormalizado}`

    try {
      // Tenta buscar do Redis via API REST
      const response = await fetch(`${REDIS_URL}/get/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(REDIS_PASSWORD && { 'Authorization': `Bearer ${REDIS_PASSWORD}` })
        }
      })

      if (!response.ok) {
        console.warn(`Redis retornou status ${response.status} para chave ${key}`)
        return NextResponse.json({
          memoria_longa: '',
          from_redis: false
        })
      }

      const data = await response.json()

      return NextResponse.json({
        memoria_longa: data.value || data.result || '',
        from_redis: true,
        telefone: telefoneNormalizado
      })

    } catch (fetchError) {
      console.error('Erro ao buscar do Redis:', fetchError)
      return NextResponse.json({
        memoria_longa: '',
        from_redis: false,
        error: 'Redis indisponível'
      })
    }

  } catch (error) {
    console.error('Erro ao buscar memória longa:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar memória longa' },
      { status: 500 }
    )
  }
}

/**
 * POST - Salva memória longa no Redis
 * Body: { telefone: string, memoria_longa: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telefone, memoria_longa } = body

    if (!telefone) {
      return NextResponse.json(
        { error: 'Telefone é obrigatório' },
        { status: 400 }
      )
    }

    // Remove caracteres não numéricos do telefone
    const telefoneNormalizado = telefone.replace(/\D/g, '')

    // Chave do Redis: memoria_longa:{telefone}
    const key = `memoria_longa:${telefoneNormalizado}`

    try {
      // Salva no Redis via API REST
      const response = await fetch(`${REDIS_URL}/set/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(REDIS_PASSWORD && { 'Authorization': `Bearer ${REDIS_PASSWORD}` })
        },
        body: JSON.stringify({
          value: memoria_longa || '',
          ttl: null // Sem expiração
        })
      })

      if (!response.ok) {
        console.error(`Erro ao salvar no Redis: status ${response.status}`)
        return NextResponse.json(
          { error: 'Erro ao salvar no Redis', saved: false },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        saved: true,
        telefone: telefoneNormalizado,
        key
      })

    } catch (fetchError) {
      console.error('Erro ao conectar com Redis:', fetchError)
      return NextResponse.json(
        { error: 'Redis indisponível', saved: false },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Erro ao salvar memória longa:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar memória longa' },
      { status: 500 }
    )
  }
}
