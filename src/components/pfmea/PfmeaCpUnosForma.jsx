import { useMemo } from "react";
import { primeniRpnKalkulaciju, pfmeaKljucMenjaRpn } from "../../lib/pfmeaCpPolja.js";

/**
 * Forma za unos jedne PFMEA ili Control Plan stavke — sva polja po grupama.
 */
export default function PfmeaCpUnosForma({
  tip,
  grupe,
  vrednosti,
  onChange,
  mozeEdit,
  C,
  naslov,
  indeks,
  onSacuvaj,
  onOtkazi,
  onObrisi,
}) {
  const red = useMemo(
    () => (tip === "pfmea" ? primeniRpnKalkulaciju(vrednosti) : vrednosti),
    [tip, vrednosti],
  );

  const set = (key, val) => {
    let next = { ...red, [key]: val };
    if (tip === "pfmea" && pfmeaKljucMenjaRpn(key)) {
      next = primeniRpnKalkulaciju(next);
    }
    onChange(next);
  };

  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 0.6, marginBottom: 4, display: "block" };
  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 12,
    padding: "10px 12px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const renderPolje = (p) => {
    const val = red[p.key] ?? "";
    const dis = !mozeEdit || p.readOnlyCalc;
    if (p.type === "date") {
      return (
        <input
          type="date"
          value={val}
          disabled={dis}
          onChange={(e) => set(p.key, e.target.value)}
          style={INP}
        />
      );
    }
    if (p.type === "select") {
      return (
        <select
          value={val}
          disabled={dis}
          onChange={(e) => set(p.key, e.target.value)}
          style={{ ...INP, cursor: dis ? "default" : "pointer" }}
        >
          {p.options.map((o) => (
            <option key={o || "_"} value={o}>{o || "— izaberi —"}</option>
          ))}
        </select>
      );
    }
    if (p.rows && p.rows > 1) {
      return (
        <textarea
          value={val}
          disabled={dis}
          onChange={(e) => set(p.key, e.target.value)}
          rows={p.rows}
          placeholder={p.placeholder}
          style={{ ...INP, resize: "vertical", minHeight: 56 }}
        />
      );
    }
    return (
      <input
        type={p.type === "number" ? "number" : "text"}
        min={p.min}
        max={p.max}
        value={val}
        disabled={dis}
        onChange={(e) => set(p.key, e.target.value)}
        placeholder={p.placeholder}
        style={INP}
      />
    );
  };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.plava}55`,
      borderRadius: 12,
      padding: "16px 18px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ color: C.plava, fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
          {naslov}
          {indeks != null ? ` #${indeks + 1}` : " — nova stavka"}
        </div>
        {mozeEdit && onSacuvaj && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onSacuvaj}
              style={{
                background: C.plava, border: "none", borderRadius: 6, color: "#fff",
                fontSize: 11, fontWeight: 700, padding: "8px 16px", cursor: "pointer",
              }}
            >
              {indeks != null ? "Ažuriraj stavku" : "Dodaj stavku"}
            </button>
            {onOtkazi && (
              <button
                type="button"
                onClick={onOtkazi}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.sivi, fontSize: 11, padding: "8px 12px", cursor: "pointer",
                }}
              >
                Otkaži
              </button>
            )}
            {indeks != null && onObrisi && (
              <button
                type="button"
                onClick={onObrisi}
                style={{
                  background: "none", border: `1px solid ${C.crvena}66`, borderRadius: 6,
                  color: C.crvena, fontSize: 11, padding: "8px 12px", cursor: "pointer",
                }}
              >
                Obriši
              </button>
            )}
          </div>
        )}
      </div>

      {grupe.map((g) => (
        <div key={g.id} style={{
          marginBottom: 14,
          background: C.hover,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "12px 14px",
        }}>
          <div style={{
            color: C.plava, fontSize: 11, fontWeight: 700, marginBottom: 12,
            letterSpacing: 0.5,
          }}>
            {g.naslov}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${g.cols || 1}, minmax(0, 1fr))`,
            gap: 10,
          }}>
            {g.polja.map((p) => (
              <div
                key={p.key}
                style={{
                  gridColumn: p.span ? `span ${Math.min(p.span, g.cols || 1)}` : undefined,
                }}
              >
                <label style={lbl}>
                  {p.label}
                  {p.required && <span style={{ color: C.crvena }}> *</span>}
                </label>
                {renderPolje(p)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
