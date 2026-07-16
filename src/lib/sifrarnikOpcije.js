/** Liste za dropdown/datalist u šifrarniku i glavnom unosu. */

import {
  fetchLinije,
  fetchMasine,
  fetchKarakteristikeMerljive,
  fetchKupci,
} from "./sifrarnikApi.js";
import { fetchPogonLinijaMapa } from "./glavniUnosApi.js";
import { pogonMapaIzRedova, pogonSelectOpcije } from "./pogonOznaka.js";
import {
  fetchListeVrednosti,
  grupisiListePoKljucu,
  KLASE_FIKSNE,
  TIPOVI_FIKSNI,
} from "./sifrarnikListeApi.js";
import {
  reakcioniZaDropdown,
  jediniceZaDropdown,
  karakteristikeZaDropdown,
  instrumentiZaDropdown,
  filtrirajKarakteristikeBezBrojeva,
  karakteristikaImaBroj,
} from "./sifrarnikListeKanoni.js";
import listeSeed from "../data/sifrarnikListeSeed.json" with { type: "json" };

const PRAZNE_OPCIJE = {
  linija: [],
  operacija: [],
  linijaOperacija: {},
  masina: [],
  karakteristika: [],
  klasa: [],
  tip: [],
  jedinica: [],
  instrument: [],
  reakcioni: [],
  kupac: [],
};

function uniqSort(arr) {
  return [...new Set(
    (arr || []).map((s) => String(s).trim()).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, "sr"));
}

export function danasIso() {
  return new Date().toISOString().slice(0, 10);
}

export function stampAuditPolja(red, korisnik, { uvek = false } = {}) {
  const ime = korisnik?.ime?.trim() || "";
  if (!red) return red;
  if (uvek || !red.datum) {
    return { ...red, datum: danasIso(), podatke_uneo: ime || red.podatke_uneo || "" };
  }
  if (ime && !red.podatke_uneo) {
    return { ...red, podatke_uneo: ime };
  }
  return red;
}

export function stampAuditNaIzmenu(red, korisnik) {
  const ime = korisnik?.ime?.trim() || "";
  return {
    ...red,
    datum: danasIso(),
    podatke_uneo: ime || red.podatke_uneo || "",
  };
}

/** Mapa linija → operacije iz tabele linije + seed (glavni unos / SPC_atributivne). */
export function izgradiLinijaOperacijaMapu(linijeRows, seedMap = listeSeed.linija_operacija) {
  const map = {};
  const dodaj = (linija, operacija) => {
    const l = String(linija || "").trim();
    const o = String(operacija || "").trim();
    if (!l || !o) return;
    if (!map[l]) map[l] = new Set();
    map[l].add(o);
  };

  for (const r of linijeRows || []) {
    dodaj(r.linija, r.operacija);
  }
  for (const [linija, ops] of Object.entries(seedMap || {})) {
    for (const o of ops || []) dodaj(linija, o);
  }

  const out = {};
  for (const [l, set] of Object.entries(map)) {
    out[l] = [...set].sort((a, b) => a.localeCompare(b, "sr"));
  }
  return out;
}

function listeIzBazeIliSeeda(dbListe, karakteristike) {
  const gr = grupisiListePoKljucu(dbListe);
  const karPoz = (karakteristike || []).map((r) => r.pozicija).filter(Boolean);
  const karInst = (karakteristike || []).map((r) => r.merni_instrument).filter(Boolean);
  const karJed = (karakteristike || []).map((r) => r.jedinica).filter(Boolean);
  return {
    karakteristika: karakteristikeZaDropdown(
      listeSeed.karakteristika,
      gr.karakteristika,
      [...karPoz, ...(karakteristike || []).map((r) => r.naziv_mere)],
    ),
    reakcioni: reakcioniZaDropdown(gr.reakcioni_plan),
    instrument: instrumentiZaDropdown(listeSeed.instrument, gr.instrument, karInst),
    jedinica: jediniceZaDropdown(gr.jedinica, karJed),
  };
}

export async function ucitajSifrarnikOpcije() {
  const [linije, masine, pogon, karakteristike, dbListe, kupci] = await Promise.all([
    fetchLinije().catch(() => []),
    fetchMasine().catch(() => []),
    fetchPogonLinijaMapa().catch(() => []),
    fetchKarakteristikeMerljive({}).catch(() => []),
    fetchListeVrednosti().catch(() => []),
    fetchKupci({ samoAktivni: true }).catch(() => []),
  ]);

  const linijaOperacija = izgradiLinijaOperacijaMapu(linije);
  const liste = listeIzBazeIliSeeda(dbListe, karakteristike);
  const pogonPoKodu = pogonMapaIzRedova(pogon);

  const linijeNazivi = uniqSort([
    ...pogon.map((r) => r.linija_faza),
    ...linije.map((r) => r.linija),
    ...Object.keys(linijaOperacija),
  ]);

  const sveOperacije = uniqSort([
    ...Object.values(linijaOperacija).flat(),
  ]);

  return {
    linija: linijeNazivi,
    operacija: sveOperacije,
    linijaOperacija,
    pogon: pogonSelectOpcije(pogonPoKodu),
    pogonPoKodu,
    masina: (masine || [])
      .map((m) => ({
        id: String(m.id),
        label: `${m.id} — ${m.naziv || "?"}`,
        naziv: m.naziv || "",
        linija: m.linija || "",
      }))
      .sort((a, b) => Number(a.id) - Number(b.id)),
    karakteristika: liste.karakteristika,
    klasa: [...KLASE_FIKSNE],
    tip: [...TIPOVI_FIKSNI],
    jedinica: liste.jedinica,
    instrument: liste.instrument,
    reakcioni: liste.reakcioni,
    kupac: uniqSort((kupci || []).map((k) => k.naziv)),
  };
}

export function operacijeZaLiniju(opcije, linija) {
  const l = String(linija || "").trim();
  if (!l) return opcije?.operacija || [];
  return opcije?.linijaOperacija?.[l]?.length
    ? opcije.linijaOperacija[l]
    : (opcije?.operacija || []);
}

export function dopuniOpcijeIzRedova(opcije, redovi, mapa = {}) {
  const baza = { ...PRAZNE_OPCIJE, ...opcije };
  const out = { ...baza, linijaOperacija: { ...(opcije?.linijaOperacija || {}) } };
  const dodaj = (kljuc, vrednosti) => {
    out[kljuc] = uniqSort([...(out[kljuc] || []), ...vrednosti]);
  };

  for (const r of redovi || []) {
    for (const [polje, kljuc] of Object.entries(mapa)) {
      if (r[polje] == null || r[polje] === "") continue;
      if (kljuc === "karakteristika" && karakteristikaImaBroj(r[polje])) continue;
      dodaj(kljuc, [r[polje]]);
    }
    if (r.linija && r.operacija) {
      const l = String(r.linija).trim();
      const o = String(r.operacija).trim();
      if (!out.linijaOperacija[l]) out.linijaOperacija[l] = [];
      if (!out.linijaOperacija[l].includes(o)) {
        out.linijaOperacija[l] = [...out.linijaOperacija[l], o].sort((a, b) => a.localeCompare(b, "sr"));
      }
    }
  }
  return out;
}

export const GLAVNI_UNOS_OPCIJE_MAPA = {
  linija: "linija",
  operacija: "operacija",
  karakteristika: "karakteristika",
  klasa: "klasa",
  tip: "tip",
  jedinica: "jedinica",
  instrument: "instrument",
  kupac: "kupac",
};
