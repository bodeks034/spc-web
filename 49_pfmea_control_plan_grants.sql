GRANT SELECT, INSERT, UPDATE, DELETE ON pfmea_cp_dokumenti TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pfmea_stavke TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON control_plan_stavke TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE pfmea_cp_dokumenti_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE pfmea_stavke_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE control_plan_stavke_id_seq TO authenticated, service_role;
