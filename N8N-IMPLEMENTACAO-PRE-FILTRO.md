# IMPLEMENTAÇÃO PRÉ-FILTRO SETORIZADOR - N8N

## 🎯 Objetivo

Resolver o problema do AI Agent que ignora regras e roteia perguntas sobre horários para o setor errado (ALEX ao invés de SECRETARIA).

**Solução:** Adicionar um node de código JavaScript ANTES do AI Agent que detecta automaticamente palavras-chave e roteia direto para SECRETARIA, sem precisar do AI interpretar.

---

## 📊 FLUXO ATUAL (COM PROBLEMA)

```
Webhook → Refaz numero1 → AI Agent Setorizador → SupaBase (alterar setor)
                          (Ignora regras e vai    ↓
                           para ALEX errado)    PROBLEMA
```

---

## ✅ NOVO FLUXO (COM PRÉ-FILTRO)

```
Webhook → Refaz numero1 → Code (Pré-Filtro) → IF Node → AI Agent Setorizador
                                               ↓              ↓
                                         precisa_ai_agent?  (só casos complexos)
                                               ↓              ↓
                                    FALSE: SECRETARIA   TRUE: continua
                                    (direto, rápido)    (análise AI)
                                           ↓                  ↓
                                           └──────┬───────────┘
                                                  ↓
                                        SupaBase (alterar setor)
```

---

## 🔧 PASSO A PASSO DE IMPLEMENTAÇÃO

### PASSO 1: Adicionar Node CODE

1. **Clique no "+"** entre `Refaz numero1` e `AI Agent Setorizador`
2. **Selecione:** `Code` → `Run JavaScript Code`
3. **Nome do node:** `Pré-Filtro Horários`
4. **Copie o código** de `N8N-CODE-PRE-FILTRO-SETORIZADOR.js` para dentro do node
5. **Mode:** `Run Once for All Items`
6. **Salvar**

---

### PASSO 2: Adicionar Node IF

1. **Clique no "+"** após o node `Pré-Filtro Horários`
2. **Selecione:** `Flow` → `IF`
3. **Nome do node:** `Precisa AI Agent?`
4. **Configuração:**
   - **Condition:** `precisa_ai_agent` (Boolean)
   - **Operation:** `Is Equal`
   - **Value:** `true`

5. **Salvar**

---

### PASSO 3: Configurar Rota FALSE (Direto para SECRETARIA)

1. **Na saída "false" do IF**, adicione node `SupaBase` (ou o node que altera setor)
2. **Configuração:**
   - **Setor:** `{{ $json.setor }}` (virá como "SECRETARIA" do pré-filtro)
   - **Telefone:** `{{ $('Refaz numero1').item.json.Telefone }}`

3. **Salvar**

---

### PASSO 4: Configurar Rota TRUE (AI Agent)

1. **Na saída "true" do IF**, conecte ao `AI Agent Setorizador` existente
2. **O AI Agent** deve usar o **prompt simplificado:** `PROMPT-SETORIZADOR-SIMPLIFICADO.md`
3. **Depois do AI Agent**, conecte ao mesmo node `SupaBase` da rota FALSE

---

### PASSO 5: Merge das Rotas (Opcional)

Se quiser unificar as saídas:

1. **Adicione node `Merge`** após ambas as rotas
2. **Mode:** `Append`
3. **Input 1:** Saída do SupaBase (rota false)
4. **Input 2:** Saída do SupaBase (rota true)

---

## 📋 ESTRUTURA FINAL COMPLETA

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Webhook                                                    │
│     ↓                                                       │
│  Refaz numero1 (normaliza telefone)                        │
│     ↓                                                       │
│  Code: Pré-Filtro Horários                                 │
│     ↓                                                       │
│  IF: precisa_ai_agent?                                     │
│     ├──FALSE─→ SupaBase (setor=SECRETARIA)                │
│     │              ↓                                        │
│     │          [FIM - Rápido]                              │
│     │                                                       │
│     └──TRUE──→ AI Agent Setorizador                        │
│                    ↓                                        │
│                SupaBase (setor do AI)                      │
│                    ↓                                        │
│                [FIM - Análise complexa]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTES

### Teste 1: Pergunta sobre horários (PRÉ-FILTRO)
**Input:** "Horários do Alex hoje"
**Esperado:**
- Code detecta "horários"
- IF vai para rota FALSE
- Setor = **SECRETARIA** ✅
- **NÃO passa pelo AI Agent** (mais rápido)

### Teste 2: Pergunta sobre preços (PRÉ-FILTRO)
**Input:** "Quanto custa corte + barba?"
**Esperado:**
- Code detecta "quanto custa"
- IF vai para rota FALSE
- Setor = **SECRETARIA** ✅

### Teste 3: Conversa pessoal (AI AGENT)
**Input:** "Alex, preciso remarcar"
**Esperado:**
- Code NÃO detecta palavras-chave
- IF vai para rota TRUE
- AI Agent analisa contexto
- Setor = **ALEX** (se cliente tem barbeiro_preferido=Alex) ✅

---

## 🔍 DEBUG

### Ver Output do Code Node

No node `Pré-Filtro Horários`, após executar, veja a saída:

```json
{
  "setor": "SECRETARIA",
  "motivo": "Palavra-chave detectada: \"horários\"",
  "mensagem_original": "Horários do Alex hoje",
  "precisa_ai_agent": false,
  "rota": "pre_filtro_automatico"
}
```

### Se não funcionar:

1. **Verifique** se o campo `mensagem` está correto no Webhook
2. **Ajuste** a linha 13 do código se necessário:
   ```javascript
   const mensagem = $input.item.json.SEU_CAMPO_AQUI || '';
   ```

3. **Adicione console.log** para debug:
   ```javascript
   console.log('Mensagem recebida:', mensagem);
   console.log('Palavra encontrada:', palavraEncontrada);
   ```

---

## ⚡ VANTAGENS DESTA SOLUÇÃO

1. **Mais rápido:** Perguntas sobre horários não passam pelo AI Agent
2. **Mais confiável:** Não depende de interpretação do AI
3. **Menos custo:** Menos chamadas de API do AI Agent
4. **Fácil manutenção:** Adicione mais palavras-chave no array se necessário

---

## 📝 MANUTENÇÃO

### Adicionar novas palavras-chave:

Edite o node `Pré-Filtro Horários`, adicione no array correspondente:

```javascript
const palavrasChaveHorarios = [
  'horário', 'horarios', 'horario',
  'horas', 'hora',
  // ... existentes ...
  'sua_nova_palavra_aqui' // ← ADICIONAR AQUI
];
```

---

## 🚀 DEPLOY

Após configurar tudo:

1. **Salvar workflow**
2. **Ativar workflow**
3. **Testar** enviando mensagem real pelo WhatsApp:
   - "Horários do Alex hoje" → Deve ir para SECRETARIA
   - "Alex, preciso remarcar" → Deve ir para ALEX (se cliente dele)

---

## 💡 ALTERNATIVA MAIS SIMPLES (Se não quiser usar Code)

Se não quiser usar JavaScript, use um **Switch node** com regex:

1. **Switch node** com múltiplas rotas
2. **Route 1:** Regex `/(horário|horarios|horas|vaga|disponível)/i`
   - Output: SECRETARIA
3. **Route 2:** Regex `/(preço|preco|valor|quanto)/i`
   - Output: SECRETARIA
4. **Fallback:** AI Agent (casos complexos)

**Configuração do Switch:**
- **Value:** `{{ $json.mensagem }}`
- **Mode:** `Rules`
- **Data Type:** `String`
