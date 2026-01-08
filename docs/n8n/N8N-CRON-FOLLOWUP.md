# 🔄 Configurar Follow-ups Automáticos no N8N

Como a Vercel plano Hobby não permite cron jobs, você precisa configurar o N8N para chamar a API de lembretes periodicamente.

---

## 📋 O que o sistema faz:

Quando você chama a API `/api/cron/lembretes`, ela verifica e dispara automaticamente:

1. **Lembrete 24h antes** - Envia 1 dia antes do agendamento
2. **Lembrete 2h antes** - Envia 2 horas antes do agendamento
3. **Follow-up 3 dias** - Pede feedback 3 dias após atendimento
4. **Follow-up 21 dias** - Lembrete para reagendar (21 dias após)

---

## 🔧 Configuração no N8N

### 1️⃣ Criar Novo Workflow

1. Acesse seu N8N
2. Crie um novo workflow
3. Nome: **"Cron - Lembretes e Follow-ups"**

### 2️⃣ Adicionar Nó "Schedule Trigger"

**Nó 1: Schedule Trigger**
- **Trigger**: Schedule Trigger
- **Modo**: Every Hour (Toda hora)
- **Hours**: De 8h às 20h (adicione: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
- **Timezone**: America/Sao_Paulo

**Configuração:**
```
Trigger: Schedule Trigger
Mode: Custom
Fields to Set: Hours
Hours: 8,9,10,11,12,13,14,15,16,17,18,19,20
Minutes: 0
```

### 3️⃣ Adicionar Nó "HTTP Request"

**Nó 2: HTTP Request**
- **Method**: GET
- **URL**: `https://SEU-DOMINIO.vercel.app/api/cron/lembretes`

**Exemplo de URL:**
```
https://vincibarbearia.vercel.app/api/cron/lembretes
```

**Authentication**: None (ou configure Bearer Token se quiser segurança)

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

### 4️⃣ (Opcional) Adicionar Nó de Log

**Nó 3: Set Node** (para log)
- Cria um registro do que foi executado
- Mostra quantas notificações foram enviadas

---

## 🎯 Como Funciona:

### Fluxo Completo:
```
1. N8N Schedule (a cada hora entre 8h-20h)
   ↓
2. Chama /api/cron/lembretes na Vercel
   ↓
3. API verifica no Supabase:
   - Agendamentos para amanhã → Envia lembrete 24h
   - Agendamentos daqui 2h → Envia lembrete 2h
   - Atendimentos de 3 dias atrás → Pede feedback
   - Atendimentos de 21 dias atrás → Lembra de reagendar
   ↓
4. Para cada notificação, dispara o webhook N8N configurado
   ↓
5. Seu workflow N8N de WhatsApp envia as mensagens
```

---

## 📝 Exemplo de Workflow N8N (JSON):

```json
{
  "name": "Cron - Lembretes e Follow-ups",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "hoursInterval": 1
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://vincibarbearia.vercel.app/api/cron/lembretes",
        "options": {}
      },
      "name": "Chamar API Lembretes",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [470, 300]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Chamar API Lembretes",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## ⚙️ Configurações no Dashboard

### No Dashboard → Configurações:

1. **Webhook URL**: Cole a URL do seu webhook N8N de WhatsApp
2. **Ative os toggles** das notificações que deseja:
   - ✅ Lembrete 24h Antes
   - ✅ Lembrete 2h Antes
   - ✅ Follow-up 3 Dias (feedback)
   - ✅ Follow-up 21 Dias (reagendar)

3. **Salve** as configurações

---

## 🧪 Como Testar:

### Teste Manual:
1. Acesse diretamente no navegador:
   ```
   https://SEU-DOMINIO.vercel.app/api/cron/lembretes
   ```

2. Deve retornar JSON como:
   ```json
   {
     "success": true,
     "message": "Cron executado com sucesso",
     "data": {
       "lembrete_24h": 2,
       "lembrete_2h": 0,
       "followup_3d": 1,
       "followup_21d": 0,
       "erros": []
     }
   }
   ```

### Teste no N8N:
1. Abra o workflow
2. Clique em **"Execute Workflow"**
3. Verifique os logs
4. Confira se os webhooks foram disparados

---

## 🔒 Segurança (Opcional):

Se quiser adicionar segurança básica:

### 1. Adicione variável de ambiente na Vercel:
```
CRON_SECRET=seu_token_secreto_aqui
```

### 2. No N8N, adicione header:
```
Authorization: Bearer seu_token_secreto_aqui
```

Mas **NÃO é obrigatório** para funcionar!

---

## 🎉 Pronto!

Agora seus clientes vão receber:
- ✅ Lembretes antes dos agendamentos
- ✅ Pedido de feedback após atendimento
- ✅ Lembrete para reagendar a cada 21 dias

**Tudo automático via N8N!** 🚀
