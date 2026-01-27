# API do Barbeiro - Documentação Completa

**Vince Barbearia - API para IA/WhatsApp**

⚠️ **ATENÇÃO: TODOS os cURLs abaixo JÁ INCLUEM o header de autenticação!**

---

## 🔐 Configuração de Autenticação

**TODOS os endpoints requerem token de autenticação!**

### Header Obrigatório:
```bash
-H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

### Onde conseguir o token?
- Entre em contato com o administrador do sistema
- O token é usado para validar que apenas pessoas autorizadas acessam os dados
- **Substitua `SEU_TOKEN_AQUI` pelo token real fornecido**

---

## 📋 Endpoints Disponíveis

### 1. AGENDAMENTOS

#### 1.1 Buscar Agendamentos (Principal)
**Endpoint:** `GET /api/barbeiro/agendamentos`

**Descrição:** Consulta agendamentos do barbeiro com filtros flexíveis

**Parâmetros:**
- `barbeiro` (obrigatório): Nome ou UUID do barbeiro
- `quando` (opcional): Filtro de data
  - `hoje` - Agendamentos de hoje
  - `amanha` - Agendamentos de amanhã
  - `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo` - Próximo dia da semana
  - `22/01/2026` ou `2026-01-22` - Data específica
  - Se não informado: retorna todos os agendamentos futuros

**Exemplo cURL:**
```bash
curl -X GET 'https://vincebarbearia.vercel.app/api/barbeiro/agendamentos?barbeiro=Hiago&quando=hoje' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "barbeiro": {
      "id": "uuid-do-barbeiro",
      "nome": "Hiago"
    },
    "filtro": "hoje",
    "descricao": "hoje (22/01/2026)",
    "total_agendamentos": 5,
    "valor_total": 400.00,
    "agendamentos": [
      {
        "id": "uuid-agendamento",
        "data": "22/01/2026",
        "hora": "14:30",
        "cliente": "João Silva",
        "telefone": "11 99999-9999",
        "servicos": "Corte + Barba",
        "valor": 80.00,
        "status": "confirmado",
        "observacoes": ""
      }
    ],
    "mensagem_whatsapp": "📅 *Agendamentos - hoje (22/01/2026)*\n\n..."
  }
}
```

**Perguntas que a IA pode responder:**
- "Quais agendamentos tenho hoje?"
- "E amanhã?"
- "Da semana?"
- "Da terça-feira?"
- "Do dia 25/01?"

---

### 2. FATURAMENTO

#### 2.1 Faturamento Simplificado
**Endpoint:** `GET /api/barbeiros/meu-faturamento`

**Descrição:** Faturamento do barbeiro (hoje, semana ou mês)

**Parâmetros:**
- `barbeiro_nome` (obrigatório): Nome do barbeiro
- `periodo` (opcional): `hoje` | `semana` | `mes` (padrão: `hoje`)

**Exemplo cURL:**
```bash
curl -X GET 'https://vincebarbearia.vercel.app/api/barbeiros/meu-faturamento?barbeiro_nome=Hiago&periodo=hoje' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "barbeiro": {
      "id": "uuid-do-barbeiro",
      "nome": "Hiago"
    },
    "periodo": "hoje (22/01/2026)",
    "data_inicio": "22/01/2026",
    "data_fim": "22/01/2026",
    "total_atendimentos": 8,
    "faturamento_total": 640.00,
    "ticket_medio": 80.00,
    "faturamento_por_dia": [
      {
        "data": "22/01/2026",
        "quantidade": 8,
        "valor": 640.00
      }
    ],
    "mensagem_whatsapp": "💰 *Seu faturamento hoje (22/01/2026)*\n\n..."
  }
}
```

**Perguntas que a IA pode responder:**
- "Quanto faturei hoje?"
- "Quanto ganhei na semana?"
- "Meu faturamento do mês?"

---

#### 2.2 Faturamento Mensal Detalhado
**Endpoint:** `GET /api/barbeiros/faturamento-mes`

**Descrição:** Faturamento detalhado do mês com estatísticas

**Parâmetros:**
- Pelo menos um é obrigatório: `telefone` | `barbeiro_nome` | `barbeiro_id`
- `mes` (opcional): Mês no formato MM (01-12). Padrão: mês atual
- `ano` (opcional): Ano no formato YYYY. Padrão: ano atual

**Exemplo cURL:**
```bash
curl -X GET 'https://vincebarbearia.vercel.app/api/barbeiros/faturamento-mes?barbeiro_nome=Hiago&mes=01&ano=2026' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta:**
```json
{
  "barbeiro": {
    "id": "uuid-do-barbeiro",
    "nome": "Hiago",
    "telefone": "11999999999"
  },
  "periodo": {
    "mes": 1,
    "ano": 2026,
    "nome_mes": "Janeiro",
    "data_inicio": "01/01/2026",
    "data_fim": "31/01/2026"
  },
  "faturamento": {
    "bruto": 12500.00,
    "confirmado": 11200.00,
    "perdido": 1300.00
  },
  "estatisticas": {
    "total_agendamentos": 150,
    "concluidos": 140,
    "compareceram": 135,
    "faltaram": 5,
    "taxa_comparecimento": "90.0%"
  },
  "faturamento_por_dia": [
    {
      "dia": "01",
      "data": "01/01/2026",
      "total_agendamentos": 8,
      "faturamento_bruto": 640.00,
      "faturamento_confirmado": 640.00,
      "concluidos": 8,
      "compareceram": 8
    }
  ],
  "top_servicos": [
    {
      "nome": "Corte Masculino",
      "quantidade": 120,
      "total": 6000.00
    }
  ],
  "agendamentos_detalhados": [...]
}
```

**Perguntas que a IA pode responder:**
- "Quanto ganhei este mês?"
- "Me faturamento de janeiro"
- "Quanto fiz em dezembro?"

---

### 3. CANCELAR AGENDAMENTO

#### 3.1 Cancelar Agendamento
**Endpoint:** `POST /api/barbeiros/cancelar-meu-agendamento`

**Descrição:** Cancela um agendamento e notifica o cliente automaticamente

**Forma 1 - RECOMENDADA (pelo ID):**
```json
{
  "agendamento_id": "uuid-do-agendamento"
}
```

**Forma 2 - COMPATIBILIDADE (por nome e hora):**
```json
{
  "barbeiro_nome": "Hiago",
  "cliente_nome": "João Silva",
  "hora": "14:30",
  "data": "22/01/2026"
}
```

**Exemplo cURL (Forma 1 - Recomendada):**
```bash
curl -X POST 'https://vincebarbearia.vercel.app/api/barbeiros/cancelar-meu-agendamento' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{
    "agendamento_id": "abc123-def456-ghi789"
  }'
```

**Exemplo cURL (Forma 2 - Compatibilidade):**
```bash
curl -X POST 'https://vincebarbearia.vercel.app/api/barbeiros/cancelar-meu-agendamento' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{
    "barbeiro_nome": "Hiago",
    "cliente_nome": "João Silva",
    "hora": "14:30",
    "data": "22/01/2026"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso!",
  "data": {
    "agendamento_id": "uuid-do-agendamento",
    "cliente": "João Silva",
    "data": "22/01/2026",
    "hora": "14:30",
    "valor": 80.00,
    "mensagem_whatsapp": "✅ *Agendamento cancelado com sucesso!*\n\n📅 *Data:* 22/01/2026\n🕐 *Hora:* 14:30\n👤 *Cliente:* João Silva\n📞 *Telefone:* 11 99999-9999\n💵 *Valor:* R$ 80.00\n\nO cliente será notificado sobre o cancelamento."
  }
}
```

**Perguntas que a IA pode entender:**
- "Cancele o agendamento das 14h"
- "Cancela o do João Silva"
- "Desmarca o cliente de hoje às 15:30"

---

### 4. HORÁRIOS

#### 4.1 Consultar Horários Disponíveis
**Endpoint:** `GET /api/barbeiros/horarios`

**Descrição:** Mostra horários livres e ocupados de todos os barbeiros hoje

**Exemplo cURL:**
```bash
curl -X GET 'https://vincebarbearia.vercel.app/api/barbeiros/horarios' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "data": "22/01/2026",
    "hora_consulta": "14:30:00",
    "total_agendamentos": 25,
    "barbeiros": [
      {
        "barbeiro_id": "uuid-do-barbeiro",
        "barbeiro_nome": "Hiago",
        "total_agendamentos": 8,
        "horarios_ocupados": [
          {
            "hora": "09:00",
            "cliente": "João Silva",
            "servico": "Corte Masculino",
            "valor": 50.00,
            "status": "confirmado"
          }
        ],
        "horarios_livres": [
          "08:00",
          "08:30",
          "09:30",
          "10:00",
          ...
        ],
        "proximos_livres": [
          "08:00",
          "08:30",
          "09:30",
          "10:00",
          "10:30"
        ]
      }
    ],
    "estatisticas": {
      "mais_ocupado": {
        "nome": "Hiago",
        "agendamentos": 8
      },
      "menos_ocupado": {
        "nome": "Carlos",
        "agendamentos": 3
      }
    }
  }
}
```

---

## 📊 Resumo para IA/Chatbot

### Comandos Principais:

| Pergunta do Barbeiro | Endpoint | Parâmetros |
|---------------------|----------|------------|
| "Quais agendamentos tenho hoje?" | `/api/barbeiro/agendamentos` | `?barbeiro=NOME&quando=hoje` |
| "E amanhã?" | `/api/barbeiro/agendamentos` | `?barbeiro=NOME&quando=amanha` |
| "Da semana?" | `/api/barbeiro/agendamentos` | `?barbeiro=NOME&quando=semana` (não suportado, usar outro) |
| "Quanto faturei hoje?" | `/api/barbeiros/meu-faturamento` | `?barbeiro_nome=NOME&periodo=hoje` |
| "Quanto ganhei na semana?" | `/api/barbeiros/meu-faturamento` | `?barbeiro_nome=NOME&periodo=semana` |
| "Do mês?" | `/api/barbeiros/meu-faturamento` | `?barbeiro_nome=NOME&periodo=mes` |
| "Cancele o agendamento X" | `/api/barbeiros/cancelar-meu-agendamento` | Body com `agendamento_id` |

---

## 🔒 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `400` | Parâmetros inválidos |
| `401` | Token não fornecido |
| `403` | Token inválido |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

---

## ⚠️ Importante

### Endpoints CONFUSOS (SUBSTITUIR):

Estes endpoints existem mas são confusos. **NÃO USE** nas novas integrações:

- ❌ `/api/barbeiros/agendamentos-hoje` → **USE** `/api/barbeiro/agendamentos?quando=hoje`
- ❌ `/api/barbeiros/agendamentos-semana` → **USE** `/api/barbeiro/agendamentos` (com filtro de data)
- ❌ `/api/barbeiros/meus-agendamentos` → **USE** `/api/barbeiro/agendamentos`

### Backup disponível em:
`/src/app/api/barbeiros/_backup/`

---

## 📞 Suporte

Para obter o token de autenticação ou dúvidas, entre em contato com o administrador do sistema.
