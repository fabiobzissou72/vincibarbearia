-- ========================================
-- ADICIONA WEBHOOK SEPARADO PARA SENHA TEMPORÁRIA
-- ========================================
-- Execute este SQL no Supabase SQL Editor

-- Adiciona coluna webhook_senha_url na tabela configuracoes
ALTER TABLE configuracoes
ADD COLUMN IF NOT EXISTS webhook_senha_url TEXT;

-- Comentário da coluna
COMMENT ON COLUMN configuracoes.webhook_senha_url IS
'URL do webhook N8N específico para envio de senhas temporárias via WhatsApp. Se não configurado, usa o webhook_url geral.';

-- Verificar se foi criado
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'configuracoes'
  AND column_name = 'webhook_senha_url';

-- ========================================
-- COMO USAR
-- ========================================
-- 1. Configure o webhook no Dashboard > Configurações
-- 2. Cole a URL do N8N específica para senha temporária
-- 3. O sistema usará este webhook ao invés do webhook_url geral
-- 4. Assim suas automações de agendamento não serão afetadas
