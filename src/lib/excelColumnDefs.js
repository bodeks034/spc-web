/** Excel kolone — deljeni između excelSync i sapCsvToExcel (bez kružnog uvoza). */

export const DELOVI_EXCEL_COLS = [
  ["id_deo", "id dela*"],
  ["pogon_kod", "pogon kod"],
  ["radni_nalog", "radni nalog"],
  ["naziv_dela", "naziv dela*"],
  ["karakteristika", "karakteristika kontrole*"],
  ["linija_id", "linija id*"],
  ["masina_id", "masina id*"],
  ["kom_za_kontrolu", "kom za kontrolu n*"],
  ["slika_naziv", "slika/crtez"],
  ["aktivan", "aktivan"],
  ["napomena", "napomena"],
  ["tip_kontrole", "tip kontrole"],
  ["vozilo_katalog_id", "vozilo katalog id"],
  ["greska_katalog_id", "greska katalog id"],
];

export const RADNI_NALOZI_EXCEL_COLS = [
  ["id", "id"],
  ["broj_naloga", "radni nal"],
  ["id_deo", "id dela*"],
  ["naziv_dela", "naziv dela"],
  ["kolicina", "količina"],
  ["kupac", "kupac"],
  ["datum_unosa", "datum unosa"],
  ["rok_isporuke", "rok isporuke"],
  ["status", "status"],
  ["operater", "operater"],
  ["napomena", "napomena"],
  ["pogon_kod", "pogon_kod"],
];

export const KUPCI_EXCEL_COLS = [
  ["id", "id"],
  ["naziv", "naziv"],
  ["aktivan", "aktivan"],
];
