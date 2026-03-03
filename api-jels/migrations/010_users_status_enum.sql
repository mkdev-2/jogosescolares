-- Substituir coluna ativo (boolean) por status (enum) na tabela users
-- Enum: ATIVO, INATIVO, PENDENTE

CREATE TYPE user_status AS ENUM ('ATIVO', 'INATIVO', 'PENDENTE');

-- Adicionar nova coluna status
ALTER TABLE users ADD COLUMN status user_status;

-- Migrar dados: ativo=true -> ATIVO, ativo=false -> INATIVO
UPDATE users SET status = CASE WHEN ativo THEN 'ATIVO'::user_status ELSE 'INATIVO'::user_status END;

-- Tornar NOT NULL e definir default
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'ATIVO'::user_status;

-- Remover coluna ativo
ALTER TABLE users DROP COLUMN ativo;
