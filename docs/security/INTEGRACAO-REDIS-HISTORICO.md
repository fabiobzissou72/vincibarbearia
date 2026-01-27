# 🔄 Integração Redis - Histórico de Clientes

## 📋 Visão Geral

Sistema de sincronização automática do histórico de agendamentos e cancelamentos com Redis, permitindo que o agente do WhatsApp tenha contexto completo do cliente independente da origem do agendamento (WhatsApp, App ou Dashboard).

---

## 🎯 Funcionamento

### Chave no Redis
**Formato:** DDD + Número (sem código do país)
**Exemplo:** `11999887766`

### Conversão Automática
O sistema remove automaticamente:
- Código do país (55)
- Espaços
- Parênteses
- Traços

**Exemplos:**
- `+55 11 99988-7766` → `11999887766`
- `(11) 99988-7766` → `11999887766`
- `5511999887766` → `11999887766`

---

## 📊 Estrutura dos Dados

### Formato JSON no Redis

```json
{
  "nome": "João Silva",
  "telefone": "+55 11 99988-7766",
  "agendamentos": [
    {
      "data": "15/01/2026",
      "hora": "14:30",
      "barbeiro": "Carlos Santos",
      "servicos": ["Corte Masculino", "Barba"],
      "valor": 80.00,
      "status": "agendado",
      "origem": "dashboard",
      "timestamp": "2026-01-08T10:30:00.000Z"
    }
  ],
  "cancelamentos": [
    {
      "data": "10/01/2026",
      "hora": "10:00",
      "barbeiro": "Pedro Oliveira",
      "motivo": "Imprevisto",
      "cancelado_por": "cliente",
      "horas_antecedencia": 24.5,
      "origem": "app",
      "timestamp": "2026-01-09T09:30:00.000Z"
    }
  ],
  "ultima_atualizacao": "2026-01-08T10:30:00.000Z"
}
```

---

## ⚙️ Configuração

### 1️⃣ Adicionar Variável de Ambiente

Adicione no arquivo `.env.local` (Dashboard):

```env
# URL do Redis para histórico de clientes
REDIS_URL=https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769
```

**OU** se seu Redis precisar de autenticação:

```env
REDIS_URL=https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769
REDIS_TOKEN=seu_token_aqui
```

### 2️⃣ Reiniciar o Servidor

```bash
# Parar o servidor (Ctrl+C)

# Reiniciar em desenvolvimento
npm run dev

# OU em produção (Vercel)
# Faça commit e push - deploy automático
```

### 3️⃣ Verificar Logs

Ao criar um agendamento, você verá logs como:

```
📝 [REDIS] Salvando agendamento para: +55 11 99988-7766
📞 [REDIS] Número limpo: 11999887766
🆕 [REDIS] Criando novo histórico para cliente
📊 [REDIS] Total de agendamentos no histórico: 1
✅ [REDIS] Histórico salvo para 11999887766
✅ [REDIS] Agendamento salvo com sucesso! Cliente: João Silva
```

---

## 🔌 Pontos de Integração

O sistema salva automaticamente em **3 origens**:

### 1. Dashboard (Admin)
- **Criar agendamento:** `src/app/api/agendamentos/criar/route.ts`
- **Cancelar agendamento:** `src/app/api/agendamentos/cancelar/route.ts`
- **Origem marcada como:** `dashboard`

### 2. App Cliente
- **Criar agendamento:** Via proxy para API do Dashboard
- **Cancelar agendamento:** Via proxy para API do Dashboard
- **Origem marcada como:** `app`

### 3. WhatsApp (N8N)
- **Criar agendamento:** Chama API do Dashboard
- **Cancelar agendamento:** Chama API do Dashboard
- **Origem marcada como:** `whatsapp`

---

## 🧪 Testando a Integração

### Teste 1: Criar Agendamento

1. Abra o Dashboard → Agendamentos → Novo Agendamento
2. Preencha com telefone: `(11) 99988-7766`
3. Crie o agendamento
4. Verifique os logs no console
5. Acesse o Redis e busque a chave `11999887766`

### Teste 2: Cancelar Agendamento

1. No Dashboard → Agendamentos
2. Cancele um agendamento existente
3. Verifique os logs no console
4. Acesse o Redis e veja o cancelamento adicionado

### Teste 3: Verificar Histórico no Redis

**Via Redis Browser:**
1. Acesse: https://redis.bonnutech.com.br/9017b722-535d-4d5d-b6e4-1691e662e769/browser
2. Busque pela chave: `11999887766`
3. Veja o JSON completo do histórico

---

## 🔍 Função de Debug

Você pode buscar o histórico de qualquer cliente programaticamente:

```typescript
import { buscarHistoricoCliente } from '@/lib/redis-history'

// Buscar histórico
const historico = await buscarHistoricoCliente('(11) 99988-7766')

if (historico) {
  console.log(`Cliente: ${historico.nome}`)
  console.log(`Total de agendamentos: ${historico.agendamentos.length}`)
  console.log(`Total de cancelamentos: ${historico.cancelamentos.length}`)
}
```

---

## 📈 Limites e Otimizações

### Limites Automáticos
- **Agendamentos:** Mantém últimos 50
- **Cancelamentos:** Mantém últimos 30
- **TTL:** 1 ano (opcional, pode ser removido)

### Por que os limites?
- Evitar histórico muito grande no Redis
- Melhorar performance de leitura/escrita
- Manter dados mais relevantes (recentes)

### Remover TTL (Histórico Infinito)

Edite `src/lib/redis-history.ts`:

```typescript
// Remova ou comente a linha do ttl:
body: JSON.stringify({
  value: JSON.stringify(historico),
  // ttl: 365 * 24 * 60 * 60  // ← REMOVER ESTA LINHA
})
```

---

## ⚠️ Tratamento de Erros

### Erro Não Bloqueia o Sistema
Se o Redis falhar, o agendamento/cancelamento **ainda funciona normalmente**.

A integração com Redis é:
- ✅ Não bloqueante
- ✅ Não crítica
- ✅ Executada em background
- ✅ Com logs detalhados

### Erros Comuns e Soluções

#### 1. `REDIS_URL não configurada`
**Solução:** Adicione a variável `REDIS_URL` no `.env.local`

#### 2. `Erro ao buscar histórico: 404`
**Causa:** Cliente ainda não tem histórico (normal na primeira vez)
**Solução:** Não é erro, o sistema cria um novo histórico automaticamente

#### 3. `Erro ao salvar histórico: 401`
**Causa:** Redis requer autenticação
**Solução:** Adicione token: `REDIS_TOKEN=seu_token`

#### 4. `Erro ao salvar histórico: 500`
**Causa:** Redis fora do ar ou problema de rede
**Solução:** Verifique se o Redis está online

---

## 🔐 Segurança

### Dados Sensíveis
O histórico contém:
- ✅ Nome do cliente
- ✅ Telefone
- ✅ Histórico de agendamentos
- ❌ **NÃO** contém: CPF, endereço, dados de pagamento

### Recomendações
1. Use HTTPS para conexão com Redis
2. Configure autenticação no Redis (token/senha)
3. Restrinja acesso ao Redis por IP (se possível)
4. Monitore acessos ao Redis

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

**Desenvolvimento:**
```bash
npm run dev
# Logs aparecem no terminal
```

**Produção (Vercel):**
1. Acesse https://vercel.com
2. Vá no seu projeto
3. Clique em "Functions"
4. Veja os logs das funções API

### Logs do Redis

Busque por:
- `📝 [REDIS]` - Salvando dados
- `✅ [REDIS]` - Sucesso
- `❌ [REDIS]` - Erro
- `📊 [REDIS]` - Estatísticas

---

## 🤖 Uso no Agente WhatsApp

### Como o Agente Usa o Histórico

1. Cliente envia mensagem no WhatsApp
2. N8N extrai o número do telefone
3. N8N faz GET no Redis com a chave (número limpo)
4. N8N envia o histórico para o agente
5. Agente responde com contexto completo

### Exemplo de Prompt para o Agente

```
Você é um assistente da Vinci Barbearia.

HISTÓRICO DO CLIENTE:
Nome: João Silva
Telefone: (11) 99988-7766

Agendamentos anteriores:
- 15/01/2026 às 14:30 com Carlos Santos (R$ 80,00)
- 10/01/2026 às 10:00 com Pedro Oliveira (CANCELADO)

Cancelamentos: 1

Use esse contexto para atender melhor o cliente.
```

---

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Dashboard de Histórico**
   - Visualizar histórico do cliente no Dashboard
   - Buscar por telefone

2. **Alertas Automáticos**
   - Cliente com muitos cancelamentos
   - Cliente fiel (muitos agendamentos)

3. **Análise de Dados**
   - Clientes mais frequentes
   - Horários preferidos
   - Barbeiros preferidos

4. **Cache Local**
   - Cachear histórico localmente (performance)
   - Sincronizar com Redis periodicamente

---

## 📞 Suporte

Se tiver problemas:

1. **Verifique os logs** - A maioria dos problemas aparece nos logs
2. **Teste a conexão com Redis** - Use o browser do Redis
3. **Verifique variáveis de ambiente** - `.env.local` configurado?
4. **Reinicie o servidor** - Após alterar `.env.local`

---

## 📚 Arquivos Relacionados

- `src/lib/redis-history.ts` - Serviço principal de integração
- `src/app/api/agendamentos/criar/route.ts` - Criar agendamento
- `src/app/api/agendamentos/cancelar/route.ts` - Cancelar agendamento
- `.env.local` - Configuração da URL do Redis

---

**Última atualização:** 08/01/2026
**Versão:** 1.0.0
