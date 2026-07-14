/**
 * Kompaktna numerička tastatura za unos merenja na telefonu/tabletu.
 * Ne otvara sistemsku tastaturu — manje prekriva formu.
 */
export default function TastaturaBrojeviMerljive({
  C,
  ugao = false,
  onTaster,
  onGotovoDodaj,
  kompakt = true,
}) {
  const btnH = kompakt ? 28 : 34;
  const fontSize = kompakt ? 14 : 16;
  const fontSimbol = kompakt ? 12 : 14;
  const radius = kompakt ? 5 : 7;
  const gap = kompakt ? 2 : 4;
  const pad = kompakt ? "3px 5px 5px" : "6px 8px 8px";

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
        borderRadius: radius,
        background: accent ? `${C.sivi}33` : C.input,
        color: C.tekst,
        fontSize: typeof label === "number" ? fontSize : fontSimbol,
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
        padding: pad,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {redovi.map((red, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: red.length === 2 ? "2fr 1fr" : "repeat(3, 1fr)",
              gap,
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
          onClick={() => onGotovoDodaj?.()}
          style={{
            width: "100%",
            minHeight: kompakt ? 26 : 32,
            border: "none",
            borderRadius: radius,
            background: C.plava,
            color: C.onAkcent,
            fontSize: kompakt ? 11 : 12,
            fontWeight: 700,
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            letterSpacing: 0.3,
          }}
        >
          Gotovo + Dodaj
        </button>
      </div>
    </div>
  );
}
