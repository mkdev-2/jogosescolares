-- Criação da tabela para armazenar o token de integração com a API do Instagram e permitir a automação de renovação

CREATE TABLE IF NOT EXISTS instagram_tokens (
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
