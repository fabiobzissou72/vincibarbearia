-- Remover trigger problemático se existir
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;

-- Adicionar coluna updated_at se não existir
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger
CREATE TRIGGER update_agendamentos_updated_at
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
