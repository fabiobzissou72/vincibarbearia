'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function ApiDocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copiarCodigo = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const apiSections = [
    {
      titulo: '🔐 Autenticação',
      descricao: 'Todas as APIs requerem autenticação via Bearer Token',
      rotas: [
        {
          metodo: 'GET/POST',
          rota: 'Todas as rotas',
          descricao: 'Use o header Authorization com o token gerado em Configurações',
          exemplo: `Authorization: Bearer vinci_XXXXXXXXXXXXXXXXX...`
        }
      ]
    },
    {
      titulo: '📅 Agendamentos',
      descricao: 'APIs para gerenciar agendamentos',
      rotas: [
        {
          metodo: 'POST',
          rota: '/api/agendamentos/criar',
          descricao: 'Criar novo agendamento com rodízio automático',
          body: {
            cliente_nome: "João Silva",
            telefone: "11999998888",
            data: "2025-12-15",
            hora: "14:00",
            servico_ids: ["uuid-servico-1", "uuid-servico-2"],
            barbeiro_preferido: "Hiago (opcional)",
            observacoes: "Cliente prefere barba com navalha"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/agendamentos/criar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente_nome": "João Silva",
    "telefone": "11999998888",
    "data": "2025-12-15",
    "hora": "14:00",
    "servico_ids": ["uuid-1", "uuid-2"]
  }'`
        },
        {
          metodo: 'DELETE',
          rota: '/api/agendamentos/cancelar',
          descricao: 'Cancelar agendamento com validação de prazo',
          body: {
            agendamento_id: "uuid-do-agendamento",
            motivo: "Cliente teve imprevisto",
            cancelado_por: "cliente"
          }
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/reagendar',
          descricao: 'Reagendar um agendamento existente',
          body: {
            agendamento_id: "uuid-do-agendamento",
            nova_data: "15-12-2025",
            nova_hora: "16:00"
          }
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/checkin',
          descricao: 'Fazer check-in do cliente (iniciar atendimento)',
          body: {
            agendamento_id: "uuid-do-agendamento"
          }
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/finalizar',
          descricao: 'Finalizar atendimento e calcular tempo',
          body: {
            agendamento_id: "uuid-do-agendamento",
            valor_final: 45.00,
            observacoes: "Cliente satisfeito"
          }
        }
      ]
    },
    {
      titulo: '👤 Clientes',
      descricao: 'APIs para gerenciar clientes',
      rotas: [
        {
          metodo: 'POST',
          rota: '/api/clientes/criar',
          descricao: 'Cadastrar novo cliente',
          body: {
            nome_completo: "João Silva",
            telefone: "11999998888",
            email: "joao@email.com",
            data_nascimento: "1990-05-20",
            profissional_preferido: "Hiago",
            is_vip: false
          }
        },
        {
          metodo: 'POST',
          rota: '/api/clientes/atualizar',
          descricao: 'Atualizar dados de cliente existente',
          body: {
            cliente_id: "uuid-do-cliente",
            is_vip: true,
            observacoes: "Cliente frequente"
          }
        },
        {
          metodo: 'GET',
          rota: '/api/clientes/historico?telefone=11999998888',
          descricao: 'Buscar histórico completo do cliente',
          exemplo: `curl -X GET "https://seu-dominio.com/api/clientes/historico?telefone=11999998888" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    },
    {
      titulo: '✂️ Barbeiros',
      descricao: 'APIs para barbeiros',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=hoje',
          descricao: 'Listar agendamentos do barbeiro',
          parametros: 'periodo: hoje | amanha | semana | semana_que_vem | mes | mes_que_vem | proximos7dias | proximos30dias'
        },
        {
          metodo: 'POST',
          rota: '/api/barbeiros/bloquear-horario',
          descricao: 'Bloquear horário específico (almoço, folga, etc)',
          body: {
            barbeiro_id: "uuid-do-barbeiro",
            data: "15-12-2025",
            hora_inicio: "12:00",
            hora_fim: "13:00",
            motivo: "Almoço"
          }
        },
        {
          metodo: 'POST',
          rota: '/api/barbeiros/configurar-webhook',
          descricao: 'Configurar webhook personalizado para o barbeiro',
          body: {
            barbeiro_id: "uuid-do-barbeiro",
            webhook_url: "https://n8n.com/webhook/barbeiro-notif",
            eventos: ["novo_agendamento", "cancelamento"],
            ativo: true
          }
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/webhooks?barbeiro_id=uuid',
          descricao: 'Listar webhooks configurados para um barbeiro'
        }
      ]
    },
    {
      titulo: '🛍️ Produtos',
      descricao: 'APIs para gerenciar produtos',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/produtos/listar?ativo=true',
          descricao: 'Listar todos os produtos'
        },
        {
          metodo: 'POST',
          rota: '/api/produtos/criar',
          descricao: 'Criar novo produto',
          body: {
            nome: "Pomada Modeladora",
            descricao: "Pomada fixação média",
            preco: 45.00,
            categoria: "Cosméticos",
            estoque: 10,
            ativo: true
          }
        },
        {
          metodo: 'POST',
          rota: '/api/produtos/atualizar',
          descricao: 'Atualizar produto existente',
          body: {
            produto_id: "uuid-do-produto",
            preco: 50.00,
            estoque: 15
          }
        }
      ]
    },
    {
      titulo: '💎 Planos',
      descricao: 'APIs para gerenciar planos de serviço',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/planos/listar?ativo=true',
          descricao: 'Listar todos os planos'
        },
        {
          metodo: 'POST',
          rota: '/api/planos/criar',
          descricao: 'Criar novo plano',
          body: {
            nome: "Plano Executivo",
            descricao: "5 cortes + 3 barbas",
            valor_original: 400.00,
            valor_total: 320.00,
            quantidade_servicos: 8,
            validade_dias: 90,
            ativo: true
          }
        },
        {
          metodo: 'POST',
          rota: '/api/planos/atualizar',
          descricao: 'Atualizar plano existente',
          body: {
            plano_id: "uuid-do-plano",
            valor_total: 300.00,
            ativo: false
          }
        }
      ]
    },
    {
      titulo: '📊 Estatísticas Admin',
      descricao: 'APIs administrativas para estatísticas gerais',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/admin/estatisticas?periodo=mes',
          descricao: 'Estatísticas completas da barbearia',
          parametros: 'periodo: hoje | semana | mes | ano',
          exemplo: `curl -X GET "https://seu-dominio.com/api/admin/estatisticas?periodo=mes" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 mb-8 shadow-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            📚 Documentação da API
          </h1>
          <p className="text-purple-100 text-lg">
            Vinci Barbearia - Guia completo de integração
          </p>
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-white text-sm">
              <strong>Base URL:</strong> https://seu-dominio.com
            </p>
            <p className="text-white text-sm mt-2">
              <strong>Autenticação:</strong> Bearer Token (obter em Configurações → Segurança da API)
            </p>
          </div>
        </div>

        {/* Seções */}
        {apiSections.map((secao, idx) => (
          <div key={idx} className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/30 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-1">{secao.titulo}</h2>
              <p className="text-purple-200">{secao.descricao}</p>
            </div>

            <div className="p-6 space-y-6">
              {secao.rotas.map((rota, rotaIdx) => {
                const codigoId = `${idx}-${rotaIdx}`
                const codigoExemplo = rota.exemplo || (rota.body ? JSON.stringify(rota.body, null, 2) : '')

                return (
                  <div key={rotaIdx} className="bg-slate-900/50 rounded-lg p-5 border border-purple-500/20">
                    {/* Método e Rota */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        rota.metodo === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                        rota.metodo === 'POST' ? 'bg-green-500/20 text-green-300' :
                        rota.metodo === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {rota.metodo}
                      </span>
                      <code className="text-purple-300 text-sm font-mono bg-slate-950/50 px-3 py-1 rounded flex-1">
                        {rota.rota}
                      </code>
                    </div>

                    {/* Descrição */}
                    <p className="text-slate-300 mb-3">{rota.descricao}</p>

                    {/* Parâmetros */}
                    {rota.parametros && (
                      <div className="mb-3 bg-blue-900/20 border border-blue-500/30 rounded p-3">
                        <p className="text-xs text-blue-300 font-mono">{rota.parametros}</p>
                      </div>
                    )}

                    {/* Body ou Exemplo */}
                    {codigoExemplo && (
                      <div className="relative">
                        <div className="bg-slate-950 rounded-lg p-4 border border-purple-500/20">
                          <pre className="text-sm text-purple-200 overflow-x-auto">
                            <code>{codigoExemplo}</code>
                          </pre>
                        </div>
                        <button
                          onClick={() => copiarCodigo(codigoExemplo, codigoId)}
                          className="absolute top-2 right-2 p-2 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
                          title="Copiar código"
                        >
                          {copiedId === codigoId ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-800 to-purple-900 rounded-lg p-6 text-center border border-purple-500/30 shadow-xl">
          <p className="text-purple-200 mb-2">
            Precisa de ajuda? Acesse as configurações do sistema ou entre em contato com o suporte.
          </p>
          <p className="text-purple-400 text-sm">
            Versão da API: v1.0.0 | Última atualização: 12/12/2025
          </p>
        </div>
      </div>
    </div>
  )
}
