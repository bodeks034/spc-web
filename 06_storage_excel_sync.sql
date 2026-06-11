-- Supabase Storage bucket za Excel kopije (dual-write iz aplikacije)
-- Pokreni u SQL Editoru posle 05_dopuna_tabele_rls.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spc-excel-sync',
  'spc-excel-sync',
  false,
  52428800,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated: čitanje i upis Excel fajlova
DROP POLICY IF EXISTS "auth_read_excel_sync" ON storage.objects;
CREATE POLICY "auth_read_excel_sync" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spc-excel-sync');

DROP POLICY IF EXISTS "auth_insert_excel_sync" ON storage.objects;
CREATE POLICY "auth_insert_excel_sync" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spc-excel-sync');

DROP POLICY IF EXISTS "auth_update_excel_sync" ON storage.objects;
CREATE POLICY "auth_update_excel_sync" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'spc-excel-sync');

DROP POLICY IF EXISTS "auth_delete_excel_sync" ON storage.objects;
CREATE POLICY "auth_delete_excel_sync" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spc-excel-sync');

-- Uvoz iz Excela (admin): upsert šifrarnika
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

DROP POLICY IF EXISTS "auth_upsert_kontrolna_stavke" ON kontrolna_lista_stavke;
CREATE POLICY "auth_upsert_kontrolna_stavke" ON kontrolna_lista_stavke FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "auth_upsert_merila" ON merila;
CREATE POLICY "auth_upsert_merila" ON merila FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_upsert_kalibracije" ON kalibracije;
CREATE POLICY "auth_upsert_kalibracije" ON kalibracije FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
