/** SPC alarm workflow — blokada linije, potvrda operatera, karantin, zatvaranje. */

import { kreirajAutoEskalaciju, upisiSpcAlarm } from "./spcStats.js";
import { obavestiAdminZahtev } from "./adminZahtevNotifikacije.js";
import { vrednostZaKarte } from "./varijabilneUtils.js";
import {
  NOK_ALARM_PROCENAT,
  NOK_ALARM_MIN_NOK,
  NOK_ALARM_PO_KLASI,
  normalizujKlasaDefekta,
  nokAlarmProcenatZaKlasu,
  labelKlasaSaPragom,
  statistikaNokSerije,
  pozicijeSaPrekoracenimNok,
} from "./spcAlarmPragovi.js";

export {
  NOK_ALARM_PROCENAT,
  NOK_ALARM_MIN_NOK,
  NOK_ALARM_PO_KLASI,
  normalizujKlasaDefekta,
  nokAlarmProcenatZaKlasu,
  labelKlasaSaPragom,
  statistikaNokSerije,
  pozicijeSaPrekoracenimNok,
};

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export function normalizujIdDeo(idDeo) {
  return String(idDeo || "").trim().toUpperCase();
}

const BLOKIRAJUCI_STATUSI = ["otvoren", "karantin"];

async function ucitajAlarmPoId(supabase, alarmId) {
  const { data, error } = await supabase
    .from("spc_alarmi")
    .select("*")
    .eq("id", alarmId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** UPDATE + select jednog reda — bez .single() greške kad je red već promenjen. */
async function azurirajAlarmJedan(supabase, alarmId, patch, { dozvoljeniStari = [] } = {}) {
  let q = supabase.from("spc_alarmi").update(patch).eq("id", alarmId);
  if (dozvoljeniStari.length) q = q.in("status", dozvoljeniStari);
  const { data, error } = await q.select("*");
  if (error) throw error;
  if (data?.length === 1) return data[0];
  if (data?.length > 1) return data[0];

  const trenutni = await ucitajAlarmPoId(supabase, alarmId);
  if (!trenutni) throw new Error("Alarm više ne postoji u bazi.");
  return trenutni;
}

export async function ucitajBlokirajuciSpcAlarm(supabase, idDeo) {
  const deo = normalizujIdDeo(idDeo);
  if (deo.length < 3) return null;

  const { data, error } = await supabase
    .from("spc_alarmi")
    .select("*")
    .eq("id_deo", deo)
    .in("status", BLOKIRAJUCI_STATUSI)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** @deprecated koristi ucitajBlokirajuciSpcAlarm */
export async function ucitajOtvorenSpcAlarm(supabase, idDeo) {
  return ucitajBlokirajuciSpcAlarm(supabase, idDeo);
}

export async function ucitajAktivneSpcAlarme(supabase) {
  const { data, error } = await supabase
    .from("spc_alarmi")
    .select("*")
    .in("status", ["otvoren", "potvrden", "karantin"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

async function pustiKarantinZaAlarm(supabase, alarmId, radnikId) {
  if (!alarmId) return;
  await supabase.from("karantin_lotovi").update({
    status: "pusten",
    pustio_id: radnikId || null,
    updated_at: new Date().toISOString(),
  }).eq("spc_alarm_id", alarmId).eq("status", "aktivan");
}

export async function potvrdiSpcAlarm(supabase, { alarmId, radnikId, komentar }) {
  const txt = String(komentar || "").trim();
  if (!txt) throw new Error("Komentar je obavezan pre nastavka rada.");

  const trenutni = await ucitajAlarmPoId(supabase, alarmId);
  if (!trenutni) throw new Error("Alarm više ne postoji.");
  if (trenutni.status === "potvrden" || trenutni.status === "zatvoren") {
    return { id: trenutni.id, status: trenutni.status };
  }
  if (trenutni.status === "karantin") {
    throw new Error("Alarm je u karantinu — čeka odluku kvaliteta/admina.");
  }

  const data = await azurirajAlarmJedan(
    supabase,
    alarmId,
    {
      status: "potvrden",
      komentar_operater: txt,
      potvrdio_id: radnikId || null,
      updated_at: new Date().toISOString(),
    },
    { dozvoljeniStari: ["otvoren"] },
  );
  return { id: data.id, status: data.status };
}

export async function karantinSpcAlarm(supabase, {
  alarm,
  radnikId,
  komentar,
  radniNalog = null,
}) {
  const txt = String(komentar || "").trim();
  if (!txt) throw new Error("Razlog karantina je obavezan.");
  if (!alarm?.id || !alarm?.id_deo) throw new Error("Alarm nije validan.");

  const opis = opisSpcAlarma(alarm);
  const esk = await kreirajAutoEskalaciju(supabase, {
    id_deo: alarm.id_deo,
    opis: `KARANTIN SPC: ${opis} — ${txt}`,
    prioritet: "kriticno",
    kreirao_id: radnikId,
    prefiks: "KARANTIN-SPC",
    korektivna_akcija: "HOLD proizvodnje / lota dok kvalitet ne odobri puštanje.",
  });

  const data = await azurirajAlarmJedan(
    supabase,
    alarm.id,
    {
      status: "karantin",
      komentar_operater: txt,
      potvrdio_id: radnikId || null,
      eskalacija_id: esk?.id || null,
      updated_at: new Date().toISOString(),
    },
    { dozvoljeniStari: ["otvoren"] },
  );

  const rn = String(radniNalog || "").trim().toUpperCase() || null;
  const { error: kErr } = await supabase.from("karantin_lotovi").insert({
    id_deo: alarm.id_deo,
    radni_nalog: rn,
    razlog: txt,
    spc_alarm_id: alarm.id,
    eskalacija_id: esk?.id || null,
    kreirao_id: radnikId || null,
    status: "aktivan",
  });
  if (kErr && !String(kErr.message || "").includes("does not exist")) {
    throw kErr;
  }

  obavestiAdminZahtev(supabase, {
    tip: "spc_karantin",
    zahtev: { ...data, razlog: txt, radni_nalog: rn },
    kanali: "remote",
  }).catch(() => {});

  return { alarm: data, eskalacijaId: esk?.id };
}

export async function zatvoriSpcAlarm(supabase, { alarmId, radnikId, komentar }) {
  const txt = String(komentar || "").trim();
  if (!txt) throw new Error("Komentar zatvaranja je obavezan.");

  const trenutni = await ucitajAlarmPoId(supabase, alarmId);
  if (!trenutni) throw new Error("Alarm više ne postoji.");
  if (trenutni.status === "zatvoren") return trenutni;

  const data = await azurirajAlarmJedan(
    supabase,
    alarmId,
    {
      status: "zatvoren",
      komentar_zatvaranja: txt,
      zatvorio_id: radnikId || null,
      updated_at: new Date().toISOString(),
    },
    { dozvoljeniStari: ["otvoren", "potvrden", "karantin"] },
  );
  await pustiKarantinZaAlarm(supabase, alarmId, radnikId);
  return data;
}

export function opisSpcAlarma(alarm) {
  if (!alarm) return "";
  const deo = alarm.tip_karte ? `${alarm.tip_karte}-karta` : "SPC";
  const poz = alarm.pozicija ? ` · ${alarm.pozicija}` : "";
  return `${deo}${poz} · ${alarm.pravilo || "van kontrole"}`;
}

export function alarmBlokiraLiniju(alarm) {
  return !!alarm && BLOKIRAJUCI_STATUSI.includes(alarm.status);
}

const KLASA_NAZIVI = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

/** @deprecated koristi pozicijeSaPrekoracenimNok */
export function pozicijeSaPotpunimNok(rows) {
  return pozicijeSaPrekoracenimNok(rows).filter((p) => p.nok === p.uk);
}

/**
 * Alarm na liniji kad NOK u seriji pređe prag (podrazumevano ≥20%).
 * SPC karte (Western Electric) ne pale se automatski pri unosu — samo pri pregledu grafikona.
 */
export async function kreirajAlarmNokSerije(supabase, {
  idDeo,
  pozicija,
  merenja,
  lsl,
  usl,
  jedinica,
  radnikId,
  serija,
  nok,
  uk,
  proc,
  prag,
  klasa,
}) {
  const deo = normalizujIdDeo(idDeo);
  const n = uk ?? merenja?.length ?? 0;
  const nokCnt = nok ?? (merenja || []).filter((r) => r.status === "NOK").length;
  if (!deo || n === 0 || nokCnt === 0) return null;

  const vals = merenja
    .map((m) => vrednostZaKarte(m.vrednost_raw, m.vrednost_dec, jedinica))
    .filter(Number.isFinite);
  const prosek = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const procTxt = Math.round((proc ?? nokCnt / n) * 100);
  const pragBroj = prag ?? nokAlarmProcenatZaKlasu(klasa);
  const pragTxt = Math.round(pragBroj * 100);
  const klasaNorm = normalizujKlasaDefekta(klasa);
  const klasaTxt = klasaNorm ? ` ${KLASA_NAZIVI[klasaNorm]}` : "";
  const serijaTxt = String(serija || "").trim() || "?";
  const pravilo = `NOK ≥${pragTxt}%${klasaTxt} (${nokCnt}/${n}) · S${serijaTxt}`;

  const { data: otvoren } = await supabase
    .from("spc_alarmi")
    .select("*")
    .eq("id_deo", deo)
    .eq("pozicija", pozicija)
    .eq("pravilo", pravilo)
    .eq("status", "otvoren")
    .limit(1);
  if (otvoren?.length) return otvoren[0];

  const { data: obradjen } = await supabase
    .from("spc_alarmi")
    .select("id")
    .eq("id_deo", deo)
    .eq("pozicija", pozicija)
    .eq("datum", dISO())
    .in("status", ["potvrden", "zatvoren"])
    .ilike("pravilo", `% · S${serijaTxt}%`)
    .limit(1);
  if (obradjen?.length) return null;

  const alarm = await upisiSpcAlarm(supabase, {
    id_deo: deo,
    datum: dISO(),
    tip_karte: "Linija",
    pozicija,
    pravilo,
    vrednost: prosek,
    ucl: usl ?? null,
    lcl: lsl ?? null,
  });

  const esk = await kreirajAutoEskalaciju(supabase, {
    id_deo: deo,
    opis: `${pozicija} · serija ${serija || "—"}: ${procTxt}% NOK (${nokCnt}/${n})`,
    prioritet: nokCnt >= n ? "kriticno" : "visok",
    kreirao_id: radnikId,
    prefiks: "AUTO-NOK-VAR",
    korektivna_akcija: `Proveriti uzrok — ${procTxt}% merenja van specifikacije (prag ${pragTxt}%${klasaTxt}).`,
  });

  if (alarm?.id && esk?.id) {
    await supabase.from("spc_alarmi").update({
      eskalacija_id: esk.id,
      updated_at: new Date().toISOString(),
    }).eq("id", alarm.id);
  }

  if (alarm?.id) {
    const { data: pun } = await supabase.from("spc_alarmi").select("*").eq("id", alarm.id).maybeSingle();
    return pun || alarm;
  }

  return alarm;
}

/** Proveri snimljenu seriju i kreiraj alarm(e) za pozicije iznad NOK praga. */
export async function proveriIKreirajAlarmeNokSerije(supabase, {
  rows,
  idDeo,
  radnikId,
  serija,
  kolone = [],
}) {
  const granice = Object.fromEntries(
    (kolone || [])
      .filter((k) => k.naziv && k.naziv !== "-")
      .map((k) => [k.naziv, { lsl: k.lslDec, usl: k.uslDec, jedinica: k.jedinica, klasa: k.klasa }]),
  );

  const kreirani = [];
  for (const { pozicija, merenja, nok, uk, proc, prag, klasa } of pozicijeSaPrekoracenimNok(
    rows,
    Object.fromEntries(Object.entries(granice).map(([p, g]) => [p, g.klasa])),
  )) {
    const g = granice[pozicija] || {};
    const alarm = await kreirajAlarmNokSerije(supabase, {
      idDeo,
      pozicija,
      merenja,
      lsl: g.lsl,
      usl: g.usl,
      jedinica: g.jedinica,
      radnikId,
      serija,
      nok,
      uk,
      proc,
      prag,
      klasa: klasa || g.klasa,
    });
    if (alarm) kreirani.push(alarm);
  }
  return kreirani;
}
