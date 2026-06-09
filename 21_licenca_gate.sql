-- Licenca / kill-switch — provera na serveru (Sloj B)
-- Pokreni u Supabase SQL Editoru na firminskom serveru

CREATE TABLE IF NOT EXISTS app_licenca (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  aktivna     BOOLEAN NOT NULL DEFAULT true,
  vazi_do     TIMESTAMPTZ NOT NULL,
  napomena    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_licenca ENABLE ROW LEVEL SECURITY;

-- Autentifikovani korisnici NE vide i NE menjaju tabelu direktno
DROP POLICY IF EXISTS "service_role_app_licenca" ON app_licenca;
CREATE POLICY "service_role_app_licenca" ON app_licenca
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Početni red — zameni datum posle deploy-a (ili postavi-licencu.mjs)
INSERT INTO app_licenca (id, aktivna, vazi_do, napomena)
VALUES (1, false, '2000-01-01T00:00:00Z', 'Nije aktivirano — pokreni postavi-licencu.mjs')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION proveri_licencu()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r app_licenca%ROWTYPE;
BEGIN
  SELECT * INTO r FROM app_licenca WHERE id = 1;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'nema_licence',
      'poruka', 'Licenca nije konfigurisana. Kontaktirajte dobavljača.'
    );
  END IF;
  IF NOT r.aktivna THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'iskljuceno',
      'poruka', 'Program je privremeno onemogućen. Kontaktirajte dobavljača.',
      'vazi_do', r.vazi_do
    );
  END IF;
  IF r.vazi_do < NOW() THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'isteklo',
      'poruka', 'Licenca je istekla. Kontaktirajte dobavljača za produženje.',
      'vazi_do', r.vazi_do
    );
  END IF;
  RETURN json_build_object(
    'ok', true,
    'kod', 'ok',
    'poruka', '',
    'vazi_do', r.vazi_do,
    'napomena', r.napomena
  );
END;
$$;

REVOKE ALL ON FUNCTION proveri_licencu() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION proveri_licencu() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
