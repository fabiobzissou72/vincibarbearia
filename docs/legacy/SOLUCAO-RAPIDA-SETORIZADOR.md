# 🚀 SOLUÇÃO RÁPIDA - SETORIZADOR CORRETO

## ❌ Problema
Pergunta "Horários do Alex hoje" está indo para setor **ALEX** (errado)
Deveria ir para **SECRETARIA** (correto)

## ✅ Solução
Adicionar **pré-filtro automático** ANTES do AI Agent que detecta palavras-chave

---

## 🔧 IMPLEMENTAÇÃO RÁPIDA (5 MINUTOS)

### OPÇÃO 1: Com Code Node (RECOMENDADO)

1. **Abra seu workflow n8n**

2. **Entre "Refaz numero1" e "AI Agent Setorizador"**, adicione:
   - **Node:** `Code` → `Run JavaScript Code`
   - **Nome:** `Pré-Filtro`
   - **Código:** Copie de `N8N-CODE-PRE-FILTRO-SETORIZADOR.js`

3. **Depois do Code**, adicione:
   - **Node:** `IF`
   - **Condição:** `precisa_ai_agent` igual a `true`

4. **Conecte:**
   - **IF = FALSE** → Direto para SupaBase com `setor = SECRETARIA`
   - **IF = TRUE** → AI Agent Setorizador (casos complexos)

5. **Salvar e ativar**

**Resultado:** Perguntas com "horários", "preços", "quando" vão direto para SECRETARIA sem passar pelo AI.

---

### OPÇÃO 2: Apenas trocar o prompt (MAIS SIMPLES)

Se quiser tentar só com prompt melhorado:

1. **Substitua o prompt do AI Agent** por `PROMPT-SETORIZADOR-SIMPLIFICADO.md`
2. **Salvar e ativar**

**Obs:** Esta opção ainda depende do AI interpretar corretamente (menos confiável).

---

## 🧪 TESTE RÁPIDO

Envie pelo WhatsApp:

1. **"Horários do Alex hoje"**
   - ✅ Deve ir para: **SECRETARIA**

2. **"Quando o Hiago tem vaga?"**
   - ✅ Deve ir para: **SECRETARIA**

3. **"Alex, preciso remarcar meu horário"**
   - ✅ Deve ir para: **ALEX** (se cliente dele)

---

## 📁 Arquivos Criados

1. `PROMPT-SETORIZADOR-SIMPLIFICADO.md` - Prompt melhorado para AI Agent
2. `N8N-CODE-PRE-FILTRO-SETORIZADOR.js` - Código do pré-filtro
3. `N8N-IMPLEMENTACAO-PRE-FILTRO.md` - Guia detalhado completo

---

## ⚡ Por que funciona?

**Antes:**
```
Mensagem → AI Agent (pode interpretar errado) → Setor errado
```

**Depois:**
```
Mensagem → Code detecta "horários" → SECRETARIA direto (sempre certo)
```

---

## 🆘 Se tiver dúvida

Veja o guia completo em: `N8N-IMPLEMENTACAO-PRE-FILTRO.md`

Tem explicação passo a passo com prints e exemplos.
