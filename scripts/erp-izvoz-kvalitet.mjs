#!/usr/bin/env node
/**
 * Izvoz modula kvaliteta u ERP — srpski nazivi kolona.
 *
 * Generiše u erp-drop/outgoing/:
 *   Karakteristike.csv  — karakteristike_merljive
 *   KontrolniPlan.csv   — control_plan_stavke (+ revizija dokumenta)
 *   PFMEA.csv           — pfmea_stavke
 *
 * Upotreba:
 *   node scripts/erp-izvoz-kvalitet.mjs
 *   node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001
 *   node scripts/erp-izvoz-kvalitet.mjs --out C:\erp\ulaz
 *   node scripts/erp-izvoz-kvalitet.mjs --dry-run
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "erp-izvoz-kvalitet.log", {
  jobId: "erp-quality-izvoz",
});

function parseArgs(argv) {
  const args = { deo: null, out: null, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--dry-run") args.dryRun = true;
    else if (t === "--deo" && argv[i + 1]) { args.deo = argv[i + 1].trim().toUpperCase(); i += 1; }
    else if (t === "--out" && argv[i + 1]) { args.out = path.resolve(argv[i + 1]); i += 1; }
  }
  return args;
}

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

function daNe(v) {
  return v === true || v === "da" || v === "DA" ? "da" : "ne";
}

async function fetchAll(supabase, tabela, select, filterFn) {
  const pageSize = 1000;
  const out = [];
  for (let from = 0; ; from += pageSize) {
    let q = supabase.from(tabela).select(select).range(from, from + pageSize - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function atomskiUpisi(dest, sadrzaj) {
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, "\uFEFF" + sadrzaj, "utf8");
  try {
    await fs.rename(tmp, dest);
  } catch (error) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = parseArgs(process.argv);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY (.env.erp / .env.local)");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (!args.dryRun) {
    let settings = spojiAutoPodesavanja({});
    try {
      const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
      (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
      settings = spojiAutoPodesavanja(settings);
    } catch { /* eksport radi i na starijoj šemi */ }
    if (!jeAutoPraviloUkljuceno(settings, "erp_izvoz")) {
      console.log("ERP izvoz kvaliteta je isključen u Auto pravilima.");
      await skriptaLog.info("ERP izvoz kvaliteta iskljucen u podesavanjima");
      return;
    }
  }

  return skriptaLog.run(`erp-quality-izvoz${args.dryRun ? " (dry-run)" : ""}`, async () => {
    const outDir = args.out || path.join(ROOT, "erp-drop", "outgoing");

    console.log("ERP izvoz kvaliteta");
    console.log(`  Cilj: ${outDir}${args.deo ? ` · deo ${args.deo}` : ""}${args.dryRun ? " · --dry-run" : ""}`);

    // 1) Karakteristike.csv
    const kar = await fetchAll(
    supabase,
    "karakteristike_merljive",
    "id_deo,sifra_karakteristike,sifra_merenja,pozicija,revizija,sifra_operacije,naziv_mere,tip_karakteristike,nominala,lsl,usl,jedinica,sifra_merila,merni_instrument,kriticna_karakteristika",
    (q) => {
      let query = q.order("id_deo").order("pogon_kod").order("pozicija");
      if (args.deo) query = query.eq("id_deo", args.deo);
      return query;
    },
  );
    const karHeaders = [
    "SifraKarakteristike", "SifraDela", "Revizija", "SifraOperacije", "NazivKarakteristike",
    "TipKarakteristike", "Nominal", "LSL", "USL", "JedinicaMere", "SifraMerila", "KriticnaKarakteristika",
  ];
    const seenKar = new Set();
    const karRows = kar
    .map((r) => ({
      SifraKarakteristike: r.sifra_karakteristike || r.sifra_merenja || r.pozicija,
      SifraDela: r.id_deo,
      Revizija: r.revizija || "0",
      SifraOperacije: r.sifra_operacije || "",
      NazivKarakteristike: r.naziv_mere || r.pozicija,
      TipKarakteristike: r.tip_karakteristike
        || (r.nominala != null || r.usl != null || r.lsl != null ? "Merljiva" : "Atributivna"),
      Nominal: r.nominala,
      LSL: r.lsl,
      USL: r.usl,
      JedinicaMere: r.jedinica || "mm",
      SifraMerila: r.sifra_merila || r.merni_instrument || "",
      KriticnaKarakteristika: daNe(r.kriticna_karakteristika),
    }))
    .filter((r) => {
      const key = `${r.SifraDela}|${r.Revizija}|${r.SifraKarakteristike}`;
      if (seenKar.has(key)) return false;
      seenKar.add(key);
      return true;
    });

    // 2) KontrolniPlan.csv (revizija sa dokumenta)
    const cpDokumenti = await fetchAll(supabase, "pfmea_cp_dokumenti", "id,id_deo,revizija");
    const revizijaPoDok = new Map(cpDokumenti.map((d) => [d.id, d.revizija]));
    const cp = await fetchAll(
    supabase,
    "control_plan_stavke",
    "dokument_id,br_dela,sifra_operacije,sifra_karakteristike,karakteristika,velicina_uzoraka,ucestalost,reakcija_nekontrolisano,odgovorni",
    (q) => (args.deo ? q.eq("br_dela", args.deo) : q),
  );
    const cpHeaders = [
    "SifraDela", "Revizija", "SifraOperacije", "SifraKarakteristike",
    "VelicinaUzorka", "Ucestalost", "ReakcioniPlan", "OdgovornoLice",
  ];
    const cpRows = cp.map((r) => ({
    SifraDela: r.br_dela,
    Revizija: revizijaPoDok.get(r.dokument_id) || "A",
    SifraOperacije: r.sifra_operacije || "",
    SifraKarakteristike: r.sifra_karakteristike || r.karakteristika || "",
    VelicinaUzorka: r.velicina_uzoraka || "",
    Ucestalost: r.ucestalost || "",
    ReakcioniPlan: r.reakcija_nekontrolisano || "",
    OdgovornoLice: r.odgovorni || "",
  }));

    // 3) PFMEA.csv
    const pfmea = await fetchAll(
    supabase,
    "pfmea_stavke",
    "br_dela,sifra_operacije,proces,mod_greske,efekat_greske,uzrok_greske,preventivna_kontrola,detekciona_kontrola,s,o,d,ap",
    (q) => (args.deo ? q.eq("br_dela", args.deo) : q),
  );
    const pfmeaHeaders = [
    "SifraDela", "SifraOperacije", "NacinOtkaza", "PosledicaOtkaza", "UzrokOtkaza",
    "PreventivnaKontrola", "DetekcionaKontrola", "S", "O", "D", "AP",
  ];
    const pfmeaRows = pfmea.map((r) => ({
    SifraDela: r.br_dela,
    SifraOperacije: r.sifra_operacije || r.proces || "",
    NacinOtkaza: r.mod_greske || "",
    PosledicaOtkaza: r.efekat_greske || "",
    UzrokOtkaza: r.uzrok_greske || "",
    PreventivnaKontrola: r.preventivna_kontrola || "",
    DetekcionaKontrola: r.detekciona_kontrola || "",
    S: r.s || "",
    O: r.o || "",
    D: r.d || "",
    AP: r.ap || "",
  }));

    const fajlovi = [
    ["Karakteristike.csv", toCsv(karHeaders, karRows), karRows.length],
    ["KontrolniPlan.csv", toCsv(cpHeaders, cpRows), cpRows.length],
    ["PFMEA.csv", toCsv(pfmeaHeaders, pfmeaRows), pfmeaRows.length],
  ];

    if (args.dryRun) {
      for (const [ime, , n] of fajlovi) console.log(`  ○ ${ime}: ${n} redova (dry-run, bez pisanja)`);
      return { ukupno: fajlovi.reduce((sum, [, , n]) => sum + n, 0), dryRun: true };
    }

    await fs.mkdir(outDir, { recursive: true });
    for (const [ime, sadrzaj, n] of fajlovi) {
      const dest = path.join(outDir, ime);
      await atomskiUpisi(dest, sadrzaj);
      console.log(`  ✓ ${ime}: ${n} redova → ${dest}`);
    }
    const ukupno = fajlovi.reduce((sum, [, , n]) => sum + n, 0);
    await skriptaLog.info(`Izvezeno ${ukupno} redova u ${fajlovi.length} CSV fajla`);
    console.log("\n✓ Izvoz završen.");
    return { ukupno, fajlova: fajlovi.length };
  });
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
