-- ============================================================
-- RLS za uvoz merljivih Excel tabova (Admin → Merljive)
-- Greška: merenja_varijabilna violates row-level security (USING expression)
-- Uzrok: upsert traži UPDATE, a postojala je samo INSERT politika
-- Pokreni u Supabase SQL Editoru posle 11_varijabilne_schema.sql
-- ============================================================

DROP POLICY IF EXISTS "auth_upsert_merenja_var" ON merenja_varijabilna;
CREATE POLICY "auth_upsert_merenja_var" ON merenja_varijabilna
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- (opciono) sop + karakteristike — ako 11 nije imao auth_all politike
DROP POLICY IF EXISTS "auth_upsert_sop_deo_var" ON sop_deo_varijabilni;
CREATE POLICY "auth_upsert_sop_deo_var" ON sop_deo_varijabilni
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_karakteristike" ON karakteristike_merljive;
CREATE POLICY "auth_upsert_karakteristike" ON karakteristike_merljive
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
