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
      descricao: 'Todas as APIs requerem autenticação via Bearer Token (exceto lembretes simples)',
      rotas: [
        {
          metodo: 'GET/POST/PUT/DELETE',
          rota: 'Todas as rotas',
          descricao: 'Use o header Authorization com o token gerado em Configurações → Segurança da API',
          exemplo: `# Exemplo de uso em todas as requisições
Authorization: Bearer vinci_XXXXXXXXXXXXXXXXX...

# Gere seu token em: Dashboard → Configurações → Segurança da API
# O token é único e NÃO expira (guarde com segurança!)`
        }
      ]
    },
    {
      titulo: '📅 Agendamentos',
      descricao: 'APIs para gerenciar agendamentos completos',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/agendamentos',
          descricao: 'Listar todos os agendamentos (com filtros opcionais)',
          parametros: 'status, data_inicio, data_fim, profissional_id',
          exemplo: `curl -X GET "https://seu-dominio.com/api/agendamentos?status=agendado" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/agendamentos/horarios-disponiveis',
          descricao: 'Buscar horários disponíveis para uma data específica',
          parametros: 'data (YYYY-MM-DD, obrigatório), barbeiro (nome, opcional), servico_ids (separados por vírgula, opcional)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/agendamentos/horarios-disponiveis?data=2025-12-20&barbeiro=Hiago&servico_ids=uuid1,uuid2" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/agendamentos/buscar-barbeiro-rodizio',
          descricao: 'Buscar próximo barbeiro disponível no rodízio automático',
          parametros: 'data (DD-MM-YYYY), hora (HH:MM), servico_ids (separados por vírgula)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/agendamentos/buscar-barbeiro-rodizio?data=20-12-2025&hora=14:00&servico_ids=uuid1,uuid2" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/criar',
          descricao: 'Criar novo agendamento com rodízio automático de barbeiros',
          body: {
            cliente_nome: "João Silva",
            telefone: "11999998888",
            data: "2025-12-15",
            hora: "14:00",
            servico_ids: ["uuid-servico-1", "uuid-servico-2"],
            barbeiro_preferido: "Hiago (opcional, deixe vazio para rodízio)",
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
          metodo: 'POST',
          rota: '/api/agendamentos/confirmar-comparecimento',
          descricao: 'Cliente confirma que vai comparecer (via WhatsApp geralmente)',
          body: {
            agendamento_id: "uuid-do-agendamento",
            confirmado: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/agendamentos/confirmar-comparecimento \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123", "confirmado": true}'`
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/checkin',
          descricao: 'Fazer check-in do cliente (marcar que chegou e iniciar atendimento)',
          body: {
            agendamento_id: "uuid-do-agendamento"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/agendamentos/checkin \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123"}'`
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/finalizar',
          descricao: 'Finalizar atendimento, calcular tempo total e registrar valor',
          body: {
            agendamento_id: "uuid-do-agendamento",
            valor_final: 45.00,
            observacoes: "Cliente satisfeito, pediu produto XYZ"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/agendamentos/finalizar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123", "valor_final": 45.00}'`
        },
        {
          metodo: 'POST',
          rota: '/api/agendamentos/reagendar',
          descricao: 'Reagendar um agendamento existente para nova data/hora',
          body: {
            agendamento_id: "uuid-do-agendamento",
            nova_data: "15-12-2025",
            nova_hora: "16:00"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/agendamentos/reagendar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123", "nova_data": "15-12-2025", "nova_hora": "16:00"}'`
        },
        {
          metodo: 'DELETE',
          rota: '/api/agendamentos/cancelar',
          descricao: 'Cancelar agendamento (com validação de prazo antecedência)',
          body: {
            agendamento_id: "uuid-do-agendamento",
            motivo: "Cliente teve imprevisto",
            cancelado_por: "cliente"
          },
          exemplo: `curl -X DELETE https://seu-dominio.com/api/agendamentos/cancelar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123", "motivo": "Imprevisto", "cancelado_por": "cliente"}'`
        }
      ]
    },
    {
      titulo: '👤 Clientes',
      descricao: 'APIs para gerenciar clientes e histórico',
      rotas: [
        {
          metodo: 'POST',
          rota: '/api/clientes/criar',
          descricao: 'Cadastrar novo cliente no sistema',
          body: {
            nome_completo: "João Silva",
            telefone: "11999998888",
            email: "joao@email.com",
            data_nascimento: "1990-05-20",
            profissional_preferido: "Hiago",
            is_vip: false,
            observacoes: "Prefere barba sem máquina"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/clientes/criar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nome_completo": "João Silva",
    "telefone": "11999998888",
    "email": "joao@email.com"
  }'`
        },
        {
          metodo: 'POST',
          rota: '/api/clientes/atualizar',
          descricao: 'Atualizar dados de cliente existente',
          body: {
            cliente_id: "uuid-do-cliente",
            is_vip: true,
            observacoes: "Cliente frequente, sempre pontual"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/clientes/atualizar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"cliente_id": "uuid-123", "is_vip": true}'`
        },
        {
          metodo: 'GET',
          rota: '/api/clientes/historico',
          descricao: 'Buscar histórico completo do cliente (todos os agendamentos)',
          parametros: 'telefone (obrigatório) - telefone do cliente com DDD',
          exemplo: `curl -X GET "https://seu-dominio.com/api/clientes/historico?telefone=11999998888" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/clientes/meus-agendamentos',
          descricao: 'Cliente busca seus próprios agendamentos futuros',
          parametros: 'telefone (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/clientes/meus-agendamentos?telefone=11999998888" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    },
    {
      titulo: '✂️ Barbeiros',
      descricao: 'APIs completas para barbeiros e profissionais',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/barbeiros/listar',
          descricao: 'Listar todos os barbeiros cadastrados (com estatísticas e próximo do rodízio)',
          parametros: 'ativo (opcional, default: true) - true | false',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/listar?ativo=true" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/meus-agendamentos',
          descricao: 'Listar agendamentos de um barbeiro específico por período',
          parametros: 'barbeiro_nome (obrigatório), periodo: hoje | amanha | semana | semana_que_vem | mes | mes_que_vem | proximos7dias | proximos30dias',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=hoje" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/agendamentos-hoje',
          descricao: 'Buscar apenas os agendamentos de hoje do barbeiro',
          parametros: 'barbeiro_nome (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/agendamentos-hoje?barbeiro_nome=Hiago" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/agendamentos-semana',
          descricao: 'Buscar agendamentos da semana atual do barbeiro',
          parametros: 'barbeiro_nome (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/agendamentos-semana?barbeiro_nome=Hiago" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/horarios',
          descricao: 'Buscar horários de trabalho configurados do barbeiro',
          parametros: 'barbeiro_id (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/horarios?barbeiro_id=uuid-123" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/meu-faturamento',
          descricao: 'Consultar faturamento pessoal do barbeiro',
          parametros: 'barbeiro_nome (obrigatório), periodo (opcional)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/meu-faturamento?barbeiro_nome=Hiago" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/faturamento-mes',
          descricao: 'Faturamento do barbeiro no mês atual',
          parametros: 'barbeiro_id (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/faturamento-mes?barbeiro_id=uuid-123" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'POST',
          rota: '/api/barbeiros/bloquear-horario',
          descricao: 'Bloquear horário específico do barbeiro (almoço, folga, compromisso)',
          body: {
            barbeiro_id: "uuid-do-barbeiro",
            data: "15-12-2025",
            hora_inicio: "12:00",
            hora_fim: "13:00",
            motivo: "Almoço"
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/barbeiros/bloquear-horario \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"barbeiro_id": "uuid-123", "data": "15-12-2025", "hora_inicio": "12:00", "hora_fim": "13:00", "motivo": "Almoço"}'`
        },
        {
          metodo: 'DELETE',
          rota: '/api/barbeiros/cancelar-meu-agendamento',
          descricao: 'Barbeiro cancela um agendamento próprio',
          body: {
            agendamento_id: "uuid-do-agendamento",
            motivo: "Imprevisto pessoal"
          },
          exemplo: `curl -X DELETE https://seu-dominio.com/api/barbeiros/cancelar-meu-agendamento \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"agendamento_id": "uuid-123", "motivo": "Imprevisto"}'`
        },
        {
          metodo: 'POST',
          rota: '/api/barbeiros/configurar-webhook',
          descricao: 'Configurar webhook personalizado para o barbeiro receber notificações',
          body: {
            barbeiro_id: "uuid-do-barbeiro",
            webhook_url: "https://n8n.com/webhook/barbeiro-hiago",
            eventos: ["novo_agendamento", "cancelamento", "confirmacao"],
            ativo: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/barbeiros/configurar-webhook \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"barbeiro_id": "uuid-123", "webhook_url": "https://n8n.com/webhook/notif", "eventos": ["novo_agendamento"], "ativo": true}'`
        },
        {
          metodo: 'GET',
          rota: '/api/barbeiros/webhooks',
          descricao: 'Listar todos os webhooks configurados para um barbeiro',
          parametros: 'barbeiro_id (obrigatório)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/barbeiros/webhooks?barbeiro_id=uuid-123" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    },
    {
      titulo: '🛍️ Produtos',
      descricao: 'APIs para gerenciar produtos e estoque',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/produtos/listar',
          descricao: 'Listar todos os produtos (com filtro opcional por status)',
          parametros: 'ativo (opcional) - true | false',
          exemplo: `curl -X GET "https://seu-dominio.com/api/produtos/listar?ativo=true" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'POST',
          rota: '/api/produtos/criar',
          descricao: 'Criar novo produto no catálogo',
          body: {
            nome: "Pomada Modeladora",
            descricao: "Pomada fixação média, ideal para todos os tipos de cabelo",
            preco: 45.00,
            categoria: "Cosméticos",
            estoque: 10,
            ativo: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/produtos/criar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Pomada Modeladora", "preco": 45.00, "estoque": 10}'`
        },
        {
          metodo: 'POST',
          rota: '/api/produtos/atualizar',
          descricao: 'Atualizar produto existente (preço, estoque, status)',
          body: {
            produto_id: "uuid-do-produto",
            preco: 50.00,
            estoque: 15,
            ativo: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/produtos/atualizar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"produto_id": "uuid-123", "preco": 50.00, "estoque": 15}'`
        }
      ]
    },
    {
      titulo: '💎 Planos',
      descricao: 'APIs para gerenciar planos e pacotes de serviços',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/planos/listar',
          descricao: 'Listar todos os planos disponíveis',
          parametros: 'ativo (opcional) - true | false',
          exemplo: `curl -X GET "https://seu-dominio.com/api/planos/listar?ativo=true" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'POST',
          rota: '/api/planos/criar',
          descricao: 'Criar novo plano/pacote de serviços',
          body: {
            nome: "Plano Executivo",
            descricao: "5 cortes + 3 barbas por mês",
            valor_original: 400.00,
            valor_total: 320.00,
            quantidade_servicos: 8,
            validade_dias: 90,
            ativo: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/planos/criar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Plano Executivo", "valor_original": 400, "valor_total": 320, "quantidade_servicos": 8, "validade_dias": 90}'`
        },
        {
          metodo: 'POST',
          rota: '/api/planos/atualizar',
          descricao: 'Atualizar plano existente',
          body: {
            plano_id: "uuid-do-plano",
            valor_total: 300.00,
            ativo: false
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/planos/atualizar \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"plano_id": "uuid-123", "valor_total": 300.00, "ativo": false}'`
        }
      ]
    },
    {
      titulo: '✨ Serviços',
      descricao: 'APIs para gerenciar serviços oferecidos',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/servicos',
          descricao: 'Listar todos os serviços ativos da barbearia',
          exemplo: `curl -X GET "https://seu-dominio.com/api/servicos" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        },
        {
          metodo: 'POST',
          rota: '/api/servicos',
          descricao: 'Criar novo serviço',
          body: {
            nome: "Corte Degradê",
            descricao: "Corte moderno com degradê nas laterais",
            preco: 45.00,
            duracao_minutos: 40,
            categoria: "Cabelo",
            ativo: true
          },
          exemplo: `curl -X POST https://seu-dominio.com/api/servicos \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Corte Degradê", "preco": 45.00, "duracao_minutos": 40}'`
        },
        {
          metodo: 'PUT',
          rota: '/api/servicos',
          descricao: 'Atualizar serviço existente',
          body: {
            id: "uuid-do-servico",
            nome: "Corte Degradê Premium",
            preco: 50.00,
            duracao_minutos: 45
          },
          exemplo: `curl -X PUT https://seu-dominio.com/api/servicos \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "uuid-123", "preco": 50.00}'`
        },
        {
          metodo: 'DELETE',
          rota: '/api/servicos?id=uuid-123',
          descricao: 'Desativar serviço (soft delete)',
          parametros: 'id (obrigatório) - UUID do serviço',
          exemplo: `curl -X DELETE "https://seu-dominio.com/api/servicos?id=uuid-123" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    },
    {
      titulo: '🔔 Lembretes (N8N)',
      descricao: 'API simples para N8N buscar e enviar lembretes (SEM autenticação)',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/lembretes',
          descricao: 'Buscar agendamentos para enviar lembretes via WhatsApp',
          parametros: 'tipo: amanha | hoje | 1hora',
          exemplo: `# Esta API NÃO requer autenticação (uso interno N8N)
curl -X GET "https://seu-dominio.com/api/lembretes?tipo=amanha"

# Retorna lista de clientes para N8N enviar WhatsApp
# - amanha: agendamentos de amanhã (lembrete 24h antes)
# - hoje: agendamentos de hoje (lembrete manhã)
# - 1hora: agendamentos daqui 1 hora (lembrete urgente)`
        },
        {
          metodo: 'GET',
          rota: '/api/cron/lembretes',
          descricao: 'Endpoint automático para cron jobs enviarem lembretes (COM autenticação)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/cron/lembretes" \\
  -H "Authorization: Bearer SEU_TOKEN"`
        }
      ]
    },
    {
      titulo: '📊 Estatísticas Admin',
      descricao: 'APIs administrativas para estatísticas e relatórios',
      rotas: [
        {
          metodo: 'GET',
          rota: '/api/admin/estatisticas',
          descricao: 'Estatísticas completas da barbearia (faturamento, taxa comparecimento, barbeiro mais ativo, etc)',
          parametros: 'periodo: hoje | semana | mes | ano, data_inicio (DD-MM-YYYY, opcional), data_fim (DD-MM-YYYY, opcional)',
          exemplo: `curl -X GET "https://seu-dominio.com/api/admin/estatisticas?periodo=mes" \\
  -H "Authorization: Bearer SEU_TOKEN"

# Ou com período customizado:
curl -X GET "https://seu-dominio.com/api/admin/estatisticas?data_inicio=01-12-2025&data_fim=31-12-2025" \\
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
            📚 Documentação completa com TODAS as APIs do sistema<br />
            Precisa de ajuda? Acesse as configurações do sistema ou entre em contato com o suporte.
          </p>
          <p className="text-purple-400 text-sm mb-2">
            🎯 <strong>{apiSections.reduce((acc, sec) => acc + sec.rotas.length, 0)} endpoints documentados</strong> |
            ✅ Exemplos curl para todas as rotas
          </p>
          <p className="text-purple-400 text-sm">
            Versão da API: v2.0.0 | Última atualização: 12/12/2025
          </p>
        </div>
      </div>
    </div>
  )
}
