-- Proširenje licence: tenant, moduli, deployment (cloud → on-prem ista šema)
-- Pokreni posle 21_licenca_gate.sql

ALTER TABLE app_licenca
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS deployment TEXT NOT NULL DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS moduli_json JSONB NOT NULL DEFAULT '{"atributivne":true,"varijabilne":true,"admin":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_korisnika INT;

UPDATE app_licenca
SET moduli_json = COALESCE(moduli_json, '{"atributivne":true,"varijabilne":true,"admin":true}'::jsonb)
WHERE id = 1;

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
      'max_korisnika', r.max_korisnika
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
      'max_korisnika', r.max_korisnika
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
    'max_korisnika', r.max_korisnika
  );
END;
$$;

REVOKE ALL ON FUNCTION proveri_licencu() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION proveri_licencu() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
