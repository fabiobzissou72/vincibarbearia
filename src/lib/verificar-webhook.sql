-- ============================================
-- Script para verificar e configurar Webhook
-- ============================================

-- 1. Ver configuração atual do webhook
SELECT webhook_url FROM configuracoes;

-- 2. Se não existir registro, criar com o webhook correto
INSERT INTO configuracoes (webhook_url)
SELECT 'https://webhook.fbzia.com.br/webhook/dashvince'
WHERE NOT EXISTS (SELECT 1 FROM configuracoes);

-- 3. Atualizar webhook existente
UPDATE configuracoes
SET webhook_url = 'https://webhook.fbzia.com.br/webhook/dashvince'
WHERE webhook_url IS NULL
   OR webhook_url != 'https://webhook.fbzia.com.br/webhook/dashvince';

-- 4. Verificar se foi atualizado
SELECT
  webhook_url,
  CASE
    WHEN webhook_url = 'https://webhook.fbzia.com.br/webhook/dashvince' THEN '✅ Configurado corretamente'
    ELSE '❌ Webhook incorreto ou não configurado'
  END as status
FROM configuracoes;

-- ============================================
-- Teste manual de envio (copie e cole no n8n ou Postman)
-- ============================================
/*
POST https://webhook.fbzia.com.br/webhook/dashvince
Content-Type: application/json

{
  "telefone": "11999999999",
  "mensagem": "Teste de mensagem",
  "nome_cliente": "Cliente Teste"
}
*/
