-- team_members: active area / team (e.g. "Data Science Team"), separate from the
-- membership title held in `role` (e.g. "Pioneer Member").
ALTER TABLE team_members ADD COLUMN team TEXT NOT NULL DEFAULT '';
