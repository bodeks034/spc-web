-- Licenca po uređaju (browser/PC) — max_uredjaja + evidencija
-- Pokreni posle 23_licenca_moduli.sql

ALTER TABLE app_licenca ADD COLUMN IF NOT EXISTS max_uredjaja INT;

CREATE TABLE IF NOT EXISTS licenca_uredjaji (
  id BIGSERIAL PRIMARY KEY,
  uredjaj_id TEXT NOT NULL UNIQUE,
  naziv TEXT,
  radnik_id BIGINT REFERENCES radnici(id) ON DELETE SET NULL,
  poslednji_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenca_uredjaji_login ON licenca_uredjaji (poslednji_login DESC);

ALTER TABLE licenca_uredjaji ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS licenca_uredjaji_select ON licenca_uredjaji;
CREATE POLICY licenca_uredjaji_select ON licenca_uredjaji
  FOR SELECT TO authenticated, anon, service_role USING (true);

-- Registracija uređaja pri loginu (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION registruj_uredjaj_licence(p_uredjaj_id TEXT, p_naziv TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_u INT;
  cnt INT;
  uid TEXT;
BEGIN
  uid := NULLIF(TRIM(p_uredjaj_id), '');
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'kod', 'uredjaj_id', 'poruka', 'Nedostaje ID uređaja.');
  END IF;

  SELECT max_uredjaja INTO max_u FROM app_licenca WHERE id = 1;
  IF max_u IS NULL OR max_u <= 0 THEN
    RETURN json_build_object('ok', true, 'preskoceno', true);
  END IF;

  IF EXISTS (SELECT 1 FROM licenca_uredjaji WHERE uredjaj_id = uid) THEN
    UPDATE licenca_uredjaji
    SET poslednji_login = NOW(),
        naziv = COALESCE(NULLIF(TRIM(p_naziv), ''), naziv)
    WHERE uredjaj_id = uid;
    SELECT COUNT(*) INTO cnt FROM licenca_uredjaji;
    RETURN json_build_object('ok', true, 'count', cnt, 'max', max_u, 'vec_registrovan', true);
  END IF;

  SELECT COUNT(*) INTO cnt FROM licenca_uredjaji;
  IF cnt >= max_u THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'max_uredjaja',
      'poruka', format('Licenca dozvoljava najviše %s uređaja (trenutno %s). Kontaktirajte administratora.', max_u, cnt),
      'count', cnt,
      'max', max_u
    );
  END IF;

  INSERT INTO licenca_uredjaji (uredjaj_id, naziv) VALUES (uid, NULLIF(TRIM(p_naziv), ''));
  RETURN json_build_object('ok', true, 'count', cnt + 1, 'max', max_u, 'vec_registrovan', false);
END;
$$;

REVOKE ALL ON FUNCTION registruj_uredjaj_licence(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registruj_uredjaj_licence(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION broj_uredjaja_licence()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::INT FROM licenca_uredjaji;
$$;

REVOKE ALL ON FUNCTION broj_uredjaja_licence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION broj_uredjaja_licence() TO anon, authenticated, service_role;

-- Proširi proveri_licencu() sa max_uredjaja
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
      'vazi_do', r.vazi_do,
      'tenant_id', r.tenant_id,
      'deployment', r.deployment,
      'moduli', r.moduli_json,
      'max_korisnika', r.max_korisnika,
      'max_uredjaja', r.max_uredjaja
    );
  END IF;
  IF r.vazi_do < NOW() THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'isteklo',
      'poruka', 'Licenca je istekla. Kontaktirajte dobavljača za produženje.',
      'vazi_do', r.vazi_do,
      'tenant_id', r.tenant_id,
      'deployment', r.deployment,
      'moduli', r.moduli_json,
      'max_korisnika', r.max_korisnika,
      'max_uredjaja', r.max_uredjaja
    );
  END IF;
  RETURN json_build_object(
    'ok', true,
    'kod', 'ok',
    'poruka', '',
    'vazi_do', r.vazi_do,
    'napomena', r.napomena,
    'tenant_id', r.tenant_id,
    'deployment', r.deployment,
    'moduli', r.moduli_json,
    'max_korisnika', r.max_korisnika,
    'max_uredjaja', r.max_uredjaja
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
