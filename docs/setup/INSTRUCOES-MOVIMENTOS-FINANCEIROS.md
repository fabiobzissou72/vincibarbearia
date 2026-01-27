# 📊 Como Configurar a Tabela de Movimentos Financeiros

## ⚠️ IMPORTANTE: Execute o SQL Primeiro!

**A tabela `movimentos_financeiros` NÃO existe ainda no seu banco de dados!**
Você precisa executar o SQL no Supabase para criar a tabela.

---

## O que é?

A tabela `movimentos_financeiros` registra **automaticamente** cada movimento financeiro da barbearia:

- ✅ Cada **serviço** realizado (quando status = `concluido` ou `em_andamento` E cliente compareceu)
- ✅ Cada **produto** vendido
- ✅ Data, hora, barbeiro, cliente, valor
- ✅ Se cancelar, remove movimentos automaticamente
- ✅ Ideal para relatórios e controle financeiro

---

## 🚀 Passo a Passo (5 minutos)

### 1️⃣ Acesse o Supabase

1. Entre em: https://supabase.com
2. Faça login
3. Selecione seu projeto **Vince Barbearia**

### 2️⃣ Execute o SQL

1. No menu lateral, clique em **SQL Editor** (ícone `</>`)
2. Clique em **+ New Query**
3. Abra o arquivo: `D:\VINCI BARBEARIA\src\lib\movimentos-financeiros.sql`
4. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)
5. **Cole** no editor SQL do Supabase (Ctrl+V)
6. Clique em **RUN** (ou pressione `Ctrl+Enter`)

### 3️⃣ Verificar se funcionou

Você deve ver mensagens de sucesso:
```
✅ Tabela movimentos_financeiros criada com sucesso!
✅ Triggers configurados para registrar automaticamente:
   - Serviços quando agendamento for concluído
   - Produtos quando venda for criada
```

### 4. Popular dados existentes (OPCIONAL)

Se você já tem agendamentos concluídos e quer populá-los na tabela:

```sql
-- Inserir movimentos de agendamentos já concluídos
INSERT INTO movimentos_financeiros (
  data_movimento,
  hora_movimento,
  tipo,
  agendamento_id,
  profissional_id,
  profissional_nome,
  cliente_id,
  cliente_nome,
  servico_id,
  servico_nome,
  quantidade,
  valor_unitario,
  valor_total,
  status,
  compareceu
)
SELECT
  TO_DATE(a.data_agendamento, 'DD/MM/YYYY'),
  a.hora_inicio::time,
  'servico',
  a.id,
  a.profissional_id,
  a.Barbeiro,
  a.cliente_id,
  a.nome_cliente,
  ags.servico_id,
  s.nome,
  1,
  ags.preco,
  ags.preco,
  'confirmado',
  a.compareceu
FROM agendamentos a
JOIN agendamento_servicos ags ON ags.agendamento_id = a.id
JOIN servicos s ON s.id = ags.servico_id
WHERE a.status = 'concluido' AND a.compareceu = true;

-- Verificar quantos foram inseridos
SELECT COUNT(*) as total_movimentos FROM movimentos_financeiros;
```

---

## 📋 Estrutura da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único do movimento |
| `data_movimento` | Date | Data do movimento |
| `hora_movimento` | Time | Hora do movimento |
| `tipo` | String | `'servico'` ou `'produto'` |
| `profissional_id` | UUID | ID do barbeiro |
| `profissional_nome` | String | Nome do barbeiro |
| `cliente_id` | UUID | ID do cliente |
| `cliente_nome` | String | Nome do cliente |
| `servico_id` | UUID | ID do serviço (se for serviço) |
| `servico_nome` | String | Nome do serviço |
| `produto_id` | UUID | ID do produto (se for produto) |
| `produto_nome` | String | Nome do produto |
| `quantidade` | Integer | Quantidade vendida |
| `valor_unitario` | Decimal | Valor unitário |
| `valor_total` | Decimal | Valor total do movimento |
| `status` | String | Status (`'confirmado'`) |
| `compareceu` | Boolean | Se cliente compareceu |

---

## 🤖 Como Funciona (100% Automático)

### ✅ Quando registra movimento financeiro:
1. **Muda status para `concluido` ou `em_andamento`** E cliente compareceu
2. Para **cada serviço** do agendamento:
   - ✅ Cria 1 registro em `movimentos_financeiros`
   - ✅ Preenche automaticamente: data, hora, barbeiro, cliente, serviço, valor

### ❌ Quando NÃO registra movimento:
- Status = `agendado` ou `confirmado` (ainda não aconteceu)
- Status = `cancelado` (não houve serviço)
- Cliente não compareceu (`compareceu = false`)

### 🗑️ Se cancelar agendamento:
- Deleta automaticamente os movimentos financeiros daquele agendamento

### 📦 Quando registra venda de produto:
1. Sistema cria automaticamente:
   - 1 registro em `movimentos_financeiros`
   - Tipo: `'produto'`
   - Com todas as informações da venda

---

## 🎯 Benefícios

✅ **Histórico completo** de tudo que foi feito/vendido
✅ **Relatórios precisos** por período
✅ **Faturamento detalhado** por barbeiro
✅ **Controle financeiro** simplificado
✅ **Automático** - você não precisa fazer nada!

---

## 🔍 Consultas Úteis

### Ver movimentos de hoje
```sql
SELECT * FROM v_movimentos_hoje;
```

### Faturamento do dia por barbeiro
```sql
SELECT
  profissional_nome,
  COUNT(*) as total_atendimentos,
  SUM(valor_total) as faturamento
FROM movimentos_financeiros
WHERE data_movimento = CURRENT_DATE
  AND tipo = 'servico'
GROUP BY profissional_nome
ORDER BY faturamento DESC;
```

### Top 5 serviços mais vendidos
```sql
SELECT
  servico_nome,
  COUNT(*) as quantidade,
  SUM(valor_total) as faturamento
FROM movimentos_financeiros
WHERE tipo = 'servico'
GROUP BY servico_nome
ORDER BY quantidade DESC
LIMIT 5;
```

---

## ⚠️ Importante

- Os movimentos são criados **automaticamente** quando você marca agendamento como concluído
- **Não delete** registros da tabela `movimentos_financeiros` (é seu histórico financeiro!)
- Se precisar corrigir algo, edite o agendamento/venda original

---

**Pronto!** Depois de executar o SQL, os movimentos financeiros serão registrados automaticamente! 🎉
