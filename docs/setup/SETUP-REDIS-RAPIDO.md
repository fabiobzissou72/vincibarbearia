# ⚡ Setup Rápido - Redis Histórico de Clientes

## 🎯 O que foi implementado?

Sistema que salva **automaticamente** no Redis:
- ✅ Agendamentos criados (Dashboard, App ou WhatsApp)
- ✅ Agendamentos cancelados (Dashboard, App ou WhatsApp)
- ✅ Histórico completo por cliente (telefone como chave)

**Benefício:** O agente do WhatsApp terá contexto completo do cliente, mesmo que ele tenha agendado pelo App ou Dashboard!

---

## 🚀 Setup em 3 Passos

### 1️⃣ Adicionar URL do Redis

Crie/edite o arquivo `.env.local` na raiz do projeto:

```env
# URL do Redis
REDIS_URL=https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769
```

### 2️⃣ Reiniciar o Servidor

```bash
# Parar servidor (Ctrl+C)

# Iniciar novamente
npm run dev
```

### 3️⃣ Testar

1. Crie um agendamento no Dashboard
2. Veja os logs no terminal:
   ```
   ✅ [REDIS] Agendamento salvo com sucesso! Cliente: João Silva
   ```
3. Acesse o Redis e busque pela chave do número

---

## 📱 Como Funciona?

### Chave no Redis
**Formato:** DDD + Número (sem código do país)

**Exemplos:**
- Telefone: `+55 11 99988-7766`
- Chave Redis: `11999887766`

### O que é Salvo?

```json
{
  "nome": "João Silva",
  "telefone": "+55 11 99988-7766",
  "agendamentos": [
    {
      "data": "15/01/2026",
      "hora": "14:30",
      "barbeiro": "Carlos Santos",
      "servicos": ["Corte", "Barba"],
      "valor": 80.00,
      "status": "agendado",
      "origem": "dashboard"  ← NOVO!
    }
  ],
  "cancelamentos": [
    {
      "data": "10/01/2026",
      "hora": "10:00",
      "barbeiro": "Pedro Oliveira",
      "motivo": "Imprevisto",
      "origem": "app"  ← NOVO!
    }
  ]
}
```

---

## 🔄 Onde Salva Automaticamente?

### Dashboard (Admin)
- ✅ Criar agendamento
- ✅ Cancelar agendamento
- **Origem:** `dashboard`

### App Cliente
- ✅ Criar agendamento (via proxy → Dashboard)
- ✅ Cancelar agendamento (via proxy → Dashboard)
- **Origem:** `app`

### WhatsApp (N8N)
- ✅ Criar agendamento (via API → Dashboard)
- ✅ Cancelar agendamento (via API → Dashboard)
- **Origem:** `whatsapp`

---

## ✅ Verificar se Está Funcionando

### Logs no Terminal

Ao criar agendamento, você deve ver:

```
📝 [REDIS] Salvando agendamento para: +55 11 99988-7766
📞 [REDIS] Número limpo: 11999887766
🆕 [REDIS] Criando novo histórico para cliente
📊 [REDIS] Total de agendamentos no histórico: 1
✅ [REDIS] Histórico salvo para 11999887766
✅ [REDIS] Agendamento salvo com sucesso! Cliente: João Silva
```

### Redis Browser

1. Acesse: https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769/browser
2. Busque pela chave: `11999887766`
3. Veja o JSON completo

---

## 🤖 Usar no Agente WhatsApp (N8N)

### 1. Cliente manda mensagem no WhatsApp
```
Cliente: Oi, gostaria de agendar
```

### 2. N8N busca histórico no Redis
```javascript
// GET no Redis
const telefone = "11999887766"
const historico = await redis.get(telefone)
```

### 3. N8N envia contexto para o agente
```
Prompt para o agente:
Cliente: João Silva
Histórico:
- 3 agendamentos anteriores
- 1 cancelamento
- Último agendamento: 15/01 às 14h30 com Carlos
```

### 4. Agente responde com contexto
```
Agente: Olá João! Vi que você agendou com o Carlos
na última vez. Gostaria de agendar com ele novamente?
```

---

## ⚠️ Importante

### Não Bloqueia o Sistema
Se o Redis falhar:
- ✅ Agendamento funciona normalmente
- ✅ Sistema continua operando
- ⚠️ Apenas o histórico não é salvo

### Logs de Erro
Se houver erro no Redis, você verá:
```
⚠️ Erro ao salvar no Redis (não crítico): [mensagem do erro]
```

---

## 🔍 Debug

Se não estiver salvando no Redis:

1. **Verifique `.env.local`**
   ```bash
   cat .env.local | grep REDIS_URL
   ```

2. **Reiniciou o servidor?**
   ```bash
   # Sempre reiniciar após mudar .env.local
   npm run dev
   ```

3. **Veja os logs**
   - Procure por `[REDIS]` no terminal
   - Veja se tem erro

4. **Teste o Redis diretamente**
   - Acesse o browser do Redis
   - Tente criar uma chave manualmente

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- **`INTEGRACAO-REDIS-HISTORICO.md`** - Documentação completa
- **`src/lib/redis-history.ts`** - Código do serviço

---

## ✅ Checklist Final

Antes de fazer deploy em produção:

- [ ] `.env.local` configurado com `REDIS_URL`
- [ ] Testou criar agendamento localmente
- [ ] Testou cancelar agendamento
- [ ] Viu os logs `✅ [REDIS]` no terminal
- [ ] Verificou no Redis Browser que salvou
- [ ] Adicionou `REDIS_URL` nas variáveis de ambiente da Vercel
- [ ] Fez deploy

---

## 🚀 Deploy na Vercel

1. Acesse https://vercel.com
2. Vá no seu projeto
3. Settings → Environment Variables
4. Adicione:
   - **Key:** `REDIS_URL`
   - **Value:** `https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769`
5. Faça commit e push
6. Deploy automático!

---

**Pronto! 🎉**

Agora todos os agendamentos e cancelamentos do Dashboard e App serão automaticamente salvos no Redis para o agente do WhatsApp!

---

**Última atualização:** 08/01/2026
