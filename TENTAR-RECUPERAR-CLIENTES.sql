-- 🆘 TENTAR RECUPERAR DADOS DE CLIENTES
-- Execute isso no Supabase SQL Editor para ver se ainda há algum dado

-- 1. Verificar se ainda existem clientes na tabela
SELECT COUNT(*) as total_clientes FROM clientes;

-- 2. Tentar recuperar nomes e telefones únicos de agendamentos antigos (SE ainda existirem)
-- NOTA: O SQL de limpeza também deletou agendamentos, então pode não haver nada aqui
SELECT DISTINCT
  nome_cliente,
  telefone
FROM agendamentos
WHERE nome_cliente IS NOT NULL
ORDER BY nome_cliente;

-- 3. Verificar se há dados em notificações enviadas
SELECT DISTINCT
  cliente_nome,
  cliente_telefone
FROM notificacoes_enviadas
WHERE cliente_nome IS NOT NULL
ORDER BY cliente_nome;

-- ⚠️ SE VOCÊ TIVER BACKUP NO SUPABASE:
-- 1. Vá em: Database → Backups
-- 2. Restaure o backup mais recente ANTES da limpeza
-- 3. Isso vai recuperar TODOS os dados
