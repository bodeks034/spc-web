/** Otvoren 8D: stari kodovi i trenutni tok (u_izradi). Završen ne ulazi. */
export const OTVORENI_8D = ["u_toku", "otvoren", "ceka", "u_izradi"];

/** Automatsko dodeljivanje brojeva 8D / PFMEA / Control Plan (isti redni broj po delu). */

export function prefiksDeoIzIdDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return "GEN";
  const parts = id.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const kandidat = parts[parts.length - 2];
    if (/^[A-Z0-9]{2,8}$/.test(kandidat)) return kandidat.slice(0, 8);
  }
  const m = id.match(/^([A-Z0-9]{2,8})/);
  return m ? m[1].slice(0, 8) : "GEN";
}

function parsirajRedniBroj(vrednost, prefiks) {
  const re = new RegExp(`^8D-${prefiks}-(\\d+)$`, "i");
  const m = String(vrednost || "").trim().match(re);
  return m ? Number(m[1]) : 0;
}

export function brojeviPaketaIzRednog(prefiks, seq) {
  const seqStr = String(seq).padStart(3, "0");
  const p = String(prefiks || "GEN").toUpperCase();
  return {
    broj_8d: `8D-${p}-${seqStr}`,
    broj_pfmea: `PFMEA-${p}-${seqStr}`,
    broj_control_plan: `CP-${p}-${seqStr}`,
  };
}

/** Iz postojećeg broja 8D — dopuni PFMEA i CP. */
/** „8D-NM-002” ostaje kako jeste; gol broj dobija prefiks. */
export function oznaka8d(broj, id) {
  const b = String(broj || "").trim();
  if (b) return /^8D\b/i.test(b) ? b : `8D ${b}`;
  if (id != null && String(id).trim()) return `8D #${id}`;
  return "";
}

export function brojeviPaketaIzBroj8d(broj8d) {
  const m = String(broj8d || "").trim().match(/^8D-([A-Z0-9]+)-(\d+)$/i);
  if (!m) return null;
  return brojeviPaketaIzRednog(m[1].toUpperCase(), Number(m[2]));
}

export async function generisiBrojevePaketa8d(supabase, idDeo) {
  const pref = prefiksDeoIzIdDeo(idDeo);
  const pattern = `8D-${pref}-%`;
  const { data } = await supabase.from("osmd_izvestaji")
    .select("broj_8d")
    .like("broj_8d", pattern)
    .order("broj_8d", { ascending: false })
    .limit(50);

  let maxSeq = 0;
  for (const row of data || []) {
    maxSeq = Math.max(maxSeq, parsirajRedniBroj(row.broj_8d, pref));
  }
  return brojeviPaketaIzRednog(pref, maxSeq + 1);
}

/** Popuni nedostajuće brojeve u formi / izveštaju. */
export async function osigurajBrojevePaketa8d(supabase, forma = {}) {
  const imaSve = forma.broj_8d && forma.broj_pfmea && forma.broj_control_plan;
  if (imaSve) return { ...forma };

  if (forma.broj_8d && (!forma.broj_pfmea || !forma.broj_control_plan)) {
    const iz8d = brojeviPaketaIzBroj8d(forma.broj_8d);
    if (iz8d) {
      return {
        ...forma,
        broj_pfmea: forma.broj_pfmea || iz8d.broj_pfmea,
        broj_control_plan: forma.broj_control_plan || iz8d.broj_control_plan,
      };
    }
  }

  if (!forma.id_deo?.trim()) return { ...forma };

  const novi = await generisiBrojevePaketa8d(supabase, forma.id_deo);
  return {
    ...forma,
    broj_8d: forma.broj_8d || novi.broj_8d,
    broj_pfmea: forma.broj_pfmea || novi.broj_pfmea,
    broj_control_plan: forma.broj_control_plan || novi.broj_control_plan,
  };
}
