-- =====================================================
-- TESTAR SISTEMA DE MARCAR FALTOSOS AUTOMATICAMENTE
-- =====================================================

-- 1. Ver agendamentos que deveriam ser marcados como faltosos
-- (Agendamentos com status "agendado" ou "confirmado" que já passaram)
WITH agora AS (
  SELECT
    NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '30 minutes' as limite_tolerancia,
    TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') as data_hoje,
    TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora_agora
)
SELECT
  '1️⃣ AGENDAMENTOS QUE DEVERIAM SER MARCADOS COMO FALTOSOS' as etapa,
  a.id,
  a.nome_cliente,
  a.telefone,
  a.data_agendamento,
  a.hora_inicio,
  a.status,
  a.compareceu,
  CASE
    WHEN a.status IN ('agendado', 'confirmado') THEN '⚠️ DEVERIA SER FALTOSO'
    ELSE '✅ Já foi tratado'
  END as situacao
FROM agendamentos a
CROSS JOIN agora
WHERE
  -- Comparar data e hora
  (
    -- Data anterior a hoje
    TO_DATE(a.data_agendamento, 'DD/MM/YYYY') < TO_DATE(agora.data_hoje, 'DD/MM/YYYY')
    OR
    -- Mesma data mas hora já passou (considerando tolerância)
    (
      TO_DATE(a.data_agendamento, 'DD/MM/YYYY') = TO_DATE(agora.data_hoje, 'DD/MM/YYYY')
      AND TO_TIMESTAMP(a.data_agendamento || ' ' || a.hora_inicio, 'DD/MM/YYYY HH24:MI') < agora.limite_tolerancia
    )
  )
  AND a.status IN ('agendado', 'confirmado')
ORDER BY a.data_agendamento DESC, a.hora_inicio DESC
LIMIT 20;

-- 2. Ver estatísticas de comparecimento
SELECT
  '2️⃣ ESTATÍSTICAS DE COMPARECIMENTO' as etapa,
  status,
  compareceu,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM agendamentos
WHERE data_agendamento >= TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '30 days', 'DD/MM/YYYY')
GROUP BY status, compareceu
ORDER BY quantidade DESC;

-- 3. Ver últimos agendamentos marcados como não compareceu
SELECT
  '3️⃣ ÚLTIMOS MARCADOS COMO FALTOSOS' as etapa,
  nome_cliente,
  telefone,
  data_agendamento,
  hora_inicio,
  status,
  compareceu,
  observacoes,
  updated_at
FROM agendamentos
WHERE compareceu = false
  OR observacoes LIKE '%não compareceu%'
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================
-- TESTE MANUAL: Marcar um agendamento específico como faltoso
-- =====================================================
/*
-- Substitua o ID pelo agendamento que deseja testar
UPDATE agendamentos
SET
  status = 'cancelado',
  compareceu = false,
  observacoes = 'Cliente não compareceu - marcado automaticamente pelo sistema'
WHERE id = 'COLE-O-ID-AQUI'
  AND status IN ('agendado', 'confirmado');

-- Verificar se funcionou
SELECT
  id,
  nome_cliente,
  data_agendamento,
  hora_inicio,
  status,
  compareceu,
  observacoes
FROM agendamentos
WHERE id = 'COLE-O-ID-AQUI';
*/

-- =====================================================
-- DESFAZER (se precisar testar novamente)
-- =====================================================
/*
-- Voltar um agendamento para "agendado" (para testar de novo)
UPDATE agendamentos
SET
  status = 'agendado',
  compareceu = null,
  observacoes = null
WHERE id = 'COLE-O-ID-AQUI';
*/
