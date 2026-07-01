import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";

/** Filter ID dela — primeni na Enter ili dugme Pretraži (ne na svako slovo). */
export default function SifrarnikFilterBar({
  C,
  idDraft,
  onIdDraftChange,
  onPrimeni,
  loading = false,
  pogonFilter,
  onPogonChange,
  pogonOpcije = [],
  textFilter,
  onTextFilterChange,
  textPlaceholder = "Pretraga…",
  showPogon = false,
  showText = false,
}) {
  const INP = inpStyle(C);

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>ID DELO</span>
        <input
          value={idDraft}
          onChange={(e) => onIdDraftChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onPrimeni?.(); } }}
          placeholder="npr. DEMO-NM-001"
          style={{ ...INP, width: 120 }}
        />
      </label>
      <button
        type="button"
        onClick={() => onPrimeni?.()}
        disabled={loading}
        style={btnStyle(C, C.plava, { disabled: loading })}
      >
        {loading ? "…" : "Pretraži"}
      </button>
      {showPogon && (
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>POGON</span>
          <select
            value={pogonFilter}
            onChange={(e) => onPogonChange?.(e.target.value)}
            style={{ ...INP, width: 180, cursor: "pointer" }}
          >
            <option value="">Svi pogoni</option>
            {pogonOpcije.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      {showText && (
        <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 140 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>TEKST</span>
          <input
            value={textFilter}
            onChange={(e) => onTextFilterChange?.(e.target.value)}
            placeholder={textPlaceholder}
            style={{ ...INP, width: "100%" }}
          />
        </label>
      )}
    </div>
  );
}
