/** Provera aktivnog HOLD/karantin za deo ili RN. */

import { resolveMomentIdDeo } from "./momentKljucApi.js";

function normalizujId(id) {
  return String(id || "").trim().toUpperCase();
}

export async function proveriAktivanKarantin(supabase, { idDeo, radniNalog = null }) {
  const id = normalizujId(idDeo);
  const rn = normalizujId(radniNalog);
  if (!id && !rn) return { aktivan: false, zapisi: [], alarmi: [] };

  const idLista = new Set();
  if (id) idLista.add(id);
  if (id) {
    try {
      const resolved = await resolveMomentIdDeo(supabase, id);
      if (resolved) idLista.add(normalizujId(resolved));
    } catch { /* optional */ }
  }

  const ids = [...idLista];

  const upiti = [];
  if (ids.length) {
    upiti.push(
      supabase.from("karantin_lotovi")
        .select("id,id_deo,radni_nalog,razlog,status,created_at,spc_alarm_id")
        .in("id_deo", ids)
        .eq("status", "aktivan")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("spc_alarmi")
        .select("id,id_deo,pravilo,status,datum,tip_karte")
        .in("id_deo", ids)
        .eq("status", "karantin")
        .order("created_at", { ascending: false })
        .limit(5),
    );
  } else {
    upiti.push(Promise.resolve({ data: [], error: null }), Promise.resolve({ data: [], error: null }));
  }

  if (rn) {
    upiti.push(
      supabase.from("karantin_lotovi")
        .select("id,id_deo,radni_nalog,razlog,status,created_at,spc_alarm_id")
        .eq("radni_nalog", rn)
        .eq("status", "aktivan")
        .order("created_at", { ascending: false })
        .limit(8),
    );
  }

  const rezultati = await Promise.all(upiti);
  const lotRes = rezultati[0];
  const alarmRes = rezultati[1];
  const lotRnRes = rn ? rezultati[2] : null;

  if (lotRes.error && alarmRes.error && (!lotRnRes || lotRnRes.error)) {
    return { aktivan: false, greska: lotRes.error?.message || alarmRes.error?.message, zapisi: [], alarmi: [] };
  }

  const lotMap = new Map();
  for (const r of [...(lotRes.data || []), ...(lotRnRes?.data || [])]) {
    if (r?.id) lotMap.set(r.id, r);
  }
  let zapisi = [...lotMap.values()];
  const alarmi = alarmRes.data || [];

  if (rn && zapisi.length) {
    const poRn = zapisi.filter((z) =>
      !z.radni_nalog || normalizujId(z.radni_nalog) === rn,
    );
    if (poRn.length) zapisi = poRn;
  }

  const aktivan = zapisi.length > 0 || alarmi.length > 0;
  const razlog = zapisi[0]?.razlog
    || (alarmi[0] ? `SPC karantin: ${alarmi[0].pravilo}` : null);

  return {
    aktivan,
    zapisi,
    alarmi,
    razlog,
    idDeo: zapisi[0]?.id_deo || alarmi[0]?.id_deo || id || null,
  };
}

/** Tekst za polje „Karantin“ u formi (prazan ili HOLD opis). */
export function tekstKarantinPolja(karantin) {
  if (!karantin?.aktivan) return "prazan";
  const z = karantin.zapisi?.[0];
  const a = karantin.alarmi?.[0];
  const idPrikaz = z?.id_deo || a?.id_deo || karantin.idDeo;
  const razlogPrikaz = z?.razlog || karantin.razlog || (a ? `SPC: ${a.pravilo}` : null);
  return [
    idPrikaz,
    z?.radni_nalog ? `RN ${z.radni_nalog}` : "",
    razlogPrikaz,
  ].filter(Boolean).join(" · ");
}
