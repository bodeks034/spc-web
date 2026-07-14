import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchNcrVeze, labelIzvorNcr } from "../../lib/ncrWorkflowVeza.js";

/** Povezivanje NCR sa alarmom, 8D, eskalacijom, PfMEA i auto-akcijom. */
export default function NcrWorkflowVeza({
  ncr, C, onOtvori8D, onOtvoriTab, onOtvoriPfmeaCp,
}) {
  const [veze, setVeze] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ncr?.id) {
      setVeze(null);
      return;
    }
    setLoading(true);
    fetchNcrVeze(supabase, ncr)
      .then(setVeze)
      .catch(() => setVeze(null))
      .finally(() => setLoading(false));
  }, [ncr?.id, ncr?.spc_alarm_id, ncr?.osmd_id, ncr?.eskalacija_id, ncr?.pfmea_stavka_id]);

  if (!ncr) return null;

  const linkBtn = (label, onClick, testId) => (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        background: `${C.plava}15`,
        border: `1px solid ${C.plava}44`,
        borderRadius: 5,
        color: C.plava,
        fontSize: 9,
        fontWeight: 700,
        padding: "4px 8px",
        cursor: "pointer",
        marginRight: 6,
        marginTop: 4,
      }}
    >
      {label}
    </button>
  );

  const auto = veze?.autoUzrok;

  return (
    <div
      data-testid="ncr-workflow-veza"
      style={{
        marginBottom: 10,
        padding: "8px 10px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
        fontSize: 9,
        lineHeight: 1.55,
      }}
    >
      <div style={{ color: C.sivi, marginBottom: 6 }}>
        Izvor: <strong style={{ color: C.tekst }}>{labelIzvorNcr(ncr)}</strong>
        {loading && " · učitavam veze…"}
      </div>

      {auto && (
        <div
          data-testid="ncr-auto-uzrok"
          style={{
            marginBottom: 8,
            padding: "6px 8px",
            borderRadius: 6,
            border: `1px solid ${C.zuta}55`,
            background: `${C.zuta}12`,
            color: C.tekst,
          }}
        >
          <strong style={{ color: C.zuta }}>{auto.naslov}</strong>
          <div style={{ marginTop: 4 }}>{auto.razlog}</div>
          {auto.vreme && (
            <div style={{ color: C.sivi, marginTop: 2 }}>
              {new Date(auto.vreme).toLocaleString("sr-RS")}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {veze?.alarm && onOtvoriTab && linkBtn(
          `SPC alarm #${veze.alarm.id}`,
          () => onOtvoriTab("odobrenja"),
          "ncr-link-alarm",
        )}
        {veze?.eskalacija && onOtvoriTab && linkBtn(
          `Eskalacija #${veze.eskalacija.id}`,
          () => onOtvoriTab("eskalacije"),
          "ncr-link-eskalacija",
        )}
        {veze?.osmd && onOtvori8D && linkBtn(
          `8D ${veze.osmd.broj_8d || `#${veze.osmd.id}`}`,
          () => onOtvori8D({ broj_8d: veze.osmd.broj_8d, id_deo: veze.osmd.id_deo, ncr_id: ncr.id }),
          "ncr-link-8d",
        )}
        {!veze?.osmd && onOtvori8D && linkBtn(
          "Otvori / poveži 8D",
          () => onOtvori8D({ id_deo: ncr.id_deo, opis: ncr.opis, ncr_id: ncr.id }),
          "ncr-link-8d-novi",
        )}
        {veze?.pfmea && onOtvoriPfmeaCp && linkBtn(
          `PfMEA ${veze.pfmea.pfmea_veza || veze.pfmea.mod_greske || `#${veze.pfmea.id}`}`,
          () => onOtvoriPfmeaCp({ idDeo: veze.pfmea._dokument?.id_deo || ncr.id_deo, pfmeaStavkaId: veze.pfmea.id }),
          "ncr-link-pfmea",
        )}
        {onOtvoriPfmeaCp && !veze?.pfmea && linkBtn(
          "PfMEA / CP",
          () => onOtvoriPfmeaCp({ idDeo: ncr.id_deo }),
          "ncr-link-pfmea-cp",
        )}
      </div>

      {veze?.alarm && (
        <div style={{ color: C.sivi, marginTop: 6 }}>
          Alarm: {veze.alarm.opis} · {veze.alarm.status}
        </div>
      )}
    </div>
  );
}
