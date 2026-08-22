import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchPrethodniNcrZaOkidac } from "../../lib/ncrCapa.js";
import {
  evaluiraj8dOkidace,
  NCR_8D_OKIDACI,
  NCR_8D_PRAGOVI,
} from "../../lib/ncr8dOkidaci.js";

/** Prikaz 4 okidača za obavezan 8D + dugme za pokretanje Word/8D. */
export default function Ncr8dOkidaciPanel({ forma, C, onOtvori8D, onPrimeniPreporuku }) {
  const [prethodni, setPrethodni] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!forma?.id_deo) {
      setPrethodni([]);
      return;
    }
    setLoading(true);
    fetchPrethodniNcrZaOkidac(supabase, forma, { dana: NCR_8D_PRAGOVI.ponavljanjeDana })
      .then(setPrethodni)
      .catch(() => setPrethodni([]))
      .finally(() => setLoading(false));
  }, [forma?.id, forma?.id_deo, forma?.datum_otvaranja]);

  if (!forma) return null;

  const ev = evaluiraj8dOkidace(forma, { prethodniLista: prethodni });
  const statusOkidaca = Object.fromEntries(
    NCR_8D_OKIDACI.map((o) => {
      const aktivno = ev.okidaci.some((a) => a.id === o.id);
      return [o.id, aktivno];
    }),
  );

  return (
    <div data-testid="ncr-8d-okidaci" style={{
      marginBottom: 12,
      padding: 10,
      borderRadius: 8,
      border: `1px solid ${ev.obavezan8d ? C.crvena : C.border}`,
      background: ev.obavezan8d ? `${C.crvena}08` : C.bg,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
        Kada pokrenuti 8D? (Pokrenut 8D = DA)
        {loading && <span style={{ color: C.sivi, fontWeight: 400 }}> · proveravam registar…</span>}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {NCR_8D_OKIDACI.map((o) => {
          const aktivno = statusOkidaca[o.id];
          const det = ev.okidaci.find((x) => x.id === o.id)?.detalj;
          return (
            <div key={o.id} data-testid={`ncr-okidac-${o.id}`} style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${aktivno ? C.crvena : C.border}`,
              background: aktivno ? `${C.crvena}12` : "transparent",
              fontSize: 10,
            }}>
              <div style={{ fontWeight: 700, color: aktivno ? C.crvena : C.tekst }}>
                {aktivno ? "✓ DA — " : "○ NE — "}{o.redni}. {o.naziv}
              </div>
              <div style={{ color: C.sivi, marginTop: 2 }}>{o.opis}</div>
              {aktivno && det && (
                <div style={{ color: C.tekst, marginTop: 4, fontWeight: 600 }}>{det}</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 9, color: C.sivi, marginTop: 8 }}>
        Pragovi: ponavljanje {NCR_8D_PRAGOVI.ponavljanjeDana} dana · trošak ≥ {NCR_8D_PRAGOVI.trosakSkartaEur} €
        · neispravna ≥ {NCR_8D_PRAGOVI.kolicinaNeispravnaMin} kom
      </div>

      {ev.obavezan8d && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.crvena }}>
            8D je obavezan — upišite DA u „8D pokrenut“ i otvorite Word izveštaj
          </span>
          {onPrimeniPreporuku && (
            <button type="button" data-testid="ncr-primeni-8d-preporuku" onClick={() => onPrimeniPreporuku(ev)}
              style={{
                background: C.crvena, border: "none", borderRadius: 5, color: C.onAkcent,
                padding: "5px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}>
              Primeni preporuku (DA + razlog)
            </button>
          )}
          {onOtvori8D && (
            <button type="button" data-testid="ncr-otvori-8d-obavezno" onClick={onOtvori8D}
              style={{
                background: `${C.plava}`, border: "none", borderRadius: 5, color: C.onAkcent,
                padding: "5px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}>
              Otvori 8D / Word
            </button>
          )}
        </div>
      )}
    </div>
  );
}
