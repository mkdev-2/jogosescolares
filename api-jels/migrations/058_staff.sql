CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    foto_url VARCHAR(500),
    cargo_id INTEGER NOT NULL REFERENCES staff_cargos(id),
    documento_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_staff_cpf ON staff(cpf);
CREATE INDEX idx_staff_cargo_id ON staff(cargo_id);
