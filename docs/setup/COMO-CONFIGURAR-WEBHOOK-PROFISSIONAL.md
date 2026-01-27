# Como Configurar Webhook para Profissional

## Problema

Quando você cria um **profissional novo**, o webhook dele **não dispara automaticamente** porque não existe configuração de webhook para ele na tabela `webhooks_barbeiros`.

## Solução

### 1. Criar a Tabela (Primeira vez apenas)

Execute o arquivo de migration no Supabase:

```sql
-- Arquivo: migrations/criar-tabela-webhooks-barbeiros.sql
```

Acesse o SQL Editor do Supabase e execute todo o conteúdo do arquivo.

### 2. Configurar Webhook para um Profissional Específico

Existem 2 formas de configurar:

#### Opção A: Via API (Recomendado)

Use a API `/api/barbeiros/configurar-webhook`:

```bash
POST https://seu-dominio.vercel.app/api/barbeiros/configurar-webhook
Authorization: Bearer SEU_TOKEN_API

{
  "barbeiro_id": "UUID-DO-BARBEIRO",
  "webhook_url": "https://webhook.fbzia.com.br/webhook/dashvince",
  "eventos": ["novo_agendamento", "cancelamento", "confirmacao"],
  "ativo": true
}
```

**Exemplo com curl:**

```bash
curl -X POST https://vincibarbearia.vercel.app/api/barbeiros/configurar-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "barbeiro_id": "UUID-DO-BARBEIRO",
    "webhook_url": "https://webhook.fbzia.com.br/webhook/dashvince",
    "eventos": ["novo_agendamento", "cancelamento", "confirmacao"],
    "ativo": true
  }'
```

#### Opção B: Direto no Banco (Supabase)

Execute no SQL Editor:

```sql
-- Inserir webhook para um profissional específico
INSERT INTO webhooks_barbeiros (profissional_id, webhook_url, eventos, ativo)
VALUES (
  'UUID-DO-PROFISSIONAL', -- Substitua pelo ID real
  'https://webhook.fbzia.com.br/webhook/dashvince',
  ARRAY['novo_agendamento', 'cancelamento', 'confirmacao'],
  true
);
```

#### Opção C: Configurar para TODOS os Profissionais de Uma Vez

Execute no SQL Editor:

```sql
-- Configurar webhook para TODOS os profissionais ativos
INSERT INTO webhooks_barbeiros (profissional_id, webhook_url, eventos, ativo)
SELECT
  id,
  'https://webhook.fbzia.com.br/webhook/dashvince',
  ARRAY['novo_agendamento', 'cancelamento', 'confirmacao'],
  true
FROM profissionais
WHERE ativo = true
ON CONFLICT DO NOTHING;
```

### 3. Verificar Configurações

Para ver os webhooks configurados:

```sql
SELECT
  p.nome as barbeiro,
  wb.webhook_url,
  wb.eventos,
  wb.ativo
FROM webhooks_barbeiros wb
INNER JOIN profissionais p ON p.id = wb.profissional_id
ORDER BY p.nome;
```

### 4. Pegar o UUID de um Profissional

Se você não sabe o UUID do profissional:

```sql
SELECT id, nome, telefone, ativo
FROM profissionais
ORDER BY nome;
```

## Fluxo de Webhooks

Quando um agendamento é criado, o sistema dispara **2 webhooks**:

1. **Webhook Global** (configurado em `configuracoes.webhook_url`)
   - Dispara para TODOS os agendamentos
   - Independente do barbeiro

2. **Webhook do Barbeiro** (configurado em `webhooks_barbeiros`)
   - Dispara APENAS para agendamentos daquele barbeiro específico
   - Precisa estar configurado na tabela `webhooks_barbeiros`
   - Precisa ter `ativo = true`
   - O evento precisa estar na lista `eventos` (ex: 'novo_agendamento')

## Tipos de Eventos Disponíveis

- `novo_agendamento` - Quando um agendamento é criado
- `cancelamento` - Quando um agendamento é cancelado
- `confirmacao` - Quando um agendamento é confirmado

## Payload do Webhook

```json
{
  "tipo": "novo_agendamento",
  "agendamento_id": "uuid-do-agendamento",
  "cliente": {
    "nome": "Nome do Cliente",
    "telefone": "11999999999"
  },
  "agendamento": {
    "data": "06/01/2026",
    "hora": "14:00",
    "barbeiro": "Nome do Barbeiro",
    "servicos": ["Corte Masculino", "Barba"],
    "valor_total": 50.00,
    "duracao_total": 60
  }
}
```

## Troubleshooting

### Webhook não está disparando?

1. Verifique se a tabela `webhooks_barbeiros` existe
2. Verifique se há registro para o profissional
3. Verifique se `ativo = true`
4. Verifique se o evento está na lista `eventos`
5. Verifique os logs da tabela `notificacoes_enviadas`:

```sql
SELECT *
FROM notificacoes_enviadas
WHERE tipo = 'novo_agendamento_barbeiro'
ORDER BY created_at DESC
LIMIT 10;
```

### Como desativar temporariamente?

```sql
UPDATE webhooks_barbeiros
SET ativo = false
WHERE profissional_id = 'UUID-DO-PROFISSIONAL';
```

### Como reativar?

```sql
UPDATE webhooks_barbeiros
SET ativo = true
WHERE profissional_id = 'UUID-DO-PROFISSIONAL';
```

### Como atualizar a URL do webhook?

```sql
UPDATE webhooks_barbeiros
SET webhook_url = 'https://nova-url.com/webhook'
WHERE profissional_id = 'UUID-DO-PROFISSIONAL';
```

## Exemplo Completo

```sql
-- 1. Criar profissional novo
INSERT INTO profissionais (nome, telefone, especialidades, ativo)
VALUES ('João Silva', '11999999999', ARRAY['Corte'], true)
RETURNING id;

-- 2. Pegar o ID retornado e configurar webhook
INSERT INTO webhooks_barbeiros (profissional_id, webhook_url, eventos, ativo)
VALUES (
  'ID-RETORNADO-ACIMA',
  'https://webhook.fbzia.com.br/webhook/dashvince',
  ARRAY['novo_agendamento', 'cancelamento'],
  true
);

-- 3. Verificar
SELECT
  p.nome,
  wb.webhook_url,
  wb.ativo
FROM profissionais p
LEFT JOIN webhooks_barbeiros wb ON wb.profissional_id = p.id
WHERE p.nome = 'João Silva';
```

## Próximos Passos (Opcional)

Se você quiser que **novos profissionais tenham webhook configurado automaticamente**, seria necessário:

1. Adicionar lógica no código de criação de profissional
2. Ou criar um trigger no banco de dados
3. Ou configurar manualmente sempre que criar um profissional novo

Por enquanto, a recomendação é **configurar manualmente** usando a Opção C acima (configurar para todos os profissionais de uma vez).
