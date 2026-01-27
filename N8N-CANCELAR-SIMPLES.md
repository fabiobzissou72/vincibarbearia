# 🚀 Fluxo N8N Simplificado - Cancelar Agendamento com ID

Forma mais simples de cancelar agendamentos usando o ID retornado pela API de consulta.

---

## 💡 Conceito

1. Barbeiro consulta agendamentos → API retorna lista com **IDs**
2. Barbeiro escolhe qual cancelar → Passa só o **ID**
3. API cancela direto → Muito mais simples!

---

## 📋 Fluxo Completo

### 1. Consultar Agendamentos

**HTTP Request:**
```
Método: GET
URL: https://vincibarbearia.vercel.app/api/barbeiro/agendamentos?barbeiro={{ barbeiro_id }}&quando=hoje
Headers:
  Authorization: Bearer SEU_TOKEN
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "agendamentos": [
      {
        "id": "abc123-uuid-agendamento-1",
        "hora": "09:00",
        "cliente": "João Silva",
        "telefone": "11999999999",
        "servicos": "Corte + Barba",
        "valor": 70.00
      },
      {
        "id": "def456-uuid-agendamento-2",
        "hora": "11:00",
        "cliente": "Maria Santos",
        "telefone": "11988888888",
        "servicos": "Corte Feminino",
        "valor": 80.00
      }
    ]
  }
}
```

---

### 2. Montar Mensagem com Botões

**Code Node:**
```javascript
const agendamentos = $input.item.json.data.agendamentos;

// Criar botões interativos
const botoes = agendamentos.map((ag, index) => ({
  id: `cancelar_${ag.id}`,
  title: `❌ ${ag.hora} - ${ag.cliente.split(' ')[0]}`
}));

// Mensagem formatada
let mensagem = $input.item.json.data.mensagem_whatsapp;
mensagem += "\n\n─────────────────\n";
mensagem += "❌ *Para cancelar um agendamento:*\n";
mensagem += "Clique no botão abaixo do horário que deseja cancelar.";

return {
  json: {
    mensagem: mensagem,
    botoes: botoes
  }
};
```

---

### 3. Enviar WhatsApp com Botões

**WhatsApp Node:**
```
Para: {{ $node["Webhook WhatsApp"].json["from"] }}
Mensagem: {{ $json.mensagem }}
Botões: {{ $json.botoes }}
```

**Exemplo visual no WhatsApp:**
```
📅 *Agendamentos - hoje (21/12/2024)*

👤 *Barbeiro:* Hiago
📊 *Total:* 2 agendamento(s)
💰 *Valor total:* R$ 150.00

─────────────────

*1. 09:00* - João Silva
   📞 11999999999
   ✂️ Corte + Barba
   💵 R$ 70.00

*2. 11:00* - Maria Santos
   📞 11988888888
   ✂️ Corte Feminino
   💵 R$ 80.00

─────────────────
❌ *Para cancelar um agendamento:*
Clique no botão abaixo do horário que deseja cancelar.

[❌ 09:00 - João]  [❌ 11:00 - Maria]
```

---

### 4. Webhook - Botão Clicado

Quando o barbeiro clica no botão:

**Webhook recebe:**
```json
{
  "from": "5511999999999",
  "button_clicked": "cancelar_abc123-uuid-agendamento-1"
}
```

---

### 5. Extrair ID do Agendamento

**Code Node:**
```javascript
const buttonData = $input.item.json.button_clicked;

// Extrair ID do agendamento do botão
// Formato: "cancelar_abc123-uuid-agendamento-1"
const agendamentoId = buttonData.replace('cancelar_', '');

return {
  json: {
    agendamento_id: agendamentoId
  }
};
```

---

### 6. Cancelar Agendamento

**HTTP Request:**
```
Método: POST
URL: https://vincibarbearia.vercel.app/api/barbeiros/cancelar-meu-agendamento
Headers:
  Content-Type: application/json
Body:
{
  "agendamento_id": "{{ $json.agendamento_id }}"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso!",
  "data": {
    "agendamento_id": "abc123-uuid-agendamento-1",
    "cliente": "João Silva",
    "data": "21/12/2024",
    "hora": "09:00",
    "valor": 70.00,
    "mensagem_whatsapp": "✅ *Agendamento cancelado com sucesso!*\n\n📅 *Data:* 21/12/2024\n🕐 *Hora:* 09:00\n👤 *Cliente:* João Silva\n📞 *Telefone:* 11999999999\n💵 *Valor:* R$ 70.00\n\nO cliente será notificado sobre o cancelamento."
  }
}
```

---

### 7. Confirmar Cancelamento

**WhatsApp Node:**
```
Para: {{ $node["Webhook WhatsApp"].json["from"] }}
Mensagem: {{ $node["HTTP Request - Cancelar"].json["data"]["mensagem_whatsapp"] }}
```

---

## 🎯 Comparação: Método Antigo vs Novo

### ❌ Método Antigo (Complexo)

**Barbeiro escreve:**
```
Cancela o agendamento do João às 09:00
```

**N8N precisa:**
1. Extrair nome do cliente com regex
2. Extrair hora com regex
3. Buscar barbeiro
4. Chamar API com 3 parâmetros
5. Tratamento de erro se nome ou hora errados

---

### ✅ Método Novo (Simples)

**Barbeiro clica:**
```
[❌ 09:00 - João]
```

**N8N precisa:**
1. Extrair ID do botão
2. Chamar API com 1 parâmetro
3. Pronto!

---

## 📝 Vantagens do Método Novo

✅ **Mais simples** - Apenas 1 parâmetro (ID)
✅ **Sem erros** - Não depende de regex ou parseamento
✅ **Mais rápido** - Menos passos no fluxo
✅ **Melhor UX** - Barbeiro só clica um botão
✅ **Sem ambiguidade** - ID é único, não confunde clientes com mesmo nome
✅ **Funciona sempre** - Não importa como o cliente se chama ou qual horário

---

## 🔄 Fluxograma Simplificado

```
┌─────────────────────┐
│ WhatsApp:           │
│ "Meus agendamentos" │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ GET /agendamentos   │
│ Retorna lista       │
│ com IDs             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Cria botões com IDs │
│ Envia WhatsApp      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Barbeiro clica      │
│ botão "❌ 09:00"    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Extrai ID do botão  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /cancelar      │
│ { agendamento_id }  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Confirmação         │
│ WhatsApp            │
└─────────────────────┘
```

---

## 🛠️ Implementação Rápida

### Passo 1: Atualizar Code Node da Consulta

Adicione botões ao código que monta a resposta:

```javascript
const data = $input.item.json.data;

// Criar botões para cada agendamento
const botoes = data.agendamentos.map(ag => ({
  id: `cancelar_${ag.id}`,
  title: `❌ ${ag.hora} - ${ag.cliente.split(' ')[0]}`
}));

return {
  json: {
    mensagem: data.mensagem_whatsapp + "\n\n❌ *Clique para cancelar:*",
    botoes: botoes
  }
};
```

### Passo 2: Criar Webhook para Botões

Quando botão é clicado:

```javascript
const buttonId = $input.item.json.button_clicked;
const agendamentoId = buttonId.replace('cancelar_', '');

return { json: { agendamento_id: agendamentoId } };
```

### Passo 3: Chamar API de Cancelamento

```
POST /api/barbeiros/cancelar-meu-agendamento
{ "agendamento_id": "{{ $json.agendamento_id }}" }
```

---

## ✅ Pronto!

Com apenas **3 passos simples**, você tem um fluxo completo de consulta e cancelamento com a melhor experiência para o barbeiro!

---

**Documentação criada em:** 21/12/2024
**Versão:** 1.0 - Método Simplificado com ID
