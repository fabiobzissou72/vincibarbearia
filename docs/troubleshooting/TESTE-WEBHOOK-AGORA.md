# 🧪 TESTE DE WEBHOOK - EXECUTAR AGORA

## ⏱️ Passo 1: Aguardar Deploy (2-3 minutos)

O Vercel está fazendo deploy automático. Aguarde 2-3 minutos.

**Verificar:** https://vercel.com (ou abra o Dashboard e veja se está atualizado)

---

## 📝 Passo 2: Criar Agendamento pelo Dashboard

1. Acesse o Dashboard
2. Vá em **Agendamentos → Novo Agendamento**
3. Preencha:
   - Cliente: Fabio Zissou
   - Telefone: seu telefone
   - Barbeiro: **Nicollas** (que tem webhook configurado)
   - Data: Amanhã (07/01/2026)
   - Hora: 14:00
   - Serviço: Qualquer um
4. **Clique em Criar**
5. **Anote o horário exato** que clicou (ex: 08:15:30)

---

## 🔍 Passo 3: Verificar Logs no Supabase

Execute esta query no **SQL Editor do Supabase**:

```sql
-- Ver últimos 10 webhooks disparados
SELECT
  tipo,
  status,
  webhook_url,
  erro,
  created_at AT TIME ZONE 'America/Sao_Paulo' as horario_brasilia
FROM notificacoes_enviadas
ORDER BY created_at DESC
LIMIT 10;
```

### ✅ Resultado ESPERADO:

Você deve ver **2 registros novos** com horário próximo ao que você criou o agendamento:

| tipo | status | webhook_url | erro | horario_brasilia |
|------|--------|-------------|------|------------------|
| novo_agendamento_barbeiro | enviado | https://webhook.bonnutech.com.br/webhook/nicollas | null | 2026-01-06 08:15:31 |
| confirmacao | enviado ou falhou | https://webhook.fbzia.com.br/webhook/dashvince | null ou timeout | 2026-01-06 08:15:30 |

**OBS:**
- `confirmacao` pode dar **timeout** - é problema da Evolution API, não do código
- `novo_agendamento_barbeiro` deve dar **SUCESSO** (status: enviado)

---

## ❌ Se NÃO aparecer webhook do barbeiro:

Execute para verificar configuração:

```sql
-- Verificar se Nicollas tem webhook configurado
SELECT
  p.nome,
  wb.webhook_url,
  wb.eventos,
  wb.ativo
FROM profissionais p
LEFT JOIN webhooks_barbeiros wb ON wb.profissional_id = p.id
WHERE p.nome = 'Nicollas';
```

**Deve retornar:**
```
nome: Nicollas
webhook_url: https://webhook.bonnutech.com.br/webhook/nicollas
eventos: {novo_agendamento, cancelamento, confirmacao}
ativo: true
```

Se não retornar, configure:

```sql
-- Pegar ID do Nicollas
SELECT id FROM profissionais WHERE nome = 'Nicollas';

-- Inserir webhook (substitua UUID-DO-NICOLLAS pelo ID acima)
INSERT INTO webhooks_barbeiros (profissional_id, webhook_url, eventos, ativo)
VALUES (
  'UUID-DO-NICOLLAS',
  'https://webhook.bonnutech.com.br/webhook/nicollas',
  ARRAY['novo_agendamento', 'cancelamento', 'confirmacao'],
  true
);
```

---

## 🧪 Passo 4: Testar Cancelamento

1. No Dashboard, **cancele o agendamento** que você acabou de criar
2. Anote o horário
3. Execute a query novamente:

```sql
SELECT
  tipo,
  status,
  webhook_url,
  created_at AT TIME ZONE 'America/Sao_Paulo' as horario_brasilia
FROM notificacoes_enviadas
ORDER BY created_at DESC
LIMIT 10;
```

### ✅ Resultado ESPERADO:

Mais **2 registros novos**:

| tipo | status | webhook_url | horario_brasilia |
|------|--------|-------------|------------------|
| cancelamento_barbeiro | enviado | https://webhook.bonnutech.com.br/webhook/nicollas | 2026-01-06 08:20:15 |
| cancelado | enviado ou falhou | https://webhook.fbzia.com.br/webhook/dashvince | 2026-01-06 08:20:14 |

---

## 📊 Debug Completo

Se quiser ver TUDO que aconteceu, use o script completo:

```sql
-- Cole todo o conteúdo do arquivo debug-webhook-agora.sql
```

---

## ✅ Checklist de Sucesso

- [ ] Deploy do Vercel concluído (2-3 min)
- [ ] Agendamento criado pelo Dashboard
- [ ] 2 webhooks apareceram nos logs (confirmacao + novo_agendamento_barbeiro)
- [ ] Agendamento cancelado pelo Dashboard
- [ ] 2 webhooks apareceram nos logs (cancelado + cancelamento_barbeiro)

---

## 🎯 Próximo Teste (Opcional)

Teste pelo **App Cliente**:
1. Abra o app
2. Crie um agendamento
3. Verifique se webhooks dispararam

---

**Me confirme os resultados! 🚀**
