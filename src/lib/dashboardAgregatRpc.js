/**
 * Agregati dashboarda iz baze (migracija 90).
 *
 * Vraća `null` ako RPC još ne postoji, pa pozivalac pada na staru JS putanju.
 */

function rpcNedostaje(err) {
  return err && /function.*does not exist|could not find|no function matches/i.test(err.message || "");
}

function argumenti({ od, idDeo, linija, smena }) {
  return {
    p_od: od,
    p_id_deo: idDeo || null,
    p_linija: linija || null,
    p_smena: smena == null || smena === "" ? null : Number(smena),
  };
}

async function pozovi(supabase, ime, args) {
  const { data, error } = await supabase.rpc(ime, args);
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return data || [];
}

/**
 * Atributivni agregat se pretvara u „sintetičke" redove kontrolnog loga:
 * jedan red po (datum, id_deo) sa jedinstvenim batch ključem, pa postojeća
 * JS agregacija nad njima daje identičan rezultat kao nad sirovim redovima.
 */
function uSintetickeAttrRedove(rows) {
  return rows.map((r) => ({
    datum: r.datum,
    id_deo: r.id_deo,
    ok_kolicina: Number(r.ok) || 0,
    nok_kolicina: Number(r.nok) || 0,
    kom_nok: Number(r.kom_nok) || 0,
    inspekcija_id: `agg|${r.datum}|${r.id_deo}`,
  }));
}

export async function fetchDashboardAgregate(supabase, { od, idDeo = "", linija = "", smena = null } = {}) {
  const args = argumenti({ od, idDeo, linija, smena });

  const attr = await pozovi(supabase, "dashboard_agregat_attr", args);
  if (attr === null) return null;

  const [mer, pareto] = await Promise.all([
    pozovi(supabase, "dashboard_agregat_mer", args),
    pozovi(supabase, "dashboard_pareto", { ...args, p_limit: 8 }),
  ]);
  if (mer === null) return null;

  return {
    attrRedovi: uSintetickeAttrRedove(attr),
    attrGrupe: attr,
    merGrupe: mer.map((r) => ({
      datum: r.datum,
      id_deo: r.id_deo,
      n: Number(r.n) || 0,
      nok: Number(r.nok) || 0,
    })),
    pareto: (pareto || []).map((r) => ({
      naziv: r.naziv,
      count: Number(r.broj) || 0,
      izvor: r.izvor,
    })),
  };
}

export const _test = { uSintetickeAttrRedove };
