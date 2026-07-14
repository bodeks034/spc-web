import { labelSerije } from "../../lib/varijabilneUtils.js";

export function MerljiveDugmadSerije({
  C, L, mozeObrisati, obrisiPoslednje, mozeSacuvati, snima, greskaDb,
  onSacuvajAkcija, faiRezimAktivan, mozeOdobriFai, prekidOdobrenId, serijaPotpuna,
}) {
  if (L.mobTabKarusel) return null;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
      flexShrink: 0,
      width: "100%",
    }}>
      <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.tekst,
          padding: "9px 8px",
          cursor: mozeObrisati ? "pointer" : "not-allowed",
          fontSize: 10, fontWeight: 600, boxSizing: "border-box",
        }}>
        Obriši poslednje
      </button>
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={onSacuvajAkcija}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: C.onAkcent,
          padding: "9px 8px",
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 11, boxSizing: "border-box",
        }}>
        {snima ? "Snimam…" : (faiRezimAktivan
          ? (mozeOdobriFai ? "Sačuvaj i odobri FAI" : "Sačuvaj FAI")
          : (prekidOdobrenId && !serijaPotpuna ? "Sačuvaj (prekid)" : "Sačuvaj seriju"))}
      </button>
    </div>
  );
}

export function MerljiveMobDugmadAkcije({
  C, L, ekran, mozeObrisati, obrisiPoslednje, mozeSacuvati, snima, greskaDb,
  onSacuvajAkcija, faiRezimAktivan, mozeOdobriFai, prekidOdobrenId, serijaPotpuna,
}) {
  if (!L.mobTabKarusel) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
      flexShrink: 0, marginBottom: 2,
    }}>
      <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.tekst, padding: "5px 8px", minHeight: 30,
          cursor: mozeObrisati ? "pointer" : "not-allowed",
          fontSize: 9, fontWeight: 600, whiteSpace: "nowrap", flex: 1, maxWidth: "48%",
        }}>
        {ekran.w < 340 ? "Obriši" : "Obriši poslednje"}
      </button>
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={onSacuvajAkcija}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: C.onAkcent, padding: "5px 8px", minHeight: 30,
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 9, flex: 1, maxWidth: "48%", whiteSpace: "nowrap",
        }}>
        {snima ? "Snimam…" : (faiRezimAktivan
          ? (mozeOdobriFai
            ? (ekran.w < 360 ? "FAI ✓" : "Sačuvaj i odobri FAI")
            : (ekran.w < 360 ? "FAI" : "Sačuvaj FAI"))
          : (prekidOdobrenId && !serijaPotpuna
            ? (ekran.w < 360 ? "Sačuvaj*" : "Sačuvaj (prekid)")
            : (ekran.w < 360 ? "Sačuvaj" : "Sačuvaj seriju")))}
      </button>
    </div>
  );
}

export function MerljiveMobSerijaStatus({ C, L, grupe, grupaAB, sacuvaneGrupe, indeksAktivne }) {
  if (!L.mobTabKarusel || grupe.length === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      flexShrink: 0, padding: "4px 0 6px",
    }}>
      {grupe.map((g, gi) => {
        const idx = grupe.indexOf(g);
        const aktivna = g === grupaAB;
        const zavrsena = sacuvaneGrupe.includes(g);
        const buduca = idx > indeksAktivne && !zavrsena;
        return (
          <span key={g} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {gi > 0 && (
              <span style={{ color: C.border, fontSize: 9, opacity: 0.45 }}>|</span>
            )}
            <span style={{
              fontSize: aktivna ? 10 : 9,
              fontWeight: aktivna ? 700 : 500,
              letterSpacing: 0.6,
              color: aktivna ? C.zelena : zavrsena ? C.plava : C.sivi,
              opacity: aktivna ? 1 : buduca ? 0.28 : zavrsena ? 0.85 : 0.55,
            }}>
              Serija {g}{zavrsena && !aktivna ? " ✓" : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function MerljiveSerijaDugmad({
  C, inp, serijeMeta, grupe, grupaAB, sacuvaneGrupe, indeksAktivne, onGrupaChange,
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {serijeMeta.map((meta) => {
        const g = meta.sifra;
        const idx = grupe.indexOf(g);
        const aktivna = g === grupaAB;
        const zavrsena = sacuvaneGrupe.includes(g);
        const zakljucana = idx > indeksAktivne && !zavrsena;
        const kratko = meta.faza_naziv
          ? `${g} · ${meta.faza_naziv} (${meta.broj_merenja}×)`
          : `${g} (${meta.broj_merenja}×)`;
        return (
          <button
            key={g}
            type="button"
            disabled={zakljucana}
            onClick={() => !zakljucana && onGrupaChange(g)}
            title={zakljucana ? `Prvo završi seriju ${grupe[idx - 1] || "prethodnu"}` : labelSerije(meta)}
            style={{
              ...inp,
              width: "auto",
              minWidth: 32,
              padding: "3px 8px",
              cursor: zakljucana ? "not-allowed" : "pointer",
              opacity: zakljucana ? 0.4 : 1,
              borderColor: aktivna ? C.zelena : zavrsena ? C.plava : C.border,
              background: aktivna ? `${C.zelena}22` : C.input,
              fontWeight: aktivna ? 700 : 400,
              fontSize: 10,
            }}
          >
            {kratko}{zavrsena ? " ✓" : ""}
          </button>
        );
      })}
      {!serijeMeta.length && <span style={{ color: C.sivi, fontSize: 10 }}>—</span>}
    </div>
  );
}
