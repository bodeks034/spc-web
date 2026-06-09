-- SPC baseline — proširenje za merljive karte (xbar, r, i, mr) + pozicija
-- Pokreni POSLE 07_spc_views_and_alarms.sql

ALTER TABLE spc_baseline DROP CONSTRAINT IF EXISTS spc_baseline_tip_karte_check;
ALTER TABLE spc_baseline ADD CONSTRAINT spc_baseline_tip_karte_check
  CHECK (tip_karte IN ('p','np','c','u','nc','xbar','r','i','mr'));

ALTER TABLE spc_baseline ADD COLUMN IF NOT EXISTS pozicija TEXT;

ALTER TABLE spc_baseline DROP CONSTRAINT IF EXISTS spc_baseline_id_deo_tip_karte_vazi_od_key;

CREATE UNIQUE INDEX IF NOT EXISTS spc_baseline_deo_tip_poz_vazi_od
  ON spc_baseline (id_deo, tip_karte, COALESCE(pozicija, ''), vazi_od);

DROP POLICY IF EXISTS "auth_update_spc_baseline" ON spc_baseline;
CREATE POLICY "auth_update_spc_baseline" ON spc_baseline
  FOR UPDATE USING (auth.role() = 'authenticated');
