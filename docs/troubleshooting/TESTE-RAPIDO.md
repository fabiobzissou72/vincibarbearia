# 🚀 TESTE RÁPIDO - AGENDAMENTO FUNCIONANDO

Execute estes comandos na ordem para testar tudo:

---

## PASSO 1: Executar Script SQL no Supabase

1. Acesse: https://supabase.com/dashboard
2. SQL Editor → New Query
3. Cole o conteúdo de: `CORRIGIR-RLS-SUPABASE.sql`
4. Execute (Run)

---

## PASSO 2: Iniciar o Servidor

```bash
npm run dev
```

Aguarde abrir em: http://localhost:3000

---

## PASSO 3: Testar via Dashboard

1. Acesse: http://localhost:3000/dashboard/agendamentos
2. Clique: "Novo Agendamento"
3. Preencha:
   - Nome: Teste Final
   - Telefone: 11999999999
   - Data: Amanhã
   - Hora: 10:00
   - Serviço: Qualquer um
4. Clique: "Criar Agendamento"

✅ **Deve criar sem erro!**

---

## PASSO 4: Testar via cURL

Primeiro, pegue um UUID de serviço:

```bash
curl -X GET "http://localhost:3000/api/agendamentos/horarios-disponiveis?data=2025-12-25"
```

Depois, crie o agendamento (substitua o UUID):

```bash
curl -X POST http://localhost:3000/api/agendamentos/criar \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_nome": "Teste cURL",
    "telefone": "11888888888",
    "data": "2025-12-25",
    "hora": "14:00",
    "servico_ids": ["COLE-UUID-AQUI"],
    "observacoes": "Teste rápido"
  }'
```

---

## ✅ RESULTADO ESPERADO

### Sucesso (201):
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso!",
  "data": {
    "agendamento_id": "...",
    "barbeiro_atribuido": "Nome do Barbeiro",
    "valor_total": 60.00
  }
}
```

### Se der erro:
- Verifique se executou o SQL no Supabase
- Verifique se o serviço existe
- Veja os logs: `npm run dev` (console)

---

## 🎯 COMANDOS ÚTEIS

### Listar todos os serviços:
```bash
# No Supabase SQL Editor:
SELECT id, nome, preco, duracao_minutos FROM servicos WHERE ativo = true;
```

### Listar todos os barbeiros:
```bash
curl -X GET "http://localhost:3000/api/barbeiros/listar"
```

### Ver agendamentos de hoje:
```bash
curl -X GET "http://localhost:3000/api/agendamentos"
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Column Barbeiro does not exist"
❌ Você não aplicou as correções! Execute:
```bash
git pull
```

### Erro: "RLS policy error"
❌ Você não executou o SQL! Vá no Supabase e execute `CORRIGIR-RLS-SUPABASE.sql`

### Erro: "Serviço não encontrado"
❌ UUID inválido! Copie um UUID real da tabela `servicos`

---

**Qualquer dúvida, veja:** `GUIA-APIS-CURL.md` (documentação completa)
