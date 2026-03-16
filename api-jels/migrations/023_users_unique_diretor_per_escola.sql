-- Regra: apenas 1 diretor por escola
-- Remove diretores duplicados (mantém o mais antigo por escola) e cria constraint

DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY escola_id ORDER BY created_at ASC) as rn
    FROM users
    WHERE role = 'DIRETOR' AND escola_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS users_unique_diretor_per_escola
ON users (escola_id)
WHERE role = 'DIRETOR' AND escola_id IS NOT NULL;
