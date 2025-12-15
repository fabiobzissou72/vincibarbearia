-- ============================================
-- DEBUG: Procurar VIEWS, TRIGGERS e CONSTRAINTS
-- ============================================

-- 1. Ver se há VIEWS que usam agendamentos
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition LIKE '%agendamentos%';

-- 2. Ver TRIGGERS na tabela agendamentos
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'agendamentos';

-- 3. Ver TODAS as constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'agendamentos';

-- 4. Ver detalhes de CHECK constraints (se houver)
SELECT
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'agendamentos';

-- 5. Tentar inserir direto para ver erro completo
-- Execute separadamente se as queries acima não mostrarem nada
INSERT INTO agendamentos (
  profissional_id,
  data_agendamento,
  hora_inicio,
  nome_cliente,
  telefone,
  valor,
  status
) VALUES (
  (SELECT id FROM profissionais LIMIT 1),
  '15/12/2025',  -- Formato brasileiro
  '14:00',
  'Teste Debug',
  '11999999999',
  70.00,
  'agendado'
);
