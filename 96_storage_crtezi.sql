-- Storage bucket za crteže delova (atributivne/ + merljive/)
-- Pokreni u Supabase SQL Editoru ako upload javlja:
--   "new row violates row-level security policy"
--
-- Aplikacija: uploadSlikaSifrarnik → bucket spc-crtezi

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spc-crtezi',
  'spc-crtezi',
  false,
  20971520,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ukloni stare / nepotpune politike
DROP POLICY IF EXISTS "auth_read_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "auth_write_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "anon_insert_crtezi" ON storage.objects;
DROP POLICY IF EXISTS "anon_update_crtezi" ON storage.objects;

-- Prijavljeni korisnici (LoginScreen → authenticated)
CREATE POLICY "auth_read_crtezi" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spc-crtezi');

CREATE POLICY "auth_insert_crtezi" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spc-crtezi');

CREATE POLICY "auth_update_crtezi" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'spc-crtezi')
  WITH CHECK (bucket_id = 'spc-crtezi');

CREATE POLICY "auth_delete_crtezi" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spc-crtezi');

-- Anon upis: ako tablet / klijent nema auth session, authenticated politike ne važe.
CREATE POLICY "anon_read_crtezi" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'spc-crtezi');

CREATE POLICY "anon_insert_crtezi" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'spc-crtezi');

CREATE POLICY "anon_update_crtezi" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'spc-crtezi')
  WITH CHECK (bucket_id = 'spc-crtezi');
