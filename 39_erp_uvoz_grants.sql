-- GRANT za erp_uvoz_log (PostgREST)
GRANT SELECT, INSERT ON erp_uvoz_log TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE erp_uvoz_log_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
