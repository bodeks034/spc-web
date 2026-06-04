-- Demo merljivi podaci za 5501-A i 5503-A (pokreni u Supabase SQL Editoru kao postgres)
-- Posle: osveži app, unesi 5501-A ili 5503-A

INSERT INTO sop_deo_varijabilni (id_deo, radni_nalog, naziv_dela, slika, masina, linija, broj_merenja, kontrolor_ime)
VALUES
  ('5501-A', 'RN-2024-001', 'Nosac', 'Deo1.jpg', 'M1', 'Preseraj', 5, 'PETROVIC DRAGOMIR'),
  ('5503-A', 'RN-2024-003', 'Poklopac', 'Deo3.jpg', 'M3', 'Preseraj', 5, 'peric milic')
ON CONFLICT (id_deo) DO UPDATE SET
  radni_nalog = EXCLUDED.radni_nalog,
  naziv_dela = EXCLUDED.naziv_dela,
  slika = EXCLUDED.slika,
  masina = EXCLUDED.masina,
  linija = EXCLUDED.linija,
  broj_merenja = EXCLUDED.broj_merenja,
  kontrolor_ime = EXCLUDED.kontrolor_ime;

INSERT INTO karakteristike_merljive (id, id_deo, sifra_merenja, pozicija, naziv_mere, nominala, usl, lsl, usl_text, lsl_text, merni_instrument, jedinica)
VALUES
  (10,'5501-A','A','Ukupna visina','Ukupna visina',100,100.5,99.5,'100.5','99.5','Pomicno merilo','mm'),
  (11,'5501-A','A','Sirina nosaca','Sirina nosaca',50,50.2,49.8,'50.2','49.8','Pomicno merilo','mm'),
  (12,'5501-A','A','Dubina kanala','Dubina kanala',12,12.3,11.7,'12.3','11.7','Dubinsko pomicno merilo','mm'),
  (13,'5501-A','A','Razmak rupa','Razmak rupa',25,25.2,24.8,'25.2','24.8','Pomicno merilo','mm'),
  (14,'5501-A','A','Duzina kraka','Duzina kraka',75,75.3,74.7,'75.3','74.7','Pomicno merilo','mm'),
  (15,'5501-A','B','Debljina zida','Debljina zida',3,3.15,2.85,'3.15','2.85','Pomicno merilo','mm'),
  (16,'5501-A','B','Precnik rupe','Precnik rupe',8,8.1,7.9,'8.1','7.9','Pomicno merilo','mm'),
  (17,'5501-A','B','Radijalno bacanje','Radijalno bacanje',0.05,0.05,0,'0,05','0','Komparator','mm'),
  (18,'5501-A','B','Ravnost povrsine','Ravnost povrsine',0.02,0.02,0,'0,02','0','Komparator','mm'),
  (19,'5501-A','B','Zazor spoja','Zazor spoja',1.5,1.6,1.4,'1.6','1.4','Tolerancijski cep','mm'),
  (20,'5503-A','A','Ukupna duzina','Ukupna duzina',200,200.5,199.5,'200.5','199.5','Pomicno merilo','mm'),
  (21,'5503-A','A','Sirina poklopca','Sirina poklopca',40,40.2,39.8,'40.2','39.8','Pomicno merilo','mm'),
  (22,'5503-A','A','Visina zida','Visina zida',15,15.2,14.8,'15.2','14.8','Pomicno merilo','mm'),
  (23,'5503-A','A','Zazor poklopca','Zazor poklopca',1.2,1.25,1.15,'1.25','1.15','Tolerancijski cep','mm'),
  (24,'5503-A','A','Dubina kanala','Dubina kanala',8,8.2,7.8,'8.2','7.8','Dubinsko pomicno merilo','mm'),
  (25,'5503-A','B','Precnik montaze','Precnik montaze',30,30.2,29.8,'30.2','29.8','Pomicno merilo','mm'),
  (26,'5503-A','B','Debljina rebra','Debljina rebra',2.5,2.6,2.4,'2.6','2.4','Pomicno merilo','mm'),
  (27,'5503-A','B','Duzina vezne povrsine','Duzina vezne povrsine',120,120.5,119.5,'120.5','119.5','Pomicno merilo','mm'),
  (28,'5503-A','B','Radijalno bacanje','Radijalno bacanje',0.04,0.04,0,'0,04','0','Komparator','mm'),
  (29,'5503-A','B','Ravnost','Ravnost',0.03,0.03,0,'0,03','0','Komparator','mm')
ON CONFLICT (id) DO UPDATE SET
  id_deo = EXCLUDED.id_deo,
  pozicija = EXCLUDED.pozicija,
  naziv_mere = EXCLUDED.naziv_mere,
  nominala = EXCLUDED.nominala,
  usl = EXCLUDED.usl,
  lsl = EXCLUDED.lsl,
  merni_instrument = EXCLUDED.merni_instrument;

-- Demo merenja (5 uzoraka × 5 dimenzija serije A) — id 301–350
INSERT INTO merenja_varijabilna (id, datum, smena, radni_nalog, id_deo, pozicija, vrednost_raw, vrednost_dec, status, linija, kontrolor, operater, merni_instrument, masina)
SELECT * FROM (VALUES
  (301,'2026-06-01'::date,1,'RN-2024-001','5501-A','Ukupna visina','100',100,'OK','Preseraj','PETROVIC DRAGOMIR','PETROVIC DRAGOMIR','Pomicno merilo','M1'),
  (302,'2026-06-01',1,'RN-2024-001','5501-A','Ukupna visina','100,02',100.02,'OK','Preseraj','PETROVIC DRAGOMIR','PETROVIC DRAGOMIR','Pomicno merilo','M1'),
  (303,'2026-06-01',1,'RN-2024-001','5501-A','Ukupna visina','99,99',99.99,'OK','Preseraj','PETROVIC DRAGOMIR','PETROVIC DRAGOMIR','Pomicno merilo','M1'),
  (304,'2026-06-01',1,'RN-2024-001','5501-A','Ukupna visina','100,08',100.08,'OK','Preseraj','PETROVIC DRAGOMIR','PETROVIC DRAGOMIR','Pomicno merilo','M1'),
  (305,'2026-06-01',1,'RN-2024-001','5501-A','Ukupna visina','100',100,'OK','Preseraj','PETROVIC DRAGOMIR','PETROVIC DRAGOMIR','Pomicno merilo','M1'),
  (326,'2026-06-01',1,'RN-2024-003','5503-A','Ukupna duzina','200',200,'OK','Preseraj','peric milic','peric milic','Pomicno merilo','M3'),
  (327,'2026-06-01',1,'RN-2024-003','5503-A','Ukupna duzina','200,02',200.02,'OK','Preseraj','peric milic','peric milic','Pomicno merilo','M3'),
  (328,'2026-06-01',1,'RN-2024-003','5503-A','Ukupna duzina','199,99',199.99,'OK','Preseraj','peric milic','peric milic','Pomicno merilo','M3'),
  (329,'2026-06-01',1,'RN-2024-003','5503-A','Ukupna duzina','200,08',200.08,'OK','Preseraj','peric milic','peric milic','Pomicno merilo','M3'),
  (330,'2026-06-01',1,'RN-2024-003','5503-A','Ukupna duzina','200',200,'OK','Preseraj','peric milic','peric milic','Pomicno merilo','M3')
) AS v(id,datum,smena,radni_nalog,id_deo,pozicija,vrednost_raw,vrednost_dec,status,linija,kontrolor,operater,merni_instrument,masina)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('karakteristike_merljive', 'id'),
  COALESCE((SELECT MAX(id) FROM karakteristike_merljive), 1),
  (SELECT COUNT(*) > 0 FROM karakteristike_merljive)
);

SELECT setval(
  pg_get_serial_sequence('merenja_varijabilna', 'id'),
  COALESCE((SELECT MAX(id) FROM merenja_varijabilna), 1),
  (SELECT COUNT(*) > 0 FROM merenja_varijabilna)
);

-- Za pun set merenja pokreni: npm run seed:5501-5503 (sa SERVICE_ROLE_KEY) ili Admin → Demo dugme posle logina
-- Posle uvoza sa eksplicitnim id: 19_fix_merenja_varijabilna_sequence.sql
