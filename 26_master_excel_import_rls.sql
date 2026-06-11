-- ============================================================
-- RLS za uvoz master Excel-a iz Admin panela (authenticated)
-- Pokreni u Supabase SQL Editoru ako dobijaš:
--   "new row violates row-level security policy for table linije"
-- Može posle 05_dopuna_tabele_rls.sql (06_storage_excel_sync.sql je podskup)
-- ============================================================

-- Šifrarnik — pun upsert (INSERT + UPDATE + DELETE gde treba)
DROP POLICY IF EXISTS "auth_upsert_linije" ON linije;
CREATE POLICY "auth_upsert_linije" ON linije FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_masine" ON masine;
CREATE POLICY "auth_upsert_masine" ON masine FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_smene" ON smene;
CREATE POLICY "auth_upsert_smene" ON smene FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_greske" ON greske_katalog;
CREATE POLICY "auth_upsert_greske" ON greske_katalog FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_katalog_vozilo" ON katalog_gresaka_vozilo;
CREATE POLICY "auth_upsert_katalog_vozilo" ON katalog_gresaka_vozilo FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_delovi" ON delovi;
CREATE POLICY "auth_upsert_delovi" ON delovi FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_radnici" ON radnici;
CREATE POLICY "auth_upsert_radnici" ON radnici FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_radni_nalozi" ON radni_nalozi;
CREATE POLICY "auth_upsert_radni_nalozi" ON radni_nalozi FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_kupci" ON kupci;
CREATE POLICY "auth_upsert_kupci" ON kupci FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_ciljevi" ON ciljevi;
CREATE POLICY "auth_upsert_ciljevi" ON ciljevi FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_kontrolna_stavke" ON kontrolna_lista_stavke;
CREATE POLICY "auth_upsert_kontrolna_stavke" ON kontrolna_lista_stavke FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_merila" ON merila;
CREATE POLICY "auth_upsert_merila" ON merila FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_kalibracije" ON kalibracije;
CREATE POLICY "auth_upsert_kalibracije" ON kalibracije FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
