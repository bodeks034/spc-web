/** Status za shop-floor traku na liniji — alarmi, moment, ERP, NCR, NOK streak. */

import { brojUzastopnihNok } from "./kontekstualniVodic.js";
import { AUTO_PRAGOVI } from "./autoAkcije.js";

const danasIso = () => new Date().toISOString().split("T")[0];

export function izracunajMomentPct(ok = 0, nok = 0) {
  const uk = ok + nok;
  return uk > 0 ? Math.round((ok / uk) * 100) : null;
}

async function ucitajNokStreak(supabase, { idDeo, smena, modul = "merljive", danas }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { nokUzastopna: 0, nokPozicija: null, pragPauze: AUTO_PRAGOVI.nokUzastopnaEskalacija };

  const mod = String(modul || "merljive").toLowerCase();
  const tabela = mod === "atributivne" ? "kontrolni_log" : "merenja_varijabilna";
  const polje = mod === "atributivne" ? "greska_naziv" : "pozicija";
  const select = mod === "atributivne"
    ? "status,nok_kolicina,greska_naziv,created_at"
    : "status,pozicija,created_at";

  let q = supabase.from(tabela).select(select).eq("id_deo", id).eq("datum", danas);
  if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
  const { data } = await q.order("created_at", { ascending: false }).limit(40);
  const { max, pozicija } = brojUzastopnihNok(data || [], polje);

  return {
    nokUzastopna: max,
    nokPozicija: pozicija,
    pragPauze: AUTO_PRAGOVI.nokUzastopnaEskalacija,
  };
}

export async function ucitajShopFloorStatus(supabase, {
  idDeo = "",
  smena = null,
  linija = "",
  modul = "merljive",
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const danas = danasIso();

  let alarmQ = supabase.from("spc_alarmi")
    .select("id,pravilo,status,datum", { count: "exact", head: false })
    .eq("status", "otvoren")
    .gte("datum", danas)
    .order("created_at", { ascending: false })
    .limit(20);
  if (id) alarmQ = alarmQ.eq("id_deo", id);

  let momentQ = supabase.from("moment_protokol")
    .select("status")
    .eq("datum", danas);
  if (id) momentQ = momentQ.eq("id_deo", id);
  if (smena) momentQ = momentQ.eq("smena", Number(smena));
  if (linija) momentQ = momentQ.eq("linija", String(linija).trim());

  let ncrQ = supabase.from("ncr_capa")
    .select("id,broj_ncr,status", { count: "exact", head: false })
    .not("status", "eq", "zatvoren")
    .order("created_at", { ascending: false })
    .limit(10);
  if (id) ncrQ = ncrQ.eq("id_deo", id);

  const erpQ = supabase.from("erp_uvoz_log")
    .select("created_at,uspeh,izvor,detalj")
    .order("created_at", { ascending: false })
    .limit(1);

  const [alarmRes, momentRes, ncrRes, erpRes, nokStreak] = await Promise.all([
    alarmQ,
    momentQ,
    ncrQ,
    erpQ,
    ucitajNokStreak(supabase, { idDeo: id, smena, modul, danas }),
  ]);

  let momentOk = 0;
  let momentNok = 0;
  for (const r of momentRes.data || []) {
    if (r.status === "OK") momentOk += 1;
    else if (r.status === "NOK") momentNok += 1;
  }

  return {
    spcAlarmiOtvoreni: alarmRes.data?.length ?? 0,
    spcAlarmi: alarmRes.data || [],
    ncrOtvoreni: ncrRes.error ? 0 : (ncrRes.data?.length ?? 0),
    ncrLista: ncrRes.error ? [] : (ncrRes.data || []),
    momentOk,
    momentNok,
    momentPctOk: izracunajMomentPct(momentOk, momentNok),
    poslednjiErpUvoz: erpRes.data?.[0] || null,
    nokUzastopna: nokStreak.nokUzastopna,
    nokPozicija: nokStreak.nokPozicija,
    pragPauze: nokStreak.pragPauze,
    kalIstekle: await brojKalIsteklih(supabase),
    msaKasni: await brojMsaKasni(supabase),
    greska: alarmRes.error?.message || momentRes.error?.message || ncrRes.error?.message || null,
  };
}

async function brojKalIsteklih(supabase) {
  try {
    const { data: mer } = await supabase.from("merila")
      .select("kalibracije(sledeca_kal,datum_kal)")
      .eq("aktivno", true);
    const danas = new Date();
    let n = 0;
    for (const m of mer || []) {
      const kal = (m.kalibracije || []).sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];
      if (kal?.sledeca_kal && new Date(kal.sledeca_kal) < danas) n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}

async function brojMsaKasni(supabase) {
  try {
    const { daniDoStudije } = await import("./msaKalendar.js");
    const { data: msa } = await supabase.from("msa_kalendar").select("sledeca_studija");
    let n = 0;
    for (const r of msa || []) {
      const d = daniDoStudije(r.sledeca_studija);
      if (d !== null && d < 0) n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}
