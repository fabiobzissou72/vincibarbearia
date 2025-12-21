# 📅 API de Agendamentos para Barbeiros

API simples e intuitiva para barbeiros consultarem seus agendamentos.

## 🔗 Endpoint

```
GET /api/barbeiro/agendamentos
```

## 🔐 Autenticação

A API requer autenticação via token Bearer:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

## 📝 Parâmetros

### Obrigatórios

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `barbeiro` | string | Nome do barbeiro OU UUID | `Hiago` ou `uuid-do-barbeiro` |

### Opcionais

| Parâmetro | Tipo | Descrição | Valores Aceitos |
|-----------|------|-----------|----------------|
| `quando` | string | Filtro de data | Ver tabela abaixo |

#### Valores aceitos para `quando`:

| Valor | Descrição | Exemplo de Uso |
|-------|-----------|----------------|
| `hoje` | Agendamentos de hoje | `?quando=hoje` |
| `amanha` | Agendamentos de amanhã | `?quando=amanha` |
| `segunda` | Próxima segunda-feira | `?quando=segunda` |
| `terca` ou `terça` | Próxima terça-feira | `?quando=terca` |
| `quarta` | Próxima quarta-feira | `?quando=quarta` |
| `quinta` | Próxima quinta-feira | `?quando=quinta` |
| `sexta` | Próxima sexta-feira | `?quando=sexta` |
| `sabado` ou `sábado` | Próximo sábado | `?quando=sabado` |
| `domingo` | Próximo domingo | `?quando=domingo` |
| `DD/MM/YYYY` | Data específica | `?quando=21/12/2024` |
| `YYYY-MM-DD` | Data específica (formato ISO) | `?quando=2024-12-21` |
| *(vazio)* | Todos os agendamentos futuros | *(não passar o parâmetro)* |

## 📌 Exemplos de Uso

### 1. Agendamentos de hoje (por nome)

```bash
GET /api/barbeiro/agendamentos?barbeiro=Hiago&quando=hoje
```

### 2. Agendamentos de amanhã (por UUID)

```bash
GET /api/barbeiro/agendamentos?barbeiro=1039a091-b264-4c17-8fd6-88732f2112aa&quando=amanha
```

### 3. Agendamentos da próxima terça-feira

```bash
GET /api/barbeiro/agendamentos?barbeiro=Hiago&quando=terca
```

### 4. Agendamentos de uma data específica

```bash
GET /api/barbeiro/agendamentos?barbeiro=Hiago&quando=25/12/2024
```

### 5. Todos os agendamentos futuros

```bash
GET /api/barbeiro/agendamentos?barbeiro=Hiago
```

**Nota:** O parâmetro `barbeiro` aceita tanto o **nome** (`Hiago`) quanto o **UUID** (`1039a091-b264-4c17-8fd6-88732f2112aa`) do barbeiro.

## ✅ Resposta de Sucesso

### Status: 200 OK

```json
{
  "success": true,
  "data": {
    "barbeiro": {
      "id": "uuid-do-barbeiro",
      "nome": "Hiago"
    },
    "filtro": "terca",
    "descricao": "terça-feira (24/12/2024)",
    "data_filtro": "24/12/2024",
    "total_agendamentos": 5,
    "valor_total": 250.00,
    "agendamentos": [
      {
        "id": "uuid-agendamento",
        "data": "24/12/2024",
        "hora": "09:00",
        "cliente": "João Silva",
        "telefone": "11999999999",
        "servicos": "Corte + Barba",
        "valor": 50.00,
        "status": "confirmado",
        "observacoes": null
      }
    ],
    "mensagem_whatsapp": "📅 *Agendamentos - terça-feira (24/12/2024)*\n\n..."
  }
}
```

## ❌ Erros Possíveis

### 400 - Bad Request

Parâmetros inválidos ou faltando:

```json
{
  "success": false,
  "message": "Parâmetro \"barbeiro\" é obrigatório. Exemplo: ?barbeiro=Hiago"
}
```

```json
{
  "success": false,
  "message": "Filtro \"ontem\" não reconhecido. Use: hoje, amanha, segunda, terca, ..."
}
```

### 401 - Unauthorized

Token não fornecido:

```json
{
  "success": false,
  "message": "Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN"
}
```

### 403 - Forbidden

Token inválido:

```json
{
  "success": false,
  "message": "Token de autorização inválido"
}
```

### 404 - Not Found

Barbeiro não encontrado:

```json
{
  "success": false,
  "message": "Barbeiro \"NomeInexistente\" não encontrado"
}
```

## 🎯 Casos de Uso com IA/WhatsApp

Esta API foi projetada para ser usada com chatbots e assistentes de IA. Exemplos de perguntas que a IA pode fazer:

### Perguntas Comuns

| Pergunta do Barbeiro | Parâmetro `quando` |
|---------------------|-------------------|
| "Quais meus agendamentos hoje?" | `hoje` |
| "Tenho cliente amanhã?" | `amanha` |
| "Quantos clientes tenho na terça?" | `terca` |
| "Mostra minha agenda de quinta" | `quinta` |
| "Agendamentos do dia 25/12" | `25/12/2024` |
| "Quais meus próximos clientes?" | *(não passar)* |

### Exemplo de Integração com N8N

```javascript
// No N8N, você pode capturar a pergunta do barbeiro e extrair a intenção

const pergunta = $input.item.json.mensagem.toLowerCase();
let filtro = '';

if (pergunta.includes('hoje')) {
  filtro = 'hoje';
} else if (pergunta.includes('amanhã') || pergunta.includes('amanha')) {
  filtro = 'amanha';
} else if (pergunta.includes('terça') || pergunta.includes('terca')) {
  filtro = 'terca';
} else if (pergunta.includes('quarta')) {
  filtro = 'quarta';
} else if (pergunta.includes('quinta')) {
  filtro = 'quinta';
} else if (pergunta.includes('sexta')) {
  filtro = 'sexta';
}
// ... e assim por diante

// Montar a URL
const url = `https://seu-dominio.com/api/barbeiro/agendamentos?barbeiro=${barbeiroNome}&quando=${filtro}`;
```

## 📱 Mensagem para WhatsApp

A resposta inclui um campo `mensagem_whatsapp` formatado e pronto para enviar:

```
📅 *Agendamentos - terça-feira (24/12/2024)*

👤 *Barbeiro:* Hiago
📊 *Total:* 5 agendamento(s)
💰 *Valor total:* R$ 250.00

─────────────────

*1. 09:00* - João Silva
   📞 11999999999
   ✂️ Corte + Barba
   💵 R$ 50.00

*2. 10:00* - Maria Santos
   📞 11988888888
   ✂️ Corte Feminino
   💵 R$ 60.00
   📝 Prefere franja curta
```

## 🔄 Diferenças em relação às APIs antigas

### `/api/barbeiros/meus-agendamentos`
- ❌ Requer `periodo` com valores específicos (hoje, semana, mes_que_vem, etc.)
- ❌ Não aceita dias da semana naturais (segunda, terça, etc.)
- ✅ Aceita períodos mais longos (mês, semana)

### `/api/barbeiro/agendamentos` (NOVA)
- ✅ Aceita linguagem natural: "terca", "quinta", etc.
- ✅ Mais simples: apenas `barbeiro` e `quando`
- ✅ Sem `quando`: retorna todos futuros automaticamente
- ✅ Aceita datas em múltiplos formatos
- ❌ Foca em consultas de curto prazo (dias específicos)

## 💡 Recomendações

1. **Para IA/Chatbots**: Use esta API (`/api/barbeiro/agendamentos`)
2. **Para períodos longos**: Use `/api/barbeiros/meus-agendamentos` com `periodo=mes` ou `periodo=semana`
3. **Para dashboard**: Use `/api/barbeiros/agendamentos-semana`

## 🛠️ Próximos Passos

Para usar esta API com WhatsApp:

1. Configure o webhook no N8N
2. Extraia o nome do barbeiro da mensagem
3. Identifique a intenção temporal (hoje, amanhã, terça, etc.)
4. Chame a API com os parâmetros corretos
5. Envie a `mensagem_whatsapp` de volta para o barbeiro
