import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DOCS = path.resolve("docs");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normHeader(h) {
  return h
    .trim()
    .replace(/\*+$/, "")
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d");
}

async function readCsv(fileName) {
  const filePath = path.join(DOCS, fileName);
  const txt = await fs.readFile(filePath, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => normHeader(h));
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  }).filter((row) => Object.values(row).some((v) => v !== ""));
}

function daNe(v) {
  if (!v) return true;
  return ["da", "1", "true", "yes"].includes(String(v).trim().toLowerCase());
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

async function upsertBatches(supabase, table, rows, onConflict) {
  if (!rows.length) {
    console.log(`  ${table}: nema redova`);
    return;
  }
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  ${table}: ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }
}

function findRadnikId(radnici, imeFragment) {
  if (!imeFragment) return null;
  const q = imeFragment.toUpperCase().replace(/\./g, "").trim();
  const hit = radnici.find((r) => {
    const ime = r.ime.toUpperCase().replace(/\./g, "");
    return ime.includes(q) || q.includes(ime.split(" ")[0]);
  });
  return hit?.id ?? null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error: preflightErr } = await supabase.from("linije").select("id", { head: true, count: "exact" });
  if (preflightErr?.message?.includes("schema cache") || preflightErr?.code === "PGRST205") {
    throw new Error(
      "Tabela 'linije' ne postoji u Supabase.\n" +
      "Prvo pokreni SQL fajl 03_schema_from_docs.sql u Supabase Dashboard → SQL Editor → Run.\n" +
      "Zatim ponovo: node scripts/import-all-docs.mjs"
    );
  }
  if (preflightErr) throw preflightErr;

  console.log("Učitavam CSV...");
  const linijeRows = await readCsv("linije.csv");
  const masineRows = await readCsv("masine.csv");
  const smeneRows = await readCsv("smene.csv");
  const greskeRows = await readCsv("greske_katalog.csv");
  const voziloRows = await readCsv("katalog_gresaka_vozilo.csv");
  const deloviRows = await readCsv("delovi.csv");
  const radniciRows = await readCsv("radnici.csv");
  const naloziRows = await readCsv("radni_nalozi.csv");
  const logRows = await readCsv("kontrolni_log.csv");
  const ciljeviRows = await readCsv("ciljevi.csv");
  const merilaRows = await readCsv("merila.csv");
  const eskRows = await readCsv("eskalacije.csv");
  const osmdRows = await readCsv("osmd_izvestaji.csv");
  const analKRows = await readCsv("analiza_kontrolor.csv");
  const analMRows = await readCsv("analiza_masina.csv");
  const analSRows = await readCsv("analiza_smena.csv");
  const dpmoRows = await readCsv("dpmo.csv");
  const paretoRows = await readCsv("pareto.csv");
  const listaStavkeRows = await readCsv("kontrolna_lista_stavke.csv");
  let karMerRows = [];
  let sopDeoVarRows = [];
  let merVarRows = [];
  try { karMerRows = await readCsv("karakteristike_merljive.csv"); } catch { /* optional */ }
  try { sopDeoVarRows = await readCsv("sop_deo_varijabilni.csv"); } catch { /* optional */ }
  try { merVarRows = await readCsv("merenja_varijabilna.csv"); } catch { /* optional */ }

  console.log("Import šifrarnika...");
  await upsertBatches(
    supabase,
    "linije",
    linijeRows.map((r) => ({
      id: num(r.id),
      linija: pick(r, "linija"),
      proces: pick(r, "proces"),
      operacija: pick(r, "operacija"),
      greske: pick(r, "greske"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "masine",
    masineRows.map((r) => ({
      id: num(r.id),
      naziv: pick(r, "naziv masine", "naziv"),
      linija: pick(r, "linija"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "smene",
    smeneRows.map((r) => ({
      id: num(r.id),
      naziv: pick(r, "smena", "naziv"),
      pocetak: pick(r, "pocetak"),
      kraj: pick(r, "kraj"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "greske_katalog",
    greskeRows.map((r) => ({
      id: num(r.id),
      kategorija: pick(r, "kategorija"),
      podkategorija: pick(r, "podkategorija"),
      defekt: pick(r, "defekt") || pick(r, "podkategorija"),
      opis: pick(r, "opis"),
    })).filter((r) => r.id && r.kategorija),
    "id"
  );

  const voziloPayload = voziloRows.map((r) => ({
    vozilo_id: pick(r, "id"),
    kategorija: pick(r, "kategorija"),
    podkategorija: pick(r, "podkategorija"),
    defekt: pick(r, "defekt"),
  })).filter((r) => r.vozilo_id && r.defekt);
  if (voziloPayload.length) {
    await supabase.from("katalog_gresaka_vozilo").delete().neq("id", 0);
    const { error } = await supabase.from("katalog_gresaka_vozilo").insert(voziloPayload);
    if (error) throw new Error(`katalog_gresaka_vozilo: ${error.message}`);
    console.log(`  katalog_gresaka_vozilo: ${voziloPayload.length}`);
  }

  console.log("Import radnika i delova...");
  const radniciPayload = radniciRows.map((r) => ({
    id: num(r.id),
    ime: pick(r, "ime i prezime", "ime"),
    uloga: pick(r, "uloga").toLowerCase().replace(/\*+$/, ""),
    email: pick(r, "email") || null,
    user_id: null,
    aktivan: daNe(pick(r, "aktivan")),
    napomena: pick(r, "napomena") || null,
  })).filter((r) => r.id && r.ime && r.uloga);
  if (!radniciPayload.length && radniciRows.length) {
    throw new Error("radnici: CSV ima redove, ali mapiranje nije uspelo — proveri kolone u radnici.csv");
  }
  await upsertBatches(supabase, "radnici", radniciPayload, "id");

  await upsertBatches(
    supabase,
    "kontrolna_lista_stavke",
    listaStavkeRows.map((r) => ({
      id: num(r.id),
      kategorija: pick(r, "kategorija"),
      stavka: pick(r, "stavka"),
      redosled: num(pick(r, "redosled")) ?? 0,
      aktivna: daNe(pick(r, "aktivna")),
    })).filter((r) => r.id && r.stavka),
    "id"
  );

  await upsertBatches(
    supabase,
    "delovi",
    deloviRows.map((r) => {
      const idDeo = pick(r, "id dela", "id_deo").toUpperCase();
      const tip = (pick(r, "tip kontrole", "tip_kontrole") || (idDeo.startsWith("AUTO") ? "vozilo" : "deo")).toLowerCase();
      return {
        id_deo: idDeo,
        naziv_dela: pick(r, "naziv dela", "naziv_dela"),
        karakteristika: pick(r, "karakteristika kontrole", "karakteristika"),
        linija_id: num(pick(r, "linija id", "linija_id")),
        masina_id: num(pick(r, "masina id", "masina_id")),
        kom_za_kontrolu: num(pick(r, "kom za kontrolu n", "kom za kontrolu")) ?? 30,
        slika_naziv: pick(r, "slika/crtez", "slika_naziv") || null,
        aktivan: daNe(pick(r, "aktivan")),
        napomena: pick(r, "napomena") || null,
        tip_kontrole: tip === "vozilo" ? "vozilo" : "deo",
        vozilo_katalog_id: pick(r, "vozilo katalog id", "vozilo_katalog_id") || (tip === "vozilo" ? "FINAL-001" : null),
      };
    }).filter((r) => r.id_deo),
    "id_deo"
  );

  const kupciSet = [...new Set(naloziRows.map((r) => pick(r, "kupac")).filter(Boolean))];
  await upsertBatches(
    supabase,
    "kupci",
    kupciSet.map((naziv) => ({ naziv, aktivan: true })),
    "naziv"
  );

  await upsertBatches(
    supabase,
    "radni_nalozi",
    naloziRows.map((r) => ({
      id: num(r.id),
      broj_naloga: pick(r, "radni nal", "broj_naloga").toUpperCase(),
      id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
      naziv_dela: pick(r, "naziv dela", "naziv_dela"),
      kolicina: num(pick(r, "količina", "kolicina")),
      kupac: pick(r, "kupac") || null,
      datum_unosa: pick(r, "datum unosa") || null,
      rok_isporuke: pick(r, "rok isporuke") || null,
      status: pick(r, "status") || "aktivan",
      operater: pick(r, "operater") || null,
      napomena: pick(r, "napomena") || null,
    })).filter((r) => r.broj_naloga),
    "broj_naloga"
  );

  console.log("Import kontrolni_log...");
  await upsertBatches(
    supabase,
    "kontrolni_log",
    logRows.map((r) => ({
      id: num(r.id),
      datum: pick(r, "datum"),
      smena: num(pick(r, "smena")),
      radni_nalog: pick(r, "radni nalog", "radni_nalog") || null,
      id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
      naziv_dela: pick(r, "naziv dela", "naziv_dela"),
      linija_id: num(pick(r, "linija id", "linija_id")),
      masina_id: num(pick(r, "masina id", "masina_id")),
      kontrolor_id: num(pick(r, "kontrolor id", "kontrolor_id")),
      operater_id: num(pick(r, "operater id", "operater_id")),
      status: pick(r, "status").toUpperCase(),
      greska_naziv: pick(r, "kategorija greske", "greska_naziv") || null,
      podkategorija: pick(r, "podkategorija") || null,
      defekt: pick(r, "defekt") || null,
      kom_nok: num(pick(r, "kom nok", "kom_nok")) ?? 0,
      ok_kolicina: num(pick(r, "ok kol.", "ok_kolicina")) ?? 0,
      nok_kolicina: num(pick(r, "nok kol.", "nok_kolicina")) ?? 0,
      ukupno_merenja: num(pick(r, "ukupno n", "ukupno_merenja")) ?? 0,
      komentar: pick(r, "komentar") || null,
    })).filter((r) => r.id),
    "id"
  );

  try {
    const { error: seqErr } = await supabase.rpc("sync_kontrolni_log_seq");
    if (seqErr) {
      console.warn("  kontrolni_log sekvenca: pokreni 09_fix_kontrolni_log_sequence.sql u Supabase");
    } else {
      console.log("  kontrolni_log: ID sekvenca usklađena");
    }
  } catch {
    console.warn("  kontrolni_log sekvenca: pokreni 09_fix_kontrolni_log_sequence.sql u Supabase");
  }

  await upsertBatches(
    supabase,
    "ciljevi",
    ciljeviRows.map((r) => ({
      id: num(r.id),
      id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
      naziv: pick(r, "naziv"),
      rty_cilj: num(pick(r, "rty cilj %", "rty_cilj")),
      dpmo_cilj: num(pick(r, "dpmo cilj", "dpmo_cilj")),
      p_cilj: num(pick(r, "p cilj %", "p_cilj")),
      vazi_od: pick(r, "vazi od", "vazi_od") || null,
    })).filter((r) => r.id),
    "id"
  );

  console.log("Import merila/kalibracija...");
  const merilaPayload = merilaRows.map((r) => ({
    id: num(r.id),
    naziv: pick(r, "naziv merila", "naziv"),
    serijski_broj: pick(r, "serijski br.", "serijski_broj") || null,
    tip: pick(r, "tip") || null,
    lokacija: pick(r, "lokacija") || null,
    opseg: pick(r, "opseg") || null,
    aktivno: true,
  })).filter((r) => r.id);
  await upsertBatches(supabase, "merila", merilaPayload, "id");

  const kalibracijePayload = merilaRows.map((r) => ({
    merilo_id: num(r.id),
    datum_kal: pick(r, "datum kal.", "datum_kal") || null,
    sledeca_kal: pick(r, "sledeca kal.", "sledeca_kal") || null,
    izvrsio: pick(r, "izvrsio") || null,
    sertifikat_br: pick(r, "cert br.", "sertifikat_br") || null,
    rezultat: pick(r, "rezultat") || null,
  })).filter((r) => r.merilo_id && r.datum_kal);

  if (kalibracijePayload.length) {
    const { error } = await supabase.from("kalibracije").insert(kalibracijePayload);
    if (error) throw new Error(`kalibracije: ${error.message}`);
    console.log(`  kalibracije: ${kalibracijePayload.length}`);
  }

  const { data: radniciDb } = await supabase.from("radnici").select("id,ime");
  console.log("Import eskalacija/osmd...");
  await upsertBatches(
    supabase,
    "eskalacije",
    eskRows.map((r) => ({
      id: num(r.id),
      id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
      opis: pick(r, "opis problema", "opis"),
      prioritet: pick(r, "prioritet").toLowerCase(),
      status: pick(r, "status").toLowerCase().replace(" ", "_"),
      kreirao_id: findRadnikId(radniciDb || [], pick(r, "kreirao")),
      dodeljen_id: findRadnikId(radniciDb || [], pick(r, "dodeljen")),
      rok: pick(r, "rok") || null,
      korektivna_akcija: pick(r, "korektivna akcija", "korektivna_akcija") || null,
      zatvoreno_at: pick(r, "zatvoren") || null,
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "osmd_izvestaji",
    osmdRows.map((r) => ({
      id: num(r.id),
      d1_tim: pick(r, "d1 tim", "d1_tim"),
      d2_opis_problema: pick(r, "d2 opis problema", "d2_opis_problema"),
      d3_privremena_akcija: pick(r, "d3 privremena akcija", "d3_privremena_akcija"),
      d4_uzrok: pick(r, "d4 uzrok", "d4_uzrok"),
      d5_korektivna: pick(r, "d5 korektivna", "d5_korektivna"),
      d6_implementacija: pick(r, "d6 implementacija", "d6_implementacija"),
      d7_prevencija: pick(r, "d7 prevencija", "d7_prevencija"),
      d8_zakljucak: pick(r, "d8 zakljucak", "d8_zakljucak"),
    })).filter((r) => r.id && r.d2_opis_problema),
    "id"
  );

  console.log("Import analitičkih tabela...");
  await upsertBatches(
    supabase,
    "analiza_kontrolor",
    analKRows.map((r) => ({
      id: num(r.id),
      ime: pick(r, "ime"),
      uloga: pick(r, "uloga"),
      mereno: num(pick(r, "mereno")),
      ok: num(pick(r, "ok")),
      nok: num(pick(r, "nok")),
      dpmo: num(pick(r, "dpmo")),
      kalibracija: pick(r, "kalibracija"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "analiza_masina",
    analMRows.map((r) => ({
      id: num(r.id),
      masina: pick(r, "masina"),
      period: pick(r, "period"),
      id_deo: pick(r, "id dela", "id_deo"),
      mereno: num(pick(r, "mereno")),
      ok: num(pick(r, "ok")),
      nok: num(pick(r, "nok")),
      rty_proc: num(pick(r, "rty %", "rty_proc")),
      dpmo: num(pick(r, "dpmo")),
      korelacija_greska: pick(r, "korelacija greska"),
      status: pick(r, "status"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "analiza_smena",
    analSRows.map((r) => ({
      id: num(r.id),
      smena: pick(r, "smena"),
      datum: pick(r, "datum") || null,
      id_deo: pick(r, "id dela", "id_deo"),
      mereno: num(pick(r, "mereno")),
      ok: num(pick(r, "ok")),
      nok: num(pick(r, "nok")),
      rty_proc: num(pick(r, "rty %")),
      dpmo: num(pick(r, "dpmo")),
      top_greska: pick(r, "top greska"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "dpmo",
    dpmoRows.map((r) => ({
      id: num(r.id),
      id_deo: pick(r, "id dela", "id_deo"),
      period: pick(r, "period"),
      mereno_n: num(pick(r, "mereno n")),
      nok: num(pick(r, "nok")),
      dpmo: num(pick(r, "dpmo")),
      rty_proc: num(pick(r, "rty %")),
      sigma_nivo: pick(r, "sigma nivo"),
      cilj_dpmo: num(pick(r, "cilj dpmo")),
      status: pick(r, "status"),
      trend: pick(r, "trend"),
    })).filter((r) => r.id),
    "id"
  );

  await upsertBatches(
    supabase,
    "pareto",
    paretoRows.map((r) => ({
      id: num(r.id),
      rang: num(pick(r, "rang")),
      kategorija: pick(r, "kategorija"),
      podkategorija: pick(r, "podkategorija"),
      broj: num(pick(r, "broj")),
      procenat: num(pick(r, "% ukupno", "procenat")),
      kumulativ_proc: num(pick(r, "kumulativ %", "kumulativ_proc")),
      pareto_8020: pick(r, "80/20", "pareto_8020"),
      prioritet: pick(r, "prioritet"),
      korektivna_akcija: pick(r, "korektivna akcija"),
      odgovorni: pick(r, "odgovorni"),
    })).filter((r) => r.id),
    "id"
  );

  if (sopDeoVarRows.length) {
    console.log("Import varijabilnih SOP zaglavlja...");
    await upsertBatches(
      supabase,
      "sop_deo_varijabilni",
      sopDeoVarRows.map((r) => ({
        id_deo: pick(r, "id_deo").toUpperCase(),
        radni_nalog: pick(r, "radni_nalog"),
        naziv_dela: pick(r, "naziv_dela"),
        slika: pick(r, "slika"),
        masina: pick(r, "masina"),
        linija: pick(r, "linija"),
        broj_merenja: num(pick(r, "broj_merenja")) || 5,
        kontrolor_ime: pick(r, "kontrolor_ime"),
      })).filter((r) => r.id_deo),
      "id_deo"
    );
  }

  if (karMerRows.length) {
    console.log("Import karakteristika merljivih...");
    await upsertBatches(
      supabase,
      "karakteristike_merljive",
      karMerRows.map((r) => ({
        id: num(r.id),
        id_deo: pick(r, "id_deo").toUpperCase(),
        sifra_merenja: pick(r, "sifra_merenja"),
        pozicija: pick(r, "pozicija"),
        naziv_mere: pick(r, "naziv_mere"),
        nominala: num(pick(r, "nominala")),
        usl: num(pick(r, "usl")),
        lsl: num(pick(r, "lsl")),
        usl_text: pick(r, "usl_text"),
        lsl_text: pick(r, "lsl_text"),
        merni_instrument: pick(r, "merni_instrument"),
        jedinica: pick(r, "jedinica"),
        napomena: pick(r, "napomena"),
      })).filter((r) => r.id && r.id_deo && r.pozicija),
      "id"
    );
  }

  if (merVarRows.length) {
    console.log("Import merenja varijabilnih...");
    await upsertBatches(
      supabase,
      "merenja_varijabilna",
      merVarRows.map((r) => ({
        id: num(r.id),
        datum: pick(r, "datum") || null,
        smena: num(pick(r, "smena")),
        radni_nalog: pick(r, "radni_nalog"),
        id_deo: pick(r, "id_deo").toUpperCase(),
        pozicija: pick(r, "dimenzija", "pozicija"),
        vrednost_raw: String(pick(r, "izmereno", "vrednost_raw")),
        vrednost_dec: num(pick(r, "izmereno", "vrednost_dec")),
        status: pick(r, "status").toUpperCase(),
        linija: pick(r, "linija"),
        kontrolor: pick(r, "kontrolor"),
        operater: pick(r, "operater"),
        merni_instrument: pick(r, "merni_instrument"),
        masina: pick(r, "masina"),
      })).filter((r) => r.id && r.id_deo && r.vrednost_raw),
      "id"
    );
  }

  if (merVarRows.length) {
    console.log(
      "\nAko Sačuvaj seriju javlja duplicate key na merenja_varijabilna:"
      + "\n  pokreni 19_fix_merenja_varijabilna_sequence.sql u Supabase SQL Editoru.\n",
    );
  }

  console.log("Gotovo — svi CSV fajlovi su uvezani.");
}

main().catch((err) => {
  console.error("Import greška:", err.message);
  process.exit(1);
});
