-- ============================================
-- VERIFICAR SCHEMA COMPLETO DA TABELA AGENDAMENTOS
-- ============================================

-- 1. Ver TODAS as colunas e seus tipos
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'agendamentos'
ORDER BY ordinal_position;

-- 2. Ver CONSTRAINTS (restrições)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'agendamentos';

-- 3. Ver TRIGGERS
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'agendamentos';
