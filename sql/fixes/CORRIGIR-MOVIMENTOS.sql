-- =====================================================
-- CORRIGIR: Sistema de Movimentos Financeiros
-- Execute este SQL no Supabase para corrigir o problema
-- =====================================================

-- 1. Recriar a função do trigger (SEMPRE atualiza, não dá erro)
CREATE OR REPLACE FUNCTION registrar_movimento_agendamento()
RETURNS TRIGGER AS $$
BEGIN
  -- APENAS registrar quando:
  -- 1. Status mudou para 'concluido' OU 'em_andamento'
  -- 2. Cliente compareceu (compareceu = true)
  -- 3. Ainda não foi registrado (evitar duplicatas)

  IF (NEW.status IN ('concluido', 'em_andamento')) AND
     NEW.compareceu = true AND
     (OLD.status IS NULL OR OLD.status NOT IN ('concluido', 'em_andamento') OR OLD.compareceu IS NOT true) THEN

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
        NEW.Barbeiro,
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
  IF NEW.status = 'cancelado' AND OLD.status IS NOT NULL THEN
    DELETE FROM movimentos_financeiros WHERE agendamento_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_movimento_agendamento ON agendamentos;
CREATE TRIGGER trigger_movimento_agendamento
  AFTER INSERT OR UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimento_agendamento();

-- 3. Recriar função para vendas
CREATE OR REPLACE FUNCTION registrar_movimento_venda()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO movimentos_financeiros (
    data_movimento,
    hora_movimento,
    tipo,
    venda_id,
    profissional_id,
    profissional_nome,
    cliente_id,
    cliente_nome,
    produto_id,
    produto_nome,
    quantidade,
    valor_unitario,
    valor_total,
    status
  )
  SELECT
    NEW.data_venda::date,
    CURRENT_TIME,
    'produto',
    NEW.id,
    NEW.profissional_id,
    p.nome,
    NEW.cliente_id,
    c.nome_completo,
    NEW.produto_id,
    prod.nome,
    NEW.quantidade,
    NEW.preco_unitario,
    NEW.valor_total,
    'confirmado'
  FROM profissionais p
  LEFT JOIN clientes c ON c.id = NEW.cliente_id
  JOIN produtos prod ON prod.id = NEW.produto_id
  WHERE p.id = NEW.profissional_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar trigger de vendas
DROP TRIGGER IF EXISTS trigger_movimento_venda ON vendas;
CREATE TRIGGER trigger_movimento_venda
  AFTER INSERT ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimento_venda();

-- 5. Criar/Atualizar view
CREATE OR REPLACE VIEW v_movimentos_hoje AS
SELECT
  m.*,
  TO_CHAR(m.data_movimento, 'DD/MM/YYYY') as data_formatada
FROM movimentos_financeiros m
WHERE m.data_movimento = CURRENT_DATE
ORDER BY m.hora_movimento DESC;

-- 6. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers de movimentos financeiros CORRIGIDOS!';
  RAISE NOTICE '✅ Agora o botão COMPARECEU vai funcionar sem erro 500!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Teste: Clique em COMPARECEU em um agendamento';
END $$;
