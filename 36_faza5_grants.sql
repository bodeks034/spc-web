-- GRANT za Faza 5 tabele (PostgREST / anon + authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON kontrolni_plan TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kontrolni_plan_revizija TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON msa_kalendar TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fai_unosi TO authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE kontrolni_plan_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kontrolni_plan_revizija_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE msa_kalendar_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE fai_unosi_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
