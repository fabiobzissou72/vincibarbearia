# 📲 Notificação Automática de Cancelamento para Cliente

## ✅ SIM! O sistema JÁ ESTÁ PREPARADO!

Quando um barbeiro cancela um agendamento (pelo WhatsApp ou Dashboard), **a API automaticamente dispara um webhook** que você pode usar para notificar o cliente.

---

## 🔄 Como Funciona

```
Barbeiro cancela agendamento
         ↓
API detecta o cancelamento
         ↓
API dispara webhook para N8N (se configurado)
         ↓
N8N recebe os dados do cancelamento
         ↓
N8N envia WhatsApp para o CLIENTE
         ↓
Cliente recebe: "❌ Seu agendamento foi cancelado..."
```

---

## 📊 O Que a API Envia Automaticamente

Quando há cancelamento, a API envia este JSON para o webhook:

```json
{
  "tipo": "cancelamento",
  "agendamento_id": "abc123-uuid",
  "cliente": {
    "nome": "João Silva",
    "telefone": "11999887766"
  },
  "agendamento": {
    "data": "15/01/2026",
    "hora": "14:30",
    "barbeiro": "Carlos Santos",
    "valor_total": 80.00
  },
  "cancelamento": {
    "cancelado_por": "barbeiro",
    "motivo": "Imprevisto",
    "horas_antecedencia": "24.5"
  }
}
```

**Todos os dados que você precisa estão aí!** ✅

---

## ⚙️ Como Configurar (3 passos)

### 1️⃣ Ativar Webhook de Cancelamento no Dashboard

**Opção A: Via Dashboard** (Mais fácil)
1. Acesse: **Dashboard → Configurações**
2. Encontre: **"Notificações Automáticas"**
3. Configure:
   - **Webhook URL:** `https://seu-n8n.com/webhook/cancelamento`
   - **Notificação de Cancelamento:** ✅ Ativar

**Opção B: Via SQL** (Direto no Supabase)
```sql
UPDATE configuracoes
SET
  webhook_url = 'https://seu-n8n.com/webhook/cancelamento',
  notif_cancelamento = true
WHERE id = 1;
```

---

### 2️⃣ Criar Workflow no N8N

#### Node 1: Webhook (Trigger)
```
Método: POST
Caminho: /webhook/cancelamento
```

#### Node 2: Code (Montar mensagem para cliente)
```javascript
const dados = $input.item.json;

// Extrair dados
const cliente = dados.cliente.nome.split(' ')[0]; // Primeiro nome
const telefone = dados.cliente.telefone;
const data = dados.agendamento.data;
const hora = dados.agendamento.hora;
const barbeiro = dados.agendamento.barbeiro;
const motivo = dados.cancelamento.motivo || 'Imprevisto';

// Montar mensagem
const mensagem = `❌ *Agendamento Cancelado*\n\n` +
  `Olá ${cliente}!\n\n` +
  `Infelizmente precisamos cancelar seu agendamento:\n\n` +
  `📅 *Data:* ${data}\n` +
  `🕐 *Horário:* ${hora}\n` +
  `💈 *Barbeiro:* ${barbeiro}\n` +
  `📝 *Motivo:* ${motivo}\n\n` +
  `📞 *Entre em contato para reagendar:*\n` +
  `WhatsApp: wa.me/5511987654321\n\n` +
  `Pedimos desculpas pelo inconveniente! 🙏`;

return {
  json: {
    telefone: telefone,
    mensagem: mensagem
  }
};
```

#### Node 3: WhatsApp (Enviar mensagem)
```
Para: {{ $json.telefone }}
Mensagem: {{ $json.mensagem }}
```

---

### 3️⃣ Testar

**Teste manual (cURL):**
```bash
curl -X POST https://seu-n8n.com/webhook/cancelamento \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cancelamento",
    "cliente": {
      "nome": "Teste Silva",
      "telefone": "11999999999"
    },
    "agendamento": {
      "data": "15/01/2026",
      "hora": "14:30",
      "barbeiro": "Carlos"
    },
    "cancelamento": {
      "cancelado_por": "barbeiro",
      "motivo": "Teste"
    }
  }'
```

**Teste real:**
1. Cancele um agendamento pelo Dashboard
2. Veja se o cliente recebe o WhatsApp
3. Ajuste a mensagem se necessário

---

## 📱 Exemplo de Mensagem que o Cliente Recebe

```
❌ *Agendamento Cancelado*

Olá João!

Infelizmente precisamos cancelar seu agendamento:

📅 *Data:* 15/01/2026
🕐 *Horário:* 14:30
💈 *Barbeiro:* Carlos Santos
📝 *Motivo:* Imprevisto

📞 *Entre em contato para reagendar:*
WhatsApp: wa.me/5511987654321

Pedimos desculpas pelo inconveniente! 🙏
```

---

## 🎨 Personalizar Mensagem

### Mensagem Curta
```javascript
const mensagem = `❌ Olá ${cliente}, seu agendamento de ${data} às ${hora} ` +
  `foi cancelado. Por favor, reagende pelo WhatsApp: wa.me/5511987654321`;
```

### Mensagem com Link Direto
```javascript
const linkApp = `https://app.vincibarbearia.com.br/agendar`;

const mensagem = `❌ *Cancelamento*\n\n` +
  `Olá ${cliente}!\n\n` +
  `Cancelamos seu agendamento de ${data} às ${hora}.\n\n` +
  `🔄 *Reagende aqui:*\n${linkApp}`;
```

### Mensagem com Cupom de Desconto
```javascript
const mensagem = `❌ *Agendamento Cancelado*\n\n` +
  `Olá ${cliente}!\n\n` +
  `Lamentamos cancelar seu horário de ${data}.\n\n` +
  `Como desculpas, ganhe *10% OFF* no próximo:\n` +
  `Cupom: *DESCULPA10*\n\n` +
  `Válido por 30 dias! 🎁`;
```

---

## 🔍 Verificar se Está Configurado

### Ver configuração atual no Supabase:
```sql
SELECT
  webhook_url,
  notif_cancelamento
FROM configuracoes
WHERE id = 1;
```

**Deve retornar:**
```
webhook_url              | notif_cancelamento
https://seu-n8n.com/... | true
```

---

## 🐛 Debug

### Webhook não está disparando?

1. **Verifique no Dashboard:**
   - Configurações → Webhook URL está preenchida?
   - Notificação de Cancelamento está ✅ ativada?

2. **Verifique logs da API:**
   - Ao cancelar, procure nos logs:
   ```
   🔔 Iniciando disparo de webhooks de cancelamento
   📊 Config webhook cancelamento: { url: '...', ativo: true }
   🌐 Disparando webhook global de cancelamento
   ✅ Webhook global cancelamento SUCESSO: 200
   ```

3. **Verifique N8N:**
   - O webhook está ativo?
   - Está recebendo a requisição?
   - Veja logs de execução

4. **Teste direto:**
   ```bash
   curl -X POST https://seu-n8n.com/webhook/cancelamento \
     -H "Content-Type: application/json" \
     -d '{"tipo":"teste"}'
   ```

---

## 📊 Monitorar Notificações

### Ver histórico de webhooks enviados:
```sql
SELECT
  created_at,
  tipo,
  status,
  webhook_url,
  payload,
  erro
FROM notificacoes_enviadas
WHERE tipo = 'cancelado'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚙️ Configurações Avançadas

### Horário Comercial (não enviar à noite)
```javascript
const agora = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
const hora = new Date(agora).getHours();

// Só envia entre 8h e 20h
if (hora < 8 || hora >= 20) {
  console.log('⏰ Fora do horário comercial. Agendar para amanhã 9h.');
  // Usar node Schedule do N8N para enviar no dia seguinte
  return;
}

// Horário OK, continua...
```

### Adicionar Botões Interativos
```javascript
return {
  json: {
    telefone: telefone,
    mensagem: mensagem,
    botoes: [
      { id: 'reagendar', title: '📅 Reagendar Agora' },
      { id: 'falar_atendente', title: '👤 Falar com Atendente' }
    ]
  }
};
```

### Fallback para SMS
```javascript
// Após node WhatsApp, adicionar node de verificação:
const resultado = $input.item.json;

if (resultado.error) {
  console.error('❌ WhatsApp falhou. Tentando SMS...');
  // Chamar API de SMS aqui
}
```

---

## 📝 Checklist

- [ ] Configurar webhook_url no Dashboard/Supabase
- [ ] Ativar notif_cancelamento = true
- [ ] Criar workflow no N8N (3 nodes)
- [ ] Testar com cURL
- [ ] Cancelar agendamento real e verificar
- [ ] Ajustar mensagem conforme necessário
- [ ] (Opcional) Adicionar horário comercial
- [ ] (Opcional) Adicionar botões interativos
- [ ] (Opcional) Configurar fallback

---

## 🎯 Resumo

| Item | Status | Onde Configurar |
|------|--------|-----------------|
| **API dispara webhook?** | ✅ SIM | Já implementado |
| **Dados completos?** | ✅ SIM | Cliente + agendamento + motivo |
| **Configuração?** | ⚙️ NECESSÁRIA | Dashboard → Configurações |
| **N8N workflow?** | ⚙️ CRIAR | 3 nodes (Webhook → Code → WhatsApp) |
| **Documentação?** | ✅ PRONTA | Este arquivo |

---

## 📚 Arquivos Relacionados

- `src/app/api/agendamentos/cancelar/route.ts` - API que dispara webhook
- `src/app/dashboard/configuracoes/page.tsx` - Tela de configuração
- `docs/n8n/N8N-NOTIFICAR-CLIENTE-CANCELAMENTO.md` - Guia completo N8N
- `docs/troubleshooting/TROUBLESHOOTING-WEBHOOK-CANCELAMENTO.md` - Debug

---

**Sistema completo e funcional!** 🎉

Basta configurar o webhook no Dashboard e criar o workflow de 3 nodes no N8N.

---

**Última atualização:** 08/01/2026
