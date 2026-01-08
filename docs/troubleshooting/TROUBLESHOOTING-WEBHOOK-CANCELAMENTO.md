# 🔧 Troubleshooting - Webhook de Cancelamento Não Dispara

Guia para diagnosticar e resolver problemas com webhook de cancelamento.

---

## ✅ A API JÁ DISPARA O WEBHOOK!

Boas notícias: A API `/api/agendamentos/cancelar` (usada pelo dashboard) **JÁ ESTÁ PREPARADA** para disparar webhooks!

O código (linha 164-311 de `route.ts`) dispara automaticamente quando você cancela pelo dashboard.

---

## 🔍 Checklist de Diagnóstico

### 1️⃣ Verificar Configuração no Supabase

**Abra o Supabase → Table Editor → `configuracoes`**

Verifique se os campos estão configurados:

| Campo | Deve estar | Seu valor atual |
|-------|------------|-----------------|
| `webhook_url` | URL do N8N | `https://...` |
| `notif_cancelamento` | `true` | ? |

**SQL para verificar:**
```sql
SELECT
  webhook_url,
  notif_cancelamento,
  prazo_cancelamento_horas
FROM configuracoes
WHERE id = 1;
```

**Resultado esperado:**
```
webhook_url: https://seu-n8n.com/webhook/cancelamento
notif_cancelamento: true
prazo_cancelamento_horas: 2
```

❌ **Se `notif_cancelamento` está `false` ou `null`:**
```sql
UPDATE configuracoes
SET notif_cancelamento = true
WHERE id = 1;
```

❌ **Se `webhook_url` está vazia ou incorreta:**
```sql
UPDATE configuracoes
SET webhook_url = 'https://seu-n8n.com/webhook/cancelamento'
WHERE id = 1;
```

---

### 2️⃣ Verificar Logs de Disparo

A API salva logs na tabela `notificacoes_enviadas`!

**SQL para ver últimos disparos:**
```sql
SELECT
  created_at,
  agendamento_id,
  tipo,
  status,
  webhook_url,
  erro,
  payload,
  resposta
FROM notificacoes_enviadas
WHERE tipo IN ('cancelado', 'cancelamento_barbeiro')
ORDER BY created_at DESC
LIMIT 10;
```

**Interpretação:**

| Status | Significado | Solução |
|--------|-------------|---------|
| `enviado` | ✅ Webhook disparou com sucesso | Verificar se N8N recebeu |
| `falhou` | ❌ Erro ao enviar | Ver campo `erro` |
| *(vazio)* | ⚠️ Webhook não configurado | Ver Passo 1 |

---

### 3️⃣ Verificar Logs do Console

**No terminal onde o Next.js está rodando**, procure por:

```
🔔 Iniciando disparo de webhooks de cancelamento: abc123-uuid
📊 Config webhook cancelamento: { existe: true, url: '...', ativo: true }
🌐 Disparando webhook global de cancelamento para: https://...
✅ Webhook global cancelamento SUCESSO: 200
```

❌ **Se aparecer:**
```
⚠️ Webhook global de cancelamento não configurado ou inativo
```
→ Volte no Passo 1 e configure!

❌ **Se aparecer:**
```
❌ Erro ao disparar webhook global de cancelamento: ...
```
→ Veja o erro específico e vá para Passo 4

---

### 4️⃣ Testar URL do Webhook Manualmente

**No terminal, teste se a URL funciona:**

```bash
curl -X POST https://SEU-N8N-URL-AQUI/webhook/cancelamento \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cancelamento",
    "agendamento_id": "teste-123",
    "cliente": {
      "nome": "Teste Silva",
      "telefone": "11999999999"
    },
    "agendamento": {
      "data": "25/12/2024",
      "hora": "14:00",
      "barbeiro": "Hiago",
      "valor_total": 70.00
    }
  }'
```

✅ **Se retornar status 200:**
```json
{"message": "Workflow received successfully"}
```
→ Webhook funciona! Problema é na configuração.

❌ **Se retornar erro:**
```
Failed to connect
```
→ URL incorreta ou N8N offline.

---

### 5️⃣ Verificar Workflow N8N

**No N8N:**

1. Abra o workflow de cancelamento
2. Verifique se está **ATIVADO** (chave verde)
3. Clique em **"Executions"** (histórico)
4. Veja se há execuções recentes

❌ **Se não tem execuções:**
→ Webhook não está chegando. Volte ao Passo 4.

❌ **Se tem execuções com erro:**
→ Veja o log de erro e corrija o Code Node ou WhatsApp Node.

---

## 🐛 Problemas Comuns

### Problema 1: `notif_cancelamento = false`

**Sintoma:** Logs mostram "Webhook não configurado ou inativo"

**Solução:**
```sql
UPDATE configuracoes
SET notif_cancelamento = true
WHERE id = 1;
```

---

### Problema 2: URL incorreta

**Sintoma:** Erro "Failed to connect" ou "ENOTFOUND"

**Solução:**
1. Copie a URL correta do webhook no N8N
2. Atualize no Supabase:
```sql
UPDATE configuracoes
SET webhook_url = 'https://URL-CORRETA-AQUI'
WHERE id = 1;
```

---

### Problema 3: N8N Workflow Desativado

**Sintoma:** cURL funciona quando clica "Execute" mas não funciona automaticamente

**Solução:**
1. No N8N, abra o workflow
2. Clique na **chave** (toggle) no canto superior direito
3. Deve ficar **verde** = ATIVO

---

### Problema 4: Timeout

**Sintoma:** Logs mostram "AbortError" ou "timeout"

**Solução:**
- N8N muito lento ou offline
- Aumentar timeout (linha 208 do código: `AbortSignal.timeout(10000)`)

---

### Problema 5: HTTPS vs HTTP

**Sintoma:** Erro SSL ou "protocol not supported"

**Solução:**
- Webhook URL DEVE começar com `https://` (não `http://`)
- Se N8N local, use ngrok ou similar para HTTPS

---

## 🧪 Teste Passo a Passo

### Teste 1: Verificar Configuração

```sql
-- Execute isso no Supabase
SELECT
  CASE
    WHEN webhook_url IS NULL THEN '❌ webhook_url não configurado'
    WHEN webhook_url = '' THEN '❌ webhook_url vazio'
    WHEN webhook_url LIKE 'http://%' THEN '⚠️ webhook_url HTTP (use HTTPS)'
    WHEN webhook_url LIKE 'https://%' THEN '✅ webhook_url OK'
    ELSE '❌ webhook_url inválido'
  END as status_url,
  CASE
    WHEN notif_cancelamento = true THEN '✅ Notificações ATIVAS'
    WHEN notif_cancelamento = false THEN '❌ Notificações DESATIVADAS'
    WHEN notif_cancelamento IS NULL THEN '❌ Notificações não configuradas'
  END as status_notif,
  webhook_url
FROM configuracoes
WHERE id = 1;
```

---

### Teste 2: Cancelar e Ver Logs

1. **Cancele um agendamento pelo dashboard**

2. **Imediatamente execute:**
```sql
SELECT
  created_at,
  status,
  erro,
  webhook_url
FROM notificacoes_enviadas
ORDER BY created_at DESC
LIMIT 1;
```

3. **Interpretação:**

**✅ Sucesso:**
```
status: enviado
erro: null
webhook_url: https://seu-n8n.com/...
```

**❌ Falhou:**
```
status: falhou
erro: "Failed to connect" ou "timeout"
webhook_url: https://...
```

---

### Teste 3: cURL Direto

```bash
# Teste se N8N recebe
curl -v -X POST https://SEU-N8N/webhook/cancelamento \
  -H "Content-Type: application/json" \
  -d '{"tipo":"cancelamento","cliente":{"nome":"Teste","telefone":"11999999999"},"agendamento":{"data":"25/12/2024","hora":"14:00","barbeiro":"Hiago"}}'
```

**Resposta esperada:**
```
< HTTP/1.1 200 OK
{"message": "Workflow received successfully"}
```

---

## 📊 Dashboard de Diagnóstico

**Execute este SQL para ver um resumo completo:**

```sql
-- 1. Configuração
SELECT
  'CONFIGURAÇÃO' as secao,
  'webhook_url' as campo,
  CASE
    WHEN webhook_url IS NOT NULL AND webhook_url != '' THEN '✅ Configurado'
    ELSE '❌ NÃO configurado'
  END as status,
  webhook_url as valor
FROM configuracoes
WHERE id = 1

UNION ALL

SELECT
  'CONFIGURAÇÃO',
  'notif_cancelamento',
  CASE
    WHEN notif_cancelamento = true THEN '✅ Ativo'
    ELSE '❌ Inativo'
  END,
  notif_cancelamento::text
FROM configuracoes
WHERE id = 1

UNION ALL

-- 2. Últimos 5 disparos
SELECT
  'ÚLTIMOS DISPAROS',
  to_char(created_at, 'DD/MM HH24:MI') || ' - ' || tipo,
  CASE
    WHEN status = 'enviado' THEN '✅ ' || status
    ELSE '❌ ' || status
  END,
  COALESCE(erro, 'Sem erro')
FROM notificacoes_enviadas
WHERE tipo IN ('cancelado', 'cancelamento_barbeiro')
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎯 Solução Rápida

**Se nada funciona, execute isto:**

```sql
-- 1. Limpar e reconfigurar
UPDATE configuracoes
SET
  webhook_url = 'COLE-A-URL-DO-N8N-AQUI',
  notif_cancelamento = true
WHERE id = 1;

-- 2. Verificar
SELECT
  webhook_url,
  notif_cancelamento
FROM configuracoes
WHERE id = 1;
```

**Deve retornar:**
```
webhook_url: https://seu-n8n.com/webhook/cancelamento
notif_cancelamento: true
```

---

## 📞 Próximos Passos

1. ✅ Execute o checklist acima
2. ✅ Veja os logs com o SQL fornecido
3. ✅ Teste com cURL
4. ✅ Cancele um agendamento de teste
5. ✅ Verifique se cliente recebeu WhatsApp

---

## 💡 Dica Pro

**Crie uma view para monitorar:**

```sql
CREATE OR REPLACE VIEW v_status_webhooks AS
SELECT
  (SELECT webhook_url FROM configuracoes WHERE id = 1) as webhook_url,
  (SELECT notif_cancelamento FROM configuracoes WHERE id = 1) as ativo,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as disparos_24h,
  COUNT(*) FILTER (WHERE status = 'enviado' AND created_at > NOW() - INTERVAL '24 hours') as sucesso_24h,
  COUNT(*) FILTER (WHERE status = 'falhou' AND created_at > NOW() - INTERVAL '24 hours') as falhas_24h
FROM notificacoes_enviadas
WHERE tipo IN ('cancelado', 'cancelamento_barbeiro');

-- Usar:
SELECT * FROM v_status_webhooks;
```

---

**Documentação criada em:** 21/12/2024
**Versão:** 1.0 - Troubleshooting Completo
