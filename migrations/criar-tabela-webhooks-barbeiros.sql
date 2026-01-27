-- =====================================================
-- MIGRATION: Criar tabela webhooks_barbeiros
-- Data: 2026-01-06
-- Descrição: Tabela para configurar webhooks personalizados por profissional
-- =====================================================

-- Criar tabela webhooks_barbeiros
CREATE TABLE IF NOT EXISTS public.webhooks_barbeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL,
  webhook_url TEXT NOT NULL,
  eventos TEXT[] DEFAULT ARRAY['novo_agendamento', 'cancelamento', 'confirmacao']::TEXT[],
  ativo BOOLEAN DEFAULT TRUE,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT webhooks_barbeiros_pkey PRIMARY KEY (id),
  CONSTRAINT webhooks_barbeiros_profissional_fkey FOREIGN KEY (profissional_id)
    REFERENCES public.profissionais(id) ON DELETE CASCADE
);

-- Criar índice para consultas rápidas por profissional
CREATE INDEX IF NOT EXISTS idx_webhooks_barbeiros_profissional
ON public.webhooks_barbeiros(profissional_id);

-- Criar índice para consultas de webhooks ativos
CREATE INDEX IF NOT EXISTS idx_webhooks_barbeiros_ativo
ON public.webhooks_barbeiros(ativo);

-- Comentários da tabela
COMMENT ON TABLE public.webhooks_barbeiros IS 'Configurações de webhooks personalizados por profissional';
COMMENT ON COLUMN public.webhooks_barbeiros.profissional_id IS 'ID do profissional (barbeiro)';
COMMENT ON COLUMN public.webhooks_barbeiros.webhook_url IS 'URL do webhook para receber notificações';
COMMENT ON COLUMN public.webhooks_barbeiros.eventos IS 'Array de eventos que disparam o webhook: novo_agendamento, cancelamento, confirmacao';
COMMENT ON COLUMN public.webhooks_barbeiros.ativo IS 'Se true, o webhook está ativo e será chamado';

-- Inserir webhook padrão para profissionais existentes (OPCIONAL)
-- Descomente as linhas abaixo e ajuste a URL se quiser configurar automaticamente

/*
INSERT INTO public.webhooks_barbeiros (profissional_id, webhook_url, eventos, ativo)
SELECT
  id as profissional_id,
  'https://webhook.fbzia.com.br/webhook/dashvince' as webhook_url,
  ARRAY['novo_agendamento', 'cancelamento', 'confirmacao']::TEXT[] as eventos,
  true as ativo
FROM public.profissionais
WHERE ativo = true
ON CONFLICT DO NOTHING;
*/

-- Verificação
SELECT
  p.nome as barbeiro,
  wb.webhook_url,
  wb.eventos,
  wb.ativo
FROM public.webhooks_barbeiros wb
INNER JOIN public.profissionais p ON p.id = wb.profissional_id
ORDER BY p.nome;
