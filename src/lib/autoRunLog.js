/** Čitanje auto telemetrije iz baze (admin panel). */

export const AUTO_JOB_DEFINICIJE = [
  { id: "erp-dnevni-uvoz", naziv: "ERP dnevni uvoz", log: "erp-uvoz.log", raspored: "06:00" },
  { id: "erp-quality-izvoz", naziv: "ERP izvoz kvaliteta", log: "erp-izvoz-kvalitet.log", raspored: "06:15" },
  { id: "erp-processed-cleanup", naziv: "ERP arhiva retention", log: "erp-processed-cleanup.log", raspored: "Ned 03:00" },
  { id: "smenski-digest", naziv: "Smenski digest", log: "smenski-digest.log", raspored: "14:05 / 22:05" },
  { id: "auto-podsetnici", naziv: "Proaktivni podsetnici", log: "auto-podsetnici.log", raspored: "08:00" },
  { id: "auto-health", naziv: "Health check", log: "auto-health.log", raspored: "06:30" },
  { id: "nedeljni-rollup", naziv: "Nedeljni rollup", log: "nedeljni-rollup.log", raspored: "Pet 15:00" },
  { id: "pg-backup", naziv: "PostgreSQL backup", log: "pg-backup.log", raspored: "02:00" },
  { id: "moment-drop", naziv: "Moment-drop watcher", log: "moment-drop.log", raspored: "pri logovanju" },
];

export async function ucitajPoslednjeAkcije(supabase, { limit = 30, datumOd = null, datumDo = null } = {}) {
  try {
    let q = supabase
      .from("auto_akcije_log")
      .select("id,tip,entitet,entitet_id,id_deo,opis,meta,created_at")
      .order("created_at", { ascending: false });
    if (datumOd) q = q.gte("created_at", `${datumOd}T00:00:00`);
    if (datumDo) q = q.lte("created_at", `${datumDo}T23:59:59`);
    if (!datumOd && !datumDo) q = q.limit(limit);
    else q = q.limit(5000);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function ucitajPoslednjeRunove(supabase, { limit = 50, datumOd = null, datumDo = null } = {}) {
  try {
    let q = supabase
      .from("auto_run_log")
      .select("id,job_id,status,poruka,trajanje_ms,created_at")
      .order("created_at", { ascending: false });
    if (datumOd) q = q.gte("created_at", `${datumOd}T00:00:00`);
    if (datumDo) q = q.lte("created_at", `${datumDo}T23:59:59`);
    if (!datumOd && !datumDo) q = q.limit(limit);
    else q = q.limit(5000);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export function sumirajRunovePoJobu(runovi = []) {
  const poJobu = new Map();
  for (const r of runovi) {
    if (!poJobu.has(r.job_id)) poJobu.set(r.job_id, r);
  }
  return AUTO_JOB_DEFINICIJE.map((def) => {
    const poslednji = poJobu.get(def.id) || null;
    const st = poslednji?.status || "nema";
    return {
      ...def,
      poslednji,
      statusLabel: st === "nema" ? "NEMA ZAPISA" : st.toUpperCase(),
      statusHint: st === "nema"
        ? (def.id === "nedeljni-rollup"
          ? "Čeka petak 15:00 ili ručno: npm run digest:nedelja"
          : "Još nije pokrenut od poslednje instalacije")
        : null,
    };
  });
}

/** Poslednja N runova po job_id — za detekciju uzastopnih failova. */
export function grupisiRunovePoJobu(runovi = [], poJobu = 5) {
  const mapa = new Map();
  for (const r of runovi) {
    if (!mapa.has(r.job_id)) mapa.set(r.job_id, []);
    const lista = mapa.get(r.job_id);
    if (lista.length < poJobu) lista.push(r);
  }
  return mapa;
}

/** Jobovi čija su poslednja `minFail` runa status fail. */
export function pronadjiUzastopneFailove(runovi = [], minFail = 2) {
  const grupe = grupisiRunovePoJobu(runovi, minFail);
  const out = [];
  for (const [jobId, lista] of grupe) {
    if (lista.length >= minFail && lista.slice(0, minFail).every((r) => r.status === "fail")) {
      out.push({ jobId, poslednji: lista[0] });
    }
  }
  return out;
}

export function filtrirajAkcije(akcije = [], tip = "") {
  if (!tip || tip === "sve") return akcije;
  return akcije.filter((a) => a.tip === tip);
}

export function akcijeUcsv(akcije = []) {
  const head = "vreme,tip,entitet,id_deo,opis";
  const redovi = akcije.map((a) => {
    const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
    return [
      a.created_at || "",
      a.tip || "",
      a.entitet || "",
      a.id_deo || "",
      esc(a.opis),
    ].join(",");
  });
  return [head, ...redovi].join("\n");
}

export async function fetchAutoAkcijaZaNcr(supabase, ncr) {
  if (!ncr?.broj_ncr) return null;
  try {
    const { data } = await supabase
      .from("auto_akcije_log")
      .select("id,tip,entitet,opis,created_at,meta")
      .ilike("opis", `%${ncr.broj_ncr}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export function jeAutoKreiraniNcr(ncr) {
  return ncr?.izvor === "auto_pravilo"
    || /^AUTO-NCR/i.test(String(ncr?.opis || ""));
}

export async function zapisAutoAkcijuBrowser(supabase, payload) {
  try {
    const { data, error } = await supabase.from("auto_akcije_log").insert({
      tip: payload.tip,
      entitet: payload.entitet || null,
      entitet_id: payload.entitetId ?? null,
      id_deo: payload.idDeo || null,
      opis: payload.opis,
      meta: payload.meta || null,
    }).select("id").single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
