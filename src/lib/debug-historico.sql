-- ============================================
-- VERIFICAR HISTÓRICO COMPLETO DO CLIENTE
-- ============================================

-- 1. Ver TODOS os agendamentos de um cliente específico
-- SUBSTITUA o telefone pelo seu
SELECT
  id,
  data_agendamento,
  hora_inicio,
  status,
  valor,
  observacoes,
  data_criacao,
  updated_at
FROM agendamentos
WHERE cliente_id IN (
  SELECT id FROM clientes WHERE telefone = '11970307000' -- SEU TELEFONE AQUI
)
ORDER BY data_agendamento DESC, hora_inicio DESC;

-- 2. Contar total
SELECT COUNT(*) as total_agendamentos
FROM agendamentos
WHERE cliente_id IN (
  SELECT id FROM clientes WHERE telefone = '11970307000' -- SEU TELEFONE AQUI
);

-- 3. Ver por status
SELECT
  status,
  COUNT(*) as quantidade
FROM agendamentos
WHERE cliente_id IN (
  SELECT id FROM clientes WHERE telefone = '11970307000' -- SEU TELEFONE AQUI
)
GROUP BY status
ORDER BY quantidade DESC;
