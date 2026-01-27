# 🤖 Sistema Automático de Barbeiros - Vinci Barbearia

## 🎯 RESPOSTA À SUA PERGUNTA

> "os endpoints dos barbeiros cada um tem o seu ou tenho que fazer manual mesmo como estamos fazendo?"

**RESPOSTA: NÃO! Você NÃO precisa criar endpoint para cada barbeiro!**

---

## ✅ COMO FUNCIONA (AUTOMÁTICO)

### Sistema 100% Automático

**1 endpoint atende TODOS os barbeiros:**

```
GET /api/barbeiros/agendamentos-hoje?telefone=XXXX
```

O endpoint identifica AUTOMATICAMENTE qual barbeiro está consultando pelo **telefone** informado.

---

## 🔄 FLUXO AUTOMÁTICO

```
┌──────────────────────────────────────────────────────────┐
│  1. CADASTRAR NOVO BARBEIRO                               │
│     (Dashboard ou Supabase)                              │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  2. BARBEIRO ENVIA MENSAGEM VIA WHATSAPP                 │
│     Exemplo: "HOJE"                                       │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  3. N8N RECEBE WEBHOOK                                    │
│     Extrai: telefone = "5511777777777"                   │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  4. N8N CHAMA API LISTAR BARBEIROS                       │
│     GET /api/barbeiros/listar                            │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  5. VERIFICA SE TELEFONE ESTÁ NA LISTA                   │
│     Se SIM → É barbeiro                                  │
│     Se NÃO → É cliente                                   │
└───────────────────────┬──────────────────────────────────┘
                        │ É BARBEIRO
                        ▼
┌──────────────────────────────────────────────────────────┐
│  6. CHAMA API COM TELEFONE DO BARBEIRO                   │
│     GET /api/barbeiros/agendamentos-hoje?telefone=5511777│
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  7. API IDENTIFICA BARBEIRO AUTOMATICAMENTE              │
│     Busca no banco: WHERE telefone = '5511777777777'     │
│     Retorna agendamentos APENAS deste barbeiro           │
└──────────────────────────────────────────────────────────┘
```

---

## 👥 ADICIONAR NOVO BARBEIRO

### Opção 1: Pelo Dashboard (Recomendado)

1. Acesse: `https://vincebarbearia.com.br/dashboard/profissionais`
2. Clique em **"Novo Profissional"**
3. Preencha os dados:

```
Nome: Carlos Silva
Telefone: 5511777777777  ← IMPORTANTE: Com DDI (55 + DDD + número)
Email: carlos@vinci.com
Especialidade: Cortes clássicos
Ativo: ✅ Sim
```

4. Salvar

**Pronto!** O barbeiro já pode usar o WhatsApp imediatamente.

---

### Opção 2: Direto no Supabase

```sql
INSERT INTO profissionais (
  nome,
  telefone,
  email,
  especialidade,
  ativo
) VALUES (
  'Carlos Silva',
  '5511777777777',
  'carlos@vinci.com',
  'Cortes clássicos',
  true
);
```

---

### Opção 3: Via API (Futuro)

Você pode criar um endpoint para isso:

```typescript
// src/app/api/profissionais/criar/route.ts
POST /api/profissionais/criar

Body:
{
  "nome": "Carlos Silva",
  "telefone": "5511777777777",
  "email": "carlos@vinci.com",
  "especialidade": "Cortes clássicos"
}
```

---

## 🔍 COMO O ENDPOINT IDENTIFICA O BARBEIRO

### Código do Endpoint (Já Implementado)

`src/app/api/barbeiros/agendamentos-hoje/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // 1. Pega telefone da query string
  const telefone = searchParams.get('telefone')  // "5511777777777"

  // 2. Normaliza o telefone (remove caracteres especiais)
  const telefoneNormalizado = telefone.replace(/\D/g, '')

  // 3. Busca profissional pelo telefone
  const { data: profissional } = await supabase
    .from('profissionais')
    .select('id, nome, telefone')
    .or(`telefone.eq.${telefone},telefone.eq.${telefoneNormalizado}`)
    .single()

  // ✅ ACHOU O BARBEIRO! Agora busca os agendamentos dele

  // 4. Busca agendamentos APENAS deste barbeiro
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('profissional_id', profissional.id)  // ← Filtro automático!
    .eq('data_agendamento', dataHoje)

  // 5. Retorna apenas agendamentos deste barbeiro
  return NextResponse.json({
    barbeiro: {
      id: profissional.id,
      nome: profissional.nome  // "Carlos Silva"
    },
    agendamentos: agendamentosProcessados
  })
}
```

**Explicação:**
1. API recebe telefone como parâmetro
2. Busca na tabela `profissionais` quem tem esse telefone
3. Com o `profissional_id` encontrado, filtra agendamentos
4. Retorna apenas agendamentos desse barbeiro específico

**Cada barbeiro vê APENAS seus próprios agendamentos!**

---

## 📊 EXEMPLO PRÁTICO

### Cenário: 3 Barbeiros Usando o Sistema

**Barbeiros cadastrados:**
| Nome | Telefone | ID |
|------|----------|------|
| Hiago | 5511999999999 | uuid-hiago |
| Filippe | 5511888888888 | uuid-filippe |
| Carlos | 5511777777777 | uuid-carlos |

---

### Teste 1: Hiago consulta "HOJE"

**Mensagem WhatsApp:**
```
De: 5511999999999
Texto: "HOJE"
```

**N8N processa:**
```javascript
// 1. Extrai telefone
telefone = "5511999999999"

// 2. Chama API
GET /api/barbeiros/agendamentos-hoje?telefone=5511999999999

// 3. API busca no banco
SELECT id FROM profissionais WHERE telefone = '5511999999999'
// Retorna: uuid-hiago

// 4. API busca agendamentos
SELECT * FROM agendamentos WHERE profissional_id = 'uuid-hiago'

// 5. Retorna
{
  "barbeiro": {"nome": "Hiago"},
  "agendamentos": [
    {"hora": "10:00", "cliente": "João"},
    {"hora": "14:00", "cliente": "Maria"}
  ]
}
```

**Hiago vê APENAS seus agendamentos!**

---

### Teste 2: Carlos consulta "HOJE" (novo barbeiro)

**Mensagem WhatsApp:**
```
De: 5511777777777
Texto: "HOJE"
```

**N8N processa:**
```javascript
// 1. Extrai telefone
telefone = "5511777777777"

// 2. Chama MESMA API
GET /api/barbeiros/agendamentos-hoje?telefone=5511777777777

// 3. API busca no banco
SELECT id FROM profissionais WHERE telefone = '5511777777777'
// Retorna: uuid-carlos

// 4. API busca agendamentos
SELECT * FROM agendamentos WHERE profissional_id = 'uuid-carlos'

// 5. Retorna
{
  "barbeiro": {"nome": "Carlos"},
  "agendamentos": [
    {"hora": "15:00", "cliente": "Pedro"}
  ]
}
```

**Carlos vê APENAS seus agendamentos!**

---

## 🔐 SEGURANÇA AUTOMÁTICA

### Cada barbeiro vê apenas o que é dele:

```sql
-- Hiago (uuid-hiago) consulta
SELECT * FROM agendamentos
WHERE profissional_id = 'uuid-hiago'  ← Filtro automático!
AND data_agendamento = '08/12/2025'

-- Resultado:
-- Apenas agendamentos do Hiago

-- Filippe (uuid-filippe) consulta
SELECT * FROM agendamentos
WHERE profissional_id = 'uuid-filippe'  ← Outro ID!
AND data_agendamento = '08/12/2025'

-- Resultado:
-- Apenas agendamentos do Filippe
```

**Isolamento automático por `profissional_id`!**

---

## ✅ VANTAGENS DO SISTEMA AUTOMÁTICO

| Antes (Manual) ❌ | Agora (Automático) ✅ |
|-------------------|----------------------|
| Criar endpoint para cada barbeiro | 1 endpoint para todos |
| Criar agente N8N para cada barbeiro | 1 agente para todos |
| Editar código ao adicionar barbeiro | Apenas cadastrar no banco |
| Difícil manutenção | Fácil manutenção |
| Código duplicado | Código reutilizável |

---

## 📋 CHECKLIST: ADICIONAR NOVO BARBEIRO

### Passo 1: Cadastrar no Sistema
- [ ] Acesse dashboard ou Supabase
- [ ] Adicione novo profissional
- [ ] **IMPORTANTE:** Telefone com DDI (55XXXXXXXXXXX)
- [ ] Marque como "Ativo"

### Passo 2: Testar Reconhecimento
```bash
# Teste 1: Verificar se aparece na lista
curl https://vincebarbearia.com.br/api/barbeiros/listar

# Deve aparecer na resposta:
{
  "barbeiros": [
    ...
    {
      "nome": "Carlos",
      "telefone": "5511777777777"
    }
  ]
}
```

### Passo 3: Testar Comando WhatsApp
- [ ] Barbeiro envia "HOJE" pelo WhatsApp
- [ ] N8N detecta como barbeiro (filtro automático)
- [ ] API retorna agendamentos corretos
- [ ] Mensagem formatada enviada de volta

### Passo 4: Confirmar Isolamento
```bash
# Teste 2: Consultar agendamentos
curl "https://vincebarbearia.com.br/api/barbeiros/agendamentos-hoje?telefone=5511777777777"

# Deve retornar APENAS agendamentos do Carlos
```

---

## 🔧 CONFIGURAÇÃO NO N8N

### Nó: Buscar Lista Barbeiros (Atualizado)

**Nome:** `API - Listar Barbeiros (Filtro)`

**Configuração:**
- **Method:** GET
- **URL:** `https://vincebarbearia.com.br/api/barbeiros/listar`
- **Cache:** Sim (5 minutos)

**Por que cache?**
- Evita consultar banco a cada mensagem
- Lista de barbeiros não muda com frequência
- Melhora performance

---

### Nó: Verificar Se É Barbeiro (Atualizado)

**Nome:** `Code - Verificar Barbeiro`

**Código atualizado:**
```javascript
// Lista de barbeiros vinda da API (com cache)
const respostaBarbeiros = $('API - Listar Barbeiros (Filtro)').first().json
const barbeiros = respostaBarbeiros.barbeiros || []

// Telefone da mensagem atual
const telefoneAtual = $json.telefone

// Normaliza telefones para comparação
const normalizarTelefone = (tel) => {
  return tel.replace(/\D/g, '') // Remove tudo exceto números
}

const telefoneNormalizado = normalizarTelefone(telefoneAtual)

// Verifica se está na lista de barbeiros
const ehBarbeiro = barbeiros.some(barbeiro => {
  const telBarb = normalizarTelefone(barbeiro.telefone)

  // Compara com e sem DDI
  return telBarb === telefoneNormalizado ||
         telBarb === `55${telefoneNormalizado}` ||
         telBarb === telefoneNormalizado.replace('55', '')
})

// Se for barbeiro, pega os dados completos
let dadosBarbeiro = null
if (ehBarbeiro) {
  dadosBarbeiro = barbeiros.find(b =>
    normalizarTelefone(b.telefone) === telefoneNormalizado ||
    normalizarTelefone(b.telefone) === `55${telefoneNormalizado}` ||
    normalizarTelefone(b.telefone) === telefoneNormalizado.replace('55', '')
  )
}

return {
  json: {
    ...($json),
    ehBarbeiro: ehBarbeiro,
    tipoConta: ehBarbeiro ? 'barbeiro' : 'cliente',
    dadosBarbeiro: dadosBarbeiro // Nome, ID, especialidade
  }
}
```

**Output:**
```json
{
  "telefone": "5511777777777",
  "texto": "HOJE",
  "ehBarbeiro": true,
  "tipoConta": "barbeiro",
  "dadosBarbeiro": {
    "id": "uuid-carlos",
    "nome": "Carlos",
    "telefone": "5511777777777",
    "especialidade": "Cortes clássicos"
  }
}
```

---

## 🧪 TESTES AUTOMÁTICOS

### Script de Teste (Bash)

```bash
#!/bin/bash

# Script para testar novo barbeiro

# Configurações
API_URL="https://vincebarbearia.com.br"
NOVO_TELEFONE="5511777777777"
NOVO_NOME="Carlos"

echo "🔍 Testando novo barbeiro: $NOVO_NOME ($NOVO_TELEFONE)"
echo ""

# Teste 1: Aparece na lista?
echo "📋 Teste 1: Verificando lista de barbeiros..."
LISTA=$(curl -s "$API_URL/api/barbeiros/listar")

if echo "$LISTA" | grep -q "$NOVO_TELEFONE"; then
  echo "✅ SUCESSO: Barbeiro encontrado na lista"
else
  echo "❌ FALHA: Barbeiro NÃO encontrado na lista"
  exit 1
fi

echo ""

# Teste 2: Consegue consultar agendamentos?
echo "📅 Teste 2: Consultando agendamentos de hoje..."
AGENDAMENTOS=$(curl -s "$API_URL/api/barbeiros/agendamentos-hoje?telefone=$NOVO_TELEFONE")

if echo "$AGENDAMENTOS" | grep -q "\"nome\":\"$NOVO_NOME\""; then
  echo "✅ SUCESSO: API retornou dados do barbeiro"
else
  echo "❌ FALHA: API não reconheceu o barbeiro"
  exit 1
fi

echo ""

# Teste 3: Dados isolados?
echo "🔐 Teste 3: Verificando isolamento de dados..."
OUTRO_TELEFONE="5511999999999" # Hiago
AGENDS_OUTRO=$(curl -s "$API_URL/api/barbeiros/agendamentos-hoje?telefone=$OUTRO_TELEFONE")

if ! echo "$AGENDS_OUTRO" | grep -q "\"nome\":\"$NOVO_NOME\""; then
  echo "✅ SUCESSO: Dados isolados corretamente"
else
  echo "❌ FALHA: Vazamento de dados entre barbeiros!"
  exit 1
fi

echo ""
echo "🎉 TODOS OS TESTES PASSARAM!"
echo "Barbeiro $NOVO_NOME está pronto para usar o sistema!"
```

**Executar:**
```bash
chmod +x testar-barbeiro.sh
./testar-barbeiro.sh
```

---

## 📊 MONITORAMENTO

### Query SQL: Barbeiros Ativos

```sql
SELECT
  nome,
  telefone,
  email,
  especialidade,
  ativo,
  created_at
FROM profissionais
WHERE ativo = true
ORDER BY nome;
```

---

### Query SQL: Uso por Barbeiro (Última Semana)

```sql
SELECT
  p.nome as barbeiro,
  COUNT(a.id) as total_agendamentos,
  SUM(
    (SELECT SUM(s.preco)
     FROM agendamento_servicos ags
     JOIN servicos s ON s.id = ags.servico_id
     WHERE ags.agendamento_id = a.id)
  ) as faturamento_total
FROM profissionais p
LEFT JOIN agendamentos a ON a.profissional_id = p.id
WHERE p.ativo = true
  AND a.data_agendamento >= CURRENT_DATE - INTERVAL '7 days'
  AND a.status != 'cancelado'
GROUP BY p.id, p.nome
ORDER BY total_agendamentos DESC;
```

---

## ✅ RESUMO

### Pergunta:
> "cada barbeiro tem o seu endpoint ou tenho que fazer manual?"

### Resposta:
**NÃO precisa fazer nada manual!**

✅ **1 endpoint** atende todos os barbeiros
✅ **Identificação automática** pelo telefone
✅ **Isolamento automático** de dados
✅ **Adicionar novo barbeiro**: apenas cadastrar no banco
✅ **Funciona imediatamente** após cadastro
✅ **Zero configuração** no N8N ou código

### Como adicionar novo barbeiro:
1. Cadastrar no dashboard/Supabase
2. Pronto! ✅

**Sem código, sem configuração, 100% automático! 🚀**
