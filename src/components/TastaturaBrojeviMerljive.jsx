/**
 * Kompaktna numerička tastatura za unos merenja na telefonu/tabletu.
 * Ne otvara sistemsku tastaturu — manje prekriva formu.
 */
export default function TastaturaBrojeviMerljive({
  C,
  ugao = false,
  onTaster,
  onGotovo,
  kompakt = false,
}) {
  const btnH = kompakt ? 38 : 44;
  const fontSize = kompakt ? 17 : 19;

  const taster = (label, akcija, cifra, { accent = false } = {}) => (
    <button
      key={`${akcija}-${cifra ?? label}`}
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      onClick={() => onTaster?.(akcija, cifra)}
      aria-label={typeof label === "string" ? label : akcija}
      style={{
        minHeight: btnH,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: accent ? `${C.sivi}33` : C.input,
        color: C.tekst,
        fontSize: typeof label === "number" ? fontSize : (kompakt ? 15 : 16),
        fontWeight: 600,
        fontFamily: "inherit",
        fontVariantNumeric: "tabular-nums",
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );

  const redovi = ugao
    ? [
        ["7", "8", "9"],
        ["4", "5", "6"],
        ["1", "2", "3"],
        ["0", "⌫"],
      ]
    : [
        ["7", "8", "9"],
        ["4", "5", "6"],
        ["1", "2", "3"],
        [",", "0", "⌫"],
      ];

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${C.border}`,
        background: C.panel,
        padding: kompakt ? "6px 8px 8px" : "8px 10px 10px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: kompakt ? 4 : 5 }}>
        {redovi.map((red, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: red.length === 2 ? "2fr 1fr" : "repeat(3, 1fr)",
              gap: kompakt ? 4 : 5,
            }}
          >
            {red.map((lbl) => {
              if (lbl === "⌫") return taster("⌫", "backspace");
              if (lbl === ",") return taster(",", "zarez");
              return taster(Number(lbl), "cifra", lbl);
            })}
          </div>
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={() => onGotovo?.()}
          style={{
            width: "100%",
            minHeight: btnH,
            border: "none",
            borderRadius: 8,
            background: C.zelena,
            color: "#fff",
            fontSize: kompakt ? 14 : 15,
            fontWeight: 700,
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Gotovo
        </button>
      </div>
    </div>
  );
}
