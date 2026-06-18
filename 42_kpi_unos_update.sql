-- Dozvoli ažuriranje KPI reda (kasni unos škarta / dorade)
-- Pokreni u Supabase SQL Editoru posle 14_kpi_skart_dorada_oee.sql

DROP POLICY IF EXISTS "auth_update_kpi_unos" ON kpi_unos;
CREATE POLICY "auth_update_kpi_unos" ON kpi_unos
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
