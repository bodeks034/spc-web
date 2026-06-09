import { onFocusTastatura } from "../layout/tastaturaMobil.js";

/**
 * Fabrički unos broja na liniji — veliki stepper + numerička tastatura.
 * Za uglove (DMS) stepper se ne prikazuje.
 */
export default function NumerickiUnosLinija({
  value,
  onChange,
  onBlur,
  onKeyDown,
  onFocus,
  placeholder,
  inputMode = "decimal",
  korak = null,
  style = {},
  C,
  autoFocus = false,
  inputRef,
}) {
  const imaStepper = korak != null && korak > 0;

  const podesi = (smer) => {
    const t = String(value ?? "").trim().replace(",", ".");
    const baza = t === "" || t === "-" ? 0 : Number(t);
    const sledece = (Number.isFinite(baza) ? baza : 0) + smer * korak;
    const dec = korak < 0.001 ? 4 : korak < 0.01 ? 3 : korak < 0.1 ? 2 : 1;
    const tekst = sledece.toFixed(dec).replace(/\.?0+$/, "").replace(".", ",");
    onChange?.(tekst);
  };

  const btnStep = (smer) => (
    <button
      type="button"
      onClick={() => podesi(smer)}
      aria-label={smer < 0 ? "Smanji" : "Povećaj"}
      style={{
        flex: "0 0 52px",
        width: 52,
        minHeight: 52,
        background: C.panel,
        border: "none",
        color: C.tekst,
        fontSize: 28,
        fontWeight: 300,
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {smer < 0 ? "−" : "+"}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        border: `2px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        flexShrink: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {imaStepper && btnStep(-1)}
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={(e) => { onFocusTastatura(e); onFocus?.(e); }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          textAlign: "center",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "inherit",
          fontVariantNumeric: "tabular-nums",
          padding: "12px 8px",
          boxSizing: "border-box",
          ...style,
        }}
      />
      {imaStepper && btnStep(1)}
    </div>
  );
}
