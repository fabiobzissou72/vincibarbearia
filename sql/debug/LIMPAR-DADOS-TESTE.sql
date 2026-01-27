-- =====================================================
-- LIMPAR TODOS OS DADOS DE TESTE
-- Execute este SQL no Supabase para começar do ZERO
-- ⚠️ ATENÇÃO: Isso vai DELETAR TODOS os registros!
-- =====================================================

-- 1. Deletar movimentos financeiros
DELETE FROM movimentos_financeiros;

-- 2. Deletar vendas
DELETE FROM vendas;

-- 3. Deletar relações de serviços dos agendamentos
DELETE FROM agendamento_servicos;

-- 4. Deletar agendamentos
DELETE FROM agendamentos;

-- 5. Deletar notificações enviadas
DELETE FROM notificacoes_enviadas;

-- 6. OPCIONAL: Deletar clientes (comente esta linha se quiser manter clientes)
DELETE FROM clientes;

-- =====================================================
-- Mensagem de confirmação
-- =====================================================
DO $$
DECLARE
  count_agendamentos INTEGER;
  count_vendas INTEGER;
  count_movimentos INTEGER;
  count_clientes INTEGER;
BEGIN
  -- Contar registros restantes
  SELECT COUNT(*) INTO count_agendamentos FROM agendamentos;
  SELECT COUNT(*) INTO count_vendas FROM vendas;
  SELECT COUNT(*) INTO count_movimentos FROM movimentos_financeiros;
  SELECT COUNT(*) INTO count_clientes FROM clientes;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DADOS LIMPOS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agendamentos restantes: %', count_agendamentos;
  RAISE NOTICE 'Vendas restantes: %', count_vendas;
  RAISE NOTICE 'Movimentos financeiros restantes: %', count_movimentos;
  RAISE NOTICE 'Clientes restantes: %', count_clientes;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Agora você pode começar com dados REAIS!';
  RAISE NOTICE '   Todos os relatórios começarão do ZERO.';
END $$;
