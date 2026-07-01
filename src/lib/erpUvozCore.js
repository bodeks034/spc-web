/**
 * Zajednička ERP uvoz logika — browser + Node (bez fs).
 */
import {
  normalizujDatum,
  normalizujStatus,
  upsertRadniNalozi,
  spojiSaPostojecim,
  normHeader,
  parseCsvText,
} from "./radniNaloziUvoz.js";
import { pogonIzRn } from "./pogonSop.js";

const ULOGA_MAP = {
  operator: "operator",
  operater: "operator",
  kontrolor: "kontrolor",
  inspector: "kontrolor",
  admin: "admin",
  administrator: "admin",
  kvalitet: "kvalitet",
  quality: "kvalitet",
  sef: "sef",
  supervisor: "sef",
  manager: "sef",
};

const VOZILO_PREFIKS = ["AUTO", "MRAP", "NTV", "NT-", "VZ-"];

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function deepMerge(base, override) {
  if (!isPlainObject(base)) return override ?? base;
  if (!isPlainObject(override)) return { ...base };
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function pickFromRow(row, aliases) {
  const list = Array.isArray(aliases) ? aliases : [aliases];
  for (const alias of list) {
    const key = normHeader(alias);
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function toInt(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toBool(v) {
  if (v === "" || v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["da", "1", "true", "yes", "y", "x"].includes(s)) return true;
  if (["ne", "0", "false", "no", "n"].includes(s)) return false;
  return undefined;
}

function toUpper(v) {
  return v ? String(v).trim().toUpperCase() : "";
}

function toUloga(v) {
  const key = String(v || "operator").trim().toLowerCase();
  return ULOGA_MAP[key] || (["operator", "kontrolor", "admin", "kvalitet", "sef"].includes(key) ? key : "operator");
}

function toTipKontrole(v, idDeo) {
  const raw = String(v || "").trim().toLowerCase();
  if (raw === "vozilo" || raw === "vehicle") return "vozilo";
  if (raw === "deo" || raw === "part") return "deo";
  const id = String(idDeo || "").toUpperCase();
  if (VOZILO_PREFIKS.some((p) => id.startsWith(p))) return "vozilo";
  return "deo";
}

export function transformVrednost(v, transform, ctx = {}) {
  if (!transform) return v === "" ? null : v;
  switch (transform) {
    case "upper":
      return toUpper(v) || null;
    case "int":
      return toInt(v);
    case "bool":
      return toBool(v);
    case "datum":
      return normalizujDatum(v);
    case "status":
      return v ? normalizujStatus(v) : null;
    case "uloga":
      return toUloga(v);
    case "tip_kontrole":
      return toTipKontrole(v, ctx.id_deo);
    default:
      return v === "" ? null : v;
  }
}

export function mapCsvRed(row, entityCfg) {
  const kolone = entityCfg.kolone || {};
  const defaults = entityCfg.podrazumevano || {};
  const out = { ...defaults };
  const ctx = {};

  for (const [dbPolje, spec] of Object.entries(kolone)) {
    const raw = pickFromRow(row, spec.iz || []);
    if (raw === "" && spec.obavezno !== true) continue;
    ctx[dbPolje] = raw;
    out[dbPolje] = transformVrednost(raw, spec.transform, ctx);
  }

  for (const polje of entityCfg.obavezna_polja || []) {
    if (out[polje] == null || out[polje] === "") {
      return {
        ok: false,
        greska: `Linija ${row._linija || "?"}: nedostaje obavezno polje "${polje}"`,
      };
    }
  }

  if (entityCfg.tabela === "radni_nalozi" || entityCfg.upsert_strategija === "legacy_radni_nalozi") {
    if (out.broj_naloga) out.broj_naloga = String(out.broj_naloga).trim().toUpperCase();
    if (out.id_deo) out.id_deo = String(out.id_deo).trim().toUpperCase();
    if (!out.pogon_kod && out.broj_naloga) {
      out.pogon_kod = pogonIzRn(out.broj_naloga) || null;
    }
    if (out.status) out.status = normalizujStatus(out.status);
  }

  if (entityCfg.tabela === "delovi" && out.id_deo && !out.tip_kontrole) {
    out.tip_kontrole = toTipKontrole(null, out.id_deo);
  }

  return { ok: true, row: out };
}

export function parsirajEntitetCsv(txt, entityCfg) {
  const sirovi = parseCsvText(txt);
  const redovi = [];
  const greske = [];
  const upsertKey = entityCfg.upsert_kljuc;
  const seen = new Set();

  sirovi.forEach((r) => {
    const mapped = mapCsvRed(r, entityCfg);
    if (!mapped.ok) {
      greske.push(mapped.greska);
      return;
    }
    const keyVal = upsertKey ? mapped.row[upsertKey] : JSON.stringify(mapped.row);
    if (upsertKey && seen.has(keyVal)) {
      greske.push(`Duplikat ${upsertKey}=${keyVal} (linija ${r._linija}) — poslednji red važi`);
      const idx = redovi.findIndex((x) => x[upsertKey] === keyVal);
      if (idx >= 0) redovi[idx] = mapped.row;
      return;
    }
    if (upsertKey) seen.add(keyVal);
    redovi.push(mapped.row);
  });

  return { redovi, greske, ukupno: sirovi.length, validnih: redovi.length };
}

/** Da li ime fajla odgovara entitetu iz configa. */
export function fajlOdgovaraEntitetu(imeFajla, entityCfg) {
  const low = String(imeFajla || "").toLowerCase();
  const names = [entityCfg.fajl, ...(entityCfg.fajl_alternativni || [])]
    .filter(Boolean)
    .map((n) => n.toLowerCase());
  return names.includes(low);
}

/** Mapiraj upload fajlove na entitete (prvi pogodak po redosledu). */
export function mapirajFajloveNaEntitete(fajlovi, config) {
  const redosled = config.redosled_uvoza || Object.keys(config.entiteti || {});
  const entiteti = config.entiteti || {};
  const mapa = {};
  const preostali = [...fajlovi];

  for (const entId of redosled) {
    const entityCfg = entiteti[entId];
    if (!entityCfg || entityCfg.ukljuceno === false) continue;

    const idx = preostali.findIndex((f) => fajlOdgovaraEntitetu(f.name, entityCfg));
    if (idx >= 0) {
      mapa[entId] = preostali[idx];
      preostali.splice(idx, 1);
    }
  }

  return { mapa, nespojeni: preostali };
}

async function mergeNullsRows(supabase, tabela, conflictKey, rows, preserveFields = []) {
  if (!rows.length) return rows;
  const keys = rows.map((r) => r[conflictKey]).filter(Boolean);
  const { data: postojeci } = await supabase.from(tabela).select("*").in(conflictKey, keys);
  const byKey = Object.fromEntries((postojeci || []).map((r) => [r[conflictKey], r]));

  return rows.map((novi) => {
    const stari = byKey[novi[conflictKey]];
    if (!stari) return novi;
    const out = { ...novi };
    const polja = [...new Set([...preserveFields, ...Object.keys(novi)])];
    for (const polje of polja) {
      if (polje === conflictKey || polje === "id") continue;
      if (out[polje] == null || out[polje] === "") {
        if (stari[polje] != null && stari[polje] !== "") {
          out[polje] = stari[polje];
        }
      }
    }
    return out;
  });
}

async function upsertConflictBatch(supabase, tabela, conflictKey, rows) {
  const batchSize = 100;
  let upsertovano = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const payload = batch.map(({ id, ...rest }) => {
      const row = { ...rest };
      if (id != null && id !== "") row.id = id;
      return row;
    });
    const { error } = await supabase.from(tabela).upsert(payload, { onConflict: conflictKey });
    if (error) return { ok: false, error, upsertovano };
    upsertovano += batch.length;
  }
  return { ok: true, upsertovano };
}

async function upsertNameLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const lookupPolje = entityCfg.lookup_polje || "linija";
  let upsertovano = 0;

  for (const row of rows) {
    const keyVal = row[lookupPolje];
    if (!keyVal) continue;

    const { data: postojeci } = await supabase
      .from(tabela)
      .select("*")
      .eq(lookupPolje, keyVal)
      .maybeSingle();

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(row).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await supabase.from(tabela).insert(row);
      if (error) return { ok: false, error, upsertovano };
    }
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

async function upsertEmailLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const lookupPolje = entityCfg.lookup_polje || "email";
  const fallback = entityCfg.fallback_lookup || "ime";
  let upsertovano = 0;

  for (const row of rows) {
    let postojeci = null;
    if (row[lookupPolje]) {
      const res = await supabase.from(tabela).select("*").eq(lookupPolje, row[lookupPolje]).maybeSingle();
      postojeci = res.data;
    }
    if (!postojeci && row[fallback]) {
      const res = await supabase.from(tabela).select("*").eq(fallback, row[fallback]).maybeSingle();
      postojeci = res.data;
    }

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(row).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await supabase.from(tabela).insert(row);
      if (error) return { ok: false, error, upsertovano };
    }
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

async function upsertLegacyRadniNalozi(supabase, entityCfg, rows) {
  let finalRows = rows.map((r) => ({ ...r, status: r.status ?? "aktivan" }));

  if (entityCfg.merge_nulls) {
    const brojevi = finalRows.map((r) => r.broj_naloga);
    const { data: postojeci } = await supabase.from("radni_nalozi").select("*").in("broj_naloga", brojevi);
    const byBroj = Object.fromEntries((postojeci || []).map((r) => [r.broj_naloga, r]));
    finalRows = finalRows.map((r) => spojiSaPostojecim(byBroj[r.broj_naloga], r));
  }

  return upsertRadniNalozi(supabase, finalRows, {
    syncKupci: entityCfg.sync_kupci !== false,
    mergeNulls: false,
  });
}

export async function upsertEntitet(supabase, entityCfg, rows) {
  if (!rows?.length) {
    return { ok: true, upsertovano: 0, preskoceno: true };
  }

  const strategija = entityCfg.upsert_strategija;
  const conflictKey = entityCfg.upsert_kljuc;
  let finalRows = rows;

  if (entityCfg.merge_nulls && conflictKey && strategija !== "legacy_radni_nalozi") {
    finalRows = await mergeNullsRows(
      supabase,
      entityCfg.tabela,
      conflictKey,
      rows,
      entityCfg.preserve_polja || [],
    );
  }

  if (strategija === "legacy_radni_nalozi") {
    return upsertLegacyRadniNalozi(supabase, entityCfg, finalRows);
  }
  if (strategija === "name_lookup") {
    return upsertNameLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "email_lookup") {
    return upsertEmailLookup(supabase, entityCfg, finalRows);
  }
  if (!conflictKey) {
    return { ok: false, error: new Error(`Entitet ${entityCfg.tabela || "?"}: nema upsert_kljuc ni strategiju`) };
  }

  return upsertConflictBatch(supabase, entityCfg.tabela, conflictKey, finalRows);
}

/**
 * Uvoz iz mapa entitet → { text, fajl } (upload ili server).
 * csvPoEntitetu: { delovi: { text, fajl } }
 */
export async function pokreniErpUvozIzIzvora(supabase, config, options = {}) {
  const {
    csvPoEntitetu = {},
    dryRun = false,
    entitetFilter = null,
  } = options;

  const redosled = config.redosled_uvoza || Object.keys(config.entiteti || {});
  const entiteti = config.entiteti || {};
  const rezultati = [];
  let biloGreske = false;

  for (const entId of redosled) {
    if (entitetFilter && entId !== entitetFilter) continue;

    const entityCfg = entiteti[entId];
    if (!entityCfg || entityCfg.ukljuceno === false) {
      rezultati.push({ entitet: entId, status: "iskljuceno" });
      continue;
    }

    const izvor = csvPoEntitetu[entId];
    if (!izvor?.text) {
      rezultati.push({ entitet: entId, status: "nema_fajla", fajl: entityCfg.fajl });
      continue;
    }

    const parsed = parsirajEntitetCsv(izvor.text, entityCfg);
    const entry = {
      entitet: entId,
      tabela: entityCfg.tabela,
      fajl: izvor.fajl || entityCfg.fajl,
      ukupno: parsed.ukupno,
      validnih: parsed.validnih,
      greske: parsed.greske,
      status: "ok",
    };

    if (parsed.greske.length) entry.upozorenja = parsed.greske.length;

    if (!parsed.redovi.length) {
      entry.status = "prazno";
      rezultati.push(entry);
      continue;
    }

    if (dryRun) {
      entry.status = "dry-run";
      entry.primer = parsed.redovi.slice(0, 2);
      rezultati.push(entry);
      continue;
    }

    const upsertRes = await upsertEntitet(supabase, entityCfg, parsed.redovi);
    entry.upsertovano = upsertRes.upsertovano ?? 0;

    if (!upsertRes.ok) {
      entry.status = "greska";
      entry.greska = upsertRes.error?.message || String(upsertRes.error);
      biloGreske = true;
      rezultati.push(entry);
      continue;
    }

    rezultati.push(entry);
  }

  return {
    ok: !biloGreske,
    preset: config.preset,
    erp_sistem: config.erp_sistem,
    rezultati,
  };
}

export function sumErpRezultati(rezultati) {
  return (rezultati || []).reduce(
    (acc, r) => {
      if (r.ukupno) acc.ukupno += r.ukupno;
      if (r.validnih) acc.validnih += r.validnih;
      if (r.upsertovano) acc.upsertovano += r.upsertovano;
      if (r.upozorenja) acc.upozorenja += r.upozorenja;
      if (r.greske?.length) acc.greske.push(...r.greske);
      return acc;
    },
    { ukupno: 0, validnih: 0, upsertovano: 0, upozorenja: 0, greske: [] },
  );
}

export function formatErpUvozRezultat(res) {
  const lines = [`ERP uvoz (${res.erp_sistem || res.preset})`];
  for (const r of res.rezultati) {
    if (r.status === "iskljuceno") {
      lines.push(`  ○ ${r.entitet}: isključeno`);
    } else if (r.status === "nema_fajla") {
      lines.push(`  — ${r.entitet}: nema CSV (${r.fajl})`);
    } else if (r.status === "premlad") {
      lines.push(`  ⏳ ${r.entitet}: ${r.fajl} premlad — čekam ERP`);
    } else if (r.status === "prazno") {
      lines.push(`  ⚠ ${r.entitet}: ${r.fajl} — nema validnih redova`);
    } else if (r.status === "dry-run") {
      lines.push(`  ✓ ${r.entitet}: ${r.fajl} — ${r.validnih}/${r.ukupno} (dry-run)`);
    } else if (r.status === "greska") {
      lines.push(`  ✗ ${r.entitet}: ${r.greska}`);
    } else {
      lines.push(`  ✓ ${r.entitet}: ${r.fajl} — upsert ${r.upsertovano} (${r.validnih}/${r.ukupno})`);
    }
  }
  return lines.join("\n");
}
