/**
 * Fiksna traka akcija na dnu ekrana — telefon/tablet, linijski mod.
 * Ostaje vidljiva i kad ugrađena tastatura prekrije donji deo.
 */
export default function LinijaDonjaTraka({ ekran, C, children, visinaRezerva = 76, rezerva = true }) {
  if (!ekran?.linijaUredjaj) return null;

  return (
    <>
      {rezerva && visinaRezerva > 0 && (
        <div aria-hidden style={{ flexShrink: 0, height: visinaRezerva }} />
      )}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 600,
          padding: "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))",
          background: `${C.bg}f2`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: `1px solid ${C.border}`,
          boxShadow: "0 -6px 20px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </>
  );
}

/** Dugme u donjoj traci — velika dodirna zona */
export function DugmeTraka({
  onClick,
  disabled = false,
  boja,
  bojaTekst = "#fff",
  children,
  flex = 1,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex,
        minHeight: 48,
        background: disabled ? undefined : boja,
        border: disabled ? `1px solid rgba(255,255,255,0.12)` : (bojaTekst === "#fff" ? "none" : `1px solid rgba(255,255,255,0.15)`),
        borderRadius: 10,
        color: disabled ? undefined : bojaTekst,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        padding: "12px 10px",
        touchAction: "manipulation",
        boxSizing: "border-box",
      }}
    >
      {children}
    </button>
  );
}
