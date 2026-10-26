import {
  REGISTAR_KOLONE, vrednostRegistra, statusNcrZaPrikaz, ncrIzBaze,
  nadjiDeoZaNcr, linijaNcrZaPrikaz, nazivNcrZaPrikaz,
} from "../../lib/ncrObrazacPolja.js";
import { jeNcr8dAlarmRed } from "../../lib/ncrRegistarExcelStil.js";

const bojaStatus = (s) => {
  if (s === "closed") return "#22c55e";
  if (s === "verification") return "#3b82f6";
  if (s === "osmd_progress") return "#a855f7";
  if (s === "disposition") return "#f59e0b";
  if (s === "containment") return "#eab308";
  return "#f97316";
};

const bojaOzb = (o) => {
  if (o === "Critical") return "#dc2626";
  if (o === "High") return "#ef4444";
  if (o === "Medium") return "#f59e0b";
  return "#64748b";
};

export default function NcrRegistarTabela({
  lista, C, loading, selektovanId, onIzaberi, onOtvoriObrazac, rokProsao, delovi = [], linije = [],
}) {
  if (loading) {
    return <div style={{ padding: 16, color: C.sivi, fontSize: 11 }}>Učitavam registar…</div>;
  }

  return (
    <div data-testid="ncr-registar" style={{
      overflow: "auto",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      maxHeight: "100%",
    }}>
      <table style={{
        borderCollapse: "collapse",
        fontSize: 9,
        minWidth: REGISTAR_KOLONE.reduce((s, k) => s + (k.w || 80), 0),
        width: "max-content",
      }}>
        <thead>
          <tr style={{ background: "#1e293b", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
            {REGISTAR_KOLONE.map((k) => (
              <th key={k.key} style={{
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: 700,
                minWidth: k.w,
                borderRight: "1px solid #334155",
                whiteSpace: "nowrap",
                verticalAlign: "bottom",
              }}>
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr>
              <td colSpan={REGISTAR_KOLONE.length} style={{ padding: 16, color: C.sivi }}>
                Nema NCR zapisa — klikni + Novi NCR pa popuni Obrazac.
              </td>
            </tr>
          ) : lista.map((n, i) => {
            const prekoracen = rokProsao?.(n);
            const sel = selektovanId === n.id;
            const alarm8d = jeNcr8dAlarmRed(ncrIzBaze(n));
            return (
              <tr
                key={n.id}
                data-testid={`ncr-reg-red-${n.broj_ncr}`}
                onClick={() => onIzaberi?.(n)}
                style={{
                  cursor: "pointer",
                  background: sel
                    ? `${C.plava}18`
                    : alarm8d
                      ? "#fde8e8"
                      : (i % 2 ? `${C.bg}` : C.panel),
                  borderLeft: sel ? `3px solid ${C.plava}` : alarm8d ? "3px solid #ef4444" : "3px solid transparent",
                }}
              >
                {REGISTAR_KOLONE.map((k) => {
                  let color = C.tekst;
                  let bg = undefined;
                  if (k.key === "status") {
                    if (n.status === "closed") { color = "#1b5e20"; bg = "#c6efce"; }
                    else if (n.status === "open") { color = "#854d0e"; bg = "#fff2cc"; }
                    else color = bojaStatus(n.status);
                  }
                  if (k.key === "ozbiljnost") color = bojaOzb(n.ozbiljnost);
                  if (prekoracen && k.key === "rok") color = C.crvena;
                  if (k.key === "link_obrazac" && n.broj_ncr) color = C.plava;
                  if (k.key === "osmd_pokrenut" && alarm8d) {
                    bg = "#ff4444";
                    color = "#fff";
                  }
                  const deo = nadjiDeoZaNcr(delovi, n.id_deo);
                  let vred;
                  if (k.key === "status") vred = statusNcrZaPrikaz(n.status);
                  else if (k.key === "naziv_dela") vred = nazivNcrZaPrikaz(n, deo) || "—";
                  else if (k.key === "linija") vred = linijaNcrZaPrikaz(n, deo, linije) || "—";
                  else vred = vrednostRegistra(n, k.key);
                  return (
                    <td
                      key={k.key}
                      onClick={k.key === "link_obrazac" && n.broj_ncr
                        ? (ev) => { ev.stopPropagation(); onOtvoriObrazac?.(n); }
                        : undefined}
                      style={{
                      padding: "5px 8px",
                      borderBottom: `1px solid ${C.border}`,
                      borderRight: `1px solid ${C.border}`,
                      color,
                      fontWeight: (k.key === "broj_ncr" || (k.key === "osmd_pokrenut" && alarm8d)) ? 700 : 400,
                      background: bg,
                      maxWidth: k.w,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: k.key === "link_obrazac" && n.broj_ncr ? "pointer" : undefined,
                      textDecoration: k.key === "link_obrazac" && n.broj_ncr ? "underline" : undefined,
                    }}
                      title={k.key === "link_obrazac" ? "Otvori obrazac u aplikaciji" : vred}>
                      {k.key === "link_obrazac" && n.broj_ncr ? "Otvori obrazac" : vred}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
