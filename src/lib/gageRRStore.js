/** Supabase CRUD za gage_rr_studije */
import { proceniMSA } from "./gageRR.js";

export function studijaIzReda(row) {
  if (!row) return null;
  const merilo = row.merila;
  return {
    id: row.id,
    dbId: row.id,
    datum: row.datum,
    naziv: row.naziv,
    merilo_id: row.merilo_id,
    merilo_naziv: merilo?.naziv || "",
    karakteristika: row.karakteristika || "",
    lsl: row.lsl != null ? String(row.lsl) : "",
    usl: row.usl != null ? String(row.usl) : "",
    nDelova: row.n_delova,
    nOperatera: row.n_operatera,
    nPonavljanja: row.n_ponavljanja,
    operateri: row.operateri || [],
    delovi: row.delovi || [],
    matrica: row.matrica,
    rezultat: buildRezultatKompletno(row),
    rezultat_xbar: row.rezultat_xbar,
    rezultat_anova: row.rezultat_anova,
    pct_grr: row.pct_grr,
    ndc: row.ndc,
    status_msa: row.status_msa,
    kreirao: row.kreirao?.ime || "",
    created_at: row.created_at,
  };
}

function buildRezultatKompletno(row) {
  const xbar = row.rezultat_xbar;
  const anova = row.rezultat_anova;
  if (!xbar?.ok && !anova?.ok) return xbar || anova || null;
  const pctGRR = row.pct_grr != null ? Number(row.pct_grr) : null;
  const ndc = row.ndc;
  const odluka = row.status_msa
    ? { status: row.status_msa, tekst: tekstStatusa(row.status_msa), boja: bojaStatusa(row.status_msa) }
    : proceniMSA({ pctGRR, pctTolGRR: null, ndc });
  return { ok: true, xbar: xbar?.ok ? xbar : null, anova: anova?.ok ? anova : null, pctGRR, ndc, odluka };
}

function tekstStatusa(s) {
  if (s === "prihvatljivo") return "Merilo prihvatljivo za kontrolu procesa";
  if (s === "uslovno") return "Uslovno prihvatljivo — prati merenja";
  if (s === "neprihvatljivo") return "Merilo neprihvatljivo — korekcija potrebna";
  return "MSA studija";
}

function bojaStatusa(s) {
  if (s === "prihvatljivo") return "zelena";
  if (s === "uslovno") return "zuta";
  if (s === "neprihvatljivo") return "crvena";
  return "sivi";
}

export function redIzStudije(studija, kreiraoId) {
  const r = studija.rezultat;
  const komplet = r?.xbar || r?.anova ? r : null;
  const xbar = komplet?.xbar || (r?.metoda === "xbar_r" ? r : null);
  const anova = komplet?.anova || (r?.metoda === "anova" ? r : null);
  const odluka = komplet?.odluka || r?.odluka;

  return {
    datum: studija.datum || new Date().toISOString().split("T")[0],
    naziv: studija.naziv,
    merilo_id: studija.merilo_id ? Number(studija.merilo_id) : null,
    karakteristika: studija.karakteristika || null,
    lsl: studija.lsl !== "" && studija.lsl != null ? Number(studija.lsl) : null,
    usl: studija.usl !== "" && studija.usl != null ? Number(studija.usl) : null,
    n_delova: studija.nDelova,
    n_operatera: studija.nOperatera,
    n_ponavljanja: studija.nPonavljanja,
    operateri: studija.operateri,
    delovi: studija.delovi,
    matrica: studija.matrica,
    rezultat_xbar: xbar,
    rezultat_anova: anova,
    pct_grr: komplet?.pctGRR ?? r?.pctGRR ?? null,
    ndc: komplet?.ndc ?? r?.ndc ?? null,
    status_msa: odluka?.status || null,
    kreirao_id: kreiraoId || null,
    napomena: studija.napomena || null,
  };
}

const SELECT = `
  id,created_at,datum,naziv,merilo_id,karakteristika,lsl,usl,
  n_delova,n_operatera,n_ponavljanja,operateri,delovi,matrica,
  rezultat_xbar,rezultat_anova,pct_grr,ndc,status_msa,kreirao_id,
  merila(naziv,serijski_broj)
`;

export async function ucitajGageRRStudije(supabase, limit = 40) {
  const { data, error } = await supabase
    .from("gage_rr_studije")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(studijaIzReda);
}

export async function snimiGageRRStudiju(supabase, studija, kreiraoId) {
  const payload = redIzStudije(studija, kreiraoId);
  if (studija.dbId) {
    const { data, error } = await supabase
      .from("gage_rr_studije")
      .update(payload)
      .eq("id", studija.dbId)
      .select(SELECT)
      .single();
    if (error) throw error;
    return studijaIzReda(data);
  }
  const { data, error } = await supabase
    .from("gage_rr_studije")
    .insert(payload)
    .select(SELECT)
    .single();
  if (error) throw error;
  return studijaIzReda(data);
}

export async function obrisiGageRRStudiju(supabase, id) {
  const { error } = await supabase.from("gage_rr_studije").delete().eq("id", id);
  if (error) throw error;
}
