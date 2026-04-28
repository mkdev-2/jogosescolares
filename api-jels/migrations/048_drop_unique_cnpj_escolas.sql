-- Remove a constraint UNIQUE do CNPJ na tabela escolas,
-- permitindo que múltiplas escolas sejam cadastradas com o mesmo CNPJ.
-- A validação de formato (14 dígitos) é mantida no backend.

ALTER TABLE escolas DROP CONSTRAINT IF EXISTS escolas_cnpj_key;
