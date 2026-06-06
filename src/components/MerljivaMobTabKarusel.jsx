/**
 * Telefon / tablet — jedna kolona merenja gore, strelice levo-desno, slika dole (manja).
 */
export default function MerljivaMobTabKarusel({
  C,
  kolone,
  aktivnaKolona,
  indeksiMerljivih,
  onPrethodna,
  onSledeca,
  crtezVisina,
  urlSlike,
  slika,
  idDeo,
  onZoomSlika,
  CrtezZoomViewer,
  children,
  indeksUListe,
}) {
  const listaIdx = indeksUListe >= 0 ? indeksUListe : 0;
  const imaPreth = listaIdx > 0;
  const imaSled = indeksiMerljivih.length > 1 && listaIdx < indeksiMerljivih.length - 1;

  const strelica = (smer, onClick, disabled) => {
    const pokreni = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) onClick();
    };
    return (
      <button
        type="button"
        onClick={pokreni}
        onPointerUp={pokreni}
        disabled={disabled}
        aria-label={smer === "l" ? "Prethodna kolona" : "Sledeća kolona"}
        style={{
          flex: "0 0 48px",
          width: 48,
          minHeight: 64,
          alignSelf: "stretch",
          background: disabled ? C.hover : C.panel,
          border: `1px solid ${disabled ? C.hover : C.border}`,
          borderRadius: 10,
          color: disabled ? C.border : C.zelena,
          fontSize: 30,
          lineHeight: 1,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          flexShrink: 0,
          padding: 0,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        {smer === "l" ? "‹" : "›"}
      </button>
    );
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      gap: 6,
    }}>
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 6,
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
          {indeksiMerljivih.length > 0 && (
            <div style={{
              fontSize: 9,
              color: C.sivi,
              textAlign: "center",
              flexShrink: 0,
              marginBottom: 4,
            }}>
              Merenje {listaIdx + 1} / {indeksiMerljivih.length}
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

      <div style={{
        flexShrink: 0,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        height: crtezVisina,
        maxHeight: crtezVisina,
        padding: 4,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 8, color: C.sivi, textAlign: "center", flexShrink: 0, marginBottom: 2 }}>
          Crtež · klik = ceo ekran
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {urlSlike ? (
            <CrtezZoomViewer url={urlSlike} C={C} onFullscreen={onZoomSlika} />
          ) : (
            <div style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.border,
              fontSize: 9,
              background: C.input,
              borderRadius: 6,
              border: `1px solid ${C.border}`,
            }}>
              {idDeo ? (slika ? "Nije učitana" : "Nema crteža") : "Unesi ID"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
