/**
 * NCR bilingual (SR / EN) — registar, obrazac, Excel, PDF.
 */

export const NCR_TITLE_SR = "NCR — IZVEŠTAJ O NEUSAGLAŠENOSTI";
export const NCR_TITLE_EN = "NCR — NONCONFORMANCE REPORT";

export const NCR_SUBTITLE_SR = "Kompaktan zapis neusaglašenosti; detaljna analiza kroz 8D kada je pokrenut.";
export const NCR_SUBTITLE_EN = "Compact nonconformance record; root-cause analysis via 8D when initiated.";

export const REGISTAR_EN = {
  broj_ncr: "NCR Number",
  datum_otvaranja: "Opening Date",
  pogon: "Plant / Area",
  linija: "Line",
  masina: "Machine",
  radni_nalog: "Work Order",
  id_deo: "Part ID",
  naziv_dela: "Part Name",
  kupac: "Customer",
  opis: "Nonconformance Description",
  karakteristika: "Characteristic",
  zahtev_spec: "Requirement / Spec",
  izmerena_vrednost: "Measured Value",
  kolicina_proizvedena: "Qty Produced",
  kolicina_sumnjiva: "Qty Suspect",
  kolicina_neispravna: "Qty Nonconforming",
  tip_greske: "Defect Type",
  kategorija_6m: "Cause Category (6M)",
  ozbiljnost: "Severity",
  ponavljanje: "Recurrence",
  prethodni_ncr: "Previous NCR",
  uticaj_kupca: "Customer Impact",
  detektovao: "Detected By",
  metoda_detekcije: "Detection Method",
  datum_containment: "Containment Date",
  containment_mere: "Containment Actions",
  dispozicija: "Disposition",
  odobrio_dispoziciju: "Disposition Approved By",
  osmd_pokrenut: "8D Initiated?",
  osmd_broj: "8D Number",
  pfmea_revizija: "PFMEA Rev.",
  cp_revizija: "CP Rev.",
  odgovoran: "Responsible",
  rok: "Due Date",
  status: "Status",
  verifikacija_efikasnost: "Effectiveness Verification",
  datum_zatvaranja: "Closing Date",
  sra_zavrseno: "SRA Done",
  broj_reklamacije: "Complaint No.",
  link_obrazac: "File Link",
};

export const SEKCIJE_EN = {
  A: "A. BASIC DATA",
  B: "B. TRACEABILITY & SCOPE",
  C: "C. NONCONFORMANCE DESCRIPTION",
  D: "D. CONTAINMENT / IMMEDIATE ACTIONS",
  E: "E. DISPOSITION",
  F: "F. 8D DECISION & SYSTEM LINKS",
  G: "G. HORIZONTAL DEPLOYMENT (SRA)",
  H: "H. APPROVAL & CLOSURE",
};

export const POLJE_EN = {
  broj_ncr: "NCR Number",
  datum_otvaranja: "Opening Date",
  status: "Status",
  pogon: "Plant / Area",
  linija: "Line",
  masina: "Machine",
  operacija: "Operation",
  radni_nalog: "Work Order",
  smena_obrazac: "Shift",
  id_deo: "Part ID",
  naziv_dela: "Part Name",
  kupac: "Customer",
  detektovao: "Detected By",
  metoda_detekcije: "Detection Method",
  ozbiljnost: "Severity",
  tip_greske: "Defect Type",
  kategorija_6m: "Cause Category (6M)",
  ponavljanje: "Recurrence",
  prethodni_ncr: "Previous NCR",
  uticaj_kupca: "Customer Impact",
  broj_reklamacije: "Complaint No.",
  serija_batch: "Serial / Batch",
  operater: "Operator",
  materijal_lot: "Material / Lot",
  kolicina_proizvedena: "Qty Produced",
  kolicina_sumnjiva: "Qty Suspect",
  kolicina_neispravna: "Qty Nonconforming",
  prvi_sumnjivi: "First Suspect Unit",
  poslednji_dobar: "Last Good Unit",
  datum_vreme_detekcije: "Detection Date/Time",
  dobavljac: "Supplier",
  kontrolni_dokument: "Control Document",
  revizija_dokumenta: "Document Revision",
  broj_crteza: "Drawing No. / Rev.",
  merna_oprema: "Measuring Equipment",
  detekcija: "Detection",
  opis: "Nonconformance Description",
  karakteristika: "Characteristic",
  karakteristika_klasa: "Characteristic Class (SC/CC)",
  zahtev_spec: "Requirement / Specification",
  izmerena_vrednost: "Measured Value",
  lokacija_pozicija: "Location / Position",
  dokaz_zapis: "Evidence / Record",
  containment_mere: "Containment Action 1",
  containment_odg_1: "Responsible",
  containment_mera_2: "Containment Action 2",
  containment_odg_2: "Responsible",
  stop_production: "Stop Production",
  vreme_zaustavljanja: "Stop Time",
  datum_containment: "Containment Date",
  izdvojena_kolicina: "Qty Segregated",
  lokacija_karantina: "Quarantine Location",
  sortiranje: "Sorting (who/result)",
  obavesten_kupac: "Customer / Internal Notified",
  datum_obavestenja: "Notification Date",
  dispozicija: "Disposition",
  odobrio_dispoziciju: "Disposition Approved By",
  datum_dispozicije: "Disposition Date",
  kolicina_dorada: "Qty for Rework",
  kolicina_skart: "Qty for Scrap",
  trosak_skarta: "Scrap Cost (€)",
  dispozicija_odgovoran: "Responsible",
  prihvaceno_odstupanjem: "Accepted with Deviation",
  odobrenje_broj: "Approval / No.",
  osmd_pokrenut: "8D Initiated",
  osmd_broj: "8D Number",
  root_cause_potvrden: "Root Cause Confirmed",
  razlog_osmd: "Reason for 8D",
  pfmea_azuriran: "PFMEA Updated",
  pfmea_revizija: "PFMEA Revision",
  cp_azuriran: "Control Plan Updated",
  cp_revizija: "CP Revision",
  povezani_ncr: "Related NCR / Complaint",
  preventivna_akcija: "Preventive Action (short)",
  sra_linije: "Lines / Machines Checked",
  sra_delovi: "Parts Checked",
  sra_rezultat: "Check Result",
  sra_akcije: "Actions Elsewhere",
  sra_zavrseno: "SRA Completed",
  sra_odgovoran: "SRA Responsible",
  sra_datum: "SRA Date",
  odgovoran: "Responsible Person",
  odgovorno_datum: "Date",
  kontrola_kvaliteta: "Quality Control",
  kontrola_kvaliteta_datum: "Date",
  verifikacija_efikasnost: "Effectiveness Verification",
  verifikacija_datum: "Verification Date",
  lekcije_naucene: "Lessons Learned",
  odobrenje_zatvaranja: "Closure Approval",
  datum_zatvaranja: "Closing Date",
  rok: "Due Date",
};

export function registarLabelEn(key, fallback = "") {
  return REGISTAR_EN[key] || fallback;
}

export function poljeLabelEn(key, srFallback = "") {
  if (!key) return "";
  return POLJE_EN[key] || srFallback;
}

export function sekcijaNaslovEn(sek) {
  return SEKCIJE_EN[sek?.id] || sek?.naslov || "";
}

/** Excel: dva reda zaglavlja (SR + EN). */
export function registarExcelHeaderSr(k) {
  if (k.key === "osmd_pokrenut") return "Pokrenut 8D?";
  return k.label;
}

export function registarExcelHeaderEn(k) {
  if (k.key === "osmd_pokrenut") return "8D Initiated?";
  return registarLabelEn(k.key, k.label);
}

export function statusBilingual(status, srLabel) {
  if (status === "closed") return { sr: "ZATVOREN", en: "CLOSED" };
  if (status === "open") return { sr: "OTVOREN", en: "OPEN" };
  return { sr: srLabel, en: srLabel };
}

export const NCR_FOOTER_SR = "Generisano iz SPC Web · NCR Registar i Obrazac · bilingual SR/EN";
export const NCR_FOOTER_EN = "Generated from SPC Web · NCR Register & Form · bilingual SR/EN";

export const NCR_NOTE_SR = "Obavezna polja označena žutom. NCR se zatvara tek nakon containment-a, dispozicije i verifikacije efektivnosti.";
export const NCR_NOTE_EN = "Required fields marked yellow. NCR closes only after containment, disposition and effectiveness verification.";
