-- Tabela de notícias (portal público e área logada)
CREATE TABLE IF NOT EXISTS noticias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    featured_image_url TEXT,
    status VARCHAR(20) DEFAULT 'rascunho',
    categories TEXT[],
    tags TEXT[],
    event_date TIMESTAMPTZ,
    author_id INTEGER REFERENCES users(id),
    gallery_urls TEXT[],
    documents JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noticias_slug ON noticias(slug);
CREATE INDEX IF NOT EXISTS idx_noticias_status ON noticias(status);
CREATE INDEX IF NOT EXISTS idx_noticias_categories ON noticias USING GIN(categories);

CREATE TRIGGER update_noticias_updated_at
    BEFORE UPDATE ON noticias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
