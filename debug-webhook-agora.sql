-- =====================================================
-- DEBUG: Verificar por que webhook não disparou
-- Executar AGORA no Supabase
-- =====================================================

-- 1. Verificar webhook GLOBAL (configuracoes)
SELECT
  webhook_url,
  notif_confirmacao,
  CASE
    WHEN webhook_url IS NULL THEN '❌ Webhook global NÃO configurado'
    WHEN notif_confirmacao = false THEN '❌ Notificação DESATIVADA'
    ELSE '✅ Webhook global OK'
  END as status_global
FROM configuracoes;

-- 2. Verificar webhooks dos PROFISSIONAIS
SELECT
  p.id,
  p.nome as barbeiro,
  p.ativo as barbeiro_ativo,
  wb.id as webhook_id,
  wb.webhook_url,
  wb.eventos,
  wb.ativo as webhook_ativo,
  CASE
    WHEN wb.id IS NULL THEN '❌ SEM webhook configurado'
    WHEN wb.ativo = false THEN '❌ Webhook DESATIVADO'
    WHEN 'novo_agendamento' = ANY(wb.eventos) THEN '✅ Configurado para novo_agendamento'
    ELSE '⚠️ Evento novo_agendamento NÃO está na lista'
  END as status
FROM profissionais p
LEFT JOIN webhooks_barbeiros wb ON wb.profissional_id = p.id
WHERE p.ativo = true
ORDER BY p.nome;

-- 3. Verificar ÚLTIMO agendamento criado (às 07:59)
SELECT
  a.id,
  a.nome_cliente,
  a.telefone,
  a.data_agendamento,
  a.hora_inicio,
  a.status,
  p.nome as barbeiro,
  a.updated_at as atualizado_em
FROM agendamentos a
LEFT JOIN profissionais p ON p.id = a.profissional_id
ORDER BY a.updated_at DESC
LIMIT 5;

-- 4. Verificar se algum webhook foi TENTADO (logs)
SELECT
  n.id,
  n.agendamento_id,
  n.tipo,
  n.status,
  n.webhook_url,
  n.erro,
  n.created_at as tentativa_em
FROM notificacoes_enviadas n
ORDER BY n.created_at DESC
LIMIT 10;

-- 5. DIAGNÓSTICO FINAL
SELECT
  'DIAGNÓSTICO WEBHOOK' as tipo,
  (SELECT COUNT(*) FROM configuracoes WHERE webhook_url IS NOT NULL AND notif_confirmacao = true) as webhook_global_ok,
  (SELECT COUNT(*) FROM webhooks_barbeiros WHERE ativo = true) as webhooks_barbeiros_ativos,
  (SELECT COUNT(*) FROM agendamentos WHERE updated_at > NOW() - INTERVAL '10 minutes') as agendamentos_ultimos_10min,
  (SELECT COUNT(*) FROM notificacoes_enviadas WHERE created_at > NOW() - INTERVAL '10 minutes') as notificacoes_ultimas_10min;
