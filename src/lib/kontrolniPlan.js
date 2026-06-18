/** Kontrolni plan u bazi — dimenzija, metoda, učestalost, reakcija + revizija. */

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export async function ucitajKontrolniPlan(supabase, { idDeo } = {}) {
  let q = supabase.from("kontrolni_plan")
    .select("*")
    .eq("aktivan", true)
    .order("id_deo")
    .order("pozicija");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function ucitajRevizijePlana(supabase, planId) {
  const { data, error } = await supabase.from("kontrolni_plan_revizija")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function upisiRevizijuPlana(supabase, {
  planId, idDeo, pozicija, polje, stara, nova, revizija, vaziOd, radnikId, radnikIme, napomena,
}) {
  await supabase.from("kontrolni_plan_revizija").insert({
    plan_id: planId,
    id_deo: idDeo,
    pozicija,
    polje,
    stara_vrednost: stara != null ? String(stara) : null,
    nova_vrednost: nova != null ? String(nova) : null,
    revizija,
    vazi_od: vaziOd,
    radnik_id: radnikId || null,
    radnik_ime: radnikIme || null,
    napomena: napomena || null,
  });
}

export async function snimiKontrolniPlan(supabase, row, korisnik) {
  const idDeo = String(row.id_deo || "").trim().toUpperCase();
  if (!idDeo || !row.pozicija) throw new Error("ID dela i pozicija su obavezni.");

  if (row.id) {
    const { data: stari } = await supabase.from("kontrolni_plan").select("*").eq("id", row.id).single();
    if (stari) {
      const polja = ["dimenzija", "metoda", "ucestalost", "reakcija", "revizija", "vazi_od", "pogon_kod"];
      for (const p of polja) {
        const st = stari[p];
        const nv = row[p];
        const stStr = String(st ?? "");
        const nvStr = String(nv ?? "");
        if (stStr !== nvStr) {
          await upisiRevizijuPlana(supabase, {
            planId: row.id,
            idDeo,
            pozicija: row.pozicija,
            polje: p,
            stara: st,
            nova: nv,
            revizija: row.revizija || stari.revizija,
            vaziOd: row.vazi_od || stari.vazi_od,
            radnikId: korisnik?.radnikId,
            radnikIme: korisnik?.ime,
          });
        }
      }
    }
    const { data, error } = await supabase.from("kontrolni_plan").update({
      pogon_kod: row.pogon_kod || null,
      pozicija: row.pozicija,
      dimenzija: row.dimenzija || null,
      metoda: row.metoda || null,
      ucestalost: row.ucestalost || null,
      reakcija: row.reakcija || null,
      revizija: row.revizija || "A",
      vazi_od: row.vazi_od || dISO(),
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("kontrolni_plan").insert({
    id_deo: idDeo,
    pogon_kod: row.pogon_kod || null,
    pozicija: row.pozicija,
    dimenzija: row.dimenzija || null,
    metoda: row.metoda || null,
    ucestalost: row.ucestalost || null,
    reakcija: row.reakcija || null,
    revizija: row.revizija || "A",
    vazi_od: row.vazi_od || dISO(),
    kreirao_id: korisnik?.radnikId || null,
  }).select("*").single();
  if (error) throw error;
  return data;
}

/** Sinhronizuj iz karakteristika_merljive (dimenzija + metoda iz šifrarnika). */
export async function uvoziPlanIzKarakteristika(supabase, idDeo, korisnik) {
  const deo = String(idDeo || "").trim().toUpperCase();
  const { data: kar, error } = await supabase.from("karakteristike_merljive")
    .select("id_deo,pogon_kod,pozicija,naziv_mere,merni_instrument,broj_merenja,nivo_kontrole")
    .eq("id_deo", deo);
  if (error) throw error;
  let n = 0;
  for (const k of kar || []) {
    const poz = k.pozicija || k.naziv_mere;
    if (!poz) continue;
    const { data: ex } = await supabase.from("kontrolni_plan")
      .select("id").eq("id_deo", deo).eq("pozicija", poz).eq("aktivan", true).limit(1);
    if (ex?.length) continue;
    await supabase.from("kontrolni_plan").insert({
      id_deo: deo,
      pogon_kod: k.pogon_kod || null,
      pozicija: poz,
      dimenzija: k.naziv_mere || poz,
      metoda: k.merni_instrument || null,
      ucestalost: k.nivo_kontrole ? String(k.nivo_kontrole) : (k.broj_merenja ? `${k.broj_merenja}/serija` : "100%"),
      reakcija: "SPC alarm / karantin / 8D po planu",
      kreirao_id: korisnik?.radnikId || null,
    });
    n += 1;
  }
  return n;
}
