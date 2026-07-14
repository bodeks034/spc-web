/**
 * Automatske akcije iz pravila (bez LLM) — NOK streak, draft NCR, KPI dorada.
 */

import { brojUzastopnihNok } from "./kontekstualniVodic.js";
import { kreirajAutoEskalaciju } from "./spcStats.js";
import { snimiNcrCapa } from "./ncrCapa.js";
import { normalizujIdDeo } from "./idDeoUtil.js";
import { ucitajPodesavanjaNotifikacija } from "./notifikacije.js";
import { posaljiAutoObavestenje } from "./autoObavestenja.js";
import { jeAutoPraviloUkljuceno } from "./autoPodesavanja.js";
import { zapisAutoAkcijuBrowser } from "./autoRunLog.js";

export const AUTO_PRAGOVI = {
  nokUzastopnaEskalacija: 3,
  nokUzastopnaNcr: 3,
  prozorSati: 24,
};

function danasIso() {
  return new Date().toISOString().slice(0, 10);
}

async function ucitajSkorasnjiLog(supabase, { modul, idDeo, datum, smena, limit = 40 }) {
  const id = normalizujIdDeo(idDeo);
  const iso = datum || danasIso();
  if (modul === "merljive") {
    let q = supabase.from("merenja_varijabilna")
      .select("status,pozicija,created_at,datum,smena")
      .eq("id_deo", id)
      .eq("datum", iso);
    if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
    const { data } = await q
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  }
  let q = supabase.from("kontrolni_log")
    .select("status,nok_kolicina,greska_naziv,created_at,datum,smena")
    .eq("id_deo", id)
    .eq("datum", iso);
  if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
  const { data } = await q
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

async function kreirajAutoNcrDraft(supabase, {
  id_deo,
  opis,
  prioritet = "visok",
  kreirao_id,
  prefiks = "AUTO-NCR",
}) {
  const since = new Date(Date.now() - AUTO_PRAGOVI.prozorSati * 3600000).toISOString();
  const { data: existing } = await supabase.from("ncr_capa")
    .select("id,broj_ncr")
    .eq("id_deo", normalizujIdDeo(id_deo))
    .in("status", ["otvoren", "analiza", "akcija", "verifikacija"])
    .gte("created_at", since)
    .ilike("opis", `${prefiks}%`)
    .limit(1);
  if (existing?.length) return { vecPostojao: true, row: existing[0] };

  const row = await snimiNcrCapa(supabase, {
    id_deo: normalizujIdDeo(id_deo),
    opis: `${prefiks}: ${opis}`,
    uzrok: "",
    korektivna: "",
    status: "otvoren",
    prioritet,
    izvor: "auto_pravilo",
  }, { kreiraoId: kreirao_id });
  return { vecPostojao: false, row };
}

async function obavestiAutoNokStreak(supabase, rez, ctx) {
  if (rez.nokUzastopna < AUTO_PRAGOVI.nokUzastopnaEskalacija) return;
  try {
    const settings = await ucitajPodesavanjaNotifikacija(supabase);
    const ncrTxt = rez.ncr && !rez.ncr.vecPostojao
      ? ` · NCR ${rez.ncr.row?.broj_ncr || "draft"}`
      : "";
    await posaljiAutoObavestenje(supabase, settings, {
      id: `auto_nok3_${normalizujIdDeo(ctx.idDeo)}_${ctx.datum || danasIso()}`,
      naslov: `${rez.nokUzastopna} NOK uzastopna — ${normalizujIdDeo(ctx.idDeo)}`,
      opis: `Poz. ${rez.pozicija || "—"} · smena ${ctx.smena || "—"}${ncrTxt} · auto eskalacija`,
      nivo: rez.nokUzastopna >= 4 ? "kriticno" : "visok",
    });
  } catch { /* */ }
}

/**
 * Proveri uzastopne NOK i pokreni eskalaciju + draft NCR.
 * @returns {{ eskalacija?, ncr?, nokUzastopna, pozicija? }}
 */
export async function proveriUzastopniNokIAktiviraj(supabase, {
  modul = "merljive",
  idDeo,
  datum,
  smena,
  radniNalog,
  kreiraoId,
} = {}) {
  const id = normalizujIdDeo(idDeo);
  if (!id || id.length < 3) return { nokUzastopna: 0 };

  const logRedovi = await ucitajSkorasnjiLog(supabase, { modul, idDeo: id, datum, smena });
  const polje = modul === "merljive" ? "pozicija" : "greska_naziv";
  const { max: nokUzastopna, pozicija: nokPozicija } = brojUzastopnihNok(logRedovi, polje);

  if (nokUzastopna < AUTO_PRAGOVI.nokUzastopnaEskalacija) {
    return { nokUzastopna, pozicija: nokPozicija };
  }

  const settings = await ucitajPodesavanjaNotifikacija(supabase);
  if (!jeAutoPraviloUkljuceno(settings, "nok3")) {
    return { nokUzastopna, pozicija: nokPozicija, preskoceno: true };
  }

  const prefiksEsk = modul === "merljive" ? "AUTO-NOK-3X-VAR" : "AUTO-NOK-3X";
  const opisEsk = `${nokUzastopna} NOK uzastopna${nokPozicija ? ` na poz. ${nokPozicija}` : ""}`
    + `${smena ? ` · smena ${smena}` : ""}`;

  const eskalacija = await kreirajAutoEskalaciju(supabase, {
    id_deo: id,
    opis: opisEsk,
    prioritet: nokUzastopna >= 4 ? "kriticno" : "visok",
    kreirao_id: kreiraoId,
    prefiks: prefiksEsk,
    korektivna_akcija: "Proveriti alat / podešavanje pre nastavka proizvodnje.",
  });

  let ncr = null;
  if (nokUzastopna >= AUTO_PRAGOVI.nokUzastopnaNcr) {
    ncr = await kreirajAutoNcrDraft(supabase, {
      id_deo: id,
      opis: opisEsk,
      prioritet: nokUzastopna >= 4 ? "kriticno" : "visok",
      kreirao_id: kreiraoId,
      prefiks: "AUTO-NCR-3X",
    });
  }

  await zapisAutoAkcijuBrowser(supabase, {
    tip: "nok3_streak",
    entitet: "eskalacije",
    entitetId: eskalacija?.id,
    idDeo: id,
    opis: `${nokUzastopna}× NOK uzastopna${ncr?.row ? ` · NCR ${ncr.row.broj_ncr}` : ""}`,
    meta: { modul, smena, pozicija: nokPozicija },
  });

  return { eskalacija, ncr, nokUzastopna, pozicija: nokPozicija };
}

/** Pozovi posle uspešnog snimanja merljive serije. */
export async function posleSnimanjaMerljiva(supabase, ctx, { onToast } = {}) {
  const rez = await proveriUzastopniNokIAktiviraj(supabase, {
    modul: "merljive",
    idDeo: ctx.idDeo,
    datum: ctx.datum,
    smena: ctx.smena,
    radniNalog: ctx.radniNalog,
    kreiraoId: ctx.kreiraoId,
  });
  if (rez.nokUzastopna >= AUTO_PRAGOVI.nokUzastopnaEskalacija) {
    const msg = `⚠ ${rez.nokUzastopna} NOK uzastopna — auto eskalacija`
      + (rez.ncr && !rez.ncr.vecPostojao ? " + NCR draft" : "");
    onToast?.(msg, "greska");
    await obavestiAutoNokStreak(supabase, rez, ctx);
  }
  return rez;
}

/** Pozovi posle uspešnog snimanja atributivnog paketa. */
export async function posleSnimanjaAtributivne(supabase, ctx, { onToast } = {}) {
  const rez = await proveriUzastopniNokIAktiviraj(supabase, {
    modul: "atributivne",
    idDeo: ctx.idDeo,
    datum: ctx.datum,
    smena: ctx.smena,
    radniNalog: ctx.radniNalog,
    kreiraoId: ctx.kreiraoId,
  });
  if (rez.nokUzastopna >= AUTO_PRAGOVI.nokUzastopnaEskalacija) {
    const msg = `⚠ ${rez.nokUzastopna} NOK uzastopna — auto eskalacija`
      + (rez.ncr && !rez.ncr.vecPostojao ? " + NCR draft" : "");
    onToast?.(msg, "greska");
    await obavestiAutoNokStreak(supabase, rez, ctx);
  }
  return rez;
}

/** KPI dorada uneta — informativno obaveštenje (proaktivni „nema dorade“ prestaje sam). */
export async function posleSnimanjaKpiDorade(supabase, {
  idDeo,
  datum,
  smena,
  dorada,
  neusaglaseno,
  kpiId,
} = {}) {
  const dor = Number(dorada) || 0;
  const neus = Number(neusaglaseno) || 0;
  if (dor <= 0 || neus <= 0) return { ok: false };
  try {
    const settings = await ucitajPodesavanjaNotifikacija(supabase);
    await posaljiAutoObavestenje(supabase, settings, {
      id: `kpi_dorada_reseno_${kpiId || `${normalizujIdDeo(idDeo)}_${datum}`}`,
      naslov: `Dorada uneta — ${normalizujIdDeo(idDeo)}`,
      opis: `Smena ${smena || "—"} · dorada ${dor} za ${neus} neusaglašenih`,
      nivo: "info",
    });
  } catch { /* */ }
  return { ok: true };
}

/** Obaveštenje kad se NCR zatvori (eskalacije/SPC alarmi auto-zatvoreni). */
export async function obavestiNcrZatvoren(supabase, ncr, {
  eskalacije = [],
  spcAlarmi = [],
} = {}) {
  if (!ncr?.id || ncr.status !== "zatvoren") return { ok: false };
  try {
    const settings = await ucitajPodesavanjaNotifikacija(supabase);
    if (!jeAutoPraviloUkljuceno(settings, "ncr_zatvori")) return { ok: false, preskoceno: true };
    const delovi = [
      `Deo ${ncr.id_deo || "—"}`,
      `Status: zatvoren`,
    ];
    if (eskalacije.length) delovi.push(`Eskalacije auto-zatvorene: ${eskalacije.length}`);
    if (spcAlarmi.length) delovi.push(`SPC alarmi auto-zatvoreni: ${spcAlarmi.length}`);
    await posaljiAutoObavestenje(supabase, settings, {
      id: `auto_ncr_zatvoren_${ncr.id}`,
      naslov: `NCR zatvoren — ${ncr.broj_ncr || ncr.id}`,
      opis: delovi.join(" · "),
      nivo: spcAlarmi.length || eskalacije.length ? "srednji" : "info",
    });
    await zapisAutoAkcijuBrowser(supabase, {
      tip: "ncr_zatvoren",
      entitet: "ncr_capa",
      entitetId: ncr.id,
      idDeo: ncr.id_deo,
      opis: `NCR ${ncr.broj_ncr} zatvoren · esk=${eskalacije.length} spc=${spcAlarmi.length}`,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
