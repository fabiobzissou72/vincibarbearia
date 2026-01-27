-- Migration: Adicionar coluna plano_id na tabela clientes
-- Descrição: Permite associar um plano de pacote a cada cliente

-- Adicionar coluna plano_id com referência à tabela planos
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS plano_id uuid NULL;

-- Adicionar foreign key para a tabela planos
ALTER TABLE public.clientes
ADD CONSTRAINT fk_clientes_planos
FOREIGN KEY (plano_id)
REFERENCES public.planos(id)
ON DELETE SET NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.clientes.plano_id IS 'ID do plano de pacote associado ao cliente';

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_clientes_plano_id ON public.clientes(plano_id);
