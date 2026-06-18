-- Pokreni u Supabase SQL editoru PRE sync-a iz glavnog unosa.
-- Uklanja legacy FAI i broj_merenja=20 iz baze (vrednosti dolaze samo iz glavni unos kol. V/W/X).

UPDATE karakteristike_merljive
SET
  nivo_kontrole = NULL,
  fai_broj_merenja = NULL,
  broj_merenja = NULL
WHERE id_deo = '5502-A';

UPDATE sop_deo_varijabilni
SET broj_merenja = 5
WHERE id_deo = '5502-A' AND broj_merenja = 20;

-- Provera:
-- SELECT id_deo, pogon_kod, broj_merenja FROM sop_deo_varijabilni WHERE id_deo = '5502-A';
-- SELECT id_deo, pogon_kod, pozicija, nivo_kontrole, fai_broj_merenja, broj_merenja
--   FROM karakteristike_merljive WHERE id_deo = '5502-A' LIMIT 10;
