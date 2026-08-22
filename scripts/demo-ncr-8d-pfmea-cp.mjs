#!/usr/bin/env node
/**
 * Demo NCR → 8D → PFMEA → CP — provera povezivanja.
 *
 *   node scripts/demo-ncr-8d-pfmea-cp.mjs
 *
 * Zahteva SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY u .env.local
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_TAG = "DEMO-VEZA-2026";
const ID_DEO = "NM-001";

async function loadEnvFile(name) {
  try {
    const raw = await fs.readFile(path.join(ROOT, name), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch { /* */ }
}

async function importLib(relPath) {
  return import(pathToFileURL(path.join(ROOT, relPath)).href);
}

function danas() {
  return new Date().toISOString().slice(0, 10);
}

function provera(oznaka, ok, detalj = "") {
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${oznaka}${detalj ? `: ${detalj}` : ""}`);
  return ok;
}

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Nedostaje SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.local");
    process.exit(1);
  }

  const sb = createClient(url, key);

  const { snimiNcrCapa, poveziOsmd } = await importLib("src/lib/ncrCapa.js");
  const { osmdPayloadIzForme } = await importLib("src/lib/osmdIzvestajPdf.js");
  const { osigurajBrojevePaketa8d } = await importLib("src/lib/osmdBrojevi.js");
  const { prefillPfmeaCpIz8d, noviPfmeaCpDocIz8d } = await importLib("src/lib/osmdPfmeaCpBridge.js");
  const { kreirajPfmeaCpDokument, sacuvajPfmeaCpDokument } = await importLib("src/lib/pfmeaCpDb.js");

  console.log(`\n=== ${DEMO_TAG} — NCR · 8D · PFMEA · CP ===\n`);

  const { data: deo, error: eDeo } = await sb.from("delovi").select("id_deo,naziv_dela").eq("id_deo", ID_DEO).maybeSingle();
  if (eDeo) throw eDeo;
  if (!deo) {
    console.error(`Deo ${ID_DEO} ne postoji u šifrarniku — pokreni ERP uvoz ili seed delova.`);
    process.exit(1);
  }
  console.log(`Deo: ${deo.id_deo} — ${deo.naziv_dela || "?"}\n`);

  // --- NCR (Modul 1 simulacija — prijava sa linije) ---
  const ncrPayload = {
    id_deo: ID_DEO,
    pogon: "Karoserija",
    linija: "Preseraj",
    opis: `[${DEMO_TAG}] Debljina lima 9.72 mm — ispod LSL 9.80 mm (5 komada u seriji A)`,
    ozbiljnost: "High",
    status: "open",
    izvor: "unos_linija",
    detektovao: "Demo kontrolor",
    metoda_detekcije: "Merljiva kontrola na liniji",
    kolicina_neispravna: 5,
    kolicina_proizvedena: 120,
    datum_otvaranja: danas(),
    containment_mere: "Stop linija · sortiranje poslednjih 30 kom · karantin palete #K-042",
  };

  const ncr = await snimiNcrCapa(sb, ncrPayload);
  console.log("1) NCR kreiran");
  console.log(`   ${ncr.broj_ncr} · status ${ncr.status} · deo ${ncr.id_deo}`);

  // --- 8D (inženjer nastavlja — Modul 2) ---
  const osmdForm = await osigurajBrojevePaketa8d(sb, {
    id_deo: ID_DEO,
    naziv_dela: deo.naziv_dela || "",
    status: "u_izradi",
    datum_otvaranja_8d: danas(),
    broj_reklamacije: ncr.broj_ncr,
    defekt_nedostatak: "Debljina lima ispod donje granice tolerancije",
    kupac_ime_id: "Demo Kupac d.o.o.",
    artikal_naziv_sifra: `${ID_DEO} — Nosač motora`,
    lot_serijski: "LOT-DEMO-0820-A",
    klasa_greske: "glavna",
    d2_opis_problema: `[${DEMO_TAG}] Problem: 5 komada sa debljinom 9.72–9.78 mm (LSL 9.80). Detekcija na WS presovanje.`,
    d3_privremena_akcija: "Grupa 1: Stop & sort\n• Izdvojeno 30 kom\n• Kalibracija merila #M-044",
    d4_uzrok: "Korenski uzrok: istrošen alat na presi P-12 — promenjen pritisak bez FAI verifikacije.",
    d6_implementacija: "Akcija|Odgovorni|Rok|Status\nKalibracija alata P-12|Održavanje|2026-08-25|U toku\n100% kontrola debljine|KK|2026-08-22|Planirano",
    d7_prevencija: "• SPC X-R kartica za debljinu\n• FAI posle svake zamene alata",
  });

  const { data: osmd, error: eOsmd } = await sb.from("osmd_izvestaji")
    .insert({ ...osmdPayloadIzForme(osmdForm), kreirao_id: null })
    .select("*")
    .single();
  if (eOsmd) throw eOsmd;

  const ncrPovezan = await poveziOsmd(sb, ncr.id, osmd.id, osmd.broj_8d);
  console.log("\n2) 8D kreiran i povezan sa NCR");
  console.log(`   ${osmd.broj_8d} · PFMEA ${osmd.broj_pfmea} · CP ${osmd.broj_control_plan}`);
  console.log(`   NCR osmd_id=${ncrPovezan.osmd_id} · osmd_broj=${ncrPovezan.osmd_broj || ncrPovezan.osmd_id}`);

  // --- PFMEA / CP iz 8D ---
  const prefill = prefillPfmeaCpIz8d(osmd);
  if (!prefill?.pfmea?.redovi?.length) {
    throw new Error("8D nema dovoljno podataka za PFMEA prefill");
  }

  const noviDoc = noviPfmeaCpDocIz8d(prefill);
  const kreiran = await kreirajPfmeaCpDokument(sb, {
    naziv: noviDoc.naziv,
    idDeo: noviDoc.idDeo,
    revizija: noviDoc.revizija,
    osmdIzvestajId: osmd.id,
    broj8d: osmd.broj_8d,
    brojPfmea: osmd.broj_pfmea,
    brojControlPlan: osmd.broj_control_plan,
    napomena: `[${DEMO_TAG}] ${noviDoc.napomena}`,
  });
  const pfDoc = await sacuvajPfmeaCpDokument(sb, { ...noviDoc, id: kreiran.id }, {});

  console.log("\n3) PFMEA / CP dokument kreiran iz 8D");
  console.log(`   Dokument #${pfDoc.id}: ${pfDoc.naziv}`);
  console.log(`   PFMEA stavki: ${pfDoc.pfmea?.redovi?.length || 0} · CP stavki: ${pfDoc.controlPlan?.redovi?.length || 0}`);
  const pfRed = pfDoc.pfmea?.redovi?.[0];
  const cpRed = pfDoc.controlPlan?.redovi?.[0];
  if (pfRed) console.log(`   PFMEA veza: ${pfRed.pfmea_veza} → CP ref: ${pfRed.control_plan_ref}`);
  if (cpRed) console.log(`   CP PFMEA ref: ${cpRed.pfmea_referenca} · zapis: ${cpRed.zapis_forma}`);

  // --- Verifikacija veza ---
  console.log("\n4) Provera veza u bazi\n");

  const { data: ncrDb } = await sb.from("ncr_capa").select("*").eq("id", ncr.id).single();
  const { data: osmdDb } = await sb.from("osmd_izvestaji").select("*").eq("id", osmd.id).single();
  const { data: pfDb } = await sb.from("pfmea_cp_dokumenti").select("*").eq("id", pfDoc.id).single();
  const { data: pfSt } = await sb.from("pfmea_stavke").select("pfmea_veza,control_plan_ref").eq("dokument_id", pfDoc.id).limit(1);
  const { data: cpSt } = await sb.from("control_plan_stavke").select("pfmea_referenca,zapis_forma").eq("dokument_id", pfDoc.id).limit(1);

  let sveOk = true;
  sveOk = provera("NCR → 8D (osmd_id)", ncrDb.osmd_id === osmd.id, `#${ncrDb.osmd_id}`) && sveOk;
  sveOk = provera("NCR → 8D (osmd_broj)", ncrDb.osmd_broj === osmd.broj_8d, ncrDb.osmd_broj) && sveOk;
  sveOk = provera("8D broj PFMEA", osmdDb.broj_pfmea === osmd.broj_pfmea, osmdDb.broj_pfmea) && sveOk;
  sveOk = provera("8D broj CP", osmdDb.broj_control_plan === osmd.broj_control_plan, osmdDb.broj_control_plan) && sveOk;
  sveOk = provera("PFMEA doc → 8D", pfDb.osmd_izvestaj_id === osmd.id, `#${pfDb.osmd_izvestaj_id}`) && sveOk;
  sveOk = provera("PFMEA doc broj_8d", pfDb.broj_8d === osmd.broj_8d, pfDb.broj_8d) && sveOk;
  sveOk = provera("PFMEA doc broj_pfmea", pfDb.broj_pfmea === osmd.broj_pfmea, pfDb.broj_pfmea) && sveOk;
  sveOk = provera("PFMEA doc broj_control_plan", pfDb.broj_control_plan === osmd.broj_control_plan, pfDb.broj_control_plan) && sveOk;
  sveOk = provera("PFMEA stavka veza", pfSt?.[0]?.pfmea_veza === osmd.broj_pfmea, pfSt?.[0]?.pfmea_veza) && sveOk;
  sveOk = provera("CP stavka referenca", cpSt?.[0]?.pfmea_referenca === osmd.broj_pfmea, cpSt?.[0]?.pfmea_referenca) && sveOk;
  sveOk = provera("Usklađeni brojevi 8D/PFMEA/CP",
    osmd.broj_8d?.includes("-NM-") && osmd.broj_pfmea?.startsWith("PFMEA-") && osmd.broj_control_plan?.startsWith("CP-"),
    `${osmd.broj_8d} / ${osmd.broj_pfmea} / ${osmd.broj_control_plan}`,
  ) && sveOk;

  console.log("\n--- Gde proveriti u aplikaciji ---");
  console.log("Modul 2 → Analitika → NCR → Registar → traži:", ncr.broj_ncr);
  console.log("Modul 2 → 8D → otvori:", osmd.broj_8d);
  console.log("Modul 2 → PFMEA/CP → dokument:", pfDoc.naziv);
  console.log(`\nTag za brisanje demo podataka: ${DEMO_TAG}\n`);

  if (!sveOk) {
    console.error("Neke veze nisu ispravne — proveri migraciju 76_osmd_pfmea_cp_brojevi.sql");
    process.exit(1);
  }
  console.log("✓ Sve veze OK\n");
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.message?.includes("broj_pfmea") || e.message?.includes("column")) {
    console.error("\nHint: pokreni 76_osmd_pfmea_cp_brojevi.sql u Supabase SQL Editoru.");
  }
  process.exit(1);
});
