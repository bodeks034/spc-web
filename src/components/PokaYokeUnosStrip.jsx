import { useMemo } from "react";
import { kalibracijaBlokiraUnos, sledecaPraznaDimenzija } from "../lib/meriloStatus.js";

export default function PokaYokeUnosStrip({
  C,
  idDeo,
  nazivDela,
  radniNalog,
  grupaAB,
  kolone,
  potrebanBroj,
  kalUpozorenja = [],
  kontrolnaListaOk,
  sacuvaneGrupe = [],
  kalibracijaOdobrena = false,
  kalibracijaCeka = false,
  mozeAdmin = false,
  onToggleKalibracijaOdobrenje,
  onZahtevKalibracija,
}) {
  const sledeca = useMemo(
    () => sledecaPraznaDimenzija(kolone, potrebanBroj),
    [kolone, potrebanBroj],
  );

  if (!idDeo) return null;

  const blokirajucaKal = kalUpozorenja.filter(k => kalibracijaBlokiraUnos(k.status));

  return (
    <div style={{
      background: `${C.plava}10`,
      border: `1px solid ${C.plava}50`,
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 10,
      flexShrink: 0,
    }}>
      <div style={{ color: C.plava, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 }}>
        POKA-YOKE · PROVERA PRE MERENJA
      </div>

      <div style={{ display: "grid", gap: 6, fontSize: 11 }}>
        <div>
          <span style={{ color: C.sivi }}>ID delo: </span>
          <strong style={{ color: C.zelena }}>{idDeo}</strong>
          {nazivDela && <span style={{ color: C.tekst }}> — {nazivDela}</span>}
          {radniNalog && <span style={{ color: C.border }}> · RN {radniNalog}</span>}
        </div>

        {grupaAB && (
          <div>
            <span style={{ color: C.sivi }}>Serija: </span>
            <strong>{grupaAB}</strong>
            {sacuvaneGrupe.length > 0 && (
              <span style={{ color: C.border }}> · sačuvano {sacuvaneGrupe.join(", ")}</span>
            )}
          </div>
        )}

        {sledeca ? (
          <div style={{ color: C.zuta }}>
            Sledeće merenje: <strong>{sledeca.pozicija}</strong>
            {" "}({sledeca.preostalo} od {sledeca.ukupno} u koloni)
          </div>
        ) : (
          <div style={{ color: C.zelena }}>Sve kolone u seriji su popunjene — možete Sačuvaj.</div>
        )}

        {kontrolnaListaOk === false && (
          <div style={{ color: C.zuta }}>
            Kontrolna lista smene nije potvrđena — završite je pre unosa (tab početak / atributivne).
          </div>
        )}

        {blokirajucaKal.length > 0 && !kalibracijaOdobrena && (
          <div style={{ color: C.crvena }}>
            {blokirajucaKal.some(k => k.status === "istekla")
              ? "Istekla kalibracija"
              : "Kalibracija nepoznata / nije u šifarniku"}
            : {blokirajucaKal.map(k => `${k.pozicija} (${k.instrument})`).join(" · ")}
          </div>
        )}
        {blokirajucaKal.length > 0 && kalibracijaOdobrena && (
          <div style={{ color: C.zuta }}>
            Kalibracija problematična — admin je dozvolio merenje za ovaj ID.
          </div>
        )}

        {kalibracijaCeka && !kalibracijaOdobrena && (
          <div style={{ color: C.zuta, fontSize: 10 }}>
            ⏳ Čeka odobrenje admina (sinhronizacija automatski)
          </div>
        )}

        {!mozeAdmin && blokirajucaKal.length > 0 && !kalibracijaOdobrena && !kalibracijaCeka
          && typeof onZahtevKalibracija === "function" && (
          <button
            type="button"
            onClick={onZahtevKalibracija}
            style={{
              marginTop: 8, background: C.zuta, border: "none", borderRadius: 6, color: "#000",
              fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
            }}
          >
            📤 Zahtev adminu (kalibracija)
          </button>
        )}

        {mozeAdmin && blokirajucaKal.length > 0 && typeof onToggleKalibracijaOdobrenje === "function" && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={onToggleKalibracijaOdobrenje}
              style={{
                background: kalibracijaOdobrena ? C.zuta : C.crvena,
                border: "none", borderRadius: 6, color: "#000",
                fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
              }}
            >
              {kalibracijaOdobrena
                ? "✓ Merenje dozvoljeno (ukloni dozvolu)"
                : "Admin: dozvoli merenje (kalibracija istekla)"}
            </button>
            <span style={{ color: C.sivi, fontSize: 9 }}>
              Važi na svim uređajima za {idDeo}
            </span>
          </div>
        )}

        {kalUpozorenja.filter(k => k.status === "uskoro").length > 0 && (
          <div style={{ color: C.zuta, fontSize: 10 }}>
            Kalibracija uskoro: {kalUpozorenja.filter(k => k.status === "uskoro")
              .map(k => k.instrument).join(", ")}
          </div>
        )}
      </div>

      <div style={{ color: C.border, fontSize: 9, marginTop: 8 }}>
        Proverite crtež desno i etiketu dela pre merenja. Podaci idu u Supabase posle „Sačuvaj seriju“.
      </div>
    </div>
  );
}
