-- ===================================
-- SISTEMA DE RODÍZIO E NOTIFICAÇÕES
-- ===================================

-- 1. TABELA DE CONTROLE DE RODÍZIO
-- Controla a ordem e distribuição de atendimentos entre barbeiros
CREATE TABLE IF NOT EXISTS public.rodizio_barbeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  ultima_vez TIMESTAMP WITHOUT TIME ZONE NULL,
  total_atendimentos_hoje INTEGER DEFAULT 0,
  data_referencia DATE DEFAULT CURRENT_DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

  UNIQUE(profissional_id, data_referencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rodizio_data ON public.rodizio_barbeiros(data_referencia);
CREATE INDEX IF NOT EXISTS idx_rodizio_profissional ON public.rodizio_barbeiros(profissional_id);
CREATE INDEX IF NOT EXISTS idx_rodizio_ativo ON public.rodizio_barbeiros(ativo);

COMMENT ON TABLE public.rodizio_barbeiros IS 'Controle de rodízio de barbeiros por dia';
COMMENT ON COLUMN public.rodizio_barbeiros.total_atendimentos_hoje IS 'Contador de atendimentos do dia para balanceamento';
COMMENT ON COLUMN public.rodizio_barbeiros.ultima_vez IS 'Última vez que o barbeiro atendeu (para critério de desempate)';


-- 2. TABELA DE NOTIFICAÇÕES ENVIADAS
-- Registra todas as notificações enviadas para evitar duplicatas
CREATE TABLE IF NOT EXISTS public.notificacoes_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- confirmacao, lembrete_24h, lembrete_2h, followup_3d, followup_21d, cancelado
  enviado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'enviado', -- enviado, falhou, pendente
  tentativas INTEGER DEFAULT 1,
  payload JSONB NULL, -- Dados enviados ao webhook
  resposta JSONB NULL, -- Resposta do webhook
  erro TEXT NULL,
  webhook_url TEXT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

  UNIQUE(agendamento_id, tipo)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_notif_agendamento ON public.notificacoes_enviadas(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON public.notificacoes_enviadas(tipo);
CREATE INDEX IF NOT EXISTS idx_notif_status ON public.notificacoes_enviadas(status);
CREATE INDEX IF NOT EXISTS idx_notif_enviado_em ON public.notificacoes_enviadas(enviado_em);

COMMENT ON TABLE public.notificacoes_enviadas IS 'Registro de todas as notificações enviadas via webhook N8N';
COMMENT ON COLUMN public.notificacoes_enviadas.tipo IS 'Tipo: confirmacao, lembrete_24h, lembrete_2h, followup_3d, followup_21d, cancelado';


-- 3. TABELA DE CANCELAMENTOS
-- Registra histórico de cancelamentos com motivos
CREATE TABLE IF NOT EXISTS public.agendamentos_cancelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  cancelado_por VARCHAR(100) NOT NULL, -- cliente, barbeiro, sistema, admin
  motivo TEXT NULL,
  cancelado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  horas_antecedencia NUMERIC(10,2) NULL, -- Quantas horas antes foi cancelado
  permitido BOOLEAN DEFAULT true, -- Se estava dentro do prazo (2h)
  cliente_nome TEXT NULL,
  cliente_telefone TEXT NULL,
  barbeiro_nome TEXT NULL,
  data_agendamento DATE NULL,
  hora_inicio TIME NULL,
  valor NUMERIC(10,2) NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cancel_agendamento ON public.agendamentos_cancelamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_cancel_data ON public.agendamentos_cancelamentos(cancelado_em);
CREATE INDEX IF NOT EXISTS idx_cancel_permitido ON public.agendamentos_cancelamentos(permitido);

COMMENT ON TABLE public.agendamentos_cancelamentos IS 'Histórico de cancelamentos de agendamentos';
COMMENT ON COLUMN public.agendamentos_cancelamentos.horas_antecedencia IS 'Quantas horas antes do agendamento foi cancelado';
COMMENT ON COLUMN public.agendamentos_cancelamentos.permitido IS 'Se estava dentro do prazo de 2h para cancelamento';


-- 4. TABELA DE HISTÓRICO DE ATENDIMENTOS
-- Registra todos os atendimentos concluídos para análise de rodízio
CREATE TABLE IF NOT EXISTS public.historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_atendimento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NULL,
  servicos_realizados JSONB NULL,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  duracao_minutos INTEGER NULL,
  compareceu BOOLEAN DEFAULT true,
  observacoes TEXT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

  UNIQUE(agendamento_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hist_profissional ON public.historico_atendimentos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_hist_cliente ON public.historico_atendimentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_hist_data ON public.historico_atendimentos(data_atendimento);
CREATE INDEX IF NOT EXISTS idx_hist_compareceu ON public.historico_atendimentos(compareceu);

COMMENT ON TABLE public.historico_atendimentos IS 'Histórico completo de atendimentos realizados';
COMMENT ON COLUMN public.historico_atendimentos.servicos_realizados IS 'Array JSON com os serviços realizados';


-- 5. FUNÇÃO PARA ATUALIZAR CONTADOR DE RODÍZIO
-- Atualiza automaticamente o contador quando um agendamento é criado
CREATE OR REPLACE FUNCTION atualizar_rodizio_barbeiro()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de atendimentos do dia
  INSERT INTO public.rodizio_barbeiros (profissional_id, data_referencia, total_atendimentos_hoje, ultima_vez)
  VALUES (NEW.profissional_id, NEW.data_agendamento::DATE, 1, NOW())
  ON CONFLICT (profissional_id, data_referencia)
  DO UPDATE SET
    total_atendimentos_hoje = public.rodizio_barbeiros.total_atendimentos_hoje + 1,
    ultima_vez = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar rodízio automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_rodizio ON public.agendamentos;
CREATE TRIGGER trigger_atualizar_rodizio
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  WHEN (NEW.status = 'agendado' OR NEW.status = 'confirmado')
  EXECUTE FUNCTION atualizar_rodizio_barbeiro();


-- 6. FUNÇÃO PARA REGISTRAR HISTÓRICO QUANDO CONCLUÍDO
CREATE OR REPLACE FUNCTION registrar_historico_atendimento()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se mudou para "concluido" e ainda não está no histórico
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    INSERT INTO public.historico_atendimentos (
      agendamento_id,
      profissional_id,
      cliente_id,
      data_atendimento,
      hora_inicio,
      valor_total,
      compareceu,
      observacoes
    ) VALUES (
      NEW.id,
      NEW.profissional_id,
      NEW.cliente_id,
      NEW.data_agendamento::DATE,
      NEW.hora_inicio::TIME,
      NEW.valor,
      COALESCE(NEW.compareceu, true),
      NEW.observacoes
    )
    ON CONFLICT (agendamento_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar histórico
DROP TRIGGER IF EXISTS trigger_registrar_historico ON public.agendamentos;
CREATE TRIGGER trigger_registrar_historico
  AFTER UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_historico_atendimento();


-- 7. FUNÇÃO PARA LIMPAR CONTADORES DE RODÍZIO DO DIA ANTERIOR
-- Executa diariamente para resetar contadores
CREATE OR REPLACE FUNCTION limpar_rodizio_dia_anterior()
RETURNS void AS $$
BEGIN
  -- Marca como inativo os registros de dias anteriores
  UPDATE public.rodizio_barbeiros
  SET ativo = false
  WHERE data_referencia < CURRENT_DATE;

  -- Cria registros para hoje para todos os barbeiros ativos
  INSERT INTO public.rodizio_barbeiros (profissional_id, data_referencia, total_atendimentos_hoje, ordem)
  SELECT
    p.id,
    CURRENT_DATE,
    0,
    ROW_NUMBER() OVER (ORDER BY p.nome)
  FROM public.profissionais p
  WHERE p.ativo = true
  ON CONFLICT (profissional_id, data_referencia) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpar_rodizio_dia_anterior IS 'Limpa contadores de rodízio de dias anteriores e inicializa o dia atual';


-- 8. ADICIONAR COLUNAS NA TABELA CONFIGURACOES (se não existirem)
ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS prazo_cancelamento_horas INTEGER DEFAULT 2;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_confirmacao BOOLEAN DEFAULT true;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_lembrete_24h BOOLEAN DEFAULT true;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_lembrete_2h BOOLEAN DEFAULT true;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_followup_3d BOOLEAN DEFAULT false;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_followup_21d BOOLEAN DEFAULT false;

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notif_cancelamento BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.configuracoes.prazo_cancelamento_horas IS 'Prazo mínimo em horas para cancelamento (padrão: 2h)';
COMMENT ON COLUMN public.configuracoes.notif_confirmacao IS 'Enviar notificação de confirmação imediata';
COMMENT ON COLUMN public.configuracoes.notif_lembrete_24h IS 'Enviar lembrete 24h antes';
COMMENT ON COLUMN public.configuracoes.notif_lembrete_2h IS 'Enviar lembrete 2h antes';
COMMENT ON COLUMN public.configuracoes.notif_followup_3d IS 'Enviar follow-up 3 dias após';
COMMENT ON COLUMN public.configuracoes.notif_followup_21d IS 'Enviar follow-up 21 dias após (reagendar)';
COMMENT ON COLUMN public.configuracoes.notif_cancelamento IS 'Notificar cancelamentos';


-- 9. VIEW PARA CONSULTAR RODÍZIO ATUAL
CREATE OR REPLACE VIEW v_rodizio_atual AS
SELECT
  r.id,
  r.profissional_id,
  p.nome AS profissional_nome,
  p.telefone AS profissional_telefone,
  r.total_atendimentos_hoje,
  r.ultima_vez,
  r.ordem,
  r.data_referencia,
  p.ativo AS profissional_ativo
FROM public.rodizio_barbeiros r
JOIN public.profissionais p ON r.profissional_id = p.id
WHERE r.data_referencia = CURRENT_DATE
  AND r.ativo = true
  AND p.ativo = true
ORDER BY r.total_atendimentos_hoje ASC, r.ultima_vez ASC NULLS FIRST, r.ordem ASC;

COMMENT ON VIEW v_rodizio_atual IS 'View do rodízio atual ordenado por menos atendimentos do dia';


-- 10. INICIALIZAR RODÍZIO PARA HOJE
SELECT limpar_rodizio_dia_anterior();

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas de rodízio e notificações criadas com sucesso!';
  RAISE NOTICE '✅ Triggers configurados!';
  RAISE NOTICE '✅ Funções auxiliares criadas!';
  RAISE NOTICE '✅ View de rodízio atual disponível: v_rodizio_atual';
END $$;
