-- =====================================================
-- CORRIGIR TRIGGER FINAL - Resolver erro "barbeiro"
-- Execute este SQL no Supabase
-- =====================================================

-- Recriar função do trigger SEM usar campo "Barbeiro"
CREATE OR REPLACE FUNCTION registrar_movimento_agendamento()
RETURNS TRIGGER AS $$
DECLARE
  v_barbeiro_nome VARCHAR(255);
BEGIN
  -- Buscar o nome do barbeiro da tabela profissionais
  SELECT nome INTO v_barbeiro_nome
  FROM profissionais
  WHERE id = NEW.profissional_id;

  -- APENAS registrar quando:
  -- 1. Status mudou para 'concluido' OU 'em_andamento'
  -- 2. Cliente compareceu (compareceu = true)
  -- 3. Ainda não foi registrado (evitar duplicatas)

  IF (NEW.status IN ('concluido', 'em_andamento')) AND
     NEW.compareceu = true AND
     (OLD IS NULL OR OLD.status NOT IN ('concluido', 'em_andamento') OR OLD.compareceu IS NOT true) THEN

    -- Verificar se já existe movimento para este agendamento
    IF NOT EXISTS (
      SELECT 1 FROM movimentos_financeiros WHERE agendamento_id = NEW.id
    ) THEN

      -- Inserir um movimento para cada serviço do agendamento
      INSERT INTO movimentos_financeiros (
        data_movimento,
        hora_movimento,
        tipo,
        agendamento_id,
        profissional_id,
        profissional_nome,
        cliente_id,
        cliente_nome,
        servico_id,
        servico_nome,
        quantidade,
        valor_unitario,
        valor_total,
        status,
        compareceu
      )
      SELECT
        -- Converter DD/MM/YYYY para DATE
        TO_DATE(NEW.data_agendamento, 'DD/MM/YYYY'),
        NEW.hora_inicio::time,
        'servico',
        NEW.id,
        NEW.profissional_id,
        v_barbeiro_nome,  -- Usa a variável em vez de NEW.Barbeiro
        NEW.cliente_id,
        NEW.nome_cliente,
        ags.servico_id,
        s.nome,
        1,
        ags.preco,
        ags.preco,
        'confirmado',
        NEW.compareceu
      FROM agendamento_servicos ags
      JOIN servicos s ON s.id = ags.servico_id
      WHERE ags.agendamento_id = NEW.id;

    END IF;
  END IF;

  -- Se mudou para cancelado, deletar movimentos se existirem
  IF NEW.status = 'cancelado' AND OLD IS NOT NULL THEN
    DELETE FROM movimentos_financeiros WHERE agendamento_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_movimento_agendamento ON agendamentos;
CREATE TRIGGER trigger_movimento_agendamento
  AFTER INSERT OR UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimento_agendamento();

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ TRIGGER CORRIGIDO COM SUCESSO!';
  RAISE NOTICE '✅ Agora o botão COMPARECEU vai funcionar!';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE: Clique no botão COMPARECEU na lista de agendamentos';
END $$;
