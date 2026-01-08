# 🚀 PRÓXIMOS PASSOS - VINCI BARBEARIA

**Data:** 12/12/2025
**Último Commit:** `7fefd5a` - "MEGA UPDATE: Novas APIs + Responsividade 100% + Autenticação"
**Status:** 60% Concluído

---

## ✅ O QUE JÁ ESTÁ PRONTO

### 1. Responsividade 100%
- ✅ Relatórios: Filtros e botões mobile-friendly
- ✅ Agendamentos: **NOVO filtro DIA/MÊS** no calendário
- ✅ Clientes: Cards, busca e formulários responsivos
- ✅ Configurações: Horários adaptados para mobile

### 2. Sistema de Autenticação (Base Criada)
**Arquivo:** `src/lib/auth.ts`
- ✅ Função `gerarTokenAPI()` - Gera token seguro `vinci_XXXXX...` (64 chars)
- ✅ Função `verificarTokenAPI(token)` - Valida token
- ✅ Função `extrairTokenDaRequest(request)` - Extrai token do header

### 3. Novas APIs Implementadas

#### Agendamentos
- ✅ `POST /api/agendamentos/reagendar` - Reagendar com validações
- ✅ `POST /api/agendamentos/checkin` - Check-in rápido
- ✅ `POST /api/agendamentos/finalizar` - Finalizar + tempo de atendimento

#### Clientes
- ✅ `POST /api/clientes/criar` - Criar cliente completo
- ✅ `POST /api/clientes/atualizar` - Atualizar por ID ou telefone
- ✅ `GET /api/clientes/historico?telefone=...` - Estatísticas completas
  - Total gasto, ticket médio, taxa de comparecimento
  - Serviços mais usados, barbeiro favorito
  - Últimos 10 agendamentos

#### Barbeiros (Melhorada)
- ✅ `GET /api/barbeiros/meus-agendamentos`
  - **Períodos flexíveis:** hoje, amanha, semana, semana_que_vem, mes, mes_que_vem, proximos7dias, proximos30dias
  - **Custom:** `?data_inicio=DD-MM-YYYY&data_fim=DD-MM-YYYY`

---

## 🔴 O QUE FALTA FAZER (PRIORIDADE ALTA)

### **PASSO 1: Adicionar coluna api_token no Supabase**

Execute no Supabase SQL Editor:

```sql
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS api_token TEXT;
```

---

### **PASSO 2: Criar Interface de Token em Configurações**

**Arquivo:** `src/app/dashboard/configuracoes/page.tsx`

Adicionar seção antes de "Notificações Automáticas":

```tsx
{/* Segurança da API */}
<Card className="bg-purple-900/20 border-purple-700/50">
  <CardHeader>
    <CardTitle className="text-white flex items-center space-x-2">
      <Key className="w-5 h-5 text-purple-400" />
      <span>Segurança da API</span>
    </CardTitle>
    <p className="text-sm text-purple-300 mt-1">
      Token de autenticação para acesso às APIs externas
    </p>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <label className="block text-sm text-purple-300 mb-1">Token API</label>
      <div className="flex gap-2">
        <input
          type={mostrarToken ? "text" : "password"}
          value={config.api_token || 'Nenhum token gerado'}
          readOnly
          className="flex-1 px-3 py-2 bg-slate-800 border border-purple-600/50 rounded text-white font-mono text-sm"
        />
        <button
          onClick={() => setMostrarToken(!mostrarToken)}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
        >
          {mostrarToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={copiarToken}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>

    <button
      onClick={gerarNovoToken}
      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg"
    >
      <RefreshCw className="w-4 h-4" />
      <span>Gerar Novo Token (Revoga o anterior)</span>
    </button>

    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-200">
          <p className="font-medium mb-1">⚠️ Importante:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Guarde este token em local seguro</li>
            <li>Todas as APIs externas precisam deste token</li>
            <li>Use no header: <code className="bg-slate-800 px-1 rounded">Authorization: Bearer SEU_TOKEN</code></li>
            <li>Gerar novo token revoga o anterior imediatamente</li>
          </ul>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

Adicionar funções no componente:

```tsx
import { gerarTokenAPI } from '@/lib/auth'
import { Key, Eye, EyeOff, Copy, RefreshCw, AlertTriangle } from 'lucide-react'

const [mostrarToken, setMostrarToken] = useState(false)

const gerarNovoToken = async () => {
  if (!confirm('⚠️ Isso vai revogar o token anterior. Todas as integrações precisarão ser atualizadas. Confirma?')) {
    return
  }

  const novoToken = gerarTokenAPI()
  setConfig({ ...config, api_token: novoToken })
  alert('✅ Novo token gerado! Clique em Salvar Alterações para ativar.')
}

const copiarToken = () => {
  if (config.api_token) {
    navigator.clipboard.writeText(config.api_token)
    alert('✅ Token copiado!')
  }
}
```

---

### **PASSO 3: Aplicar Autenticação em TODAS as APIs**

Adicionar no **início** de cada arquivo de rota API:

```typescript
import { extrairTokenDaRequest, verificarTokenAPI } from '@/lib/auth'

export async function POST/GET(request: NextRequest) {
  try {
    // 🔐 AUTENTICAÇÃO
    const token = extrairTokenDaRequest(request)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização não fornecido. Use: Authorization: Bearer SEU_TOKEN' },
        { status: 401 }
      )
    }

    const { valido, erro } = await verificarTokenAPI(token)
    if (!valido) {
      return NextResponse.json(
        { success: false, error: erro },
        { status: 403 }
      )
    }

    // ... resto do código
```

**APIs que precisam de autenticação:**
- `/api/agendamentos/criar`
- `/api/agendamentos/cancelar`
- `/api/agendamentos/confirmar`
- `/api/agendamentos/reagendar` ✅ (aplicar)
- `/api/agendamentos/checkin` ✅ (aplicar)
- `/api/agendamentos/finalizar` ✅ (aplicar)
- `/api/clientes/criar` ✅ (aplicar)
- `/api/clientes/atualizar` ✅ (aplicar)
- `/api/clientes/historico` ✅ (aplicar)
- `/api/barbeiros/meus-agendamentos`
- `/api/barbeiros/faturamento`

---

### **PASSO 4: Criar APIs de Produtos**

**Pasta:** `src/app/api/produtos/`

#### `listar/route.ts`
```typescript
GET /api/produtos/listar
// Retorna todos os produtos ativos
```

#### `criar/route.ts`
```typescript
POST /api/produtos/criar
Body: {
  nome: string,
  descricao: string,
  preco: number,
  categoria: string,
  estoque?: number
}
```

#### `atualizar/route.ts`
```typescript
POST /api/produtos/atualizar
Body: {
  produto_id: string,
  ...campos_para_atualizar
}
```

---

### **PASSO 5: Criar APIs de Planos**

**Pasta:** `src/app/api/planos/`

#### `listar/route.ts`
```typescript
GET /api/planos/listar
// Retorna planos ativos
```

#### `criar/route.ts`
```typescript
POST /api/planos/criar
Body: {
  nome: string,
  descricao: string,
  valor_original: number,
  valor_total: number,
  quantidade_servicos: number,
  validade_dias: number
}
```

#### `atualizar/route.ts`
```typescript
POST /api/planos/atualizar
Body: {
  plano_id: string,
  ...campos_para_atualizar
}
```

---

### **PASSO 6: API de Bloquear Horários**

**Arquivo:** `src/app/api/barbeiros/bloquear-horario/route.ts`

```typescript
POST /api/barbeiros/bloquear-horario
Body: {
  barbeiro_id: string,
  data: "DD-MM-YYYY",
  hora_inicio: "HH:MM",
  hora_fim: "HH:MM",
  motivo: string (ex: "Almoço", "Folga", "Compromisso")
}

// Criar agendamento com status "bloqueado"
// Não permitir novos agendamentos neste horário
```

---

### **PASSO 7: Sistema de Webhooks por Barbeiro**

#### Criar tabela no Supabase:
```sql
CREATE TABLE webhooks_barbeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profissional_id UUID REFERENCES profissionais(id),
  webhook_url TEXT NOT NULL,
  eventos TEXT[] DEFAULT ARRAY['novo_agendamento', 'cancelamento', 'confirmacao'],
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### API: `src/app/api/barbeiros/configurar-webhook/route.ts`

```typescript
POST /api/barbeiros/configurar-webhook
Body: {
  barbeiro_id: string,
  webhook_url: string,
  eventos: ['novo_agendamento', 'cancelamento', 'confirmacao']
}

GET /api/barbeiros/webhooks?barbeiro_id=xxx
// Listar webhooks do barbeiro
```

#### Modificar APIs de agendamento para disparar webhooks:
Quando criar/cancelar/confirmar agendamento:
1. Buscar webhook do barbeiro
2. Disparar POST para webhook_url com dados do agendamento
3. Incluir nome do cliente, serviço, data, horário

---

### **PASSO 8: API de Estatísticas Admin**

**Arquivo:** `src/app/api/admin/estatisticas/route.ts`

```typescript
GET /api/admin/estatisticas?periodo=mes
Query params: hoje | semana | mes | ano

Response: {
  faturamento_total: number,
  total_agendamentos: number,
  taxa_comparecimento: number,
  taxa_cancelamentos: number,
  barbeiro_mais_ativo: { nome, agendamentos },
  servico_mais_vendido: { nome, quantidade },
  horario_pico: string,
  dia_semana_mais_movimentado: string
}
```

---

### **PASSO 9: Documentação Swagger**

**Opção 1 - Criar página manual:**
`src/app/doc/page.tsx` - HTML estático com todas as APIs

**Opção 2 - Usar swagger-ui-react:**
```bash
npm install swagger-ui-react
```

Criar arquivo `public/swagger.json` com spec OpenAPI 3.0

---

## 📁 ARQUIVOS IMPORTANTES

### Já modificados (commit 7fefd5a):
- `src/lib/auth.ts` - Funções de autenticação
- `src/app/api/agendamentos/reagendar/route.ts` ✅ NOVO
- `src/app/api/agendamentos/checkin/route.ts` ✅ NOVO
- `src/app/api/agendamentos/finalizar/route.ts` ✅ NOVO
- `src/app/api/clientes/criar/route.ts` ✅ NOVO
- `src/app/api/clientes/atualizar/route.ts` ✅ NOVO
- `src/app/api/clientes/historico/route.ts` ✅ NOVO
- `src/app/api/barbeiros/meus-agendamentos/route.ts` - Melhorado
- `src/app/dashboard/configuracoes/page.tsx` - Responsivo
- `src/app/dashboard/clientes/page.tsx` - Responsivo
- `src/app/dashboard/agendamentos/page.tsx` - Filtro DIA/MÊS
- `src/app/dashboard/relatorios/page.tsx` - Responsivo

### Próximos a criar:
- `src/app/api/produtos/*`
- `src/app/api/planos/*`
- `src/app/api/barbeiros/bloquear-horario/route.ts`
- `src/app/api/barbeiros/configurar-webhook/route.ts`
- `src/app/api/admin/estatisticas/route.ts`
- `src/app/doc/page.tsx` (Swagger)

---

## 🎯 ORDEM RECOMENDADA DE EXECUÇÃO

1. ✅ Adicionar coluna `api_token` no Supabase
2. ✅ Criar interface de Token em Configurações
3. ✅ Aplicar autenticação em APIs existentes (10 rotas)
4. ✅ Criar APIs de Produtos (3 rotas)
5. ✅ Criar APIs de Planos (3 rotas)
6. ✅ Criar API de Bloquear Horários
7. ✅ Implementar Sistema de Webhooks por Barbeiro
8. ✅ Criar API de Estatísticas Admin
9. ✅ Documentação Swagger
10. ✅ Testar tudo e commit final

---

## 🚀 COMANDOS GIT ÚTEIS

```bash
# Ver status
git status

# Ver último commit
git log --oneline -1

# Adicionar tudo
git add .

# Commit
git commit -m "feat: Sistema completo de APIs + Webhooks + Docs"

# Push
git push origin main
```

---

## 📞 CONTATO/NOTAS

- Todas as APIs devem retornar JSON
- Sempre incluir `success: boolean` na resposta
- Status HTTP corretos: 200, 400, 401, 403, 404, 500
- Token formato: `vinci_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Todas as datas em DD/MM/YYYY ou aceitar YYYY-MM-DD

---

**BOA SORTE! 🚀**

**Tempo estimado:** 3-4 horas para completar tudo
