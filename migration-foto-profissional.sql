-- Migração: Adicionar campo foto_url na tabela profissionais
-- Data: 2026-01-04
-- Descrição: Permite armazenar a URL da foto do profissional

-- Adicionar coluna foto_url à tabela profissionais
ALTER TABLE public.profissionais
ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.profissionais.foto_url IS 'URL pública da foto do profissional armazenada no Supabase Storage';

-- Verificar se a coluna foi criada com sucesso
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profissionais' AND column_name = 'foto_url';
