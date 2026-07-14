#!/usr/bin/env node
/**
 * Smenski email digest — KPI, alarmi, NCR, kal/MSA.
 * Po liniji: --po-linijama ili DIGEST_PO_LINIJI=1
 * Jedna linija: --linija "Ulazna kontrola"
 *
 * npm run digest:smena
 * npm run digest:smena:dry -- --po-linijama
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import {
  fetchPredajaPodataka,
  generisiPredajaSmenePdfBuffer,
  generisiPredajaSmenePdfBufferPogon,
} from "../src/lib/predajaSmenePdf.js";
import { ucitajLinijeZaDigest } from "../src/lib/digestLinija.js";
import { fetchPrioritetSmene } from "../src/lib/kontekstualniVodic.js";
import { fetchSmenaStatPoPogonima, formatPoPogonimaTekst } from "../src/lib/smenaPogonBreakdown.js";
import { posaljiEmailIzEnv } from "./lib/posaljiEmailEnv.mjs";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "smenski-digest.log", { jobId: "smenski-digest" });

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function formatModul(naslov, pod) {
  const m = pod.merenja;
  const linije = [
    `${naslov}`,
    `  Merenja: ${m.n} (OK ${m.ok}, NOK ${m.nok}) · RTY ${m.rty}% · DPMO ${m.dpmo}`,
  ];
  if (pod.skartKpi) {
    linije.push(`  KPI: ukupno ${pod.skartKpi.ukupno || 0}, škart ${pod.skartKpi.skart || 0}, dorada ${pod.skartKpi.dorada || 0}`);
  }
  if (pod.topNok?.length) {
    linije.push(`  Top NOK: ${pod.topNok.map(([p, n]) => `${p}(${n})`).join(", ")}`);
  }
  if (pod.alarmi?.length) {
    linije.push(`  Otvoreni alarmi: ${pod.alarmi.length}`);
    pod.alarmi.slice(0, 5).forEach((a) => {
      linije.push(`    · ${a.id_deo} ${a.pozicija || ""} — ${a.pravilo || a.status}`);
    });
  }
  return linije.join("\n");
}

async function sastaviDigestBlok(supabase, { datum, smena, linija = null }) {
  const [mer, atr] = await Promise.all([
    fetchPredajaPodataka(supabase, { datum, smena, modul: "merljive", linija }),
    fetchPredajaPodataka(supabase, { datum, smena, modul: "atributivne", linija }),
  ]);

  const delovi = [];
  if (linija) {
    delovi.push(`── Linija: ${linija} ──`, "");
  }
  delovi.push(
    formatModul("Merljive", mer),
    "",
    formatModul("Atributivne", atr),
  );

  const sviNcr = [...(mer.ncr || []), ...(atr.ncr || [])];
  const uniqNcr = [...new Map(sviNcr.map((n) => [n.broj_ncr, n])).values()];
  if (uniqNcr.length) {
    delovi.push("", `Otvoreni NCR (${uniqNcr.length}):`);
    uniqNcr.slice(0, 8).forEach((n) => {
      delovi.push(`  · ${n.broj_ncr} ${n.id_deo} — ${n.status} (${n.prioritet})`);
    });
  }

  const kal = [...new Set([...(mer.kalIstekla || []), ...(atr.kalIstekla || [])])];
  if (kal.length) delovi.push("", `Kalibracija istekla: ${kal.slice(0, 6).join(", ")}`);

  const msa = [...(mer.msaKasni || []), ...(atr.msaKasni || [])];
  if (msa.length) {
    delovi.push("", `MSA kasni: ${msa.map((r) => r.merilo?.naziv || "?").slice(0, 6).join(", ")}`);
  }

  const [prioMer, prioAtr] = await Promise.all([
    fetchPrioritetSmene(supabase, { modul: "merljive", datum, smena, linija, limit: 3 }),
    fetchPrioritetSmene(supabase, { modul: "atributivne", datum, smena, linija, limit: 3 }),
  ]);
  const poPogon = await fetchSmenaStatPoPogonima(supabase, { datum, smena, linija });
  const poPogonTekst = formatPoPogonimaTekst(poPogon.redovi);
  if (poPogonTekst) {
    delovi.push("", poPogonTekst);
  }
  const formatPrio = (lista, naslov) => {
    if (!lista?.length) return [];
    return [
      "",
      `${naslov}:`,
      ...lista.map((p, i) => `  ${i + 1}. ${p.idDeo} (skor ${p.skor}, ${p.nivo}) — ${(p.razlozi || []).slice(0, 2).join("; ")}`),
    ];
  };
  const sufiks = linija ? ` — ${linija}` : "";
  delovi.push(...formatPrio(prioMer, `Top prioritet smene — merljive${sufiks}`));
  delovi.push(...formatPrio(prioAtr, `Top prioritet smene — atributivne${sufiks}`));

  return {
    tekst: delovi.join("\n"),
    mer,
    atr,
    uniqNcr,
  };
}

async function main() {
  await loadEnvZaSkripte(ROOT);

  const smena = Number(arg("--smena") || process.env.DIGEST_SMENA || 1);
  const to = arg("--to") || process.env.SMTP_TO || process.env.DIGEST_TO;
  const datum = arg("--datum") || new Date().toISOString().slice(0, 10);
  const saPdf = args.includes("--pdf") || process.env.DIGEST_PDF === "1";
  const dryRun = args.includes("--dry-run");
  const poLinijama = args.includes("--po-linijama") || process.env.DIGEST_PO_LINIJI === "1";
  const linijaJedna = arg("--linija") || process.env.DIGEST_LINIJA || null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.local");
  }
  if (!to && !dryRun) {
    throw new Error("Postavi --to ili SMTP_TO / DIGEST_TO");
  }

  await skriptaLog.run(`digest smena ${smena} ${datum}`, async () => {
    const supabase = createClient(url, key);
    let settings = spojiAutoPodesavanja({});
    try {
      const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
      (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
      settings = spojiAutoPodesavanja(settings);
    } catch { /* */ }
    if (!jeAutoPraviloUkljuceno(settings, "digest")) {
      await skriptaLog.info("Digest isključen u podešavanjima");
      return;
    }

    const delovi = [
      "SPC — Smenski digest",
      `Datum: ${datum} · Smena: ${smena}`,
    ];

    let ukMer = 0;
    let ukAtr = 0;
    let ukNcr = 0;

    if (poLinijama) {
      const linije = await ucitajLinijeZaDigest(supabase, { datum, smena });
      if (!linije.length) {
        delovi.push("", "(Nema merenja po linijama za ovu smenu — ukupni pregled)", "");
        const blok = await sastaviDigestBlok(supabase, { datum, smena });
        delovi.push(blok.tekst);
        ukMer = blok.mer.merenja.n;
        ukAtr = blok.atr.merenja.n;
        ukNcr = blok.uniqNcr.length;
      } else {
        delovi.push("", `Pregled po linijama (${linije.length}):`, "");
        for (const lin of linije) {
          const blok = await sastaviDigestBlok(supabase, { datum, smena, linija: lin });
          delovi.push(blok.tekst, "");
          ukMer += blok.mer.merenja.n;
          ukAtr += blok.atr.merenja.n;
          ukNcr += blok.uniqNcr.length;
        }
      }
    } else if (linijaJedna) {
      delovi.push("", `Filter linija: ${linijaJedna}`, "");
      const blok = await sastaviDigestBlok(supabase, { datum, smena, linija: linijaJedna });
      delovi.push(blok.tekst);
      ukMer = blok.mer.merenja.n;
      ukAtr = blok.atr.merenja.n;
      ukNcr = blok.uniqNcr.length;
    } else {
      const blok = await sastaviDigestBlok(supabase, { datum, smena });
      delovi.push("", blok.tekst);
      ukMer = blok.mer.merenja.n;
      ukAtr = blok.atr.merenja.n;
      ukNcr = blok.uniqNcr.length;
    }

    const tekst = delovi.join("\n");
    const subject = linijaJedna
      ? `SPC digest — ${datum} smena ${smena} · ${linijaJedna}`
      : poLinijama
        ? `SPC digest — ${datum} smena ${smena} (po linijama)`
        : `SPC digest — ${datum} smena ${smena}`;

    console.log(tekst);
    if (dryRun) {
      console.log("\nDry-run — preskočeno slanje emaila");
      await skriptaLog.info(`Dry-run digest → ${to || "—"} · pdf=${saPdf ? "da" : "ne"} · linije=${poLinijama ? "da" : linijaJedna || "ne"}`);
      return;
    }
    console.log(`\nŠaljem → ${to}`);

    const attachments = [];
    if (saPdf && !poLinijama) {
      const pdfPoModulu = process.env.DIGEST_PDF_PO_MODULU === "1";
      if (pdfPoModulu) {
        for (const modul of ["merljive", "atributivne"]) {
          const pdf = await generisiPredajaSmenePdfBuffer(supabase, {
            smena, modul, datum, linija: linijaJedna || undefined,
          });
          if (pdf?.buffer) {
            attachments.push({ filename: pdf.filename, content: pdf.buffer });
            await skriptaLog.info(`PDF prilog: ${pdf.filename}`);
          }
        }
      } else {
        const pdf = await generisiPredajaSmenePdfBufferPogon(supabase, {
          smena, datum, linija: linijaJedna || undefined,
        });
        if (pdf?.buffer) {
          attachments.push({ filename: pdf.filename, content: pdf.buffer });
          await skriptaLog.info(`PDF prilog (ceo pogon): ${pdf.filename}`);
        }
      }
    }

    const kanal = await posaljiEmailIzEnv(process.env, { to, subject, text: tekst, attachments });
    await skriptaLog.info(
      `Email poslat → ${to} · mer=${ukMer} atr=${ukAtr} ncr=${ukNcr} kanal=${kanal.kanal} pdf=${attachments.length} po_linijama=${poLinijama}`,
    );
    console.log("✓ Digest poslat");
  });
}

main().catch(async (e) => {
  const msg = e.message || String(e);
  console.error("✗", msg);
  try { await skriptaLog.error(msg); } catch { /* */ }
  process.exit(1);
});
