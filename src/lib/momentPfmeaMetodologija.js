/**
 * QS-TRQ-001 — PFMEA veza i Control Plan integracija za momente zatezanja.
 * Izvor: METODOLOGIJA PFMEA VEZA I CONTROL PLAN INTEGRACIJA (terensko vozilo).
 */

export const MOMENT_QS_TRQ_REF = "QS-TRQ-001";

export const MOMENT_PFMEA_SVRHA =
  "Ovaj dokument povezuje klasifikaciju kritičnosti spoja (VSK/KSK/STD) iz standarda QS-TRQ-001 "
  + "sa formalnom PFMEA analizom rizika, i integriše moment zatezanja kao kontrolisanu karakteristiku "
  + "u Control Plan za svaki sklop.";

/** PFMEA skale — S, O, D (oblacići u UI). */
export const MOMENT_PFMEA_SKALE = {
  S: {
    id: "S",
    kratak: "S",
    label: "Severity (S)",
    opseg: "1–10",
    opis: "Ozbiljnost posledice greške",
    nivoi: [
      { opseg: "1–3", tekst: "Zanemarljiv efekat (kupac ne primećuje)." },
      { opseg: "4–6", tekst: "Umeren efekat (nezadovoljstvo, popravka)." },
      { opseg: "7–8", tekst: "Visok efekat (gubitak funkcije, bez direktne opasnosti)." },
      {
        opseg: "9–10",
        tekst: "Bezbednosni efekat — moguća povreda korisnika/trećih lica ili nesaglasnost sa zakonskom regulativom "
          + "(npr. sigurnosni pojas, kočnice, upravljanje).",
      },
    ],
  },
  O: {
    id: "O",
    kratak: "O",
    label: "Occurrence (O)",
    opseg: "1–10",
    opis: "Verovatnoća pojave greške",
    nivoi: [
      { opseg: "1–2", tekst: "Retko (istorijski nema otkaza)." },
      { opseg: "3–5", tekst: "Povremeno." },
      { opseg: "6–8", tekst: "Često." },
      { opseg: "9–10", tekst: "Vrlo često / poznat hronični problem." },
    ],
  },
  D: {
    id: "D",
    kratak: "D",
    label: "Detection (D)",
    opseg: "1–10",
    opis: "Sposobnost otkrivanja greške pre isporuke",
    nivoi: [
      {
        opseg: "1–2",
        tekst: "Skoro sigurna detekcija (100% automatska kontrola, npr. digitalni ključ sa sequence lock).",
      },
      { opseg: "3–5", tekst: "Velika verovatnoća detekcije (SPC uzorkovanje)." },
      { opseg: "6–8", tekst: "Umerena šansa detekcije." },
      { opseg: "9–10", tekst: "Kontrola ne postoji ili je nepouzdana." },
    ],
  },
};

export const MOMENT_PFMEA_RPN = {
  id: "RPN",
  kratak: "RPN",
  label: "Risk Priority Number",
  formula: "S × O × D",
  opseg: "1–1000",
  opis: "Koristi se za rangiranje prioriteta akcija, NE kao jedini kriterijum klasifikacije.",
};

/** Pravilo S/RPN → VSK/KSK/STD. */
export const MOMENT_PFMEA_KLASA = {
  VSK: {
    id: "VSK",
    label: "VSK",
    punNaziv: "Bezbednosno kritičan spoj",
    pravilo: "Severity ≥ 9 (bez obzira na RPN) — bezbednosno kritičan spoj po definiciji. "
      + "Automatski VSK bez obzira na verovatnoću otkaza, jer je posledica neprihvatljiva. "
      + "Uključuje sve spojeve iz kategorije kočnice/upravljanje/vešanje/točkovi/sigurnosni pojas.",
    uzorkovanje: "100% kontrola, svaki spoj, automatska evidencija.",
  },
  KSK: {
    id: "KSK",
    label: "KSK",
    punNaziv: "Kritičan za funkciju",
    pravilo: "Severity 4–8 I RPN ≥ 100 — spoj sa značajnim rizikom za funkciju/pouzdanost, "
      + "ali bez direktne bezbednosne posledice.",
    uzorkovanje: "Uzorkovanje prema internom AQL planu (npr. n=5 po smeni ili prema ISO 2859-1).",
  },
  STD: {
    id: "STD",
    label: "STD",
    punNaziv: "Standardni spoj",
    pravilo: "Severity ≤ 6 I RPN < 100 — nekritičan spoj, standardna kontrola dovoljna.",
    uzorkovanje: "Periodična provera (npr. 1 po smeni) ili vizuelna kontrola.",
  },
};

export const MOMENT_PFMEA_DODATNO = [
  {
    id: "cp",
    naslov: "Veza sa Control Plan-om",
    tekst: "Svaka karakteristika u Control Plan-u nosi PFMEA ID koji upućuje na odgovarajući red u listu "
      + "\"PFMEA\" ove radne knjige — obezbeđuje sledivost \"zašto je ovo VSK\" do konkretnog rizika, "
      + "u skladu sa IATF 16949 / VDA zahtevima za vezu PFMEA–Control Plan.",
  },
  {
    id: "reakcija",
    naslov: "Reakcioni plan (skraćeno, QS-TRQ-001 t.8)",
    tekst: "Kod NOK: STOP → re-torque/demontaža → evidencija devijacije → za VSK obavezna izolacija jedinice "
      + "→ ako se ponavlja, 8D/5×Why.",
  },
];

export const MOMENT_PFMEA_OBLACICI = ["S", "O", "D", "RPN", "VSK", "KSK", "STD"];

export function izracunajMomentRpn(s, o, d) {
  const sn = Number(s);
  const on = Number(o);
  const dn = Number(d);
  if (!Number.isFinite(sn) || !Number.isFinite(on) || !Number.isFinite(dn)) return null;
  if (sn < 1 || sn > 10 || on < 1 || on > 10 || dn < 1 || dn > 10) return null;
  return sn * on * dn;
}

/** Predlog klasifikacije po QS-TRQ-001 pravilu (inženjerski alat, ne zamena dokumentacije). */
export function predloziMomentKlasifikaciju(s, o, d) {
  const sn = Number(s);
  const on = Number(o);
  const dn = Number(d);
  if (!Number.isFinite(sn)) return null;
  if (sn >= 9) return "VSK";
  const rpn = izracunajMomentRpn(sn, on, dn);
  if (rpn == null) return null;
  if (sn >= 4 && sn <= 8 && rpn >= 100) return "KSK";
  if (sn <= 6 && rpn < 100) return "STD";
  return null;
}

export function uzorkovanjeZaKlasu(klasifikacija) {
  const k = String(klasifikacija || "").trim().toUpperCase();
  return MOMENT_PFMEA_KLASA[k]?.uzorkovanje || null;
}

export function bojaKlasifikacije(C, klasifikacija) {
  const k = String(klasifikacija || "").trim().toUpperCase();
  if (k === "VSK") return C.crvena;
  if (k === "KSK") return C.zuta;
  return C.sivi;
}
