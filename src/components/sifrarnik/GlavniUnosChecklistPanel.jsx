import { stavkeChecklistePoslePropagacije } from "../../lib/sifrarnikChecklist.js";
import { GLAVNI_UNOS_SHEET_TIP } from "../../lib/glavniUnosSheetTip.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";
export default function GlavniUnosChecklistPanel({
  C,
  analiza,
  idDeo,
  onNavigate,
  onDismiss,
  onDodajSablonGresaka,
  sablonUcitava = false,
}) {
  const stavke = stavkeChecklistePoslePropagacije(analiza, idDeo);

  return (
    <div style={{
      background: `${C.zelena || "#22c55e"}12`,
      border: `1px solid ${C.zelena || "#22c55e"}55`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>
            ✓ Propagirano — sledeći koraci
          </div>
          {idDeo && (
            <div style={{ color: C.plava, fontSize: 10, marginTop: 2, fontWeight: 600 }}>{idDeo}</div>
          )}
        </div>
        <button type="button" onClick={onDismiss}
          style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 10 }}>
          ✕ Zatvori
        </button>
      </div>

      <ul style={{ margin: "0 0 10px", paddingLeft: 18, color: C.sivi, fontSize: 10, lineHeight: 1.55 }}>
        {stavke.map((s) => (
          <li key={s.id} style={{ marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => onNavigate?.(s.tab, {
                idDeo,
                izCheckliste: true,
                vozilo: analiza?.tip === GLAVNI_UNOS_SHEET_TIP.FINAL,
                otvoriCrtezForm: s.id === "crtez" || s.ctx?.otvoriCrtezForm,
                otvoriBarkod: s.id === "barkod" || s.ctx?.otvoriBarkod,
                ...(s.ctx || {}),
              })}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: C.plava,
                fontWeight: 600,
                fontSize: 10,
                textAlign: "left",
              }}
            >
              {s.label}
            </button>
            {s.opis && (
              <span style={{ display: "block", color: C.sivi, fontWeight: 400, fontSize: 9 }}>{s.opis}</span>
            )}
          </li>
        ))}
      </ul>

      {idDeo && onDodajSablonGresaka && (
        <button
          type="button"
          disabled={sablonUcitava}
          onClick={() => onDodajSablonGresaka(idDeo)}
          style={btnStyle(C, C.hover, { fontSize: 10, disabled: sablonUcitava })}
        >
          {sablonUcitava ? "…" : "+ Šablon grešaka (5 tipičnih)"}
        </button>
      )}
    </div>
  );
}
