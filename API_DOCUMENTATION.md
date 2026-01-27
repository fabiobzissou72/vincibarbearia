# 📚 Documentação Completa da API - Vince Barbearia
---

## ⚠️ IMPORTANTE: AUTENTICAÇÃO

**TODOS os endpoints abaixo requerem token de autenticação!**

```bash
-H "Authorization: Bearer SEU_TOKEN_AQUI"
```

Substitua `SEU_TOKEN_AQUI` pelo seu token real.

---



## 📋 Índice
1. [Agendamentos](#agendamentos)
2. [Horários e Disponibilidade](#horários-e-disponibilidade)
3. [Clientes](#clientes)
4. [Barbeiros/Profissionais](#barbeirosprofissionais)
5. [Serviços](#serviços)
6. [Cancelamento e Confirmação](#cancelamento-e-confirmação)
7. [Autenticação](#autenticação)

---

## 🗓️ AGENDAMENTOS

### 1. Criar Agendamento

**Endpoint:** `POST /api/agendamentos/criar`

**Descrição:** Cria um novo agendamento com sistema de rodízio automático.

#### Request Body:
```json
{
  "cliente_nome": "João Silva",
  "telefone": "11999999999",
  "data": "2025-12-20",
  "hora": "14:30",
  "servico_ids": ["uuid-servico-1", "uuid-servico-2"],
  "barbeiro_preferido": "uuid-barbeiro-ou-nome",
  "barbeiro_id": "uuid-barbeiro",
  "observacoes": "Cliente prefere tesoura",
  "cliente_id": "uuid-cliente-existente"
}
```

**Nota:** A API aceita tanto `barbeiro_preferido` (N8N, nome ou UUID) quanto `barbeiro_id` (App Cliente, UUID). Se nenhum for informado, usa rodízio automático.

#### Exemplo CURL - Um serviço:
```bash
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/criar \ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "João Silva",
    "telefone": "11999999999",
    "data": "2025-12-20",
    "hora": "14:30",
    "servico_ids": ["8f5e2c4a-1234-5678-9abc-def012345678"],
    "observacoes": "Primeira vez na barbearia"
  }'
```

#### Exemplo CURL - Múltiplos serviços (Corte + Barba + Sobrancelha):
```bash
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/criar \ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "João Silva",
    "telefone": "11999999999",
    "data": "2025-12-20",
    "hora": "14:30",
    "servico_ids": [
      "8f5e2c4a-1111-1111-1111-111111111111",
      "8f5e2c4a-2222-2222-2222-222222222222",
      "8f5e2c4a-3333-3333-3333-333333333333"
    ],
    "barbeiro_preferido": "Hiago",
    "observacoes": "Pacote completo: corte, barba e sobrancelha"
  }'
```

#### Response (Success):
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso!",
  "data": {
    "agendamento_id": "uuid",
    "barbeiro_atribuido": "Hiago",
    "data": "20/12/2025",
    "horario": "14:30",
    "valor_total": 150.00,
    "duracao_total": 90,
    "servicos": [
      { "nome": "Corte", "preco": 50 },
      { "nome": "Barba", "preco": 60 },
      { "nome": "Sobrancelha", "preco": 40 }
    ],
    "status": "agendado"
  }
}
```

---

### 2. Listar Agendamentos

**Endpoint:** `GET /api/agendamentos`

**Query Params:**
- `data` (opcional): Data em DD/MM/YYYY
- `profissional_id` (opcional): UUID do profissional

#### Exemplo CURL - Todos:
```bash
curl -X GET https://vincebarbearia.vercel.app/api/agendamentos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Exemplo CURL - Por data:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos?data=20/12/2025" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Exemplo CURL - Por barbeiro:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos?profissional_id=8f5e2c4a-1234-5678-9abc-def012345678" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
[
  {
    "id": "uuid",
    "data_agendamento": "20/12/2025",
    "hora_inicio": "14:30",
    "nome_cliente": "João Silva",
    "telefone": "11999999999",
    "valor": 150.00,
    "status": "agendado",
    "profissionais": {
      "nome": "Hiago"
    },
    "agendamento_servicos": [
      {
        "servicos": {
          "nome": "Corte",
          "preco": 50,
          "duracao_minutos": 30
        }
      }
    ]
  }
]
```

---

### 3. Atualizar Agendamento

**Endpoint:** `PUT /api/agendamentos`

#### Request Body:
```json
{
  "id": "uuid-agendamento",
  "cliente_id": "uuid-cliente",
  "profissional_id": "uuid-profissional",
  "servico_id": "uuid-servico",
  "data_agendamento": "20/12/2025",
  "hora_inicio": "15:00",
  "observacoes": "Mudança de horário",
  "nome_cliente": "João Silva",
  "telefone": "11999999999",
  "status": "confirmado"
}
```

#### Exemplo CURL:
```bash
curl -X PUT https://vincebarbearia.vercel.app/api/agendamentos \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "id": "8f5e2c4a-1234-5678-9abc-def012345678",
    "status": "confirmado",
    "observacoes": "Cliente confirmou presença"
  }'
```

---

### 4. Deletar Agendamento

**Endpoint:** `DELETE /api/agendamentos?id=uuid`

#### Exemplo CURL:
```bash
curl -X DELETE "https://vincebarbearia.vercel.app/api/agendamentos?id=8f5e2c4a-1234-5678-9abc-def012345678" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## ⏰ HORÁRIOS E DISPONIBILIDADE

### 5. Buscar Horários Disponíveis

**Endpoint:** `GET /api/agendamentos/horarios-disponiveis`

**Query Params:**
- `data` (obrigatório): Data em YYYY-MM-DD
- `barbeiro` (opcional): Nome do barbeiro
- `servico_ids` (opcional): IDs dos serviços separados por vírgula

#### Exemplo CURL - Horários livres do dia:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos/horarios-disponiveis?data=2025-12-20" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Exemplo CURL - Horários para barbeiro específico:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos/horarios-disponiveis?data=2025-12-20&barbeiro=Hiago" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Exemplo CURL - Com múltiplos serviços:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos/horarios-disponiveis?data=2025-12-20&servico_ids=uuid1,uuid2,uuid3" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
{
  "success": true,
  "message": "15 horários disponíveis encontrados",
  "data": {
    "data": "2025-12-20",
    "dia_semana": "Sexta",
    "horario_abertura": "09:00",
    "horario_fechamento": "19:00",
    "duracao_estimada": 90,
    "barbeiros_disponiveis": 3,
    "barbeiros": [
      { "id": "uuid1", "nome": "Hiago" },
      { "id": "uuid2", "nome": "Carlos" }
    ],
    "horarios": ["09:00", "09:30", "10:00", "10:30"],
    "horarios_ocupados": [
      {
        "horario": "14:00",
        "motivo": "Todos os barbeiros ocupados"
      }
    ],
    "total_disponiveis": 15,
    "total_ocupados": 5
  }
}
```

---

### 6. Buscar Barbeiro do Rodízio

**Endpoint:** `GET /api/agendamentos/buscar-barbeiro-rodizio`

**Query Params:**
- `data` (obrigatório): Data em YYYY-MM-DD
- `hora` (obrigatório): Hora em HH:MM
- `duracao` (obrigatório): Duração em minutos

#### Exemplo CURL:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos/buscar-barbeiro-rodizio?data=2025-12-20&hora=14:30&duracao=60" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
{
  "success": true,
  "data": {
    "barbeiro_id": "uuid",
    "barbeiro_nome": "Hiago",
    "total_atendimentos_hoje": 5,
    "disponivel": true
  }
}
```

---

## 🚫 CANCELAMENTO E CONFIRMAÇÃO

### 7. Cancelar Agendamento

**Endpoint:** `DELETE /api/agendamentos/cancelar`

**Descrição:** Cancela um agendamento com validação de prazo (2h antes por padrão).

#### Request Body:
```json
{
  "agendamento_id": "uuid",
  "motivo": "Imprevisto",
  "cancelado_por": "cliente",
  "forcar": false
}
```

**Opções para `cancelado_por`:**
- `cliente` - Valida prazo de 2h
- `barbeiro` - Pode cancelar a qualquer momento
- `admin` - Pode cancelar a qualquer momento
- `sistema` - Pode cancelar a qualquer momento

#### Exemplo CURL - Cancelamento por cliente:
```bash
curl -X DELETE https://vincebarbearia.vercel.app/api/agendamentos/cancelar \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "agendamento_id": "8f5e2c4a-1234-5678-9abc-def012345678",
    "motivo": "Não poderei comparecer",
    "cancelado_por": "cliente"
  }'
```

#### Exemplo CURL - Cancelamento por admin (forçado):
```bash
curl -X DELETE https://vincebarbearia.vercel.app/api/agendamentos/cancelar \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "agendamento_id": "8f5e2c4a-1234-5678-9abc-def012345678",
    "motivo": "Barbearia fechada por manutenção",
    "cancelado_por": "admin",
    "forcar": true
  }'
```

#### Response (Success):
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso!",
  "data": {
    "agendamento_id": "uuid",
    "status": "cancelado",
    "cancelado_por": "cliente",
    "motivo": "Imprevisto",
    "horas_antecedencia": "25.5",
    "cliente": "João Silva",
    "barbeiro": "Hiago",
    "data": "20/12/2025",
    "hora": "14:30",
    "valor_liberado": 150.00,
    "webhook_enviado": true
  }
}
```

#### Response (Erro - prazo):
```json
{
  "success": false,
  "message": "Cancelamento não permitido. É necessário cancelar com pelo menos 2h de antecedência",
  "errors": ["Faltam apenas 1.2h para o agendamento"],
  "data": {
    "prazo_minimo": 2,
    "horas_restantes": 1.2,
    "data_agendamento": "20/12/2025",
    "hora_agendamento": "14:30"
  }
}
```

---

### 8. Confirmar Comparecimento

**Endpoint:** `POST /api/agendamentos/confirmar-comparecimento`

#### Request Body:
```json
{
  "agendamento_id": "uuid",
  "compareceu": true,
  "observacoes": "Cliente chegou no horário"
}
```

#### Exemplo CURL - Cliente compareceu:
```bash
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/confirmar-comparecimento \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "agendamento_id": "8f5e2c4a-1234-5678-9abc-def012345678",
    "compareceu": true
  }'
```

#### Exemplo CURL - Cliente faltou:
```bash
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/confirmar-comparecimento \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "agendamento_id": "8f5e2c4a-1234-5678-9abc-def012345678",
    "compareceu": false,
    "observacoes": "Cliente não compareceu e não avisou"
  }'
```

---

## 👤 CLIENTES

### 9. Meus Agendamentos (Cliente)

**Endpoint:** `GET /api/clientes/meus-agendamentos`

**Query Params:**
- `telefone` (obrigatório): Telefone do cliente

#### Exemplo CURL:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/clientes/meus-agendamentos?telefone=11999999999" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
{
  "cliente": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "agendamentos": {
    "proximos": [],
    "passados": [],
    "cancelados": []
  },
  "estatisticas": {
    "total_agendamentos": 10,
    "total_comparecimentos": 9,
    "total_faltas": 1,
    "taxa_comparecimento": 90
  }
}
```

---

## 💈 BARBEIROS/PROFISSIONAIS

### 10. Agendamentos de Hoje (Barbeiro)

**Endpoint:** `GET /api/barbeiros/agendamentos-hoje`

**Query Params:**
- `telefone` (obrigatório): Telefone do barbeiro

#### Exemplo CURL:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/barbeiros/agendamentos-hoje?telefone=11988888888" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
{
  "barbeiro": {
    "id": "uuid",
    "nome": "Hiago",
    "telefone": "11988888888"
  },
  "data": "20/12/2025",
  "resumo": {
    "total_agendamentos": 8,
    "faturamento_total": 800.00,
    "confirmados": 6,
    "concluidos": 2,
    "compareceram": 2,
    "proximos": 6,
    "em_andamento": 0
  },
  "agendamentos": {
    "proximos": [],
    "em_andamento": [],
    "concluidos": [],
    "todos": []
  }
}
```

---

### 11. Agendamentos da Semana (Barbeiro)

**Endpoint:** `GET /api/barbeiros/agendamentos-semana`

**Query Params:**
- `telefone` (obrigatório): Telefone do barbeiro

#### Exemplo CURL:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/barbeiros/agendamentos-semana?telefone=11988888888" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 12. Faturamento do Mês (Barbeiro)

**Endpoint:** `GET /api/barbeiros/faturamento-mes`

**Query Params:**
- `telefone` (obrigatório): Telefone do barbeiro

#### Exemplo CURL:
```bash
curl -X GET "https://vincebarbearia.vercel.app/api/barbeiros/faturamento-mes?telefone=11988888888" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### Response:
```json
{
  "barbeiro": {
    "id": "uuid",
    "nome": "Hiago",
    "telefone": "11988888888"
  },
  "mes": "Dezembro/2025",
  "resumo": {
    "total_agendamentos": 45,
    "total_faturamento": 4500.00,
    "ticket_medio": 100.00,
    "dias_trabalhados": 15,
    "taxa_ocupacao": 85
  }
}
```

---

### 13. Listar Profissionais

**Endpoint:** `GET /api/barbeiros/listar`

#### Exemplo CURL:
```bash
curl -X GET https://vincebarbearia.vercel.app/api/barbeiros/listar \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "Hiago",
      "telefone": "11988888888",
      "ativo": true,
      "especialidades": ["Corte", "Barba"],
      "foto_url": "https://..."
    }
  ]
}
```

---

## ✂️ SERVIÇOS

### 14. Listar Serviços

**Endpoint:** `GET /api/servicos`

#### Exemplo CURL:
```bash
curl -X GET https://vincebarbearia.vercel.app/api/servicos \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

#### Response:
```json
[
  {
    "id": "uuid-corte",
    "nome": "Corte",
    "descricao": "Corte de cabelo tradicional",
    "preco": 50.00,
    "duracao_minutos": 30,
    "ativo": true
  },
  {
    "id": "uuid-barba",
    "nome": "Barba",
    "descricao": "Barba completa com toalha quente",
    "preco": 60.00,
    "duracao_minutos": 40,
    "ativo": true
  },
  {
    "id": "uuid-sobrancelha",
    "nome": "Sobrancelha",
    "descricao": "Design de sobrancelha",
    "preco": 40.00,
    "duracao_minutos": 20,
    "ativo": true
  }
]
```

---

## 📝 EXEMPLOS PRÁTICOS

### Cenário 1: Cliente agenda Corte + Barba + Sobrancelha

```bash
# 1. Listar serviços disponíveis
curl -X GET https://vincebarbearia.vercel.app/api/servicos \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'

# 2. Verificar horários disponíveis (considerando 90min total)
curl -X GET "https://vincebarbearia.vercel.app/api/agendamentos/horarios-disponiveis?data=2025-12-20&servico_ids=uuid-corte,uuid-barba,uuid-sobrancelha"

# 3. Criar agendamento com os 3 serviços
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/criar \ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "João Silva",
    "telefone": "11999999999",
    "data": "2025-12-20",
    "hora": "14:30",
    "servico_ids": ["uuid-corte", "uuid-barba", "uuid-sobrancelha"],
    "observacoes": "Pacote completo"
  }'
```

### Cenário 2: Barbeiro específico

```bash
# Criar agendamento com barbeiro preferido
curl -X POST https://vincebarbearia.vercel.app/api/agendamentos/criar \ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "Maria Santos",
    "telefone": "11988887777",
    "data": "2025-12-20",
    "hora": "10:00",
    "servico_ids": ["uuid-corte"],
    "barbeiro_preferido": "Hiago"
  }'
```

### Cenário 3: Cancelamento emergencial

```bash
# Admin cancela agendamento fora do prazo
curl -X DELETE https://vincebarbearia.vercel.app/api/agendamentos/cancelar \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H "Content-Type: application/json" \
  -d '{
    "agendamento_id": "uuid-agendamento",
    "motivo": "Emergência - encanamento estourou",
    "cancelado_por": "admin",
    "forcar": true
  }'
```

---

## 👤 CLIENTES

### 15. Enviar Senha Temporária

**Endpoint:** `POST /api/clientes/enviar-senha-temporaria`

**Descrição:** Gera senha temporária de 6 dígitos e envia via WhatsApp. Webhook separado para não interferir nas automações de agendamento.

#### Request Body:
```json
{
  "telefone": "11999999999"
}
```

#### Exemplo CURL:
```bash
curl -X POST https://vincebarbearia.vercel.app/api/clientes/enviar-senha-temporaria \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_API" \
  -d '{
    "telefone": "11999999999"
  }'
```

#### Response (Success):
```json
{
  "success": true,
  "senhaTemporaria": "123456",
  "webhookEnviado": true,
  "message": "Senha gerada e enviada via WhatsApp"
}
```

#### Response (Erro):
```json
{
  "success": false,
  "error": "Cliente não encontrado"
}
```

#### Webhook Payload Enviado:
```json
{
  "tipo": "senha_temporaria",
  "telefone": "11999999999",
  "mensagem": "🔐 *Vince Barbearia*\n\nOlá *João Silva*!\n\nSua senha de acesso foi gerada:\n\n*123456*\n\nUse essa senha para fazer login no aplicativo.",
  "cliente": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "senha": "123456"
}
```

#### Configuração do Webhook:
1. Acesse **Dashboard > Configurações**
2. Preencha o campo **"URL do Webhook - Senha Temporária"**
3. Cole a URL do N8N específica para senhas (separada das automações)
4. Se não configurado, usa o webhook geral (campo "URL do Webhook - Agendamentos")

#### Notas Importantes:
- ✅ Senha é sempre **6 dígitos numéricos**
- ✅ Webhook **separado** para não interferir nas automações existentes
- ✅ Senha salva com hash bcrypt no banco
- ✅ Notificação registrada na tabela `notificacoes_enviadas`
- ⚠️ Requer autenticação com token da API

---

## 🔐 AUTENTICAÇÃO

A API não requer autenticação para a maioria dos endpoints. Para produção, recomenda-se adicionar:
- JWT tokens
- API keys
- Rate limiting

---

## 📊 CÓDIGOS DE STATUS

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro de validação
- `404` - Não encontrado
- `409` - Conflito (horário ocupado)
- `500` - Erro interno do servidor

---

## 🌐 BASE URL

**Desenvolvimento:** `https://vincebarbearia.vercel.app`
**Produção:** `https://sua-api.com`

---

## 📞 SUPORTE

Para dúvidas ou problemas, entre em contato:
- Email: suporte@vincebarbearia.com
- WhatsApp: (11) 99999-9999

---

**Última atualização:** 22/12/2025
**Versão da API:** 1.1.0
