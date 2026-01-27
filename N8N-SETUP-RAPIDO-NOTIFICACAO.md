# ⚡ Setup Rápido - Notificação Automática de Cancelamento

Configure em **5 minutos** a notificação automática para clientes quando agendamento for cancelado.

---

## 🎯 Resultado Final

```
Barbeiro cancela agendamento
        ↓
Cliente recebe WhatsApp AUTOMATICAMENTE:
"❌ Seu agendamento foi cancelado..."
```

---

## 📋 3 Passos Simples

### PASSO 1: Configurar Webhook no Supabase

**Abra o Supabase → SQL Editor:**
```sql
UPDATE configuracoes
SET
  webhook_url = 'SUA_URL_AQUI',  -- Você vai pegar no Passo 2
  notif_cancelamento = true
WHERE id = 1;
```

⚠️ **NÃO execute ainda!** Primeiro faça o Passo 2 para pegar a URL.

---

### PASSO 2: Criar Workflow no N8N

#### 1. Criar Novo Workflow

No N8N, clique em **+ New Workflow**

---

#### 2. Adicionar Webhook (Node 1)

**Adicione o node:** `Webhook`

**Configure:**
- **Nome:** `Receber Cancelamento`
- **HTTP Method:** `POST`
- **Path:** `cancelamento`

**Clique em "Execute Node" para ativar**

**Copie a URL gerada:**
```
Exemplo: https://seu-n8n.com/webhook/12345-67890-cancelamento
```

✅ **Agora volte no Passo 1 e execute o SQL com essa URL!**

---

#### 3. Adicionar Code Node (Node 2)

**Adicione o node:** `Code`

**Configure:**
- **Nome:** `Preparar Mensagem`
- **Language:** `JavaScript`

**Cole este código:**
```javascript
// Dados vindos da API
const cliente = $input.item.json.cliente.nome;
const telefone = $input.item.json.cliente.telefone;
const data = $input.item.json.agendamento.data;
const hora = $input.item.json.agendamento.hora;
const barbeiro = $input.item.json.agendamento.barbeiro;

// Montar mensagem
const mensagem =
`❌ *Agendamento Cancelado*

Olá ${cliente.split(' ')[0]},

Infelizmente precisamos cancelar seu agendamento:

📅 *Data:* ${data}
🕐 *Horário:* ${hora}
💈 *Barbeiro:* ${barbeiro}

📞 *Para reagendar:*
Entre em contato: (11) 98765-4321

Pedimos desculpas! 🙏`;

// Retornar dados
return [{
  json: {
    telefone: telefone,
    mensagem: mensagem
  }
}];
```

**⚠️ IMPORTANTE:** Altere o telefone `(11) 98765-4321` para o da sua barbearia!

---

#### 4. Adicionar WhatsApp Node (Node 3)

**Adicione o node:** Depende do seu serviço WhatsApp:
- **Evolution API:** Use node HTTP Request
- **Twilio:** Use node Twilio
- **Outro:** Use o node correspondente

**Configuração básica (Evolution API):**
```
Método: POST
URL: https://sua-evolution-api.com/message/sendText/INSTANCE
Headers:
  - apikey: SUA_API_KEY
Body:
{
  "number": "{{ $json.telefone }}",
  "textMessage": {
    "text": "{{ $json.mensagem }}"
  }
}
```

---

#### 5. Conectar os Nodes

```
[Webhook] → [Code] → [WhatsApp]
```

Arraste as bolinhas para conectar um no outro.

---

#### 6. Salvar e Ativar

1. Clique em **Save** (canto superior direito)
2. Coloque um nome: "Notificar Cliente - Cancelamento"
3. Clique na **chave** (toggle) para **ATIVAR** o workflow

---

### PASSO 3: Testar!

#### Teste Manual (Recomendado)

No N8N, volte no node **Webhook** e clique em **"Listen for Test Event"**

**Abra um terminal e execute:**
```bash
curl -X POST https://SEU-WEBHOOK-URL-AQUI \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cancelamento",
    "cliente": {
      "nome": "Teste Silva",
      "telefone": "SEU_TELEFONE_AQUI"
    },
    "agendamento": {
      "data": "25/12/2024",
      "hora": "14:00",
      "barbeiro": "Hiago",
      "motivo": "Teste de notificação"
    }
  }'
```

**Troque:**
- `https://SEU-WEBHOOK-URL-AQUI` → URL do seu webhook
- `SEU_TELEFONE_AQUI` → Seu telefone (formato: 5511999999999)

✅ **Você deve receber o WhatsApp!**

---

#### Teste Real

1. Vá no fluxo do barbeiro
2. Cancele um agendamento real
3. Veja se o cliente recebe a notificação!

---

## 🎨 Personalize a Mensagem

Edite o Code Node e mude a parte da `mensagem`:

### Opção 1: Mensagem Curta
```javascript
const mensagem =
`❌ Olá ${cliente.split(' ')[0]}, seu agendamento de ${data} às ${hora} foi cancelado. Entre em contato para reagendar: (11) 98765-4321`;
```

### Opção 2: Com Link de Reagendamento
```javascript
const mensagem =
`❌ *Cancelamento*

Olá ${cliente.split(' ')[0]},

Seu agendamento foi cancelado:
📅 ${data} às ${hora}

🔄 *Reagende aqui:*
https://wa.me/5511987654321?text=Quero%20reagendar`;
```

### Opção 3: Com Cupom de Desconto
```javascript
const mensagem =
`❌ *Cancelamento*

Lamentamos, ${cliente.split(' ')[0]}!

Seu agendamento de ${data} foi cancelado.

🎁 Como desculpas, ganhe *10% OFF*:
Cupom: DESCULPA10

Válido por 30 dias! 💈`;
```

---

## 🔧 Configuração do WhatsApp

### Se usar Evolution API:

```javascript
// No node HTTP Request
{
  "url": "https://sua-evolution.com/message/sendText/INSTANCE",
  "method": "POST",
  "headers": {
    "apikey": "SUA_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "number": "{{ $json.telefone }}",
    "textMessage": {
      "text": "{{ $json.mensagem }}"
    }
  }
}
```

### Se usar Twilio:

Use o node **Twilio** e configure:
- **To:** `{{ $json.telefone }}`
- **Message:** `{{ $json.mensagem }}`

### Se usar WhatsApp Business API:

Consulte a documentação do seu provedor.

---

## ❓ Troubleshooting

### Webhook não recebe nada

1. ✅ Verificou se o workflow está **ATIVADO**? (chave verde)
2. ✅ Webhook URL está correta no Supabase?
3. ✅ Executou o SQL para configurar?
4. ✅ `notif_cancelamento = true` no Supabase?

### Cliente não recebe WhatsApp

1. ✅ Telefone está no formato correto? `5511999999999`
2. ✅ API do WhatsApp está funcionando?
3. ✅ Testou manualmente o envio de WhatsApp?
4. ✅ Olhou os logs do N8N? (ícone de lista no workflow)

### Mensagem está estranha

1. ✅ Dados estão chegando corretos no webhook?
2. ✅ Olhe o output do Code Node para debug
3. ✅ Teste com `console.log(cliente, data, hora)` no código

---

## 📱 Exemplo de Mensagem Final

O cliente vai receber algo assim:

```
❌ *Agendamento Cancelado*

Olá João,

Infelizmente precisamos cancelar seu agendamento:

📅 *Data:* 21/12/2024
🕐 *Horário:* 14:00
💈 *Barbeiro:* Hiago

📞 *Para reagendar:*
Entre em contato: (11) 98765-4321

Pedimos desculpas! 🙏
```

---

## ✅ Checklist Final

- [ ] Webhook criado no N8N
- [ ] URL do webhook copiada
- [ ] SQL executado no Supabase com a URL
- [ ] Code Node configurado e mensagem ajustada
- [ ] WhatsApp Node configurado
- [ ] Nodes conectados
- [ ] Workflow salvo e ATIVADO
- [ ] Teste manual executado com sucesso
- [ ] Teste real com cancelamento funcionou

---

## 🎉 Pronto!

Agora **TODA VEZ** que um barbeiro cancelar um agendamento, o cliente recebe um WhatsApp automático!

**Tempo de setup:** ~5 minutos
**Automação:** 100%
**Satisfação do cliente:** 📈

---

**Documentação criada em:** 21/12/2024
**Versão:** 1.0 - Setup Rápido
