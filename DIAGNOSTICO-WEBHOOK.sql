-- 🔍 DIAGNÓSTICO RÁPIDO - WEBHOOK DE CANCELAMENTO
-- Execute este SQL no Supabase para descobrir o problema!

-- ========================================
-- 1️⃣ CONFIGURAÇÃO ATUAL
-- ========================================
SELECT
  '1. CONFIGURAÇÃO' as secao,
  CASE
    WHEN webhook_url IS NULL OR webhook_url = '' THEN '❌ PROBLEMA: webhook_url não configurado!'
    WHEN webhook_url NOT LIKE 'https://%' THEN '⚠️ AVISO: Use HTTPS, não HTTP!'
    ELSE '✅ webhook_url configurado'
  END as status_url,
  CASE
    WHEN notif_cancelamento IS NULL THEN '❌ PROBLEMA: notif_cancelamento não configurado!'
    WHEN notif_cancelamento = false THEN '❌ PROBLEMA: Notificações DESATIVADAS!'
    ELSE '✅ Notificações ATIVAS'
  END as status_notif,
  webhook_url as url_atual,
  notif_cancelamento as notif_ativa
FROM configuracoes
WHERE id = 1;

-- ========================================
-- 2️⃣ ÚLTIMOS CANCELAMENTOS
-- ========================================
SELECT
  '2. ÚLTIMOS CANCELAMENTOS' as secao,
  id,
  created_at as quando,
  nome_cliente as cliente,
  data_agendamento as data,
  hora_inicio as hora,
  status,
  observacoes
FROM agendamentos
WHERE status = 'cancelado'
ORDER BY updated_at DESC
LIMIT 5;

-- ========================================
-- 3️⃣ WEBHOOKS DISPARADOS (ou tentados)
-- ========================================
SELECT
  '3. WEBHOOKS DISPARADOS' as secao,
  created_at as quando,
  agendamento_id,
  tipo,
  CASE
    WHEN status = 'enviado' THEN '✅ ' || status
    WHEN status = 'falhou' THEN '❌ ' || status
    ELSE '⚠️ ' || COALESCE(status, 'desconhecido')
  END as resultado,
  webhook_url as para_onde,
  COALESCE(erro, 'Sem erro') as erro_detalhes
FROM notificacoes_enviadas
WHERE tipo IN ('cancelado', 'cancelamento_barbeiro')
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 4️⃣ DIAGNÓSTICO FINAL
-- ========================================
WITH config AS (
  SELECT
    webhook_url,
    notif_cancelamento,
    CASE
      WHEN webhook_url IS NULL OR webhook_url = '' THEN false
      WHEN notif_cancelamento = false OR notif_cancelamento IS NULL THEN false
      ELSE true
    END as tudo_ok
  FROM configuracoes
  WHERE id = 1
),
ultimo_cancelamento AS (
  SELECT
    id,
    created_at,
    updated_at
  FROM agendamentos
  WHERE status = 'cancelado'
  ORDER BY updated_at DESC
  LIMIT 1
),
ultimo_webhook AS (
  SELECT
    created_at,
    status,
    erro
  FROM notificacoes_enviadas
  WHERE tipo IN ('cancelado', 'cancelamento_barbeiro')
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  '4. DIAGNÓSTICO' as secao,
  CASE
    WHEN NOT c.tudo_ok THEN '❌ PROBLEMA: Configuração incompleta! Execute a SOLUÇÃO abaixo.'
    WHEN uc.id IS NULL THEN '⚠️ Nenhum cancelamento recente para testar'
    WHEN uw.created_at IS NULL THEN '❌ PROBLEMA: Webhook não disparou! Verifique logs do servidor.'
    WHEN uw.status = 'enviado' THEN '✅ TUDO OK: Webhook funcionando! Verifique se N8N recebeu.'
    WHEN uw.status = 'falhou' THEN '❌ PROBLEMA: Webhook falhou! Erro: ' || COALESCE(uw.erro, 'desconhecido')
    ELSE '⚠️ Status desconhecido'
  END as diagnostico,
  c.webhook_url as url_configurada,
  c.notif_cancelamento as notif_ativa,
  uc.updated_at as ultimo_cancelamento_em,
  uw.created_at as ultimo_webhook_em,
  COALESCE(uw.status, 'Nenhum') as ultimo_status,
  COALESCE(uw.erro, 'N/A') as ultimo_erro
FROM config c
LEFT JOIN ultimo_cancelamento uc ON true
LEFT JOIN ultimo_webhook uw ON true;

-- ========================================
-- 💊 SOLUÇÃO RÁPIDA
-- ========================================
-- Se o diagnóstico apontou problema de configuração, COPIE e EXECUTE:
/*

UPDATE configuracoes
SET
  webhook_url = 'COLE-SUA-URL-DO-N8N-AQUI',  -- ⚠️ TROQUE PELA URL REAL!
  notif_cancelamento = true
WHERE id = 1;

-- Verificar se funcionou:
SELECT
  webhook_url,
  notif_cancelamento
FROM configuracoes
WHERE id = 1;

-- Deve retornar:
-- webhook_url: https://seu-n8n.com/webhook/cancelamento
-- notif_cancelamento: true

*/

-- ========================================
-- 🧪 TESTE MANUAL
-- ========================================
-- Depois de configurar, cancele um agendamento e execute:
/*

SELECT
  'TESTE APÓS CANCELAMENTO' as teste,
  (SELECT COUNT(*) FROM notificacoes_enviadas WHERE created_at > NOW() - INTERVAL '5 minutes') as webhooks_ultimos_5min,
  (SELECT status FROM notificacoes_enviadas ORDER BY created_at DESC LIMIT 1) as ultimo_status,
  (SELECT erro FROM notificacoes_enviadas ORDER BY created_at DESC LIMIT 1) as ultimo_erro;

*/
