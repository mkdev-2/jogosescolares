-- Migration 030: amplia fases do mata-mata para suportar chaves até 64 vagas.

ALTER TYPE campeonato_fase_enum ADD VALUE IF NOT EXISTS 'TRINTA_E_DOIS_AVOS';
ALTER TYPE campeonato_fase_enum ADD VALUE IF NOT EXISTS 'DEZESSEIS_AVOS';
