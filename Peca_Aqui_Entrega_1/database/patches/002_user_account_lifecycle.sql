-- PEÇA-AQUI | MIGRAÇÃO 002 | Contas, aprovação e revogação de sessões
-- Seguro para reaplicação; nunca execute sobre banco real sem backup.
BEGIN;
SET search_path TO peca_aqui, public;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(12) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_users_approval_status' AND conrelid='peca_aqui.users'::regclass) THEN
  ALTER TABLE users ADD CONSTRAINT chk_users_approval_status CHECK (approval_status IN ('PENDING','APPROVED','REJECTED'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_users_session_version' AND conrelid='peca_aqui.users'::regclass) THEN
  ALTER TABLE users ADD CONSTRAINT chk_users_session_version CHECK (session_version>=1);
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users(lower(email));
CREATE INDEX IF NOT EXISTS ix_users_status ON users(approval_status,deleted_at,active);
COMMIT;
