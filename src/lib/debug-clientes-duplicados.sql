-- ============================================
-- VERIFICAR SE TEM CLIENTES DUPLICADOS
-- ============================================

-- 1. Ver TODOS os clientes com telefone 11970307000
SELECT
  id,
  nome_completo,
  telefone,
  email,
  data_cadastro
FROM clientes
WHERE telefone = '11970307000'
   OR telefone = '(11) 97030-7000'
   OR telefone = '11 97030-7000'
   OR telefone LIKE '%970307000%';

-- 2. Contar agendamentos por NOME (não por cliente_id)
SELECT COUNT(*) as total
FROM agendamentos
WHERE nome_cliente LIKE '%Fabio%'
  AND telefone = '11970307000';

-- 3. Ver TODOS agendamentos por NOME
SELECT
  id,
  data_agendamento,
  hora_inicio,
  status,
  nome_cliente,
  telefone,
  cliente_id,
  valor
FROM agendamentos
WHERE telefone = '11970307000'
ORDER BY data_agendamento DESC, hora_inicio DESC;
