# 📱 APIS PARA WHATSAPP - BARBEIROS

**Data:** 11/12/2025
**Status:** 🎉 **3 APIS PRONTAS PARA N8N**

---

## 🎯 VISÃO GERAL

Criadas 3 APIs para automação via WhatsApp. Os barbeiros podem:
1. ✅ Consultar seus agendamentos (hoje/semana/mês)
2. ✅ Consultar seu faturamento
3. ✅ Cancelar agendamentos

**Tudo funciona via N8N + WhatsApp automaticamente!**

---

## 📋 API 1: MEUS AGENDAMENTOS

### Endpoint:
```
GET /api/barbeiros/meus-agendamentos
```

### Parâmetros:
- `barbeiro_nome` (obrigatório): Nome do barbeiro (Hiago, Alex, Filippe)
- `periodo` (opcional): hoje | semana | mes (padrão: hoje)

### cURL - Agendamentos de HOJE:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=hoje"
```

### cURL - Agendamentos da SEMANA:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=semana"
```

### cURL - Agendamentos do MÊS:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meus-agendamentos?barbeiro_nome=Hiago&periodo=mes"
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "barbeiro": {
      "id": "uuid",
      "nome": "Hiago"
    },
    "periodo": "hoje (11/12/2025)",
    "data_inicio": "11/12/2025",
    "data_fim": "11/12/2025",
    "total_agendamentos": 3,
    "valor_total": 235.00,
    "agendamentos": [
      {
        "id": "uuid",
        "data": "11/12/2025",
        "hora": "14:00",
        "cliente": "João Silva",
        "telefone": "11999999999",
        "servicos": "Corte + Barba",
        "valor": 125.00,
        "status": "agendado",
        "observacoes": "Cliente prefere barba na régua"
      },
      {
        "id": "uuid",
        "data": "11/12/2025",
        "hora": "15:30",
        "cliente": "Maria Santos",
        "telefone": "11988888888",
        "servicos": "Corte",
        "valor": 70.00,
        "status": "confirmado"
      }
    ],
    "mensagem_whatsapp": "📅 *Seus agendamentos hoje (11/12/2025)*\n\n👤 *Barbeiro:* Hiago\n📊 *Total:* 3 agendamento(s)\n💰 *Valor total:* R$ 235.00\n\n─────────────────\n\n*1. 14:00* - João Silva\n   📞 11999999999\n   ✂️ Corte + Barba\n   💵 R$ 125.00\n   📝 Cliente prefere barba na régua\n\n*2. 15:30* - Maria Santos\n   📞 11988888888\n   ✂️ Corte\n   💵 R$ 70.00\n\n"
  }
}
```

### Como usar no N8N:
1. Barbeiro envia: **"Quais meus agendamentos hoje?"**
2. N8N extrai: "hoje"
3. N8N chama API com período=hoje
4. N8N envia `mensagem_whatsapp` de volta

---

## 💰 API 2: MEU FATURAMENTO

### Endpoint:
```
GET /api/barbeiros/meu-faturamento
```

### Parâmetros:
- `barbeiro_nome` (obrigatório): Nome do barbeiro
- `periodo` (opcional): hoje | semana | mes (padrão: hoje)

### cURL - Faturamento de HOJE:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meu-faturamento?barbeiro_nome=Hiago&periodo=hoje"
```

### cURL - Faturamento da SEMANA:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meu-faturamento?barbeiro_nome=Hiago&periodo=semana"
```

### cURL - Faturamento do MÊS:
```bash
curl "https://vincebarbearia.vercel.app/api/barbeiros/meu-faturamento?barbeiro_nome=Hiago&periodo=mes"
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "barbeiro": {
      "id": "uuid",
      "nome": "Hiago"
    },
    "periodo": "hoje (11/12/2025)",
    "data_inicio": "11/12/2025",
    "data_fim": "11/12/2025",
    "total_atendimentos": 5,
    "faturamento_total": 425.00,
    "ticket_medio": 85.00,
    "faturamento_por_dia": [
      {
        "data": "11/12/2025",
        "quantidade": 5,
        "valor": 425.00
      }
    ],
    "mensagem_whatsapp": "💰 *Seu faturamento hoje (11/12/2025)*\n\n👤 *Barbeiro:* Hiago\n\n📊 *Total de atendimentos:* 5\n💵 *Faturamento total:* R$ 425.00\n📈 *Ticket médio:* R$ 85.00\n\n📈 *12.5% acima* da média dos últimos 7 dias"
  }
}
```

### Como usar no N8N:
1. Barbeiro envia: **"Quanto ganhei hoje?"** ou **"Meu faturamento hoje"**
2. N8N extrai: "hoje"
3. N8N chama API com período=hoje
4. N8N envia `mensagem_whatsapp` de volta

**IMPORTANTE:** Só conta agendamentos com status=**concluído**!

---

## ❌ API 3: CANCELAR AGENDAMENTO

### Endpoint:
```
POST /api/barbeiros/cancelar-meu-agendamento
```

### Body:
```json
{
  "barbeiro_nome": "Hiago",
  "cliente_nome": "Fabio",
  "hora": "13:00",
  "data": "11/12/2025"
}
```

**Nota:** Se `data` não for informada, usa data de HOJE automaticamente.

### cURL - Cancelar agendamento:
```bash
curl -X POST https://vincebarbearia.vercel.app/api/barbeiros/cancelar-meu-agendamento \
  -H "Content-Type: application/json" \
  -d '{
    "barbeiro_nome": "Hiago",
    "cliente_nome": "Fabio",
    "hora": "13:00"
  }'
```

### Resposta Sucesso:
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso!",
  "data": {
    "agendamento_id": "uuid",
    "cliente": "Fabio",
    "data": "11/12/2025",
    "hora": "13:00",
    "valor": 70.00,
    "mensagem_whatsapp": "✅ *Agendamento cancelado com sucesso!*\n\n📅 *Data:* 11/12/2025\n🕐 *Hora:* 13:00\n👤 *Cliente:* Fabio\n📞 *Telefone:* 11970307000\n💵 *Valor:* R$ 70.00\n\nO cliente será notificado sobre o cancelamento."
  }
}
```

### Resposta Erro (agendamento não encontrado):
```json
{
  "success": false,
  "message": "Agendamento não encontrado.\n\nBusquei por:\n- Cliente: Fabio\n- Data: 11/12/2025\n- Hora: 13:00\n- Barbeiro: Hiago\n\nVerifique se o nome do cliente e horário estão corretos."
}
```

### Como usar no N8N:
1. Barbeiro envia: **"Cancele o agendamento do Fabio às 13:00"**
2. N8N extrai:
   - Cliente: "Fabio"
   - Hora: "13:00"
   - Barbeiro: "Hiago" (do número do WhatsApp)
3. N8N chama API
4. N8N envia `mensagem_whatsapp` de volta

**O que acontece:**
- ✅ Agendamento é cancelado no banco
- ✅ Status muda para "cancelado"
- ✅ Some do dashboard automaticamente
- ✅ Cliente é notificado via webhook (se configurado)

---

## 🤖 FLUXOS N8N SUGERIDOS

### Fluxo 1: Consultar Agendamentos
```
Trigger (WhatsApp) → Webhook
  ↓
Detectar intenção (palavra-chave)
  - "agendamentos"
  - "compromissos"
  - "horários"
  ↓
Detectar período
  - "hoje" → periodo=hoje
  - "semana" → periodo=semana
  - "mês" → periodo=mes
  ↓
HTTP Request (GET)
  URL: /api/barbeiros/meus-agendamentos
  Params: barbeiro_nome, periodo
  ↓
Enviar WhatsApp
  Texto: {{ $json.data.mensagem_whatsapp }}
```

---

### Fluxo 2: Consultar Faturamento
```
Trigger (WhatsApp) → Webhook
  ↓
Detectar intenção
  - "faturamento"
  - "quanto ganhei"
  - "receita"
  ↓
Detectar período
  - "hoje" → periodo=hoje
  - "semana" → periodo=semana
  - "mês" → periodo=mes
  ↓
HTTP Request (GET)
  URL: /api/barbeiros/meu-faturamento
  Params: barbeiro_nome, periodo
  ↓
Enviar WhatsApp
  Texto: {{ $json.data.mensagem_whatsapp }}
```

---

### Fluxo 3: Cancelar Agendamento
```
Trigger (WhatsApp) → Webhook
  ↓
Detectar intenção
  - "cancelar"
  - "desmarcar"
  - "remover"
  ↓
Extrair dados (Regex/AI)
  - Cliente: "Fabio"
  - Hora: "13:00"
  - Data: opcional (usa hoje se não informada)
  ↓
HTTP Request (POST)
  URL: /api/barbeiros/cancelar-meu-agendamento
  Body: {
    barbeiro_nome,
    cliente_nome,
    hora,
    data (opcional)
  }
  ↓
Enviar WhatsApp
  Se success=true:
    {{ $json.data.mensagem_whatsapp }}
  Se success=false:
    {{ $json.message }}
```

---

## 📝 EXEMPLO COMPLETO - CONVERSA WHATSAPP

### Cenário 1: Consultar agendamentos
```
Hiago: Oi, quais são meus agendamentos de hoje?

Bot: 📅 *Seus agendamentos hoje (11/12/2025)*

👤 *Barbeiro:* Hiago
📊 *Total:* 3 agendamento(s)
💰 *Valor total:* R$ 235.00

─────────────────

*1. 14:00* - João Silva
   📞 11999999999
   ✂️ Corte + Barba
   💵 R$ 125.00

*2. 15:30* - Maria Santos
   📞 11988888888
   ✂️ Corte
   💵 R$ 70.00

*3. 17:00* - Pedro Costa
   📞 11977777777
   ✂️ Barba Completa
   💵 R$ 40.00
```

---

### Cenário 2: Consultar faturamento
```
Hiago: Quanto eu faturei hoje?

Bot: 💰 *Seu faturamento hoje (11/12/2025)*

👤 *Barbeiro:* Hiago

📊 *Total de atendimentos:* 5
💵 *Faturamento total:* R$ 425.00
📈 *Ticket médio:* R$ 85.00

📈 *12.5% acima* da média dos últimos 7 dias
```

---

### Cenário 3: Cancelar agendamento
```
Hiago: Preciso cancelar o agendamento do Fabio às 13:00

Bot: ✅ *Agendamento cancelado com sucesso!*

📅 *Data:* 11/12/2025
🕐 *Hora:* 13:00
👤 *Cliente:* Fabio
📞 *Telefone:* 11970307000
💵 *Valor:* R$ 70.00

O cliente será notificado sobre o cancelamento.
```

---

## 🔧 CONFIGURAÇÃO NO N8N

### Node HTTP Request - Agendamentos:
```json
{
  "method": "GET",
  "url": "https://vincebarbearia.vercel.app/api/barbeiros/meus-agendamentos",
  "qs": {
    "barbeiro_nome": "{{ $json.barbeiro }}",
    "periodo": "{{ $json.periodo }}"
  }
}
```

### Node HTTP Request - Faturamento:
```json
{
  "method": "GET",
  "url": "https://vincebarbearia.vercel.app/api/barbeiros/meu-faturamento",
  "qs": {
    "barbeiro_nome": "{{ $json.barbeiro }}",
    "periodo": "{{ $json.periodo }}"
  }
}
```

### Node HTTP Request - Cancelar:
```json
{
  "method": "POST",
  "url": "https://vincebarbearia.vercel.app/api/barbeiros/cancelar-meu-agendamento",
  "body": {
    "barbeiro_nome": "{{ $json.barbeiro }}",
    "cliente_nome": "{{ $json.cliente }}",
    "hora": "{{ $json.hora }}",
    "data": "{{ $json.data }}"
  }
}
```

---

## ✅ CHECKLIST

- [x] API de agendamentos criada
- [x] API de faturamento criada
- [x] API de cancelamento criada
- [x] Mensagens formatadas para WhatsApp
- [x] Timezone Brasília configurado
- [x] Webhook de notificação integrado
- [x] cURLs documentados
- [x] Exemplos de N8N

---

## 🎉 RESULTADO

Agora os barbeiros podem **VIA WHATSAPP**:
- ✅ Ver seus agendamentos (hoje/semana/mês)
- ✅ Ver seu faturamento
- ✅ Cancelar agendamentos
- ✅ Tudo automático via N8N!

**Deploy em andamento...**
**Teste os cURLs em 2 minutos!** ⏳
