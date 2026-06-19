import { chartDataWithWesternElectric, WE_MIN_PODGRUPA_OBRAZAC, groupSpcRows } from "./spcStats.js";
import {
  podgrupeMerenja,
  izracunajXbarRKarte,
  izracunajIMRKarte,
} from "./varijabilneSpcStats.js";

export const TIPOVI_ATRIBUTIVNE = [
  { id: "p", label: "p-Karta" },
  { id: "np", label: "np-Karta" },
  { id: "c", label: "C-Karta" },
  { id: "nc", label: "nC-Karta" },
  { id: "u", label: "u-Karta" },
];

export const TIPOVI_MERLJIVE = [
  { id: "xbar", label: "X̄-Karta" },
  { id: "r", label: "R-Karta" },
  { id: "i", label: "I-Karta" },
  { id: "mr", label: "MR-Karta" },
];

export function danasIso() {
  return new Date().toISOString().split("T")[0];
}

/** Zamrznuti CL/UCL/LCL na svim tačkama + ponovo Western Electric. */
export function primeniBaselineNaPodatke(podaci, baseline) {
  if (!baseline || !podaci?.length) return { podaci: podaci || [], baseline: null };
  const cl = Number(baseline.cl);
  const ucl = Number(baseline.ucl);
  const lcl = Number(baseline.lcl);
  if (![cl, ucl, lcl].every(Number.isFinite)) {
    return { podaci: podaci || [], baseline: null };
  }
  const osnovni = podaci.map((d) => ({ ...d, cl, ucl, lcl }));
  return {
    podaci: chartDataWithWesternElectric(osnovni, {
      obrazacPravila: osnovni.length >= WE_MIN_PODGRUPA_OBRAZAC,
    }),
    baseline,
  };
}

/** Aktivni baseline: najnoviji vazi_od <= datum za deo+tip(+pozicija). */
export async function ucitajAktivniBaseline(supabase, {
  idDeo,
  tipKarte,
  pozicija = null,
  datum = danasIso(),
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const tip = String(tipKarte || "").trim().toLowerCase();
  if (!id || !tip) return null;

  let q = supabase
    .from("spc_baseline")
    .select("id,id_deo,tip_karte,pozicija,cl,ucl,lcl,vazi_od,napomena,kreirao_id,created_at")
    .eq("id_deo", id)
    .eq("tip_karte", tip)
    .lte("vazi_od", datum)
    .order("vazi_od", { ascending: false })
    .limit(1);

  const poz = pozicija ? String(pozicija).trim() : "";
  q = poz ? q.eq("pozicija", poz) : q.is("pozicija", null);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function ucitajBaselineListu(supabase, { idDeo, modul } = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return [];

  const tipovi = modul === "merljive"
    ? TIPOVI_MERLJIVE.map((t) => t.id)
    : TIPOVI_ATRIBUTIVNE.map((t) => t.id);

  const { data, error } = await supabase
    .from("spc_baseline")
    .select("id,id_deo,tip_karte,pozicija,cl,ucl,lcl,vazi_od,napomena,created_at")
    .eq("id_deo", id)
    .in("tip_karte", tipovi)
    .order("vazi_od", { ascending: false })
    .order("tip_karte", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function snimiBaseline(supabase, payload, korisnik) {
  const row = {
    id_deo: String(payload.id_deo || "").trim().toUpperCase(),
    tip_karte: String(payload.tip_karte || "").trim().toLowerCase(),
    pozicija: payload.pozicija ? String(payload.pozicija).trim() : null,
    cl: Number(payload.cl),
    ucl: Number(payload.ucl),
    lcl: Number(payload.lcl),
    vazi_od: payload.vazi_od || danasIso(),
    napomena: payload.napomena?.trim() || null,
    kreirao_id: korisnik?.radnikId || null,
  };

  if (!row.id_deo || !row.tip_karte) {
    return { ok: false, error: new Error("ID dela i tip karte su obavezni.") };
  }
  if (![row.cl, row.ucl, row.lcl].every(Number.isFinite)) {
    return { ok: false, error: new Error("CL, UCL i LCL moraju biti brojevi.") };
  }
  if (row.lcl > row.cl || row.cl > row.ucl) {
    return { ok: false, error: new Error("Granice moraju biti LCL ≤ CL ≤ UCL.") };
  }

  const { data, error } = await supabase
    .from("spc_baseline")
    .insert(row)
    .select()
    .single();

  if (error) return { ok: false, error };
  return { ok: true, data };
}

export function formatBaselineBadge(baseline) {
  if (!baseline) return null;
  const od = baseline.vazi_od
    ? new Date(baseline.vazi_od).toLocaleDateString("sr-RS")
    : "—";
  const poz = baseline.pozicija ? ` · ${baseline.pozicija}` : "";
  return `PPAP baseline (od ${od})${poz}`;
}

/** Ista logika kao SPC karte — fiksne granice iz agregata (p̄, c̄, X̄̄, R̄…). */
export function izracunajGraniceAtributivne(rawData, tipKarte, grupisanje = "dan") {
  const tip = String(tipKarte || "").trim().toLowerCase();
  const grupe = groupSpcRows(rawData || [], grupisanje);
  if (!grupe.length && tip !== "c") return null;

  const ukNOK = grupe.reduce((s, g) => s + g.nok, 0);
  const ukN = grupe.reduce((s, g) => s + g.n, 0);
  const pBar = ukN > 0 ? ukNOK / ukN : 0;
  const cBar = grupe.length > 0 ? grupe.reduce((s, g) => s + g.c, 0) / grupe.length : 0;
  const uBar = ukN > 0 ? grupe.reduce((s, g) => s + g.c, 0) / ukN : 0;
  const nBar = grupe.length > 0 ? ukN / grupe.length : 1;

  if (tip === "p") {
    const sigma = Math.sqrt(pBar * (1 - pBar) / Math.max(nBar, 1));
    return {
      cl: +((pBar) * 100).toFixed(6),
      ucl: +((pBar + 3 * sigma) * 100).toFixed(6),
      lcl: +(Math.max(0, pBar - 3 * sigma) * 100).toFixed(6),
      meta: `${grupe.length} podgrupa · n̄=${Math.round(nBar)}`,
    };
  }
  if (tip === "np") {
    const sigma = Math.sqrt(pBar * (1 - pBar) * nBar);
    const cl = pBar * nBar;
    return {
      cl: +cl.toFixed(6),
      ucl: +(cl + 3 * sigma).toFixed(6),
      lcl: +(Math.max(0, cl - 3 * sigma)).toFixed(6),
      meta: `n̄=${Math.round(nBar)}`,
    };
  }
  if (tip === "c" || tip === "nc") {
    const sigma = Math.sqrt(Math.max(cBar, 0.001));
    return {
      cl: +cBar.toFixed(6),
      ucl: +(cBar + 3 * sigma).toFixed(6),
      lcl: +(Math.max(0, cBar - 3 * sigma)).toFixed(6),
      meta: `${grupe.length} podgrupa`,
    };
  }
  if (tip === "u") {
    const sigma = Math.sqrt(uBar / Math.max(nBar, 1));
    return {
      cl: +uBar.toFixed(6),
      ucl: +(uBar + 3 * sigma).toFixed(6),
      lcl: +(Math.max(0, uBar - 3 * sigma)).toFixed(6),
      meta: `n̄=${Math.round(nBar)}`,
    };
  }
  return null;
}

export function izracunajGraniceMerljive(rawData, tipKarte, { nPodgrupa = 5, jedinica = "mm" } = {}) {
  const tip = String(tipKarte || "").trim().toLowerCase();
  const podgrupe = podgrupeMerenja(rawData || [], nPodgrupa, jedinica);
  const spc = izracunajXbarRKarte(podgrupe, nPodgrupa);
  const imr = izracunajIMRKarte(rawData || [], jedinica);

  if (tip === "xbar") {
    if (!spc.xbarPodaci?.length) return null;
    return {
      cl: spc.xbarBar,
      ucl: spc.uclX,
      lcl: spc.lclX,
      meta: `${podgrupe.length} podgrupa · n=${nPodgrupa}`,
    };
  }
  if (tip === "r") {
    if (!spc.rPodaci?.length) return null;
    return {
      cl: spc.rBar,
      ucl: spc.uclR,
      lcl: spc.lclR,
      meta: `${podgrupe.length} podgrupa · n=${nPodgrupa}`,
    };
  }
  if (tip === "i") {
    if (!imr.iPodaci?.length) return null;
    return {
      cl: imr.xBar,
      ucl: imr.uclI,
      lcl: imr.lclI,
      meta: `${imr.iPodaci.length} merenja`,
    };
  }
  if (tip === "mr") {
    if (!imr.mrPodaci?.length) return null;
    return {
      cl: imr.mrBar,
      ucl: imr.uclMR,
      lcl: imr.lclMR,
      meta: `${imr.mrPodaci.length} opsega`,
    };
  }
  return null;
}

/** Učitaj istoriju i izračunaj CL/UCL/LCL kao na karti. */
export async function preuzmiGraniceIzGrafa(supabase, {
  modul,
  idDeo,
  tipKarte,
  pozicija = null,
  nPodgrupa = 5,
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const tip = String(tipKarte || "").trim().toLowerCase();
  if (!id || !tip) return null;

  if (modul === "merljive") {
    const poz = String(pozicija || "").trim();
    if (!poz) return null;

    let q = supabase.from("merenja_varijabilna")
      .select("*")
      .eq("id_deo", id)
      .eq("pozicija", poz)
      .order("datum", { ascending: true })
      .order("created_at", { ascending: true });

    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) return null;

    const { data: kar } = await supabase
      .from("karakteristike_merljive")
      .select("jedinica")
      .eq("id_deo", id)
      .eq("pozicija", poz)
      .limit(1)
      .maybeSingle();

    return izracunajGraniceMerljive(data, tip, {
      nPodgrupa,
      jedinica: kar?.jedinica || "mm",
    });
  }

  const { data, error } = await supabase
    .from("kontrolni_log")
    .select("datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv")
    .eq("id_deo", id)
    .order("datum", { ascending: true });

  if (error) throw error;
  if (!data?.length) return null;

  return izracunajGraniceAtributivne(data, tip);
}
