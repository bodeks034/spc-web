/** Dugmad za dvostruki izvoz liste: vizuelni ekran + formalna forma (kao 8D). */
export default function ListaIzvozDugmad({
  C,
  disabled = false,
  busyEkran = false,
  busyForma = false,
  onStampajEkran,
  onPdfEkran,
  onStampajForma,
  onPdfForma,
  akcent,
}) {
  const boja = akcent || C.plava;
  const busy = busyEkran || busyForma;
  const BTN = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 10,
    fontWeight: 700,
    padding: "7px 10px",
    cursor: disabled || busy ? "not-allowed" : "pointer",
    opacity: disabled || busy ? 0.5 : 1,
    fontFamily: "inherit",
  };
  const BTN_ACC = {
    ...BTN,
    border: `1px solid ${boja}55`,
    color: boja,
  };

  return (
    <div
      data-izvoz-hide
      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
    >
      <span style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.4 }}>
        EKRAN
      </span>
      <button type="button" disabled={disabled || busy} onClick={onStampajEkran} style={BTN} title="Štampa kao na ekranu">
        Štampaj
      </button>
      <button type="button" disabled={disabled || busyEkran || busy} onClick={onPdfEkran} style={BTN_ACC} title="PDF kao na ekranu">
        {busyEkran ? "PDF…" : "PDF"}
      </button>
      <span style={{ color: C.border, fontSize: 11, margin: "0 2px" }}>|</span>
      <span style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.4 }}>
        FORMA
      </span>
      <button type="button" disabled={disabled || busy} onClick={onStampajForma} style={BTN} title="Štampa formalnog izveštaja (kao 8D)">
        Štampaj
      </button>
      <button type="button" disabled={disabled || busyForma || busy} onClick={onPdfForma} style={BTN_ACC} title="PDF formalnog izveštaja (kao 8D)">
        {busyForma ? "PDF…" : "PDF"}
      </button>
    </div>
  );
}
