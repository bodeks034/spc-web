import {
  fetchDobavljaci,
  fetchMaterijaliDobavljaca,
  fetchPrijemneKontrole,
} from "./dobavljaciApi.js";
import { napraviPredlogOcene } from "./ocenaDobavljaca.js";
import { fetchOceneDobavljaca } from "./ocenaDobavljacaApi.js";

function broj(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function izracunajDobavljacStat(redovi = []) {
  const stat = redovi.reduce((a, r) => {
    a.prijema += 1;
    a.primljeno += broj(r.primljeno);
    a.kontrolisano += broj(r.kontrolisano);
    a.ok += broj(r.ok_kolicina);
    a.nok += broj(r.nok_kolicina);
    if (r.status === "prihvaceno") a.prihvaceno += 1;
    if (r.status === "odbijeno") a.odbijeno += 1;
    if (r.status === "uslovno") a.uslovno += 1;
    if (r.status === "otvoreno") a.otvoreno += 1;
    return a;
  }, {
    prijema: 0, primljeno: 0, kontrolisano: 0, ok: 0, nok: 0,
    prihvaceno: 0, odbijeno: 0, uslovno: 0, otvoreno: 0,
  });

  stat.okStopa = stat.kontrolisano > 0 ? +(stat.ok / stat.kontrolisano * 100).toFixed(2) : 0;
  stat.ppm = stat.kontrolisano > 0 ? Math.round(stat.nok / stat.kontrolisano * 1e6) : 0;
  stat.prihvatPrijema = stat.prijema > 0 ? +(stat.prihvaceno / stat.prijema * 100).toFixed(2) : 0;
  return stat;
}

export function agregirajDobavljacTrend(redovi = []) {
  const map = new Map();
  for (const r of redovi) {
    const datum = r.datum || "—";
    const a = map.get(datum) || { datum, prijema: 0, kontrolisano: 0, ok: 0, nok: 0 };
    a.prijema += 1;
    a.kontrolisano += broj(r.kontrolisano);
    a.ok += broj(r.ok_kolicina);
    a.nok += broj(r.nok_kolicina);
    map.set(datum, a);
  }
  return [...map.values()].sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
}

export function agregirajDobavljacDefekte(redovi = []) {
  const map = new Map();
  for (const r of redovi) {
    if (!r.defekt || broj(r.nok_kolicina) <= 0) continue;
    map.set(r.defekt, (map.get(r.defekt) || 0) + broj(r.nok_kolicina));
  }
  return [...map.entries()]
    .map(([defekt, kolicina]) => ({ defekt, kolicina }))
    .sort((a, b) => b.kolicina - a.kolicina);
}

export function agregirajDobavljacMaterijale(redovi = [], master = []) {
  const bySifra = new Map(master.map((m) => [m.sifra_materijala, {
    sifra_materijala: m.sifra_materijala,
    naziv_materijala: m.naziv_materijala,
    kontrolisano: 0,
    ok: 0,
    nok: 0,
  }]));
  for (const r of redovi) {
    const sifra = r.sifra_materijala || r.id_deo || "BEZ-ŠIFRE";
    const a = bySifra.get(sifra) || {
      sifra_materijala: sifra,
      naziv_materijala: r.id_deo ? "Deo / komponenta" : "Nije navedeno",
      kontrolisano: 0, ok: 0, nok: 0,
    };
    a.kontrolisano += broj(r.kontrolisano);
    a.ok += broj(r.ok_kolicina);
    a.nok += broj(r.nok_kolicina);
    bySifra.set(sifra, a);
  }
  return [...bySifra.values()].map((m) => ({
    ...m,
    okStopa: m.kontrolisano > 0 ? +(m.ok / m.kontrolisano * 100).toFixed(2) : "—",
  }));
}

export async function fetchIzvestajDobavljacPodaci({ sifraDobavljaca, period = "30" } = {}) {
  if (!sifraDobavljaca) throw new Error("Izaberite dobavljača");
  const od = new Date();
  od.setDate(od.getDate() - Number(period || 30));
  const datumOd = od.toISOString().slice(0, 10);

  const [dobavljaci, sviMaterijali, kontrole] = await Promise.all([
    fetchDobavljaci(),
    fetchMaterijaliDobavljaca({ samoAktivni: false }),
    fetchPrijemneKontrole({ sifraDobavljaca, datumOd, limit: 5000 }),
  ]);
  const dobavljac = dobavljaci.find((d) => d.sifra_dobavljaca === sifraDobavljaca)
    || { sifra_dobavljaca: sifraDobavljaca, naziv_dobavljaca: sifraDobavljaca };
  const masterMaterijali = sviMaterijali.filter((m) => m.sifra_dobavljaca === sifraDobavljaca);
  const stat = izracunajDobavljacStat(kontrole);
  let istorijaOcena = [];
  try {
    istorijaOcena = await fetchOceneDobavljaca(sifraDobavljaca);
  } catch (e) {
    if (!/71_ocena_dobavljaca|ocene_dobavljaca|does not exist|schema cache/i.test(String(e?.message || ""))) {
      throw e;
    }
  }

  return {
    dobavljac,
    period,
    datumOd,
    periodDo: new Date().toISOString().slice(0, 10),
    kontrole,
    stat,
    trend: agregirajDobavljacTrend(kontrole),
    defekti: agregirajDobavljacDefekte(kontrole),
    materijali: agregirajDobavljacMaterijale(kontrole, masterMaterijali),
    predlogOcene: napraviPredlogOcene(stat),
    istorijaOcena,
  };
}
