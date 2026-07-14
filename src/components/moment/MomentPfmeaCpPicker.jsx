import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  ucitajPfmeaCpPaketZaDeo,
  ucitajCpPfmeaDetalj,
  filtrirajCpZaMoment,
  nadjiPfmeaZaCp,
  nadjiCpPoTorqueId,
  mapirajCpNaMomentPolja,
  formatCpStavkaLabel,
  formatPfmeaKratko,
  formatTorqueId,
} from "../../lib/momentPfmeaCpBridge.js";
import { MomentPfmeaOblaciciRed } from "./MomentPfmeaOblacic.jsx";
import { btnStyle } from "../sifrarnik/sifrarnikPanelStyle.js";

/**
 * Izbor Control Plan stavke → automatski popunjava moment korak (PFMEA veza, torque_id, klasa, Nm).
 */
export default function MomentPfmeaCpPicker({
  C,
  idDeo,
  vrednosti = {},
  onPrimeni,
  kompakt = false,
}) {
  const [otvoren, setOtvoren] = useState(false);
  const [ucitava, setUcitava] = useState(false);
  const [paket, setPaket] = useState({ pfmea: [], cp: [] });
  const [filter, setFilter] = useState("");
  const [greska, setGreska] = useState("");

  const ucitaj = useCallback(async () => {
    const deo = String(idDeo || "").trim();
    if (!deo) {
      setPaket({ pfmea: [], cp: [] });
      return;
    }
    setUcitava(true);
    setGreska("");
    try {
      const p = await ucitajPfmeaCpPaketZaDeo(supabase, deo);
      setPaket(p);
      if (!p.cp.length) {
        setGreska(`Nema CP stavki za ${deo} — unesite u modul PFMEA / Control Plan.`);
      }
    } catch (e) {
      setGreska(e.message || "Greška učitavanja PFMEA/CP");
    } finally {
      setUcitava(false);
    }
  }, [idDeo]);

  useEffect(() => {
    if (otvoren) ucitaj();
  }, [otvoren, ucitaj]);

  const prikazCp = useMemo(
    () => filtrirajCpZaMoment(paket.cp, { tekst: filter, samoMoment: true }),
    [paket.cp, filter],
  );

  const izabranaCp = useMemo(() => {
    const id = Number(vrednosti.control_plan_stavka_id);
    if (!Number.isFinite(id)) return null;
    return paket.cp.find((c) => c._dbId === id) || null;
  }, [vrednosti.control_plan_stavka_id, paket.cp]);

  const izabranaPfmea = useMemo(() => {
    if (!izabranaCp) return null;
    return nadjiPfmeaZaCp(izabranaCp, paket.pfmea);
  }, [izabranaCp, paket.pfmea]);

  const primeni = (cp) => {
    const pfmea = nadjiPfmeaZaCp(cp, paket.pfmea);
    const polja = mapirajCpNaMomentPolja(cp, pfmea);
    onPrimeni?.(polja);
    setOtvoren(false);
  };

  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 10,
    padding: "6px 8px",
    boxSizing: "border-box",
  };

  const pfKratko = formatPfmeaKratko(izabranaPfmea);

  return (
    <div style={{
      marginTop: kompakt ? 6 : 10,
      padding: kompakt ? 8 : 10,
      background: C.hover,
      border: `1px solid ${C.plava}33`,
      borderRadius: 8,
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ color: C.plava, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
          PFMEA / CONTROL PLAN VEZA
        </div>
        <button
          type="button"
          onClick={() => setOtvoren((v) => !v)}
          disabled={!String(idDeo || "").trim()}
          style={btnStyle(C, C.plava, { fontSize: 9, padding: "4px 10px", disabled: !String(idDeo || "").trim() })}
        >
          {otvoren ? "Zatvori" : "🔗 Poveži iz CP"}
        </button>
      </div>

      {(vrednosti.pfmea_veza || vrednosti.torque_id || vrednosti.control_plan_stavka_id) && (
        <div style={{ marginTop: 8, fontSize: 10, color: C.tekst, lineHeight: 1.45 }}>
          {vrednosti.torque_id && (
            <div><span style={{ color: C.sivi }}>Torque ID:</span> <strong>{vrednosti.torque_id}</strong></div>
          )}
          {vrednosti.pfmea_veza && (
            <div><span style={{ color: C.sivi }}>PFMEA:</span> <strong>{vrednosti.pfmea_veza}</strong></div>
          )}
          {vrednosti.control_plan_stavka_id && (
            <div style={{ color: C.sivi, fontSize: 9 }}>CP stavka #{vrednosti.control_plan_stavka_id}</div>
          )}
          {pfKratko && (
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>S/O/D:</span>
              <span style={{ fontWeight: 700 }}>{pfKratko.s} / {pfKratko.o} / {pfKratko.d}</span>
              <span style={{ color: C.sivi, fontSize: 9 }}>RPN {pfKratko.rpn}</span>
              <MomentPfmeaOblaciciRed C={C} ids={["S", "O", "D", "RPN"]} kompakt />
            </div>
          )}
        </div>
      )}

      {otvoren && (
        <div style={{ marginTop: 10 }}>
          {!idDeo?.trim() ? (
            <div style={{ color: C.zuta, fontSize: 10 }}>Unesite ID deo da biste pretražili CP.</div>
          ) : (
            <>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Pretraga: moment, Nm, PFMEA ref, T000056…"
                style={{ ...INP, marginBottom: 8 }}
              />
              {ucitava && <div style={{ color: C.sivi, fontSize: 10 }}>Učitavam PFMEA/CP…</div>}
              {greska && !ucitava && <div style={{ color: C.zuta, fontSize: 10, marginBottom: 6 }}>{greska}</div>}
              <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 6 }}>
                {prikazCp.map((cp) => {
                  const pf = nadjiPfmeaZaCp(cp, paket.pfmea);
                  const izabran = vrednosti.control_plan_stavka_id === cp._dbId;
                  return (
                    <button
                      key={cp._dbId}
                      type="button"
                      onClick={() => primeni(cp)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        borderBottom: `1px solid ${C.border}`,
                        background: izabran ? `${C.plava}15` : "transparent",
                        color: C.tekst,
                        cursor: "pointer",
                        fontSize: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{formatCpStavkaLabel(cp)}</div>
                      <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
                        {formatTorqueId(cp._dbId)}
                        {pf ? ` · S/O/D ${pf.s || "—"}/${pf.o || "—"}/${pf.d || "—"}` : ""}
                      </div>
                    </button>
                  );
                })}
                {!ucitava && !prikazCp.length && !greska && (
                  <div style={{ padding: 12, color: C.sivi, fontSize: 10 }}>Nema stavki za filter.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Kompaktan read-only prikaz veze na liniji (operator). */
export function MomentPfmeaCpLinkPregled({
  C, controlPlanStavkaId, pfmeaVeza, torqueId, idDeo,
}) {
  const [detalj, setDetalj] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!controlPlanStavkaId && !pfmeaVeza && !torqueId) {
        setDetalj(null);
        return;
      }
      try {
        if (controlPlanStavkaId) {
          const d = await ucitajCpPfmeaDetalj(supabase, controlPlanStavkaId);
          if (!cancelled) setDetalj(d);
          return;
        }
        if (torqueId && idDeo) {
          const p = await ucitajPfmeaCpPaketZaDeo(supabase, idDeo);
          const cp = nadjiCpPoTorqueId(p.cp, torqueId);
          if (!cancelled) {
            setDetalj(cp ? { cp, pfmea: nadjiPfmeaZaCp(cp, p.pfmea) } : null);
          }
        }
      } catch {
        if (!cancelled) setDetalj(null);
      }
    })();
    return () => { cancelled = true; };
  }, [controlPlanStavkaId, pfmeaVeza, torqueId, idDeo]);

  if (!controlPlanStavkaId && !pfmeaVeza && !torqueId) return null;

  const pf = formatPfmeaKratko(detalj?.pfmea);
  const cp = detalj?.cp;

  return (
    <div style={{
      marginTop: 8,
      padding: "8px 10px",
      background: `${C.plava}10`,
      border: `1px solid ${C.plava}33`,
      borderRadius: 8,
      fontSize: 10,
      lineHeight: 1.4,
      textAlign: "center",
    }}
    >
      <div style={{ color: C.plava, fontWeight: 700, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>
        PFMEA / CP
      </div>
      {torqueId && <div><span style={{ color: C.sivi }}>Torque ID:</span> {torqueId}</div>}
      {(pfmeaVeza || pf?.ref) && (
        <div><span style={{ color: C.sivi }}>PFMEA:</span> {pfmeaVeza || pf?.ref}</div>
      )}
      {cp?.karakteristika && (
        <div style={{ color: C.sivi, marginTop: 2 }}>{cp.karakteristika}</div>
      )}
      {pf && (
        <div style={{ marginTop: 4, fontWeight: 700 }}>
          S {pf.s} · O {pf.o} · D {pf.d} · RPN {pf.rpn}
        </div>
      )}
    </div>
  );
}
