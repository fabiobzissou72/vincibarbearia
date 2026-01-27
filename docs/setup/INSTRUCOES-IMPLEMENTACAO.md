# 🚀 Instruções de Implementação - Sistema de Agendamento + N8N

## 📋 O QUE FOI CRIADO

✅ **Sistema de Rodízio Automático** de barbeiros (balanceado por quantidade de atendimentos)
✅ **Endpoints REST** para integração com N8N
✅ **Sistema de Notificações** via Webhook
✅ **Vercel Cron** para lembretes automáticos
✅ **Validação de Cancelamento** (2h de antecedência)
✅ **Histórico Completo** de atendimentos e notificações

---

## 🔧 PASSO A PASSO PARA ATIVAR

### 1️⃣ EXECUTAR SQL NO SUPABASE

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo: `src/lib/rodizio-notificacoes.sql`
5. Copie **TODO** o conteúdo
6. Cole no SQL Editor e clique em **RUN**

**O que será criado:**
- ✅ Tabelas de rodízio
- ✅ Tabelas de notificações
- ✅ Tabelas de cancelamentos
- ✅ Tabela de histórico
- ✅ Triggers automáticos
- ✅ Funções auxiliares
- ✅ View `v_rodizio_atual`

---

### 2️⃣ CONFIGURAR WEBHOOK NO DASHBOARD

1. Acesse seu dashboard: http://localhost:3001
2. Vá em **Configurações**
3. Role até **Webhook de Notificações**
4. Cole a URL do seu webhook N8N:
   ```
   https://seu-n8n.com/webhook/barbearia
   ```
5. Ative as notificações que desejar:
   - ☑ Confirmação imediata
   - ☑ Lembrete 24h antes
   - ☑ Lembrete 2h antes
   - ☐ Follow-up 3 dias
   - ☐ Follow-up 21 dias
   - ☑ Notificar cancelamentos
6. Clique em **Salvar**

---

### 3️⃣ CONFIGURAR VERCEL (PRODUÇÃO)

**No painel da Vercel:**

1. Vá em **Settings** → **Environment Variables**
2. Adicione uma nova variável:
   ```
   Nome: CRON_SECRET
   Valor: um_token_secreto_qualquer_aqui_123456
   ```
3. Salve e faça **Redeploy** do projeto

**O Cron já está configurado** no `vercel.json` e vai executar de hora em hora (8h-20h).

---

### 4️⃣ TESTAR LOCALMENTE

**Abra o Postman/Insomnia e teste:**

#### Teste 1: Consultar Horários Disponíveis
```http
GET http://localhost:3001/api/agendamentos/horarios-disponiveis?data=2025-12-20
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "horarios": ["09:00", "09:30", "10:00", ...]
  }
}
```

#### Teste 2: Criar Agendamento com Rodízio
```http
POST http://localhost:3001/api/agendamentos/criar
Content-Type: application/json

{
  "cliente_nome": "Teste Cliente",
  "telefone": "11999999999",
  "data": "2025-12-20",
  "hora": "14:00",
  "servico_ids": ["cole-um-uuid-de-servico-aqui"]
}
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "barbeiro_atribuido": "Nome do barbeiro com menos agendamentos",
    "agendamento_id": "uuid-do-agendamento"
  }
}
```

#### Teste 3: Confirmar Comparecimento
```http
POST http://localhost:3001/api/agendamentos/confirmar-comparecimento
Content-Type: application/json

{
  "agendamento_id": "cole-uuid-do-agendamento",
  "compareceu": true
}
```

#### Teste 4: Cancelar Agendamento
```http
DELETE http://localhost:3001/api/agendamentos/cancelar
Content-Type: application/json

{
  "agendamento_id": "cole-uuid-do-agendamento",
  "motivo": "Teste de cancelamento",
  "cancelado_por": "admin",
  "forcar": true
}
```

---

## 🤖 CONFIGURAR N8N

### Criar Webhook no N8N

1. Crie um novo workflow
2. Adicione node **Webhook**
3. Configure:
   - **HTTP Method**: POST
   - **Path**: `barbearia` (ou qualquer nome)
   - **Authentication**: None (ou configure se quiser)
4. Copie a **Webhook URL**
5. Cole no dashboard (passo 2 acima)

### Exemplo de Workflow N8N Simples

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Webhook   │────▶│  Switch (IF) │────▶│  WhatsApp   │
│  (Recebe)   │     │  Por Tipo    │     │  Evolution  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ├─ confirmacao → Mensagem de confirmação
                           ├─ lembrete_24h → "Lembrete: Amanhã é seu horário!"
                           ├─ lembrete_2h → "Atenção: Em 2h é seu horário!"
                           ├─ cancelado → "Seu agendamento foi cancelado"
                           └─ followup_3d → "Como foi seu atendimento?"
```

**Switch Node (IF):**
```javascript
// Rota 1 - Confirmação
{{ $json.tipo === 'confirmacao' }}

// Rota 2 - Lembrete 24h
{{ $json.tipo === 'lembrete_24h' }}

// Rota 3 - Lembrete 2h
{{ $json.tipo === 'lembrete_2h' }}

// Rota 4 - Cancelamento
{{ $json.tipo === 'cancelado' }}

// Rota 5 - Follow-up
{{ $json.tipo === 'followup_3d' || $json.tipo === 'followup_21d' }}
```

**WhatsApp Node (Exemplo de Mensagem):**
```
Olá {{ $json.cliente.nome }}! 👋

✅ Seu agendamento foi confirmado!

📅 Data: {{ $json.agendamento.data }}
⏰ Horário: {{ $json.agendamento.hora }}
💈 Barbeiro: {{ $json.agendamento.barbeiro }}
💰 Valor: R$ {{ $json.agendamento.valor_total }}

Nos vemos em breve! 😊
```

---

## 📊 COMO FUNCIONA O RODÍZIO

### Regras do Sistema

1. **Cliente COM barbeiro preferido:**
   - Sistema agenda direto com ele
   - Se ocupado, sugere outros horários

2. **Cliente SEM barbeiro preferido:**
   - Sistema consulta `v_rodizio_atual`
   - Seleciona barbeiro com **MENOS agendamentos do dia**
   - Critério de desempate: Quem atendeu há mais tempo

3. **Atualização Automática:**
   - Trigger atualiza contador quando agendamento é criado
   - A cada dia, sistema reseta contadores automaticamente

### Ver Rodízio Atual (SQL)

```sql
SELECT * FROM v_rodizio_atual;
```

Retorna:
```
profissional_nome | total_atendimentos_hoje | ultima_vez | ordem
Hiago             | 2                       | 2025-12-08 | 1
Alex              | 3                       | 2025-12-08 | 2
Filippe           | 5                       | 2025-12-07 | 3
```

---

## 🔔 NOTIFICAÇÕES AUTOMÁTICAS

### Como Funcionam

**Vercel Cron** executa `/api/cron/lembretes` de hora em hora (8h-20h).

Para cada execução, o cron:
1. Busca agendamentos de **amanhã** → Dispara `lembrete_24h`
2. Busca agendamentos de **hoje** (próximas 2h) → Dispara `lembrete_2h`
3. Busca atendimentos de **3 dias atrás** → Dispara `followup_3d`
4. Busca atendimentos de **21 dias atrás** → Dispara `followup_21d`

### Ver Notificações Enviadas

```sql
SELECT
  tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'enviado' THEN 1 END) as sucesso,
  COUNT(CASE WHEN status = 'falhou' THEN 1 END) as falhas
FROM notificacoes_enviadas
WHERE enviado_em >= NOW() - INTERVAL '7 days'
GROUP BY tipo;
```

---

## ⚠️ TROUBLESHOOTING

### Problema: Webhook não dispara

**Solução:**
1. Verifique se a URL está correta em **Configurações**
2. Teste manualmente o webhook N8N com Postman
3. Veja os logs em Supabase:
   ```sql
   SELECT * FROM notificacoes_enviadas
   WHERE status = 'falhou'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Problema: Cron não executa na Vercel

**Solução:**
1. Verifique se `vercel.json` está na raiz
2. Confirme se `CRON_SECRET` está configurado
3. Veja logs da Vercel: **Deployments** → **Functions** → `/api/cron/lembretes`

### Problema: Rodízio não balanceia

**Solução:**
1. Execute manualmente:
   ```sql
   SELECT limpar_rodizio_dia_anterior();
   ```
2. Verifique se triggers estão ativos:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%rodizio%';
   ```

### Problema: Horários não aparecem

**Solução:**
1. Verifique configurações em **Configurações** → **Horário por Dia**
2. Confirme que o dia está marcado como **Ativo**
3. Teste:
   ```sql
   SELECT * FROM configuracoes;
   ```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Leia o arquivo: **`INTEGRACAO-N8N.md`**

Lá você encontra:
- ✅ Referência completa de todos os endpoints
- ✅ Exemplos de payloads
- ✅ Fluxos N8N detalhados
- ✅ Tratamento de erros
- ✅ Monitoramento

---

## ✅ CHECKLIST FINAL

- [ ] SQL executado no Supabase
- [ ] Webhook configurado no dashboard
- [ ] CRON_SECRET configurado na Vercel
- [ ] Redeploy feito na Vercel
- [ ] Workflow N8N criado
- [ ] Testes locais realizados
- [ ] Primeiro agendamento de teste criado
- [ ] Verificado que webhook foi disparado
- [ ] Documentação lida

---

## 🎉 PRÓXIMOS PASSOS

Agora você tem:
✅ Sistema de rodízio automático funcionando
✅ API REST completa para N8N
✅ Notificações automáticas configuradas
✅ Histórico completo de tudo

**Falta implementar:**
- 🎨 Vista de calendário (Google Calendar style)
- 📊 Integração de métricas de vendas no dashboard
- 🖼️ Popup de detalhes do agendamento

**Quer que eu continue implementando?** 🚀
