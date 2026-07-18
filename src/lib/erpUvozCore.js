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
import {
  mapKarakteristikaMerljiveRow,
  normalizujKarakteristikuRed,
  stripKarakteristikeForDbUpsert,
  KARAKTERISTIKE_UPSERT_CONFLICT,
} from "./karakteristikaMerljive.js";
import { syncErpGlavniUnos } from "./erpGlavniUnosSync.js";

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

function toNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  if (v === "" || v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["da", "1", "true", "yes", "y", "x"].includes(s)) return true;
  if (["ne", "0", "false", "no", "n"].includes(s)) return false;
  return undefined;
}

function toAktivanIzDeleteFlag(v) {
  if (v === "" || v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["x", "1", "true", "da", "yes", "deleted", "obrisan"].includes(s)) return false;
  if (["0", "false", "ne", "no", "active", "aktivan"].includes(s)) return true;
  return undefined;
}

function toAktivanStatus(v) {
  if (v === "" || v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["aktivan", "aktivna", "aktivno", "active", "otvoren", "open", "1", "da", "yes", "true"].includes(s)) return true;
  if (["neaktivan", "neaktivna", "neaktivno", "inactive", "zatvoren", "closed", "obrisan", "deleted", "0", "ne", "no", "false"].includes(s)) return false;
  return toBool(v);
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
    case "num":
      return toNum(v);
    case "bool":
      return toBool(v);
    case "aktivan_iz_delete_flag":
      return toAktivanIzDeleteFlag(v);
    case "aktivan_status":
      return toAktivanStatus(v);
    case "datum":
      return normalizujDatum(v);
    case "status":
      return v ? normalizujStatus(v) : null;
    case "uloga":
      return toUloga(v);
    case "tip_kontrole":
      return toTipKontrole(v, ctx.id_deo);
    case "lower":
      return v ? String(v).trim().toLowerCase() : null;
    default:
      return v === "" ? null : v;
  }
}

export function mapCsvRed(row, entityCfg) {
  if (entityCfg.mapiranje === "karakteristike_merljive") {
    const kar = normalizujKarakteristikuRed(mapKarakteristikaMerljiveRow(row));
    const dbRow = stripKarakteristikeForDbUpsert(kar);
    if (!dbRow.sifra_merenja && dbRow.pozicija) dbRow.sifra_merenja = dbRow.pozicija;
    for (const polje of entityCfg.obavezna_polja || ["id_deo", "pozicija"]) {
      if (dbRow[polje] == null || dbRow[polje] === "") {
        return {
          ok: false,
          greska: `Linija ${row._linija || "?"}: nedostaje obavezno polje "${polje}"`,
        };
      }
    }
    return { ok: true, row: dbRow };
  }

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

  if (out._delete_flag !== undefined) {
    out.aktivan = out._delete_flag;
    delete out._delete_flag;
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

  if (entityCfg.tabela === "delovi") {
    if (out.pogon_kod) {
      out._sync_pogon_kod = toUpper(out.pogon_kod);
      delete out.pogon_kod;
    }
    if (out.radni_nalog) {
      out._sync_radni_nalog = toUpper(out.radni_nalog);
      delete out.radni_nalog;
    }
  }

  if (entityCfg.tabela === "crtez_assets") {
    if (!out.ref_tip) out.ref_tip = entityCfg.ref_tip_fiksno || "deo";
    if (out.ref_tip) out.ref_tip = String(out.ref_tip).trim().toLowerCase();
    if (out.ref_id) out.ref_id = toUpper(out.ref_id);
    if (!out.prikaz_format) out.prikaz_format = "svg";
    if (!out.revizija) out.revizija = "A";
  }

  if (entityCfg.tabela === "greske_katalog") {
    if (!out.defekt && out.podkategorija) out.defekt = out.podkategorija;
    if (out.id_deo) out.id_deo = toUpper(out.id_deo);
    if (out.pogon_kod) out.pogon_kod = toUpper(out.pogon_kod);
  }

  if (entityCfg.tabela === "kalibracije") {
    out._merilo_sifra = pickFromRow(row, entityCfg.merilo_sifra_iz || [
      "sifra_merila", "SifraMerila", "tool_code",
    ]);
    out._merilo_serijski = pickFromRow(row, entityCfg.merilo_serijski_iz || [
      "serijski_broj", "merilo_serijski", "serijski br", "equnr", "merilo",
    ]);
    out._merilo_naziv = pickFromRow(row, entityCfg.merilo_naziv_iz || [
      "naziv_merila", "merilo_naziv", "naziv merila", "merilo",
    ]);
    if (out.datum_kal) out.datum_kal = normalizujDatum(out.datum_kal);
    if (out.sledeca_kal) out.sledeca_kal = normalizujDatum(out.sledeca_kal);
    if (!out._merilo_sifra && !out._merilo_serijski && !out._merilo_naziv) {
      return {
        ok: false,
        greska: `Linija ${row._linija || "?"}: nedostaje merilo (sifra, serijski_broj ili naziv)`,
      };
    }
  }

  if (entityCfg.tabela === "barkod_profili" && out.id_deo) {
    out.id_deo = toUpper(out.id_deo);
  }

  if (entityCfg.tabela === "pogon_linija_mapa" && out.pogon_kod) {
    out.pogon_kod = toUpper(out.pogon_kod);
  }

  if (entityCfg.erp_kljuc_polja?.length) {
    out.erp_kljuc = entityCfg.erp_kljuc_polja
      .map((polje) => String(out[polje] ?? "").trim().toUpperCase())
      .join("|");
  }

  return { ok: true, row: out };
}

export function parsirajEntitetCsv(txt, entityCfg) {
  const sirovi = parseCsvText(txt);
  const redovi = [];
  const greske = [];
  const upsertKey = entityCfg.upsert_kljuc;
  const compositeKeyPolja = String(entityCfg.upsert_kljuc || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const lookupPolja = entityCfg.upsert_strategija === "ref_lookup"
    ? (entityCfg.lookup_polja || [])
    : entityCfg.upsert_strategija === "karakteristike_merljive"
      ? (entityCfg.upsert_kljuc || KARAKTERISTIKE_UPSERT_CONFLICT).split(",").map((s) => s.trim())
      : compositeKeyPolja.length > 1
        ? compositeKeyPolja
        : null;
  const seen = new Set();

  sirovi.forEach((r) => {
    const mapped = mapCsvRed(r, entityCfg);
    if (!mapped.ok) {
      greske.push(mapped.greska);
      return;
    }
    let keyVal;
    if (lookupPolja?.length) {
      keyVal = lookupPolja.map((p) => mapped.row[p] ?? "").join("|");
    } else if (upsertKey) {
      keyVal = mapped.row[upsertKey];
    } else {
      keyVal = JSON.stringify(mapped.row);
    }
    if ((upsertKey || lookupPolja?.length) && seen.has(keyVal)) {
      const label = lookupPolja?.length ? lookupPolja.join("+") : upsertKey;
      greske.push(`Duplikat ${label}=${keyVal} (linija ${r._linija}) — poslednji red važi`);
      const idx = lookupPolja?.length
        ? redovi.findIndex((x) => lookupPolja.map((p) => x[p] ?? "").join("|") === keyVal)
        : redovi.findIndex((x) => x[upsertKey] === keyVal);
      if (idx >= 0) redovi[idx] = mapped.row;
      return;
    }
    if (upsertKey || lookupPolja?.length) seen.add(keyVal);
    redovi.push(mapped.row);
  });

  return { redovi, greske, ukupno: sirovi.length, validnih: redovi.length };
}

async function validirajReferenceEntiteta(supabase, entityCfg, rows) {
  const checks = entityCfg.reference_checks || [];
  if (!supabase || !checks.length || !rows.length) return { redovi: rows, greske: [] };

  const normalizedChecks = checks.map((check, idx) => ({
    ...check,
    _id: idx,
    _polja: check.polja || [check.polje],
    _refPolja: check.ref_polja || [check.ref_polje],
  }));
  const keyZa = (obj, polja) => polja.map((p) => String(obj[p] ?? "").trim()).join("|");
  const dozvoljenoPoProveri = new Map();

  for (const check of normalizedChecks) {
    const prvaPolja = check._polja[0];
    const prvoRefPolje = check._refPolja[0];
    const vrednosti = [...new Set(
      rows.map((row) => row[prvaPolja]).filter((v) => v != null && String(v).trim() !== ""),
    )];
    const dozvoljeno = new Set();
    for (let i = 0; i < vrednosti.length; i += 100) {
      const chunk = vrednosti.slice(i, i + 100);
      const { data, error } = await supabase
        .from(check.tabela)
        .select(check._refPolja.join(","))
        .in(prvoRefPolje, chunk);
      if (error) {
        return {
          redovi: [],
          greske: [`Provera reference ${check._polja.join("+")} → ${check.tabela}.${check._refPolja.join("+")}: ${error.message}`],
        };
      }
      (data || []).forEach((r) => dozvoljeno.add(keyZa(r, check._refPolja)));
    }
    dozvoljenoPoProveri.set(check._id, dozvoljeno);
  }

  const validni = [];
  const greske = [];
  rows.forEach((row, idx) => {
    const neispravne = normalizedChecks.filter((check) => {
      const values = check._polja.map((p) => row[p]);
      const prazno = values.some((value) => value == null || String(value).trim() === "");
      if (prazno) return check.obavezna === true;
      return !dozvoljenoPoProveri.get(check._id)?.has(keyZa(row, check._polja));
    });
    if (!neispravne.length) {
      validni.push(row);
      return;
    }
    greske.push(
      `Red ${idx + 2}: nepostojeća referenca ${neispravne
        .map((check) => check._polja.map((p) => `${p}=${row[p] ?? ""}`).join("+"))
        .join(", ")}`,
    );
  });
  return { redovi: validni, greske };
}

/** Da li ime fajla odgovara entitetu iz configa (.csv / .xlsx / .xls). */
export function fajlOdgovaraEntitetu(imeFajla, entityCfg) {
  const canonical = (value) => String(value || "")
    .toLowerCase()
    .replace(/\.(csv|xlsx|xls)$/i, "")
    .replace(/^\d+[\s_.-]*/, "")
    .replace(/[^a-z0-9čćžšđ]+/g, "");
  const low = canonical(imeFajla);
  const names = [entityCfg.fajl, ...(entityCfg.fajl_alternativni || [])]
    .filter(Boolean)
    .map(canonical);
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

async function insertUzPkeyFallback(supabase, tabela, payload) {
  const clean = { ...payload };
  delete clean.id;
  let { error } = await supabase.from(tabela).insert(clean);
  if (error && /duplicate key.*pkey/i.test(error.message || "")) {
    const { data: maxRow } = await supabase
      .from(tabela)
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = (maxRow?.id ?? 0) + 1;
    ({ error } = await supabase.from(tabela).insert({ ...clean, id: nextId }));
  }
  return { error };
}

async function upsertCompositeLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const lookupPolja = entityCfg.lookup_polja
    || String(entityCfg.upsert_kljuc || entityCfg.lookup_polje || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (!lookupPolja.length) {
    return { ok: false, error: new Error(`Entitet ${tabela}: nema lookup polja za composite upsert`) };
  }

  let upsertovano = 0;
  for (const row of rows) {
    const kljucevi = lookupPolja.map((p) => row[p]).filter((v) => v != null && v !== "");
    if (kljucevi.length < lookupPolja.length) continue;

    let q = supabase.from(tabela).select("id");
    for (const polje of lookupPolja) {
      q = q.eq(polje, row[polje]);
    }
    const { data: postojeci } = await q.maybeSingle();
    const payload = { ...row };
    for (const p of entityCfg.izbaci_polja || []) delete payload[p];
    delete payload.id;
    if (entityCfg.postavi_updated_at) {
      payload.updated_at = new Date().toISOString();
    }

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(payload).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await insertUzPkeyFallback(supabase, tabela, payload);
      if (error) return { ok: false, error, upsertovano };
    }
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

async function upsertRefLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const lookupPolja = entityCfg.lookup_polja || ["ref_tip", "ref_id"];
  let upsertovano = 0;

  for (const row of rows) {
    const kljucevi = lookupPolja.map((p) => row[p]).filter((v) => v != null && v !== "");
    if (kljucevi.length < lookupPolja.length) continue;

    let q = supabase.from(tabela).select("id");
    for (const polje of lookupPolja) {
      q = q.eq(polje, row[polje]);
    }
    const { data: postojeci } = await q.maybeSingle();
    const payload = { ...row };
    for (const p of entityCfg.izbaci_polja || []) delete payload[p];
    delete payload.id;
    if (entityCfg.postavi_updated_at) {
      payload.updated_at = new Date().toISOString();
    }

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(payload).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await insertUzPkeyFallback(supabase, tabela, payload);
      if (error) return { ok: false, error, upsertovano };
    }
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

async function upsertConflictBatch(supabase, tabela, conflictKey, rows, izbaciPolja = []) {
  const batchSize = 100;
  let upsertovano = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const payload = batch.map(({ id, ...rest }) => {
      const row = { ...rest };
      if (id != null && id !== "" && !izbaciPolja.includes("id")) row.id = id;
      for (const p of izbaciPolja) delete row[p];
      return row;
    });
    const { error } = await supabase.from(tabela).upsert(payload, { onConflict: conflictKey });
    if (error) {
      if (
        /no unique or exclusion constraint/i.test(error.message || "")
        || /duplicate key.*pkey/i.test(error.message || "")
      ) {
        return upsertCompositeLookup(
          supabase,
          {
            tabela,
            upsert_kljuc: conflictKey,
            izbaci_polja: izbaciPolja,
          },
          rows,
        );
      }
      return { ok: false, error, upsertovano };
    }
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

async function upsertMeriloLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const sifraPolje = entityCfg.merilo_sifra_polje || "sifra_merila";
  const serijskiPolje = entityCfg.merilo_serijski_polje || "serijski_broj";
  const nazivPolje = entityCfg.lookup_polje || "naziv";
  let upsertovano = 0;

  for (const row of rows) {
    let postojeci = null;
    const sifra = row[sifraPolje];
    if (sifra) {
      const res = await supabase.from(tabela).select("*").eq(sifraPolje, sifra).maybeSingle();
      postojeci = res.data;
    }
    const serijski = row[serijskiPolje];
    if (!postojeci && serijski) {
      const res = await supabase.from(tabela).select("*").eq(serijskiPolje, serijski).maybeSingle();
      postojeci = res.data;
    }
    if (!postojeci && row[nazivPolje]) {
      const res = await supabase.from(tabela).select("*").eq(nazivPolje, row[nazivPolje]).maybeSingle();
      postojeci = res.data;
    }

    const payload = { ...row };
    for (const p of entityCfg.izbaci_polja || []) delete payload[p];

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(payload).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await supabase.from(tabela).insert(payload);
      if (error) return { ok: false, error, upsertovano };
    }
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

async function upsertKalibracijeMerilo(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const lookupPolja = entityCfg.lookup_polja || ["merilo_id", "datum_kal"];
  let upsertovano = 0;

  for (const row of rows) {
    const sifra = row._merilo_sifra;
    const serijski = row._merilo_serijski;
    const naziv = row._merilo_naziv;
    let merilo = null;

    if (sifra) {
      const res = await supabase.from("merila").select("id").eq("sifra_merila", sifra).maybeSingle();
      merilo = res.data;
    }
    if (!merilo && serijski) {
      const res = await supabase.from("merila").select("id").eq("serijski_broj", serijski).maybeSingle();
      merilo = res.data;
    }
    if (!merilo && naziv) {
      const res = await supabase.from("merila").select("id").eq("naziv", naziv).maybeSingle();
      merilo = res.data;
    }
    if (!merilo?.id) continue;

    const payload = { ...row };
    delete payload._merilo_sifra;
    delete payload._merilo_serijski;
    delete payload._merilo_naziv;
    for (const p of entityCfg.izbaci_polja || []) delete payload[p];
    payload.merilo_id = merilo.id;

    let q = supabase.from(tabela).select("id");
    for (const polje of lookupPolja) {
      q = q.eq(polje, payload[polje]);
    }
    const { data: postojeci } = await q.maybeSingle();

    if (postojeci?.id) {
      const { error } = await supabase.from(tabela).update(payload).eq("id", postojeci.id);
      if (error) return { ok: false, error, upsertovano };
    } else {
      const { error } = await supabase.from(tabela).insert(payload);
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

async function upsertCodeOrFallbackLookup(supabase, entityCfg, rows) {
  const tabela = entityCfg.tabela;
  const codeField = entityCfg.lookup_polje;
  const fallback = entityCfg.fallback_lookup;
  let upsertovano = 0;

  for (const row of rows) {
    let postojeci = null;
    if (codeField && row[codeField]) {
      const res = await supabase.from(tabela).select("id").eq(codeField, row[codeField]).maybeSingle();
      postojeci = res.data;
    }
    if (!postojeci && fallback && row[fallback]) {
      const res = await supabase.from(tabela).select("id").eq(fallback, row[fallback]).maybeSingle();
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

async function upsertQmsDocumentRows(supabase, entityCfg, rows) {
  const nazivDokumenta = entityCfg.qms_tip === "pfmea" ? "ERP PFMEA" : "ERP Control Plan";
  const grupe = new Map();
  for (const row of rows) {
    const idDeo = toUpper(row.br_dela);
    const revizija = String(row.revizija_dokumenta || "A").trim() || "A";
    const key = `${idDeo}|${revizija}`;
    if (!grupe.has(key)) grupe.set(key, { idDeo, revizija, rows: [] });
    grupe.get(key).rows.push(row);
  }

  let upsertovano = 0;
  for (const grupa of grupe.values()) {
    let { data: dokument, error: findError } = await supabase
      .from("pfmea_cp_dokumenti")
      .select("id")
      .eq("naziv", nazivDokumenta)
      .eq("id_deo", grupa.idDeo)
      .eq("revizija", grupa.revizija)
      .limit(1)
      .maybeSingle();
    if (findError) return { ok: false, error: findError, upsertovano };

    if (!dokument?.id) {
      const created = await supabase
        .from("pfmea_cp_dokumenti")
        .insert({
          naziv: nazivDokumenta,
          id_deo: grupa.idDeo,
          revizija: grupa.revizija,
          napomena: "Automatski sinhronizovano iz ERP sistema",
          aktivan: true,
        })
        .select("id")
        .single();
      if (created.error) return { ok: false, error: created.error, upsertovano };
      dokument = created.data;
    }

    const payload = grupa.rows.map((row, idx) => {
      const out = { ...row };
      delete out.revizija_dokumenta;
      out.dokument_id = dokument.id;
      out.red_broj = idx + 1;
      return out;
    });
    const res = await upsertConflictBatch(
      supabase,
      entityCfg.tabela,
      "erp_kljuc",
      payload,
      entityCfg.izbaci_polja || [],
    );
    if (!res.ok) return { ...res, upsertovano: upsertovano + (res.upsertovano || 0) };
    upsertovano += res.upsertovano;
  }
  return { ok: true, upsertovano };
}

async function syncDeloviAtributivniPogon(supabase, rows) {
  let upsertovano = 0;
  for (const row of rows) {
    const pogon = row._sync_pogon_kod;
    if (!pogon || !row.id_deo) continue;
    const payload = {
      id_deo: toUpper(row.id_deo),
      pogon_kod: pogon,
      radni_nalog: row._sync_radni_nalog || null,
      naziv_dela: row.naziv_dela || null,
      karakteristika: row.karakteristika || null,
      linija_id: row.linija_id ?? null,
      masina_id: row.masina_id ?? null,
      kom_za_kontrolu: row.kom_za_kontrolu ?? null,
      napomena: row.napomena || null,
      aktivan: row.aktivan !== false,
    };
    const { error } = await supabase
      .from("delovi_atributivni_pogon")
      .upsert(payload, { onConflict: "id_deo,pogon_kod" });
    if (error) return { ok: false, error, upsertovano };
    upsertovano += 1;
  }
  return { ok: true, upsertovano };
}

function stripDeloviSyncMeta(row) {
  const {
    _sync_pogon_kod,
    _sync_radni_nalog,
    ...rest
  } = row;
  return rest;
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
  if (strategija === "qms_document_rows") {
    return upsertQmsDocumentRows(supabase, entityCfg, finalRows);
  }
  if (strategija === "name_lookup") {
    return upsertNameLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "email_lookup") {
    return upsertEmailLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "code_or_fallback_lookup") {
    return upsertCodeOrFallbackLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "ref_lookup") {
    return upsertRefLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "merilo_lookup") {
    return upsertMeriloLookup(supabase, entityCfg, finalRows);
  }
  if (strategija === "kalibracije_merilo") {
    return upsertKalibracijeMerilo(supabase, entityCfg, finalRows);
  }
  if (strategija === "karakteristike_merljive") {
    const stripped = finalRows.map((r) => stripKarakteristikeForDbUpsert(r));
    return upsertConflictBatch(
      supabase,
      entityCfg.tabela,
      entityCfg.upsert_kljuc || KARAKTERISTIKE_UPSERT_CONFLICT,
      stripped,
      entityCfg.izbaci_polja || [],
    );
  }
  if (!conflictKey) {
    return { ok: false, error: new Error(`Entitet ${entityCfg.tabela || "?"}: nema upsert_kljuc ni strategiju`) };
  }

  if (entityCfg.tabela === "delovi") {
    const forDelovi = finalRows.map(stripDeloviSyncMeta);
    const res = await upsertConflictBatch(
      supabase,
      entityCfg.tabela,
      conflictKey,
      forDelovi,
      entityCfg.izbaci_polja || [],
    );
    if (!res.ok) return res;
    const pogonRes = await syncDeloviAtributivniPogon(supabase, finalRows);
    if (!pogonRes.ok) return pogonRes;
    return {
      ok: true,
      upsertovano: res.upsertovano,
      pogon_sync: pogonRes.upsertovano,
    };
  }

  return upsertConflictBatch(
    supabase,
    entityCfg.tabela,
    conflictKey,
    finalRows,
    entityCfg.izbaci_polja || [],
  );
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
    izvor = "erp",
  } = options;

  const batchId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let batchAktivan = false;
  if (supabase && !dryRun) {
    try {
      const { error } = await supabase.from("erp_uvoz_batch").insert({
        id: batchId,
        izvor,
        preset: config.preset || config.erp_sistem || null,
        status: "pokrenut",
      });
      batchAktivan = !error;
    } catch { /* migracija 67 još nije primenjena — stari uvoz ostaje kompatibilan */ }
  }

  const redosled = config.redosled_uvoza || Object.keys(config.entiteti || {});
  const entiteti = config.entiteti || {};
  const rezultati = [];
  let biloGreske = false;
  const promenjeniDelovi = new Set();

  for (const entId of redosled) {
    if (entitetFilter && entId !== entitetFilter) continue;

    const entityCfg = entiteti[entId];
    if (!entityCfg || entityCfg.ukljuceno === false) {
      rezultati.push({ entitet: entId, status: "iskljuceno" });
      continue;
    }

    const izvorEntiteta = csvPoEntitetu[entId];
    if (!izvorEntiteta?.text) {
      rezultati.push({ entitet: entId, status: "nema_fajla", fajl: entityCfg.fajl });
      continue;
    }

    const parsed = parsirajEntitetCsv(izvorEntiteta.text, entityCfg);
    if (supabase && entityCfg.reference_checks?.length) {
      const refs = await validirajReferenceEntiteta(supabase, entityCfg, parsed.redovi);
      parsed.redovi = refs.redovi;
      parsed.validnih = refs.redovi.length;
      parsed.greske.push(...refs.greske);
    }
    const entry = {
      entitet: entId,
      tabela: entityCfg.tabela,
      fajl: izvorEntiteta.fajl || entityCfg.fajl,
      ukupno: parsed.ukupno,
      validnih: parsed.validnih,
      greske: parsed.greske,
      status: "ok",
    };

    if (parsed.greske.length) entry.upozorenja = parsed.greske.length;
    if (batchAktivan && parsed.greske.length) {
      const rejects = parsed.greske.slice(0, 200).map((poruka) => ({
        batch_id: batchId,
        entitet: entId,
        fajl: izvorEntiteta.fajl || entityCfg.fajl,
        poruka,
      }));
      try {
        await supabase.from("erp_uvoz_reject").insert(rejects);
      } catch { /* audit ne sme oboriti osnovni uvoz */ }
    }

    if (!parsed.redovi.length) {
      if (parsed.ukupno > 0 && parsed.greske.length) {
        entry.status = "greska";
        entry.greska = parsed.greske[0];
        biloGreske = true;
      } else {
        entry.status = "prazno";
      }
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

    for (const row of parsed.redovi) {
      const idDeo = row.id_deo || row.br_dela || row.ref_id;
      if (idDeo) promenjeniDelovi.add(String(idDeo).trim().toUpperCase());
    }
    rezultati.push(entry);
  }

  if (!dryRun && supabase && promenjeniDelovi.size) {
    const syncRes = await syncErpGlavniUnos(supabase, [...promenjeniDelovi]);
    if (syncRes.ok) {
      rezultati.push({
        entitet: "glavni_unos",
        tabela: "glavni_unos_redovi",
        fajl: "ERP → Glavni unos",
        status: "ok",
        ukupno: syncRes.upsertovano,
        validnih: syncRes.upsertovano,
        upsertovano: syncRes.upsertovano,
        upozorenja: syncRes.bezMape?.length || 0,
        greske: (syncRes.bezMape || []).map(
          (sifra) => `SifraVozila ${sifra} nema dodeljen sheet u Glavnom unosu`,
        ),
      });
    } else if (syncRes.nedostajeMigracija) {
      rezultati.push({
        entitet: "glavni_unos",
        status: "greska",
        greska: "Nedostaje migracija 68_erp_glavni_unos_sheetovi.sql",
      });
      biloGreske = true;
    } else {
      rezultati.push({
        entitet: "glavni_unos",
        status: "greska",
        greska: syncRes.error?.message || String(syncRes.error),
      });
      biloGreske = true;
    }
  }

  const out = {
    ok: !biloGreske,
    preset: config.preset,
    erp_sistem: config.erp_sistem,
    batch_id: batchAktivan ? batchId : null,
    rezultati,
  };
  if (batchAktivan) {
    const sum = sumErpRezultati(rezultati);
    try {
      await supabase.from("erp_uvoz_batch").update({
        status: biloGreske ? "greska" : "uspeh",
        ukupno_redova: sum.ukupno,
        validnih: sum.validnih,
        upsertovano: sum.upsertovano,
        upozorenja: sum.upozorenja,
        detalj: rezultati,
        finished_at: new Date().toISOString(),
      }).eq("id", batchId);
    } catch { /* audit ne sme oboriti osnovni uvoz */ }
  }
  return out;
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
