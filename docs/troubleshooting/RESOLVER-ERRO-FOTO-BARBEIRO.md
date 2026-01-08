# 🔧 RESOLVER: Erro ao salvar foto do barbeiro

## ❌ Erro Reportado
```
Erro ao salvar foto: new row violates row-level security policy
```

## 🎯 Causa do Problema
As políticas de segurança (RLS) do Supabase Storage não estão configuradas para o bucket 'fotos', ou o bucket não existe.

---

## ✅ SOLUÇÃO RÁPIDA (3 passos)

### PASSO 1: Criar o bucket 'fotos' no Supabase

1. Acesse https://supabase.com e entre no seu projeto
2. No menu lateral, clique em **Storage**
3. Clique em **Create a new bucket**
4. Configure:
   - **Name:** `fotos`
   - **Public bucket:** ✅ **MARCAR COMO PÚBLICO** (importante!)
   - **File size limit:** 5MB
   - **Allowed MIME types:** `image/*`
5. Clique em **Create bucket**

### PASSO 2: Executar o script SQL

1. No Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Abra o arquivo `CORRIGIR-UPLOAD-FOTOS-STORAGE.sql` deste projeto
4. Copie TODO o conteúdo e cole no SQL Editor
5. Clique em **RUN** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem de sucesso

### PASSO 3: Testar o upload

1. Abra o Dashboard da barbearia
2. Vá em **Profissionais**
3. Clique em **Editar** em algum profissional
4. Selecione uma foto (máximo 5MB, formatos: JPG, PNG, WEBP)
5. Clique em **Salvar Alterações**
6. A foto deve aparecer no card do profissional

---

## 🐛 Se ainda não funcionar

### Verificação 1: O bucket existe e está público?

1. Vá em **Storage** no Supabase
2. Você deve ver o bucket **fotos** na lista
3. Clique nele e veja se está marcado como **Public**
4. Se não estiver público, clique em **Settings** > **Make public**

### Verificação 2: As políticas foram criadas?

Execute este SQL no SQL Editor:

```sql
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

Você deve ver 4 políticas:
- `Permitir upload de fotos` (INSERT)
- `Permitir leitura pública` (SELECT)
- `Permitir atualização de fotos` (UPDATE)
- `Permitir deleção de fotos` (DELETE)

### Verificação 3: A coluna foto_url existe?

Execute este SQL no SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profissionais' AND column_name = 'foto_url';
```

Deve retornar:
```
column_name | data_type
foto_url    | character varying
```

### Verificação 4: Ver logs detalhados

1. Abra o Dashboard
2. Pressione **F12** para abrir o Console do navegador
3. Vá na aba **Console**
4. Tente fazer upload da foto novamente
5. Veja os logs que começam com emojis:
   - 🔄 = Processo iniciado
   - ✅ = Sucesso
   - ❌ = Erro
   - ⚠️ = Aviso

---

## 📸 Como funciona o upload

1. Você seleciona uma foto no formulário
2. O sistema valida:
   - Tipo de arquivo (deve ser imagem)
   - Tamanho (máximo 5MB)
3. Faz upload para `storage.from('fotos').upload('profissionais/ID_DO_PROFISSIONAL.jpg')`
4. Pega a URL pública da foto
5. Salva a URL no campo `foto_url` da tabela `profissionais`
6. A foto aparece no card do profissional

---

## 🎨 Onde a foto aparece

### Dashboard (Admin)
- No card de cada profissional na lista
- Na tela de edição (preview)

### App Cliente
- Na seleção de profissional ao agendar
- (Futuramente: perfil do profissional)

---

## 📋 Checklist Final

Antes de reportar que não funcionou, verifique:

- [ ] Bucket 'fotos' existe no Supabase Storage
- [ ] Bucket 'fotos' está marcado como PÚBLICO
- [ ] Script SQL foi executado sem erros
- [ ] 4 políticas de storage foram criadas
- [ ] Coluna foto_url existe na tabela profissionais
- [ ] Políticas RLS da tabela profissionais permitem UPDATE
- [ ] Imagem tem menos de 5MB
- [ ] Imagem é JPG, PNG ou WEBP

---

## 🆘 Precisa de mais ajuda?

Se seguiu todos os passos e ainda não funciona:

1. Abra o Console do navegador (F12)
2. Vá na aba **Console**
3. Tente fazer upload da foto
4. Copie TODOS os logs que aparecerem (principalmente os com ❌)
5. Copie o resultado das verificações SQL acima
6. Me envie tudo para análise

---

## 📚 Arquivos Relacionados

- `CORRIGIR-UPLOAD-FOTOS-STORAGE.sql` - Script de correção completo
- `INSTRUCOES-CONFIGURACAO-FOTO-BARBEIRO.md` - Instruções detalhadas
- `migration-foto-profissional.sql` - Migração da coluna foto_url
- `src/app/dashboard/profissionais/page.tsx` - Código do upload (linha 182-231)

---

## ✅ Depois de corrigir

Teste também:
1. Upload de foto ao criar novo profissional
2. Substituir foto de profissional existente
3. Ver foto no app cliente ao agendar
4. Ver se a foto carrega rápido (está otimizada?)

---

**Última atualização:** 08/01/2026
