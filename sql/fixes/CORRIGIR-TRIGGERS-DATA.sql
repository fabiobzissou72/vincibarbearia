-- ============================================
-- CORRIGIR TRIGGERS QUE FAZEM CAST DE DATA
-- ============================================
-- Problema: Triggers tentam converter data_agendamento::DATE
-- Mas agora a coluna é TEXT com formato DD/MM/YYYY
-- Solução: Remover o cast ::DATE e salvar como TEXT
-- ============================================

-- 1. CORRIGIR FUNÇÃO atualizar_rodizio_barbeiro
CREATE OR REPLACE FUNCTION atualizar_rodizio_barbeiro()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de atendimentos do dia
  -- REMOVIDO: ::DATE (agora data_agendamento é TEXT)
  INSERT INTO public.rodizio_barbeiros (profissional_id, data_referencia, total_atendimentos_hoje, ultima_vez)
  VALUES (
    NEW.profissional_id,
    CURRENT_DATE,  -- Usar CURRENT_DATE ao invés de NEW.data_agendamento
    1,
    NOW()
  )
  ON CONFLICT (profissional_id, data_referencia)
  DO UPDATE SET
    total_atendimentos_hoje = public.rodizio_barbeiros.total_atendimentos_hoje + 1,
    ultima_vez = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CORRIGIR FUNÇÃO registrar_historico_atendimento
CREATE OR REPLACE FUNCTION registrar_historico_atendimento()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se mudou para "concluido" e ainda não está no histórico
  IF NEW.status = 'concluido' AND (OLD IS NULL OR OLD.status != 'concluido') THEN
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
      -- Converter DD/MM/YYYY para DATE corretamente
      TO_DATE(NEW.data_agendamento, 'DD/MM/YYYY'),
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

-- 3. Verificar se os triggers existem (devem existir)
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_atualizar_rodizio', 'trigger_registrar_historico');

-- ============================================
-- TESTE: Inserir agendamento manualmente
-- ============================================
-- Após executar as funções acima, tente:
/*
INSERT INTO agendamentos (
  profissional_id,
  data_agendamento,
  hora_inicio,
  nome_cliente,
  telefone,
  valor,
  status
) VALUES (
  (SELECT id FROM profissionais WHERE ativo = true LIMIT 1),
  '15/12/2025',  -- Formato brasileiro
  '14:00',
  'Teste Trigger Corrigido',
  '11999999999',
  70.00,
  'agendado'
);
*/

-- Se funcionar, verá o registro em:
-- SELECT * FROM agendamentos ORDER BY created_at DESC LIMIT 1;
-- SELECT * FROM rodizio_barbeiros WHERE data_referencia = CURRENT_DATE;
