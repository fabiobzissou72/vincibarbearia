-- ============================================
-- CORREÇÃO: Mudar coluna data_agendamento para TEXT
-- ============================================
-- Problema: Coluna está como DATE, mas sistema usa formato brasileiro DD/MM/YYYY
-- Solução: Alterar para TEXT para aceitar formato brasileiro
-- Data: 15/12/2025
-- ============================================

-- 1. Backup dos dados existentes
CREATE TABLE IF NOT EXISTS agendamentos_backup AS
SELECT * FROM agendamentos;

-- 2. Alterar tipo da coluna para TEXT
ALTER TABLE agendamentos
ALTER COLUMN data_agendamento TYPE TEXT;

-- 3. Verificar se funcionou
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'agendamentos'
  AND column_name = 'data_agendamento';

-- ============================================
-- RESULTADO ESPERADO:
-- column_name       | data_type | character_maximum_length
-- data_agendamento  | text      | NULL
-- ============================================

-- ✅ Após executar este SQL:
-- 1. Volte ao dashboard
-- 2. Tente criar um agendamento
-- 3. Deve funcionar com data DD/MM/YYYY
-- ============================================
