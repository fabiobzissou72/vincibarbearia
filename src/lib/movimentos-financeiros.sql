-- Tabela de Movimentos Financeiros
-- Registra cada movimento individual (serviço ou produto vendido)

CREATE TABLE IF NOT EXISTS public.movimentos_financeiros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Data e hora do movimento
  data_movimento date NOT NULL,
  hora_movimento time NOT NULL,
  data_criacao timestamp DEFAULT now(),

  -- Tipo de movimento
  tipo character varying(20) NOT NULL CHECK (tipo IN ('servico', 'produto')),

  -- Referências
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE CASCADE,
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE,

  -- Quem realizou
  profissional_id uuid REFERENCES profissionais(id),
  profissional_nome character varying(255),

  -- Cliente
  cliente_id uuid REFERENCES clientes(id),
  cliente_nome character varying(255),

  -- O que foi feito/vendido
  servico_id uuid REFERENCES servicos(id),
  servico_nome character varying(255),
  produto_id uuid REFERENCES produtos(id),
  produto_nome character varying(255),

  -- Valores
  quantidade integer DEFAULT 1,
  valor_unitario decimal(10,2) NOT NULL,
  valor_total decimal(10,2) NOT NULL,

  -- Status
  status character varying(20) DEFAULT 'confirmado',
  compareceu boolean DEFAULT true,

  -- Observações
  observacoes text,

  CONSTRAINT movimentos_financeiros_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Índices para performance
CREATE INDEX idx_movimentos_data ON public.movimentos_financeiros (data_movimento);
CREATE INDEX idx_movimentos_tipo ON public.movimentos_financeiros (tipo);
CREATE INDEX idx_movimentos_profissional ON public.movimentos_financeiros (profissional_id);
CREATE INDEX idx_movimentos_cliente ON public.movimentos_financeiros (cliente_id);
CREATE INDEX idx_movimentos_status ON public.movimentos_financeiros (status);

-- Comentários
COMMENT ON TABLE public.movimentos_financeiros IS 'Registro detalhado de todos os movimentos financeiros (serviços e produtos)';
COMMENT ON COLUMN public.movimentos_financeiros.tipo IS 'Tipo do movimento: servico ou produto';
COMMENT ON COLUMN public.movimentos_financeiros.compareceu IS 'Se o cliente compareceu (apenas para serviços)';


-- =====================================================
-- TRIGGER: Registrar movimentos quando agendamento for concluído
-- =====================================================

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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_movimento_agendamento ON agendamentos;
CREATE TRIGGER trigger_movimento_agendamento
  AFTER INSERT OR UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimento_agendamento();


-- =====================================================
-- TRIGGER: Registrar movimentos quando venda for criada
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_movimento_venda()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir movimento da venda
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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_movimento_venda ON vendas;
CREATE TRIGGER trigger_movimento_venda
  AFTER INSERT ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimento_venda();


-- =====================================================
-- VIEW: Movimentos do dia atual
-- =====================================================

CREATE OR REPLACE VIEW v_movimentos_hoje AS
SELECT
  m.*,
  TO_CHAR(m.data_movimento, 'DD/MM/YYYY') as data_formatada
FROM movimentos_financeiros m
WHERE m.data_movimento = CURRENT_DATE
ORDER BY m.hora_movimento DESC;


-- =====================================================
-- Mensagem de sucesso
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela movimentos_financeiros criada com sucesso!';
  RAISE NOTICE '✅ Triggers configurados para registrar automaticamente:';
  RAISE NOTICE '   - Serviços quando agendamento for concluído';
  RAISE NOTICE '   - Produtos quando venda for criada';
END $$;
