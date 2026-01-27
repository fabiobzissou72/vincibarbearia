# ✅ Sistema de Agendamentos - Totalmente Integrado

## 🎉 O QUE FOI ATUALIZADO

A página de agendamentos (`/dashboard/agendamentos`) agora está **100% conectada** com todo o sistema de rodízio, notificações e validações que criamos.

---

## 🔄 INTEGRAÇÃO COM RODÍZIO AUTOMÁTICO

### Como Funciona Agora

1. **Ao abrir o formulário de novo agendamento:**
   - Sistema verifica horários disponíveis automaticamente
   - Mostra dropdown com horários livres (intervalos de 30 min)
   - Detecta conflitos antes mesmo de criar o agendamento

2. **Campo de Profissional:**
   - **Opcional** - não precisa mais selecionar barbeiro
   - Se deixar vazio: Sistema usa **rodízio automático**
   - Opção padrão: "🔄 Rodízio Automático (barbeiro com menos atendimentos)"

3. **Preview do Rodízio:**
   - Quando seleciona data + hora + serviços
   - Sistema mostra qual barbeiro será atribuído
   - Mostra quantos atendimentos ele já tem hoje
   - Atualização em tempo real

### Exemplo Visual

```
┌─────────────────────────────────────────────┐
│ Profissional (opcional)                     │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔄 Rodízio Automático                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ✅ Barbeiro do Rodízio:                     │
│    Hiago (2 atendimentos hoje)             │
└─────────────────────────────────────────────┘
```

---

## 📋 MUDANÇAS NA CRIAÇÃO DE AGENDAMENTOS

### Antes
```typescript
// Criava direto no Supabase
await supabase.from('agendamentos').insert(...)
```

### Agora
```typescript
// Usa a API REST com rodízio e webhooks
await fetch('/api/agendamentos/criar', {
  method: 'POST',
  body: JSON.stringify({
    cliente_nome,
    telefone,
    data,
    hora,
    servico_ids: [...],
    barbeiro_preferido: null  // null = rodízio automático
  })
})
```

### O Que Acontece Automaticamente

1. ✅ **Sistema escolhe barbeiro** (se não especificado)
2. ✅ **Verifica conflitos** de horário
3. ✅ **Calcula duração total** dos serviços
4. ✅ **Cria agendamento** no banco
5. ✅ **Vincula múltiplos serviços** (agendamento_servicos)
6. ✅ **Atualiza contador do rodízio**
7. ✅ **Dispara webhook N8N** (notificação de confirmação)
8. ✅ **Registra no histórico**

### Mensagem de Sucesso

```
Agendamento criado com sucesso!

Barbeiro: Hiago
Atribuído por rodízio (menos atendimentos do dia)
✅ Notificação enviada!
```

---

## 📞 CHECK-IN / COMPARECIMENTO

### Antes
```typescript
// Atualizava direto no banco
await supabase.from('agendamentos').update(...)
```

### Agora
```typescript
// Usa endpoint de confirmação
await fetch('/api/agendamentos/confirmar-comparecimento', {
  method: 'POST',
  body: JSON.stringify({
    agendamento_id,
    compareceu: true/false
  })
})
```

### O Que Acontece Automaticamente

1. ✅ Marca `compareceu = true/false`
2. ✅ Registra `checkin_at` com timestamp
3. ✅ Atualiza `status` (concluido/cancelado)
4. ✅ **Registra no histórico de atendimentos**
5. ✅ Usado para cálculos de follow-up (3 dias, 21 dias)

---

## ❌ CANCELAMENTO DE AGENDAMENTOS

### Antes
```typescript
// Delete direto
await supabase.from('agendamentos').delete()
```

### Agora
```typescript
// Usa endpoint de cancelamento com validação
await fetch('/api/agendamentos/cancelar', {
  method: 'DELETE',
  body: JSON.stringify({
    agendamento_id,
    motivo: 'Cliente solicitou',
    cancelado_por: 'admin',
    forcar: true  // Admin pode cancelar a qualquer momento
  })
})
```

### Validação de 2 Horas

- **Cliente comum:** Só pode cancelar com 2h de antecedência
- **Admin:** Pode cancelar a qualquer momento
- Sistema pergunta confirmação se tenta cancelar dentro das 2h

### O Que Acontece Automaticamente

1. ✅ **Valida prazo de 2h** (se cliente)
2. ✅ **Registra motivo** do cancelamento
3. ✅ Atualiza `status = 'cancelado'`
4. ✅ **Salva no histórico** (agendamentos_cancelamentos)
5. ✅ **Dispara webhook N8N** (notificação de cancelamento)
6. ✅ Cliente recebe mensagem automática

---

## ⏰ HORÁRIOS DISPONÍVEIS (TEMPO REAL)

### Nova Funcionalidade

Ao selecionar **data + serviços**, o sistema:

1. Calcula duração total dos serviços selecionados
2. Consulta configurações de horário de funcionamento
3. Verifica todos os agendamentos existentes do dia
4. Calcula sobreposição de horários
5. Retorna apenas slots realmente disponíveis

### Como Aparece no Formulário

```
┌─────────────────────────────────────────────┐
│ Hora * (Verificando...)                     │
│ ┌─────────────────────────────────────────┐ │
│ │ Selecione um horário disponível...      │ │
│ │ 09:00                                   │ │
│ │ 09:30                                   │ │
│ │ 11:00                                   │ │
│ │ 14:30                                   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Se **não houver horários**:
```
⚠ Nenhum horário disponível.
Selecione outra data ou barbeiro.
```

---

## 🔔 NOTIFICAÇÕES AUTOMÁTICAS

### Quando São Disparadas

| Evento | Quando | Tipo |
|--------|--------|------|
| **Confirmação** | Ao criar agendamento | `confirmacao` |
| **Lembrete 24h** | 1 dia antes (via Cron) | `lembrete_24h` |
| **Lembrete 2h** | 2 horas antes (via Cron) | `lembrete_2h` |
| **Cancelamento** | Ao cancelar | `cancelado` |
| **Follow-up 3d** | 3 dias após atendimento | `followup_3d` |
| **Follow-up 21d** | 21 dias após atendimento | `followup_21d` |

### Payload Enviado ao Webhook

```json
{
  "tipo": "confirmacao",
  "agendamento_id": "uuid",
  "cliente": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "agendamento": {
    "data": "2025-12-20",
    "hora": "14:00",
    "barbeiro": "Hiago",
    "servicos": [
      { "nome": "Corte", "preco": 50 }
    ],
    "valor_total": 50,
    "duracao_total": 45
  }
}
```

---

## 📊 FLUXO COMPLETO - DO CLIQUE AO WHATSAPP

### 1️⃣ Usuário Clica em "Novo Agendamento"
- Abre modal
- Sistema carrega profissionais e serviços ativos

### 2️⃣ Preenche Dados
- Nome, telefone, data
- Seleciona 1 ou mais serviços
- **Opcionalmente** seleciona barbeiro

### 3️⃣ Sistema Calcula em Tempo Real
- Duração total: soma de todos os serviços
- Horários disponíveis: verifica conflitos
- Barbeiro do rodízio: consulta `v_rodizio_atual`

### 4️⃣ Mostra Preview
```
✅ Barbeiro do Rodízio:
   Hiago (2 atendimentos hoje)
```

### 5️⃣ Clica em "Criar Agendamento"

**Backend executa:**
```
1. Busca barbeiro com menos atendimentos do dia
2. Verifica conflito de horário novamente
3. Cria registro na tabela agendamentos
4. Vincula serviços (agendamento_servicos)
5. Incrementa contador do rodízio
6. Busca configuração de webhook
7. Dispara POST para N8N
8. Salva log (notificacoes_enviadas)
9. Retorna sucesso
```

**Frontend mostra:**
```
Agendamento criado com sucesso!

Barbeiro: Hiago
Atribuído por rodízio (menos atendimentos do dia)
✅ Notificação enviada!
```

### 6️⃣ N8N Recebe Webhook
- Switch identifica `tipo: 'confirmacao'`
- Envia mensagem WhatsApp via Evolution API
- Cliente recebe confirmação instantânea

### 7️⃣ Vercel Cron (a cada hora 8h-20h)
- Busca agendamentos de amanhã → `lembrete_24h`
- Busca agendamentos em 2h → `lembrete_2h`
- Busca atendimentos de 3 dias atrás → `followup_3d`
- Busca atendimentos de 21 dias atrás → `followup_21d`
- Dispara webhooks para N8N

---

## 🧪 COMO TESTAR

### Teste 1: Rodízio Automático

1. Vá em `/dashboard/agendamentos`
2. Clique em "Novo Agendamento"
3. Preencha:
   - Nome: Teste Cliente
   - Telefone: 11999999999
   - Data: Amanhã
   - Serviços: Marque "Corte" e "Barba"
   - **Barbeiro: Deixe "Rodízio Automático"**
4. Selecione um horário do dropdown
5. Observe a caixa verde mostrando qual barbeiro será atribuído
6. Clique em "Criar Agendamento"
7. Deve mostrar qual barbeiro foi escolhido e "✅ Notificação enviada!"

### Teste 2: Verificar Webhook

1. Abra o N8N
2. Veja o histórico de execuções
3. Deve ter recebido:
```json
{
  "tipo": "confirmacao",
  "cliente": { "nome": "Teste Cliente", ... },
  "agendamento": { "barbeiro": "Hiago", ... }
}
```

### Teste 3: Horários Disponíveis

1. Crie um agendamento às 14:00 com duração de 45min
2. Abra "Novo Agendamento" novamente
3. Selecione mesma data
4. Selecione mesmo serviço
5. Horários 14:00, 14:30 **não devem aparecer** no dropdown
6. Sistema detectou conflito automaticamente

### Teste 4: Cancelamento com Prazo

1. Crie agendamento para daqui 1 hora
2. Tente cancelar (clique no ícone de lixeira)
3. Digite motivo: "Teste"
4. Sistema deve avisar: "Mínimo 2h de antecedência"
5. Como admin, pode forçar o cancelamento
6. Cliente recebe notificação de cancelamento

### Teste 5: Comparecimento

1. Marque um cliente como "Compareceu"
2. Verifique no banco:
```sql
SELECT * FROM historico_atendimentos
WHERE agendamento_id = '...';
```
3. Registro foi criado automaticamente
4. Será usado para follow-up em 3 e 21 dias

---

## 📁 ARQUIVOS MODIFICADOS

### `src/app/dashboard/agendamentos/page.tsx`

**Funções Adicionadas:**
- `checkHorariosDisponiveis()` - Busca horários livres
- `checkBarbeiroRodizio()` - Consulta próximo barbeiro do rodízio
- Novos `useEffect` para atualização em tempo real

**Funções Atualizadas:**
- `handleAddAgendamento()` - Usa `/api/agendamentos/criar`
- `marcarComparecimento()` - Usa `/api/agendamentos/confirmar-comparecimento`
- `handleDelete()` - Usa `/api/agendamentos/cancelar` com validação

**Estados Adicionados:**
```typescript
const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
const [barbeiroRodizio, setBarbeiroRodizio] = useState<{ nome, atendimentos }>()
const [checkingAvailability, setCheckingAvailability] = useState(false)
```

**UI Atualizada:**
- Dropdown de horários disponíveis (em vez de input manual)
- Card mostrando barbeiro do rodízio em tempo real
- Label indicando que barbeiro é opcional
- Feedback visual de carregamento

---

## ✅ CHECKLIST DE INTEGRAÇÃO

- [x] ✅ Criar agendamento usa API REST `/api/agendamentos/criar`
- [x] ✅ Rodízio automático funciona quando barbeiro não é selecionado
- [x] ✅ Sistema mostra preview do barbeiro que será atribuído
- [x] ✅ Horários disponíveis são calculados em tempo real
- [x] ✅ Conflitos de horário são detectados antes de criar
- [x] ✅ Múltiplos serviços são vinculados corretamente
- [x] ✅ Comparecimento registra no histórico automaticamente
- [x] ✅ Cancelamento valida prazo de 2 horas
- [x] ✅ Admin pode forçar cancelamento a qualquer momento
- [x] ✅ Webhooks são disparados para todas as ações
- [x] ✅ Cliente recebe notificação de confirmação
- [x] ✅ Cliente recebe notificação de cancelamento
- [x] ✅ Mensagens de sucesso mostram detalhes do rodízio
- [x] ✅ Estado do formulário é resetado após criação

---

## 🎯 PRÓXIMOS PASSOS

O sistema de agendamentos agora está **100% funcional e integrado**. Falta apenas:

1. **Vista de Calendário** (estilo Google Calendar)
2. **Popup de Detalhes** do agendamento (ao clicar)
3. **Integração de Vendas** no dashboard principal

Mas o core do sistema - **rodízio, notificações, validações** - já está totalmente operacional! 🚀

---

## 🆘 TROUBLESHOOTING

### Horários não aparecem no dropdown

**Causa:** Configurações de horário não estão definidas
**Solução:** Vá em Configurações → Horário por Dia e ative os dias

### Barbeiro do rodízio não aparece

**Causa 1:** Serviços não foram selecionados
**Causa 2:** Hora não foi selecionada
**Solução:** Preencha data + hora + serviços para ver o preview

### Webhook não dispara

**Causa:** URL do webhook não está configurada
**Solução:** Vá em Configurações → Webhook de Notificações → Cole URL do N8N

### Erro ao criar agendamento

**Causa:** Tabelas do banco não foram criadas
**Solução:** Execute o SQL em `src/lib/rodizio-notificacoes.sql`

---

**Tudo pronto! O sistema está conectado de ponta a ponta.** 🎉
