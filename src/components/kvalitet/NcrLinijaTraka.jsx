/** Vidljiva traka — NCR obrazac sa Modula 1 (tab UNOS). */
export default function NcrLinijaTraka({ C, onClick, kompakt = false }) {
  return (
    <div
      data-testid="ncr-linija-traka"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: kompakt ? "8px 10px" : "8px 14px",
        background: `${C.crvena}14`,
        borderBottom: `1px solid ${C.crvena}55`,
      }}
    >
      <span style={{ fontSize: kompakt ? 10 : 11, color: C.tekst, lineHeight: 1.35 }}>
        <strong style={{ color: C.crvena }}>NCR</strong>
        {!kompakt && " — prijava neusaglašenosti (inženjer zatvara u Modulu 2)"}
      </span>
      <button
        type="button"
        data-testid="ncr-linija-traka-dugme"
        onClick={onClick}
        style={{
          background: C.crvena,
          border: "none",
          borderRadius: 6,
          color: C.onAkcent,
          fontSize: kompakt ? 10 : 11,
          fontWeight: 700,
          padding: kompakt ? "8px 12px" : "8px 16px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        📋 Prijavi NCR
      </button>
    </div>
  );
}
