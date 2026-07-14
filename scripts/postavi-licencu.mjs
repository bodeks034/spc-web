/**

 * Postavlja licencu u bazi (Sloj B) — zahteva service_role (drži ga razvoj, ne IT).

 *

 * Prvo pokreni u Supabase SQL Editoru:

 *   21_licenca_gate.sql

 *   23_licenca_moduli.sql  (tenant, moduli, deployment)

 *

 * node scripts/postavi-licencu.mjs --do 2026-12-31 --enable --napomena "Fabrika"

 * node scripts/postavi-licencu.mjs --do 2026-12-31 --tenant fabrika-1 --deployment cloud

 * node scripts/postavi-licencu.mjs --bez-admin --do 2026-12-31

 * node scripts/postavi-licencu.mjs --disable

 */

import { createClient } from "@supabase/supabase-js";



const args = process.argv.slice(2);

function arg(name, def = null) {

  const i = args.indexOf(name);

  if (i === -1) return def;

  return args[i + 1] ?? true;

}



const url = process.env.SUPABASE_URL;

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {

  console.error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");

  process.exit(1);

}



const enable = args.includes("--disable") ? false : true;

const doDat = arg("--do", enable ? null : "2000-01-01");

const napomena = arg("--napomena", "");



if (enable && !doDat) {

  console.error("Za enable: --do YYYY-MM-DD");

  process.exit(1);

}



const vaziDo = enable

  ? new Date(`${doDat}T23:59:59`).toISOString()

  : new Date("2000-01-01T00:00:00Z").toISOString();



const supabase = createClient(url, key);



const tenant = arg("--tenant", "default");

const deployment = arg("--deployment", "cloud");

const moduli = {

  atributivne: !args.includes("--bez-atributivne"),

  varijabilne: !args.includes("--bez-merljive"),

  admin: !args.includes("--bez-admin"),

};

const maxKorisnika = arg("--max-korisnika", null);

const maxKorisnikaNum = maxKorisnika ? Number(maxKorisnika) : null;

const maxUredjaja = arg("--max-uredjaja", null);

const maxUredjajaNum = maxUredjaja ? Number(maxUredjaja) : null;



const osnovniRed = {

  id: 1,

  aktivna: enable,

  vazi_do: vaziDo,

  napomena: napomena || (enable ? `Aktivno do ${doDat}` : "Deaktivirano"),

  updated_at: new Date().toISOString(),

};



const prosireniRed = {

  ...osnovniRed,

  tenant_id: tenant,

  deployment,

  moduli_json: moduli,

  max_korisnika: Number.isFinite(maxKorisnikaNum) ? maxKorisnikaNum : null,

  max_uredjaja: Number.isFinite(maxUredjajaNum) ? maxUredjajaNum : null,

};



function kolonaNedostaje(msg) {

  return /column.*does not exist|schema cache|Could not find the/i.test(msg || "");

}



let { error } = await supabase.from("app_licenca").upsert(prosireniRed, { onConflict: "id" });



if (error && kolonaNedostaje(error.message)) {

  console.warn("Napomena: 23_licenca_moduli.sql nije pokrenut — čuvam samo osnovna polja.");

  console.warn("Za tenant/moduli/deployment pokreni 23_licenca_moduli.sql u Supabase SQL Editoru.\n");

  ({ error } = await supabase.from("app_licenca").upsert(osnovniRed, { onConflict: "id" }));

}



if (error) {

  console.error("Greška:", error.message);

  console.error("Da li je pokrenut 21_licenca_gate.sql?");

  process.exit(1);

}



const { data: chk, error: rpcErr } = await supabase.rpc("proveri_licencu");

console.log("app_licenca ažurirano.");

if (rpcErr) {

  console.warn("proveri_licencu RPC:", rpcErr.message);

} else {

  console.log("proveri_licencu():", chk);

}


