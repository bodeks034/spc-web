/**
 * NM-001 demo — provera alarma NOK, kontrolni plan, FAI stanje.
 * Pokretanje (cmd):
 *   set SUPABASE_URL=https://wzxkcomeurogvfisticq.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=<service_role>
 *   node scripts/test-nm001-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const ID = "NM-001";
const POGON = "A";
const NOK_PRAG = 0.20;

function danas() {
  return new Date().toISOString().split("T")[0];
}

async function kreirajAlarmNok(deo, pozicija, nok, uk) {
  const procTxt = Math.round((nok / uk) * 100);
  const pragTxt = Math.round(NOK_PRAG * 100);
  const { data, error } = await sb.from("spc_alarmi").insert({
    id_deo: deo,
    datum: danas(),
    tip_karte: "Linija",
    pozicija,
    pravilo: `NOK ≥${pragTxt}% (${nok}/${uk})`,
    status: "otvoren",
  }).select("id,pravilo,status,pozicija").single();
  if (error) throw error;
  return data;
}

async function uvoziPlan(idDeo) {
  const { data: kar, error } = await sb.from("karakteristike_merljive")
    .select("pogon_kod,pozicija,naziv_mere,merni_instrument,broj_merenja,nivo_kontrole")
    .eq("id_deo", idDeo);
  if (error) throw error;
  let n = 0;
  for (const k of kar || []) {
    const poz = k.pozicija || k.naziv_mere;
    if (!poz) continue;
    const { data: ex } = await sb.from("kontrolni_plan")
      .select("id").eq("id_deo", idDeo).eq("pozicija", poz).eq("aktivan", true).limit(1);
    if (ex?.length) continue;
    const { error: insErr } = await sb.from("kontrolni_plan").insert({
      id_deo: idDeo,
      pogon_kod: k.pogon_kod || null,
      pozicija: poz,
      dimenzija: k.naziv_mere || poz,
      metoda: k.merni_instrument || null,
      ucestalost: k.broj_merenja ? `${k.broj_merenja}/serija` : "100%",
      reakcija: "SPC alarm / karantin / 8D po planu",
    });
    if (!insErr) n += 1;
  }
  return n;
}

async function main() {
  console.log("\n=== NM-001 demo ===\n");

  const { data: deo } = await sb.from("delovi").select("id_deo,naziv_dela").eq("id_deo", ID).maybeSingle();
  console.log("✓ Deo:", deo?.id_deo, "—", deo?.naziv_dela);

  const { data: kar } = await sb.from("karakteristike_merljive")
    .select("pozicija,nominala,lsl,usl,broj_merenja")
    .eq("id_deo", ID).eq("pogon_kod", POGON);
  console.log(`✓ Karakteristike pogon ${POGON}:`, kar?.length || 0);
  const debljina = kar?.find((k) => k.pozicija === "Debljina lima");
  if (debljina) {
    console.log(`  Debljina lima: ${debljina.nominala} [${debljina.lsl}–${debljina.usl}], n=${debljina.broj_merenja}`);
  }

  const datumTest = "2026-06-12";
  const { data: merenja } = await sb.from("merenja_varijabilna")
    .select("status,pozicija,vrednost_raw")
    .eq("id_deo", ID)
    .eq("datum", datumTest)
    .eq("pozicija", "Debljina lima");

  const rows = merenja || [];
  const nok = rows.filter((r) => r.status === "NOK").length;
  console.log(`\nMerenja Debljina lima (${datumTest}): ${rows.length}, NOK: ${nok}`);

  const { data: alarmiPre } = await sb.from("spc_alarmi").select("id").eq("id_deo", ID);
  console.log("SPC alarmi pre:", alarmiPre?.length || 0);

  if (rows.length >= 5 && nok / rows.length >= NOK_PRAG && !(alarmiPre?.length)) {
    const alarm = await kreirajAlarmNok(ID, "Debljina lima", nok, rows.length);
    console.log("✓ Kreiran alarm:", alarm?.id, alarm?.pravilo);
  } else if (alarmiPre?.length) {
    console.log("(Alarm već postoji — preskačem)");
  } else {
    console.log("(Nema dovoljno NOK za alarm)");
  }

  const { data: alarmiPosle } = await sb.from("spc_alarmi").select("id,status,pravilo,pozicija").eq("id_deo", ID);
  alarmiPosle?.forEach((a) => console.log(`  Alarm #${a.id}: ${a.status} · ${a.pozicija} · ${a.pravilo}`));

  const nPlan = await uvoziPlan(ID);
  console.log(`\n✓ Kontrolni plan — uvezeno ${nPlan} novih redova`);

  const { count: planCnt } = await sb.from("kontrolni_plan").select("*", { count: "exact", head: true }).eq("id_deo", ID);
  console.log(`  Ukupno plan redova za ${ID}:`, planCnt);

  const { data: fai } = await sb.from("fai_unosi")
    .select("id,status,datum,smena,pogon_kod")
    .eq("id_deo", ID).eq("datum", danas());
  console.log(`\nFAI za danas (${danas()}):`, fai?.length || 0);
  console.log("\n--- Uputstvo za test u app ---");
  console.log("Modul merljive · linija · NM-001 · pogon A · serija A");
  console.log("Korak 3 FAI: unesi Debljina lima ≈ 10.0 (OK) → Odobri FAI");
  console.log("Korak 4: unos merenja (5×) — za alarm probaj vrednosti < 9.8");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
