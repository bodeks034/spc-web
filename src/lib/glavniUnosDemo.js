/**
 * Demo redovi za test — inženjer unosi samo u Glavni unos (Osnovno),
 * propagacija puni merljive, atributivne i celo vozilo.
 */

export const GLAVNI_UNOS_DEMO_REDOVI = [
  {
    id_deo: "DEMO-NM-001",
    naziv_dela: "Nosač motora (demo NM)",
    radni_nalog: "RN-2026-DEMONM001-A",
    broj_crteza: "CR-NM001",
    linija: "Ulazna kontrola",
    operacija: "Ulazna kontrola",
    masina_id: 1,
    ukupno_kom: 50,
    kom_za_kontrolu_n: 5,
    karakteristika: "Ukupna dužina",
    tip: "Merljiva",
    klasa: "Major",
    nominal: 230,
    usl: 230.2,
    lsl: 229.8,
    jedinica: "mm",
    instrument: "Pomično merilo",
    kontolor: "Kontrolor linija",
    nivo_kontrole_fac: "FAC 2",
    spc_broj_merenja: 5,
    reakcioni_plan: "Korekcija",
    slika: "NM-01.png",
  },
  {
    id_deo: "DEMO-NM-001",
    naziv_dela: "Nosač motora (demo NM)",
    radni_nalog: "RN-2026-DEMONM001-A",
    broj_crteza: "CR-NM001",
    linija: "Ulazna kontrola",
    operacija: "Ulazna kontrola",
    masina_id: 1,
    ukupno_kom: 50,
    kom_za_kontrolu_n: 5,
    karakteristika: "Pravougaonost",
    tip: "Merljiva",
    klasa: "Major",
    nominal: 90,
    usl: 444444,
    lsl: 440000,
    jedinica: "stepen",
    instrument: "Uglomer",
    kontolor: "Kontrolor linija",
    spc_broj_merenja: 5,
    reakcioni_plan: "Korekcija",
    slika: "NM-01.png",
  },
  {
    id_deo: "DEMO-NM-001",
    naziv_dela: "Nosač motora (demo NM)",
    radni_nalog: "RN-2026-DEMONM001-A",
    broj_crteza: "CR-NM001",
    linija: "Ulazna kontrola",
    operacija: "Ulazna kontrola",
    masina_id: 1,
    ukupno_kom: 50,
    kom_za_kontrolu_n: 5,
    karakteristika: "Oštećenje površine",
    tip: "Atributivna",
    klasa: "Major",
    instrument: "Vizuelno",
    kontolor: "Kontrolor linija",
    reakcioni_plan: "Sortiranje",
    slika: "NM-01.png",
  },
  {
    id_deo: "DEMO-5502",
    naziv_dela: "Nosač motora (demo)",
    radni_nalog: "RN-2026-DEMO5502-A",
    broj_crteza: "CR-5502",
    linija: "Ulazna kontrola",
    operacija: "Ulazna kontrola",
    masina_id: 1,
    ukupno_kom: 50,
    kom_za_kontrolu_n: 5,
    karakteristika: "Ukupna dužina",
    tip: "Merljiva",
    klasa: "Major",
    nominal: 245,
    usl: 245.5,
    lsl: 244.5,
    jedinica: "mm",
    instrument: "Mikrometar 0-25mm",
    kontolor: "Kontrolor linija",
    nivo_kontrole_fac: "FAC 2",
    spc_broj_merenja: 5,
    reakcioni_plan: "Korekcija",
    slika: "DEMO-5502.jpg",
  },
  {
    id_deo: "DEMO-5502",
    naziv_dela: "Nosač motora (demo)",
    radni_nalog: "RN-2026-DEMO5502-A",
    broj_crteza: "CR-5502",
    linija: "Ulazna kontrola",
    operacija: "Ulazna kontrola",
    masina_id: 1,
    ukupno_kom: 50,
    kom_za_kontrolu_n: 5,
    karakteristika: "Oštećenje površine",
    tip: "Atributivna",
    klasa: "Major",
    instrument: "Vizuelno",
    kontolor: "Kontrolor linija",
    reakcioni_plan: "Sortiranje",
    slika: "DEMO-5502.jpg",
  },
  {
    id_deo: "MRAP-001",
    naziv_dela: "MRAP komplet (demo)",
    radni_nalog: "RN-2026-MRAP001-F",
    broj_crteza: "MRAP-FIN",
    linija: "Završna",
    operacija: "Finalna kontrola",
    masina_id: 1,
    ukupno_kom: 1,
    kom_za_kontrolu_n: 5,
    karakteristika: "Finalna vizuelna kontrola celog vozila",
    tip: "Atributivna",
    klasa: "Critical",
    instrument: "Vizuelno",
    kontolor: "Kontrolor kvaliteta",
    reakcioni_plan: "Zaustavi proces",
    slika: "MRAP_SOP.jpg",
  },
];

/** Mapa id_deo → tip kontrole (iz glavnog unosa). */
export function metaDeoIzGlavnogUnosa(dbRedovi) {
  const byDeo = new Map();
  for (const row of dbRedovi || []) {
    const id = String(row.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    const tip = String(row.tip || "").toLowerCase();
    const kar = String(row.karakteristika || "").toLowerCase();
    const isVozilo = tip.includes("vozilo")
      || /celog vozila|celo vozilo|finalna vizuelna kontrola/.test(kar);
    if (isVozilo) {
      const prefiks = id.includes("-") ? id.split("-")[0] : id.replace(/\d+$/, "");
      byDeo.set(id, { tip_kontrole: "vozilo", vozilo_katalog_id: prefiks || null });
    } else if (!byDeo.has(id)) {
      byDeo.set(id, { tip_kontrole: "deo", vozilo_katalog_id: null });
    }
  }
  return byDeo;
}

export function deoMetaMapa(deoMeta) {
  if (deoMeta instanceof Map) return deoMeta;
  return new Map(Object.entries(deoMeta || {}));
}

export function metaZaDeo(deoMeta, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  return deoMetaMapa(deoMeta).get(id) || { tip_kontrole: "deo", vozilo_katalog_id: null };
}
