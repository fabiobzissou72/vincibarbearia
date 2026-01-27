# 🔧 RESOLVER ERRO: "Serviços não encontrados"

**Data:** 10/12/2025
**Erro:** HTTP 400 - "Serviços não encontrados ou inativos"

---

## 🚨 O PROBLEMA

Você está recebendo este erro ao tentar criar um agendamento:

```json
{
  "success": false,
  "message": "Serviços não encontrados ou inativos",
  "errors": ["Um ou mais serviços inválidos ou inativos"]
}
```

**Causa:** Os IDs dos serviços que você está enviando:
1. ❌ Não existem no banco de dados
2. ❌ Existem mas estão com `ativo = false`
3. ❌ Estão em formato errado

---

## ✅ SOLUÇÃO RÁPIDA (3 PASSOS)

### PASSO 1: Descobrir os IDs corretos dos serviços

**Via Dashboard (mais fácil):**
```
1. Acesse: http://localhost:3000/dashboard/servicos
2. Abra o Console do navegador (F12)
3. Veja os IDs dos serviços listados
```

**Via API de Debug (mais completo):**
```bash
# LOCAL:
curl http://localhost:3000/api/debug/servicos

# PRODUÇÃO:
curl https://seu-dominio.vercel.app/api/debug/servicos
```

A resposta vai mostrar algo assim:
```json
{
  "success": true,
  "resumo": {
    "total_servicos": 5,
    "servicos_ativos": 3,
    "servicos_inativos": 2
  },
  "servicos_ativos": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "nome": "Corte",
      "preco": 60.00,
      "duracao_minutos": 30,
      "ativo": true
    }
  ]
}
```

**👉 COPIE O ID (UUID) de um serviço ativo!**

---

### PASSO 2: Testar com o ID correto

```bash
curl -X POST http://localhost:3000/api/agendamentos/criar \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "Teste Debug",
    "telefone": "11999999999",
    "data": "2025-12-25",
    "hora": "10:00",
    "servico_ids": ["COLE-O-ID-AQUI"],
    "observacoes": "Teste com ID correto"
  }'
```

✅ **Se funcionar:** O problema era o ID errado! Use os IDs corretos no N8N e no dashboard.

❌ **Se não funcionar:** Continue para o Passo 3.

---

### PASSO 3: Cadastrar serviços (se não existirem)

**Se não há serviços cadastrados**, crie via Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Menu: **Table Editor** → Tabela `servicos`
4. Clique: **Insert** → **Insert row**
5. Preencha:
   - **nome**: "Corte"
   - **preco**: 60
   - **duracao_minutos**: 30
   - **ativo**: true (checkbox marcado)
   - **categoria**: "Corte" (opcional)
6. Clique: **Save**

Repita para outros serviços:
- Barba: R$ 25,00 - 20min
- Sobrancelha: R$ 15,00 - 10min
- Pigmentação: R$ 40,00 - 30min

---

## 🔍 DIAGNÓSTICO DETALHADO

### Verificar se serviços existem no banco:

```sql
-- Execute no SQL Editor do Supabase
SELECT id, nome, preco, duracao_minutos, ativo, categoria
FROM servicos
ORDER BY nome;
```

**Resultado esperado:**
```
id                                   | nome        | preco | duracao | ativo
-------------------------------------|-------------|-------|---------|-------
123e4567-e89b-12d3-a456-426614174000 | Corte       | 60.00 | 30      | true
123e4567-e89b-12d3-a456-426614174001 | Barba       | 25.00 | 20      | true
```

### Ativar serviços inativos:

```sql
-- Se os serviços existem mas estão inativos:
UPDATE servicos
SET ativo = true
WHERE ativo = false;
```

---

## 🐛 PROBLEMAS COMUNS

### 1. ❌ Erro: "Nenhum serviço listado no endpoint"

**Causa:** Tabela `servicos` está vazia

**Solução:** Cadastre serviços (veja Passo 3)

---

### 2. ❌ Erro: "RLS policy error"

**Causa:** Políticas RLS bloqueando acesso à tabela `servicos`

**Solução:** Execute no Supabase SQL Editor:
```sql
-- Permitir leitura de serviços
DROP POLICY IF EXISTS "servicos_select_all" ON servicos;
CREATE POLICY "servicos_select_all" ON servicos
FOR SELECT
TO anon, authenticated
USING (true);
```

---

### 3. ❌ Dashboard não mostra serviços

**Causa:** Query do dashboard está filtrando por `ativo = true`

**Solução:**
1. Vá no Supabase
2. Certifique-se que os serviços têm `ativo = true`
3. Recarregue o dashboard

---

### 4. ❌ N8N enviando IDs errados

**Causa:** Workflow do N8N está hardcoded com IDs antigos

**Solução:**
1. Abra o workflow no N8N
2. Encontre o nó que envia `servico_ids`
3. Atualize com os IDs corretos (do endpoint `/api/debug/servicos`)
4. Salve e teste

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Antes de criar um agendamento, verifique:

- [ ] Serviços cadastrados no banco (`SELECT * FROM servicos`)
- [ ] Pelo menos 1 serviço com `ativo = true`
- [ ] IDs dos serviços copiados corretamente (UUID formato: `xxxxx-xxxx-xxxx-xxxx-xxxx`)
- [ ] RLS permitindo SELECT na tabela `servicos`
- [ ] API de debug funcionando (`/api/debug/servicos`)

---

## 🧪 TESTE COMPLETO

### 1. Listar serviços disponíveis:
```bash
curl http://localhost:3000/api/debug/servicos
```

### 2. Copiar um ID da resposta:
```json
{
  "servicos_ativos": [
    {
      "id": "abc123...",  // ← COPIE ESTE ID
      "nome": "Corte"
    }
  ]
}
```

### 3. Criar agendamento com o ID:
```bash
curl -X POST http://localhost:3000/api/agendamentos/criar \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "Teste Final",
    "telefone": "11999999999",
    "data": "2025-12-25",
    "hora": "14:00",
    "servico_ids": ["abc123..."],
    "observacoes": "Teste com ID correto"
  }'
```

### 4. Verificar resposta:
✅ **Sucesso (201):**
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso!",
  "data": {
    "agendamento_id": "...",
    "barbeiro_atribuido": "João",
    "valor_total": 60.00
  }
}
```

❌ **Erro (400) com debug:**
```json
{
  "success": false,
  "message": "Serviços não encontrados ou inativos",
  "debug": {
    "servico_ids_enviados": ["abc123..."],
    "servicos_encontrados": 0,
    "dica": "Verifique se os IDs existem e estão com ativo=true"
  }
}
```

---

## 🆘 AINDA COM PROBLEMA?

Execute este SQL no Supabase para criar serviços de exemplo:

```sql
-- Inserir serviços padrão (se não existirem)
INSERT INTO servicos (nome, preco, duracao_minutos, ativo, categoria)
VALUES
  ('Corte', 60.00, 30, true, 'Corte'),
  ('Barba', 25.00, 20, true, 'Barba'),
  ('Sobrancelha', 15.00, 10, true, 'Estética'),
  ('Pigmentação', 40.00, 30, true, 'Estética')
ON CONFLICT DO NOTHING;

-- Verificar inserção
SELECT id, nome, preco, ativo FROM servicos;
```

Depois:
1. Copie um ID da query acima
2. Teste novamente com o cURL

---

## 📊 RESUMO

| Problema | Causa | Solução |
|----------|-------|---------|
| Serviços não encontrados | IDs errados | Use `/api/debug/servicos` |
| Tabela vazia | Sem serviços cadastrados | Insira via Supabase |
| Serviços inativos | `ativo = false` | `UPDATE servicos SET ativo = true` |
| RLS bloqueando | Sem política SELECT | Execute SQL de políticas RLS |

---

**Criado em:** 10/12/2025
**Última atualização:** 10/12/2025
**Status:** ✅ Endpoint de debug criado
