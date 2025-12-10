-- Adicionar colunas de email e senha na tabela profissionais
ALTER TABLE public.profissionais
ADD COLUMN email character varying(255) UNIQUE,
ADD COLUMN senha character varying(255),
ADD COLUMN ultimo_login timestamp without time zone;

-- Inserir dados dos profissionais com email e senha
INSERT INTO public.profissionais (nome, telefone, especialidades, ativo, email, senha, id_agenda) VALUES
('Hiago', '11999999001', ARRAY['Corte', 'Barba', 'Coloração'], true, 'hiago@vincebarbearia.com', '$2b$10$123456789012345678901234567890123456789012345678901234', 'a311abb694680da1a14885a39cecdc9c10442e7e2141319a66dc399e5e534cfd@group.calendar.google.com'),
('Alex', '11999999002', ARRAY['Corte', 'Barba', 'Tratamentos'], true, 'alex@vincebarbearia.com', '$2b$10$123456789012345678901234567890123456789012345678901234', '29dfa56ff87f14c97eaced7509ebb3384c96594b5938546deb4063363a3557f2@group.calendar.google.com'),
('Filippe', '11999999003', ARRAY['Corte', 'Barba', 'Estética'], true, 'filippe@vincebarbearia.com', '$2b$10$123456789012345678901234567890123456789012345678901234', '5a840fc60f78e86e243852fd120dfe921ac9bc5ff19cc87079bb56358850801f@group.calendar.google.com')
ON CONFLICT (nome) DO UPDATE SET
  email = EXCLUDED.email,
  senha = EXCLUDED.senha,
  id_agenda = EXCLUDED.id_agenda;