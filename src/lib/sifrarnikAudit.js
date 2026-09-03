/** Audit log izmena u šifrarniku (tabela sifrarnik_audit, migracija 80). */
import { supabase } from "./supabaseClient.js";
import { getSifrarnikAuditKorisnik } from "./sifrarnikAuditKorisnik.js";

export async function logSifrarnikAudit({
  idDeo = null,
  akcija,
  izvor = null,
  detalji = null,
  korisnik = null,
} = {}) {
  if (!akcija) return;
  const korisnikZapis = korisnik || getSifrarnikAuditKorisnik();
  try {
    const { error } = await supabase.from("sifrarnik_audit").insert({
      id_deo: idDeo ? String(idDeo).trim().toUpperCase() : null,
      akcija: String(akcija).slice(0, 64),
      izvor: izvor ? String(izvor).slice(0, 64) : null,
      detalji: detalji && typeof detalji === "object" ? detalji : null,
      korisnik: korisnikZapis ? String(korisnikZapis).slice(0, 128) : null,
    });
    if (error && !/does not exist|could not find/i.test(error.message)) {
      console.warn("[sifrarnik_audit]", error.message);
    }
  } catch {
    /* tabela opciona dok migracija 80 nije primenjena */
  }
}

export async function fetchSifrarnikAudit({
  idDeo = null,
  akcija = null,
  od = null,
  limit = 50,
  offset = 0,
  arhiva = false,
} = {}) {
  const tabela = arhiva ? "sifrarnik_audit_arhiva" : "sifrarnik_audit";
  try {
    let q = supabase
      .from(tabela)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + Math.max(1, limit) - 1);
    if (idDeo) {
      q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
    }
    if (akcija) {
      q = q.eq("akcija", String(akcija).trim());
    }
    if (od) {
      q = q.gte("created_at", od);
    }
    const { data, error } = await q;
    if (error) {
      if (/does not exist|could not find/i.test(error.message)) return [];
      throw error;
    }
    return data || [];
  } catch {
    return [];
  }
}

/** Distinct ID-evi sa akcijom zatvoren_deo od ponoći (timski brojač). */
export async function fetchDanasZatvorenoIzAudit({ limit = 500 } = {}) {
  const detalj = await fetchDanasZatvorenoDetaljno({ limit });
  return {
    dan: detalj.dan,
    broj: detalj.broj,
    ids: detalj.ids,
    izvor: "audit",
  };
}

/** Agregacija audit redova — testabilno bez Supabase. */
export function agregirajDanasZatvoreno(redovi = [], { dan = null } = {}) {
  const danIso = dan || new Date().toISOString().slice(0, 10);
  const ids = new Set();
  const poKorisnikuMap = new Map();
  const hronologija = [];

  for (const r of redovi || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    const korisnik = String(r.korisnik || "").trim() || "(nepoznat)";
    const created = r.created_at || null;
    ids.add(id);
    if (!poKorisnikuMap.has(korisnik)) {
      poKorisnikuMap.set(korisnik, { korisnik, ids: new Set(), broj: 0 });
    }
    const bucket = poKorisnikuMap.get(korisnik);
    if (!bucket.ids.has(id)) {
      bucket.ids.add(id);
      bucket.broj += 1;
    }
    hronologija.push({ idDeo: id, korisnik, created_at: created });
  }

  const poKorisniku = [...poKorisnikuMap.values()]
    .map((b) => ({
      korisnik: b.korisnik,
      broj: b.broj,
      ids: [...b.ids],
    }))
    .sort((a, b) => b.broj - a.broj || a.korisnik.localeCompare(b.korisnik));

  return {
    dan: danIso,
    broj: ids.size,
    ids: [...ids],
    poKorisniku,
    hronologija,
    izvor: "audit",
  };
}

/** Timski pregled: ko je danas zatvorio koje delove. */
export async function fetchDanasZatvorenoDetaljno({ limit = 500 } = {}) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const redovi = await fetchSifrarnikAudit({
    akcija: "zatvoren_deo",
    od: start.toISOString(),
    limit,
  });
  return agregirajDanasZatvoreno(redovi, {
    dan: start.toISOString().slice(0, 10),
  });
}

export function auditLogUCsv(redovi) {
  const header = ["created_at", "id_deo", "akcija", "izvor", "korisnik", "detalji"].join(",");
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = (redovi || []).map((r) => [
    esc(r.created_at),
    esc(r.id_deo),
    esc(r.akcija),
    esc(r.izvor),
    esc(r.korisnik),
    esc(r.detalji ? JSON.stringify(r.detalji) : ""),
  ].join(","));
  return `\uFEFF${[header, ...lines].join("\n")}`;
}

export function preuzmiAuditCsv(redovi, ime = "sifrarnik-audit") {
  const csv = auditLogUCsv(redovi);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ime}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
