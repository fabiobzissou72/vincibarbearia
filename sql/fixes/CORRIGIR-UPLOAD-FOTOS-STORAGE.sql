-- =====================================================
-- CORREÇÃO: Upload de Fotos dos Barbeiros
-- VINCI BARBEARIA
-- =====================================================
--
-- Este script corrige o erro:
-- "new row violates row-level security policy"
--
-- Execute este script no SQL Editor do Supabase
-- para permitir upload de fotos no Storage
--
-- Data: 08/01/2026
-- =====================================================

-- =====================================================
-- 1️⃣ CRIAR BUCKET DE FOTOS (se não existir)
-- =====================================================

-- ATENÇÃO: Esta parte precisa ser feita manualmente na interface do Supabase
-- porque a criação de buckets via SQL requer extensões específicas.
--
-- Vá em Storage > Create bucket e configure:
--   - Name: fotos
--   - Public bucket: ✅ MARCAR COMO PÚBLICO
--   - File size limit: 5 MB
--   - Allowed MIME types: image/*

-- =====================================================
-- 2️⃣ VERIFICAR SE O BUCKET EXISTE
-- =====================================================

SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'fotos';

-- Se retornar vazio, crie o bucket manualmente conforme instruções acima

-- =====================================================
-- 3️⃣ REMOVER POLÍTICAS ANTIGAS DO STORAGE (se existirem)
-- =====================================================

DROP POLICY IF EXISTS "Permitir upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção de fotos" ON storage.objects;

-- =====================================================
-- 4️⃣ CRIAR POLÍTICAS RLS PARA O STORAGE
-- =====================================================

-- Política para INSERT (Upload de fotos)
CREATE POLICY "Permitir upload de fotos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'fotos');

-- Política para SELECT (Leitura pública das fotos)
CREATE POLICY "Permitir leitura pública"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'fotos');

-- Política para UPDATE (Atualizar/substituir fotos)
CREATE POLICY "Permitir atualização de fotos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'fotos')
WITH CHECK (bucket_id = 'fotos');

-- Política para DELETE (Deletar fotos)
CREATE POLICY "Permitir deleção de fotos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'fotos');

-- =====================================================
-- 5️⃣ VERIFICAR POLÍTICAS CRIADAS NO STORAGE
-- =====================================================

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- =====================================================
-- 6️⃣ ADICIONAR COLUNA foto_url NA TABELA PROFISSIONAIS
-- =====================================================

-- Adicionar coluna se não existir
ALTER TABLE public.profissionais
ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);

-- Adicionar comentário
COMMENT ON COLUMN public.profissionais.foto_url IS 'URL pública da foto do profissional armazenada no Supabase Storage';

-- Verificar se a coluna foi criada
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profissionais' AND column_name = 'foto_url';

-- =====================================================
-- 7️⃣ GARANTIR POLÍTICAS RLS NA TABELA PROFISSIONAIS
-- =====================================================

-- Ativar RLS se não estiver ativo
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "profissionais_select_all" ON profissionais;
DROP POLICY IF EXISTS "profissionais_insert_anon" ON profissionais;
DROP POLICY IF EXISTS "profissionais_update_anon" ON profissionais;
DROP POLICY IF EXISTS "profissionais_delete_anon" ON profissionais;

-- Política para SELECT (leitura)
CREATE POLICY "profissionais_select_all" ON profissionais
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para INSERT (criar profissional)
CREATE POLICY "profissionais_insert_anon" ON profissionais
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para UPDATE (atualizar profissional)
CREATE POLICY "profissionais_update_anon" ON profissionais
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE (deletar profissional)
CREATE POLICY "profissionais_delete_anon" ON profissionais
FOR DELETE
TO anon, authenticated
USING (true);

-- =====================================================
-- 8️⃣ TESTE FINAL - VERIFICAR CONFIGURAÇÃO
-- =====================================================

-- Verificar bucket
SELECT
  '✅ Bucket "fotos" configurado' as status,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'fotos';

-- Verificar políticas do storage
SELECT
  '✅ Políticas do Storage configuradas' as status,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%fotos%';

-- Verificar coluna foto_url
SELECT
  '✅ Coluna foto_url existe' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profissionais' AND column_name = 'foto_url';

-- Verificar políticas da tabela profissionais
SELECT
  '✅ Políticas da tabela profissionais' as status,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profissionais';

-- =====================================================
-- ✅ PRONTO!
-- =====================================================
--
-- IMPORTANTE: Para fazer upload de fotos funcionar:
--
-- 1. ✅ Execute este script no SQL Editor do Supabase
-- 2. ✅ Vá em Storage e crie o bucket 'fotos' (se não existir)
-- 3. ✅ Marque o bucket como PÚBLICO
-- 4. ✅ Teste o upload no Dashboard de Profissionais
-- 5. ✅ Abra o Console (F12) para ver logs detalhados
--
-- Se ainda tiver erro:
-- - Verifique se o bucket 'fotos' existe e está público
-- - Verifique se todas as 4 políticas foram criadas no storage
-- - Verifique se a coluna foto_url existe na tabela profissionais
-- - Veja os logs no console do navegador (F12)
--
-- =====================================================
