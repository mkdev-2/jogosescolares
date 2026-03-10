-- Tabela de categorias de notícias
CREATE TABLE IF NOT EXISTS categorias_noticias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_noticias_slug ON categorias_noticias(slug);

CREATE TRIGGER update_categorias_noticias_updated_at
    BEFORE UPDATE ON categorias_noticias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
