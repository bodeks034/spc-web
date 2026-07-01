/**
 * Prenos podataka iz 8D izveštaja u PFMEA / Control Plan dokument.
 * Jedan 8D → jedan PFMEA red + jedan CP red (spakovano).
 */

import {
  parseD4, parseD6, parseLista, parseGrupaLista, parseD2,
} from "./osmdStruktura.js";
import {
  pfmeaPrazanRed,
  cpPrazanRed,
  pfmeaRefZaEditor,
  cpRefZaEditor,
  izracunajRpnSummary,
} from "./pfmeaControlPlan.js";

function trim(s) {
  return String(s ?? "").trim();
}

function prviNePrazan(...vals) {
  for (const v of vals) {
    const t = trim(v);
    if (t) return t;
  }
  return "";
}

function splitProcesBrDela(procesStr) {
  const s = trim(procesStr);
  if (!s) return { br_dela: "", proces: "" };
  const i = s.indexOf(" — ");
  if (i === -1) return { br_dela: "", proces: s };
  return { br_dela: s.slice(0, i).trim(), proces: s.slice(i + 3).trim() };
}

function d5Stavke(raw) {
  return parseLista(raw);
}

function d7Stavke(raw) {
  const g = parseGrupaLista(raw, 1);
  return g.grupe.flatMap((gr) => gr.stavke.map(trim).filter(Boolean));
}

function d3Stavke(raw) {
  const g = parseGrupaLista(raw, 3);
  return g.grupe.flatMap((gr) => {
    const naslov = trim(gr.naslov);
    const st = gr.stavke.map(trim).filter(Boolean);
    if (naslov && st.length) return [`${naslov}: ${st[0]}`, ...st.slice(1)];
    return st;
  });
}

function d4Kontekst(osmd) {
  const d4 = parseD4(osmd.d4_uzrok);
  const grana = d4.grane?.[0] || {};
  const d2 = parseD2(osmd.d2_opis_problema);
  return {
    d4,
    grana,
    korenski: prviNePrazan(grana.korenski_uzrok, grana.definitivna),
    opis: prviNePrazan(d4.opis_problema, d4.problem_naslov, d2.sta, d2.inicijalni),
    efekti: trim(d4.efekti),
    rezultat: trim(d4.rezultat),
  };
}

function jedinstveneLinije(linije) {
  const out = [];
  const seen = new Set();
  for (const l of linije) {
    const t = trim(l);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function spakujAkcije(osmd) {
  const d6 = parseD6(osmd.d6_implementacija);
  const linije = [];

  for (const r of d6.redovi) {
    const akcija = trim(r.akcija);
    if (!akcija) continue;
    const meta = [trim(r.odgovorni), trim(r.rok), trim(r.status)].filter(Boolean).join(" · ");
    linije.push(meta ? `• ${akcija} (${meta})` : `• ${akcija}`);
  }

  for (const s of d5Stavke(osmd.d5_korektivna)) {
    linije.push(`• ${s}`);
  }

  return jedinstveneLinije(linije).join("\n");
}

function spakujKontrole(osmd, refPre) {
  return jedinstveneLinije([
    refPre,
    ...d7Stavke(osmd.d7_prevencija).map((s) => `D7: ${s}`),
  ]).join("\n");
}

function spakujVerifikaciju(osmd) {
  const d6 = parseD6(osmd.d6_implementacija);
  return jedinstveneLinije((d6.verifikacija || []).map(trim)).join("\n");
}

function spakujReakcije(osmd) {
  return jedinstveneLinije([
    ...d3Stavke(osmd.d3_privremena_akcija).map((s) => `D3: ${s}`),
  ]).join("\n");
}

function pfmeaRedIz8d(osmd, ctx, refSummary = {}) {
  const idDeo = trim(osmd.id_deo);
  const defekt = trim(osmd.defekt_nedostatak);
  const broj8d = trim(osmd.broj_8d);
  const proc = splitProcesBrDela(refSummary.proces);
  const d6 = parseD6(osmd.d6_implementacija);
  const prvaAkcija = d6.redovi.find((r) => trim(r.akcija));
  const akcije = spakujAkcije(osmd);
  const odgovorni = jedinstveneLinije(d6.redovi.map((r) => trim(r.odgovorni))).join(", ");
  const rokovi = jedinstveneLinije(d6.redovi.map((r) => trim(r.rok))).join(", ");

  return {
    ...pfmeaPrazanRed(),
    br_dela: proc.br_dela || idDeo,
    proces: proc.proces || ctx.opis?.slice(0, 200) || "",
    mod_greske: prviNePrazan(refSummary.mod_greske, defekt, ctx.grana.opis),
    uzrok_greske: ctx.korenski,
    efekat_greske: prviNePrazan(refSummary.efekat, ctx.efekti, ctx.rezultat),
    akcija: prviNePrazan(akcije, refSummary.otkrivanje_posle, prvaAkcija?.akcija),
    postojece_kontrole: spakujKontrole(osmd, refSummary.otkrivanje_pre),
    odgovorni: prviNePrazan(odgovorni, prvaAkcija?.odgovorni),
    rok: prviNePrazan(rokovi, prvaAkcija?.rok),
    status: prviNePrazan(prvaAkcija?.status, "Planirano"),
    pfmea_veza: broj8d,
    control_plan_ref: broj8d ? `CP — ${broj8d}` : "",
  };
}

function cpRedIz8d(osmd, ctx, refSummary = {}) {
  const idDeo = trim(osmd.id_deo);
  const defekt = trim(osmd.defekt_nedostatak);
  const broj8d = trim(osmd.broj_8d);
  const proc = splitProcesBrDela(refSummary.operacija);
  const verifikacija = spakujVerifikaciju(osmd);
  const reakcije = spakujReakcije(osmd);

  return {
    ...cpPrazanRed(),
    br_dela: proc.br_dela || idDeo,
    proces: proc.proces || ctx.opis?.slice(0, 200) || "",
    karakteristika: prviNePrazan(refSummary.karakteristika, defekt, ctx.opis?.slice(0, 200)),
    metoda: prviNePrazan(refSummary.metoda_kontrole, refSummary.korigovana_metoda),
    ucestalost: prviNePrazan(refSummary.ucestalost),
    reakcija_nekontrolisano: prviNePrazan(verifikacija, refSummary.korigovana_metoda),
    reakcija_na_nepravilan_deo: reakcije,
    mod_greske_pfmea: prviNePrazan(defekt, refSummary.karakteristika),
    odgovorni: prviNePrazan(refSummary.odgovornost),
    pfmea_referenca: broj8d,
    zapis_forma: broj8d ? `8D ${broj8d}` : (osmd.id ? `8D #${osmd.id}` : ""),
  };
}

function imaSadrzajRed(red, keys) {
  return keys.some((k) => trim(red[k]));
}

/**
 * @param {object} osmd — form / izveštaj iz 8D editora
 * @returns {object} prefill za PfmeaCpModul
 */
export function prefillPfmeaCpIz8d(osmd) {
  if (!osmd) return null;

  const idDeo = trim(osmd.id_deo);
  const defekt = trim(osmd.defekt_nedostatak);
  const broj8d = trim(osmd.broj_8d);
  const ctx = d4Kontekst(osmd);
  const pfRef = pfmeaRefZaEditor(osmd.pfmea_ref);
  const cpRef = cpRefZaEditor(osmd.control_plan_ref);

  const pfGlavni = pfmeaRedIz8d(osmd, ctx, pfRef);
  const cpGlavni = cpRedIz8d(osmd, ctx, cpRef);

  const pfmeaRedovi = [];
  const cpRedovi = [];

  if (imaSadrzajRed(pfGlavni, ["mod_greske", "uzrok_greske", "akcija", "efekat_greske", "proces"])
    || defekt || ctx.korenski) {
    pfmeaRedovi.push(pfGlavni);
  }

  if (imaSadrzajRed(cpGlavni, ["karakteristika", "metoda", "proces", "reakcija_nekontrolisano"])
    || defekt) {
    cpRedovi.push(cpGlavni);
  }

  const naziv = broj8d
    ? `PFMEA/CP — ${broj8d}`
    : defekt
      ? `PFMEA/CP — ${defekt.slice(0, 48)}`
      : idDeo
        ? `PFMEA/CP — ${idDeo}`
        : "PFMEA/CP iz 8D";

  const preneto = [];
  if (defekt) preneto.push("defekt");
  if (ctx.korenski) preneto.push("korenski uzrok");
  if (pfmeaRedovi.length) preneto.push("1 PFMEA red");
  if (cpRedovi.length) preneto.push("1 CP red");

  return {
    osmdId: osmd.id || null,
    broj8d,
    idDeo,
    filterDefekt: defekt,
    naziv,
    revizija: "A",
    napomena: `Preneto iz 8D${broj8d ? ` ${broj8d}` : osmd.id ? ` #${osmd.id}` : ""} · ${new Date().toLocaleDateString("sr-RS")}`,
    pfmea: { redovi: pfmeaRedovi },
    controlPlan: { redovi: cpRedovi },
    rpnSummary: izracunajRpnSummary(pfmeaRedovi),
    prenetoOpis: preneto.join(", "),
  };
}

/** Zameni PFMEA/CP sadržaj dokumenta samo ako je zameni=true. Inače ne dira postojeći sadržaj. */
export function primeniPrefillNaPfmeaCpDoc(doc, prefill, { zameni = false } = {}) {
  if (!prefill || !doc) return doc;
  const isti8d = prefill.osmdId && doc.osmdIzvestajId === prefill.osmdId;
  const istiBroj = prefill.broj8d && trim(doc.broj8d) === trim(prefill.broj8d);

  if ((isti8d || istiBroj) && !zameni) {
    return doc;
  }

  if (zameni || !doc.pfmea?.redovi?.length) {
    return {
      ...doc,
      naziv: prefill.naziv || doc.naziv,
      idDeo: doc.idDeo || prefill.idDeo,
      osmdIzvestajId: prefill.osmdId || doc.osmdIzvestajId,
      broj8d: prefill.broj8d || doc.broj8d,
      napomena: prefill.napomena || doc.napomena,
      pfmea: prefill.pfmea || { redovi: [] },
      controlPlan: prefill.controlPlan || { redovi: [] },
      rpnSummary: prefill.rpnSummary || [],
    };
  }

  return {
    ...doc,
    pfmea: { redovi: [...(doc.pfmea?.redovi || []), ...(prefill.pfmea?.redovi || [])] },
    controlPlan: { redovi: [...(doc.controlPlan?.redovi || []), ...(prefill.controlPlan?.redovi || [])] },
    rpnSummary: izracunajRpnSummary([
      ...(doc.pfmea?.redovi || []),
      ...(prefill.pfmea?.redovi || []),
    ]),
  };
}

/** @deprecated koristi primeniPrefillNaPfmeaCpDoc */
export function spojiPrefillUPfmeaCpDoc(doc, prefill) {
  return primeniPrefillNaPfmeaCpDoc(doc, prefill);
}

/** Novi dokument iz 8D prefill-a. */
export function noviPfmeaCpDocIz8d(prefill) {
  return {
    id: null,
    naziv: prefill.naziv,
    idDeo: prefill.idDeo || "",
    revizija: prefill.revizija || "A",
    napomena: prefill.napomena || "",
    osmdIzvestajId: prefill.osmdId || null,
    broj8d: prefill.broj8d || "",
    pfmea: prefill.pfmea || { redovi: [] },
    controlPlan: prefill.controlPlan || { redovi: [] },
    rpnSummary: prefill.rpnSummary || [],
  };
}

export function izvuciOsmdIdIzNapomene(napomena) {
  const m = String(napomena || "").match(/#(\d+)/);
  return m ? Number(m[1]) : null;
}

export function izvuciBroj8dIzNapomene(napomena) {
  const m = String(napomena || "").match(/Preneto iz 8D\s+([^\s·#]+)/);
  return m ? trim(m[1]) : "";
}
