-- =====================================================
-- SCHEMA COMPLETO - VINCE BARBEARIA
-- Para criar em um NOVO banco Supabase
-- =====================================================

-- =====================================================
-- 1. TABELA: clientes
-- =====================================================
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  telefone VARCHAR(20) NOT NULL UNIQUE,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  senha VARCHAR(255),
  data_nascimento DATE,
  profissao VARCHAR(100),
  estado_civil VARCHAR(50),
  tem_filhos VARCHAR(10),
  nomes_filhos TEXT[],
  idades_filhos TEXT[],
  estilo_cabelo VARCHAR(100),
  preferencias_corte TEXT,
  tipo_bebida VARCHAR(100),
  alergias TEXT,
  frequencia_retorno VARCHAR(50),
  profissional_preferido VARCHAR(255),
  observacoes TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  como_soube VARCHAR(100),
  gosta_conversar VARCHAR(50),
  menory_long TEXT,
  tratamento VARCHAR(100),
  ultimo_servico VARCHAR(255),
  plano_id UUID,
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_clientes_telefone ON public.clientes(telefone);
CREATE INDEX idx_clientes_email ON public.clientes(email);

-- =====================================================
-- 2. TABELA: profissionais
-- =====================================================
CREATE TABLE public.profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  especialidade VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  cor_calendario VARCHAR(7) DEFAULT '#3B82F6',
  CONSTRAINT profissionais_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 3. TABELA: servicos
-- =====================================================
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  categoria VARCHAR(100),
  executor VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT servicos_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 4. TABELA: produtos
-- =====================================================
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  funcao TEXT,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  beneficios TEXT,
  contra_indicacoes TEXT,
  categoria VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  estoque INTEGER DEFAULT 0,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT produtos_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 5. TABELA: planos
-- =====================================================
CREATE TABLE public.planos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  itens_inclusos TEXT NOT NULL,
  valor_total NUMERIC(10, 2) NOT NULL,
  valor_original NUMERIC(10, 2) NOT NULL,
  economia NUMERIC(10, 2) NOT NULL,
  validade_dias INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT TRUE,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT planos_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 6. TABELA: agendamentos
-- =====================================================
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cliente_id UUID,
  profissional_id UUID,
  servico_id UUID,
  data_agendamento VARCHAR(20) NOT NULL, -- DD/MM/YYYY
  hora_inicio VARCHAR(5) NOT NULL, -- HH:MM
  status VARCHAR(50) DEFAULT 'agendado',
  observacoes TEXT,
  valor NUMERIC(10, 2),
  google_calendar_event_id VARCHAR(255),
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  nome_cliente VARCHAR(255),
  telefone VARCHAR(20),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  compareceu BOOLEAN,
  checkin_at TIMESTAMPTZ,
  CONSTRAINT agendamentos_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_profissional FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE SET NULL,
  CONSTRAINT fk_servico FOREIGN KEY (servico_id) REFERENCES public.servicos(id) ON DELETE SET NULL
);

CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_agendamento);
CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_telefone ON public.agendamentos(telefone);
CREATE INDEX idx_agendamentos_profissional ON public.agendamentos(profissional_id);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);

-- =====================================================
-- 7. TABELA: agendamento_servicos (múltiplos serviços)
-- =====================================================
CREATE TABLE public.agendamento_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL,
  servico_id UUID NOT NULL,
  CONSTRAINT agendamento_servicos_pkey PRIMARY KEY (id),
  CONSTRAINT fk_agendamento FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_servico_rel FOREIGN KEY (servico_id) REFERENCES public.servicos(id) ON DELETE CASCADE
);

CREATE INDEX idx_ag_servicos_agendamento ON public.agendamento_servicos(agendamento_id);

-- =====================================================
-- 8. TABELA: movimentos_financeiros
-- =====================================================
CREATE TABLE public.movimentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria VARCHAR(100),
  descricao TEXT,
  valor NUMERIC(10, 2) NOT NULL,
  data_movimento VARCHAR(20) NOT NULL, -- DD/MM/YYYY
  profissional_id UUID,
  agendamento_id UUID,
  metodo_pagamento VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT movimentos_financeiros_pkey PRIMARY KEY (id),
  CONSTRAINT fk_mov_profissional FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE SET NULL,
  CONSTRAINT fk_mov_agendamento FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL
);

CREATE INDEX idx_movimentos_data ON public.movimentos_financeiros(data_movimento);
CREATE INDEX idx_movimentos_tipo ON public.movimentos_financeiros(tipo);
CREATE INDEX idx_movimentos_profissional ON public.movimentos_financeiros(profissional_id);

-- =====================================================
-- 9. TABELA: compras (produtos vendidos)
-- =====================================================
CREATE TABLE public.compras (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cliente_id UUID,
  produto_id UUID,
  agendamento_id UUID,
  quantidade INTEGER DEFAULT 1,
  valor_unitario NUMERIC(10, 2),
  valor_total NUMERIC(10, 2),
  data_compra TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendente',
  CONSTRAINT compras_pkey PRIMARY KEY (id),
  CONSTRAINT fk_compra_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_compra_produto FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL,
  CONSTRAINT fk_compra_agendamento FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL
);

-- =====================================================
-- 10. TABELA: configuracoes
-- =====================================================
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  webhook_url TEXT,
  webhook_senha_temporaria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT configuracoes_pkey PRIMARY KEY (id)
);

-- Inserir registro padrão
INSERT INTO public.configuracoes (webhook_url) VALUES (NULL);

-- =====================================================
-- 11. TABELA: login (autenticação profissionais)
-- =====================================================
CREATE TABLE public.login (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  ultimo_acesso TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT login_pkey PRIMARY KEY (id),
  CONSTRAINT fk_login_profissional FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE CASCADE
);

-- =====================================================
-- 12. TRIGGER: atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. RLS (Row Level Security) - DESABILITAR para Admin
-- =====================================================
-- Por padrão, vamos DESABILITAR RLS para facilitar
-- Você pode habilitar depois se quiser multi-tenancy

ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_financeiros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.login DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 14. GRANTS - Permissões de acesso
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- PRÓXIMO PASSO: Execute o arquivo PERSONALIZACAO-CORES-LOGO.sql
-- para adicionar campos de personalização
