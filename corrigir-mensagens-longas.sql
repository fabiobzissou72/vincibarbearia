-- =====================================================
-- CORRIGIR MENSAGENS LONGAS DOS FALTOSOS
-- =====================================================

-- 1. Ver agendamentos com mensagem longa (quebra o mobile)
SELECT
  id,
  nome_cliente,
  data_agendamento,
  hora_inicio,
  status,
  compareceu,
  observacoes,
  LENGTH(observacoes) as tamanho_texto
FROM agendamentos
WHERE observacoes LIKE '%marcado automaticamente pelo sistema%'
ORDER BY data_agendamento DESC;

-- 2. CORRIGIR: Encurtar mensagens longas
UPDATE agendamentos
SET observacoes = 'Não compareceu'
WHERE observacoes = 'Cliente não compareceu - marcado automaticamente pelo sistema';

-- 3. Verificar se foi corrigido
SELECT
  id,
  nome_cliente,
  data_agendamento,
  hora_inicio,
  observacoes
FROM agendamentos
WHERE compareceu = false
  AND status = 'cancelado'
  AND observacoes IS NOT NULL
ORDER BY data_agendamento DESC
LIMIT 10;
