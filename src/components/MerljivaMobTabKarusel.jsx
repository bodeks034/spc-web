import { useEkran } from "../layout/useEkran.js";

/**
 * Telefon / tablet — strelice levo-desno razvučene uz sredinu (serija + unos),
 * dole kompaktna zona za otvaranje crteža (fullscreen).
 */
export default function MerljivaMobTabKarusel({
  C,
  brojKolona = 5,
  aktivnaKolona = 0,
  onPrethodna,
  onSledeca,
  urlSlike,
  slika,
  idDeo,
  onZoomSlika,
  sredinaZaglavlje,
  children,
}) {
  const { viewportKey } = useEkran();
  const idx = aktivnaKolona >= 0 ? aktivnaKolona : 0;

  const imaPreth = idx > 0;
  const imaSled = brojKolona > 1 && idx < brojKolona - 1;

  const strelica = (smer, onClick, disabled) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-label={smer === "l" ? "Prethodna kolona" : "Sledeća kolona"}
      style={{
        flex: "0 0 30px",
        width: 30,
        alignSelf: "stretch",
        background: disabled ? C.hover : C.panel,
        border: `1px solid ${disabled ? C.hover : C.border}`,
        borderRadius: 8,
        color: disabled ? C.border : C.zelena,
        fontSize: 22,
        lineHeight: 1,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        padding: 0,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {smer === "l" ? "‹" : "›"}
    </button>
  );

  const crtezOpis = !idDeo
    ? "Unesi ID dela"
    : urlSlike
      ? "Crtež · dodirni za uvećanje"
      : slika
        ? "Crtež nije učitan"
        : "Nema crteža";

  return (
    <div
      key={viewportKey}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        gap: 4,
      }}
    >
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 4,
        minHeight: 0,
      }}>
        {strelica("l", onPrethodna, !imaPreth)}
        <div style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {sredinaZaglavlje}
          {brojKolona > 0 && (
            <div style={{
              fontSize: 8,
              color: C.sivi,
              textAlign: "center",
              flexShrink: 0,
              marginBottom: 2,
            }}>
              Merenje {idx + 1} / {brojKolona}
            </div>
          )}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}>
            {children}
          </div>
        </div>
        {strelica("d", onSledeca, !imaSled)}
      </div>

      <button
        type="button"
        onClick={() => urlSlike && onZoomSlika?.()}
        disabled={!urlSlike}
        title={urlSlike ? "Otvori crtež u celom ekranu" : crtezOpis}
        style={{
          flexShrink: 0,
          height: 36,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: urlSlike ? "pointer" : "default",
          opacity: urlSlike ? 1 : 0.65,
          touchAction: "manipulation",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>🖼</span>
        <span style={{ color: urlSlike ? C.plava : C.sivi, fontSize: 9, fontWeight: 600 }}>
          {crtezOpis}
        </span>
        {urlSlike && (
          <span style={{ color: C.border, fontSize: 8 }}>⛶</span>
        )}
      </button>
    </div>
  );
}
