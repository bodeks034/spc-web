-- PFMEA stavke — nova ocena (S/O posle) + odobrenje

ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS s_posle TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS o_posle TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS odobrio TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS datum TEXT;
