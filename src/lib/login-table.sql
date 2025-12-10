-- Criar tabela específica para login dos profissionais
CREATE TABLE public.profissionais_login (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL,
  email character varying(255) UNIQUE NOT NULL,
  senha character varying(255) NOT NULL,
  ativo boolean DEFAULT true,
  ultimo_login timestamp without time zone,
  data_criacao timestamp without time zone DEFAULT now(),
  data_atualizacao timestamp without time zone DEFAULT now(),
  CONSTRAINT profissionais_login_pkey PRIMARY KEY (id),
  CONSTRAINT profissionais_login_profissional_id_fkey
    FOREIGN KEY (profissional_id)
    REFERENCES profissionais (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Criar índices para performance
CREATE INDEX idx_profissionais_login_email ON public.profissionais_login (email);
CREATE INDEX idx_profissionais_login_profissional_id ON public.profissionais_login (profissional_id);

-- Trigger para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_profissionais_login_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profissionais_login_updated_at
    BEFORE UPDATE ON profissionais_login
    FOR EACH ROW
    EXECUTE FUNCTION update_profissionais_login_updated_at();

-- Inserir logins iniciais para os profissionais existentes
-- (Assumindo que os profissionais Hiago, Alex e Filippe já existem)
-- Você pode ajustar os IDs conforme necessário

-- Exemplo de insert (ajuste os UUIDs dos profissionais conforme sua base)
/*
INSERT INTO public.profissionais_login (profissional_id, email, senha) VALUES
((SELECT id FROM profissionais WHERE nome = 'Hiago' LIMIT 1), 'hiago@vincebarbearia.com', '123456'),
((SELECT id FROM profissionais WHERE nome = 'Alex' LIMIT 1), 'alex@vincebarbearia.com', '123456'),
((SELECT id FROM profissionais WHERE nome = 'Filippe' LIMIT 1), 'filippe@vincebarbearia.com', '123456');
*/