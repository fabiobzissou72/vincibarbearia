-- ============================================
-- VERIFICAR RLS (Row Level Security)
-- ============================================

-- 1. Ver se RLS está ativado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'agendamentos';

-- 2. Ver políticas RLS (se houver)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'agendamentos';

-- 3. DESATIVAR RLS (se estiver ativado)
-- Isso pode resolver o problema temporariamente
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;

-- 4. Tentar inserir novamente após desativar RLS
INSERT INTO agendamentos (
  profissional_id,
  data_agendamento,
  hora_inicio,
  nome_cliente,
  telefone,
  valor,
  status
) VALUES (
  (SELECT id FROM profissionais WHERE ativo = true LIMIT 1),
  '15/12/2025',
  '14:00',
  'Teste Sem RLS',
  '11999999999',
  70.00,
  'agendado'
);
