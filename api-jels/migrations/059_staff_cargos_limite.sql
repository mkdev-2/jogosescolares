ALTER TABLE staff_cargos
    ADD COLUMN IF NOT EXISTS limite INTEGER DEFAULT NULL,
    ADD CONSTRAINT chk_staff_cargos_limite CHECK (limite IS NULL OR limite > 0);
