CREATE TABLE campeonato_manual_config_pontuacao (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL UNIQUE REFERENCES campeonatos(id) ON DELETE CASCADE,
    permite_empate BOOLEAN NOT NULL DEFAULT FALSE,
    pts_vitoria INTEGER NOT NULL DEFAULT 3,
    pts_vitoria_parcial INTEGER NULL,
    pts_empate INTEGER NOT NULL DEFAULT 1,
    pts_derrota INTEGER NOT NULL DEFAULT 0,
    wxo_pts_vencedor INTEGER NOT NULL DEFAULT 3,
    wxo_pts_perdedor INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
