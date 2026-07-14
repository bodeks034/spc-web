import { useState, useMemo } from "react";
import {
  ucitajReakcioniPlanSpc,
  snimiReakcioniPlanSpc,
  resetujReakcioniPlanSpc,
  labelKategorijeReakcije,
  aktivneAkcijeZaAnalitiku,
  PODRAZUMEVANI_REAKCIONI_PLAN_SPC,
} from "../lib/reakcioniPlanSpc.js";

const INP = (C) => ({
  background: C.input,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.tekst,
  fontSize: 11,
  padding: "6px 8px",
  width: "100%",
  fontFamily: "inherit",
  boxSizing: "border-box",
});

/**
 * Matrica reakcionog plana — SPC analitika (ne u osnovnom unosu dela).
 */
export default function ReakcioniPlanSpcPanel({
  C,
  kompakt = false,
  mozeUredjivati = false,
  addToast,
  kontekst = null,
}) {
  const [redovi, setRedovi] = useState(() => ucitajReakcioniPlanSpc());
  const [izmena, setIzmena] = useState(false);

  const aktivne = useMemo(
    () => (kontekst ? aktivneAkcijeZaAnalitiku(kontekst, redovi) : []),
    [kontekst, redovi],
  );

  const sacuvaj = () => {
    const saved = snimiReakcioniPlanSpc(redovi);
    setRedovi(saved);
    setIzmena(false);
    addToast?.("✓ Reakcioni plan sačuvan", "uspeh");
  };

  const vratiSablon = () => {
    if (!window.confirm("Vratiti podrazumevani šablon? Izgubiće se lokalne izmene.")) return;
    const d = resetujReakcioniPlanSpc();
    setRedovi(d);
    setIzmena(false);
    addToast?.("Vraćen podrazumevani šablon", "info");
  };

  return (
    <div style={{ marginTop: kompakt ? 12 : 0 }}>
      {!kompakt && (
        <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: C.tekst }}>Reakcioni plan</strong> — šta uraditi kad proces odstupi.
          Primenjuje se u SPC kartama, alarmima i Cp/Cpk analizi. Ne unosi se po delu u Osnovnom unosu.
        </div>
      )}

      {aktivne.length > 0 && (
        <div style={{
          marginBottom: 12, padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.zuta}66`, background: `${C.zuta}12`,
        }}>
          <div style={{ color: C.zuta, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            PREPORUČENE AKCIJE ZA TRENUTNE PODATKE
          </div>
          {aktivne.map((r) => (
            <div key={r.id} style={{ fontSize: 10, color: C.tekst, marginBottom: 4 }}>
              <span style={{ color: C.sivi }}>{r.situacija}</span>
              {" → "}
              <strong>{r.akcija}</strong>
            </div>
          ))}
        </div>
      )}

      {mozeUredjivati && !izmena && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIzmena(true)}
            style={{
              background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,
              fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer",
            }}
          >
            Uredi plan
          </button>
          <button
            type="button"
            onClick={vratiSablon}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 10, padding: "6px 12px", cursor: "pointer",
            }}
          >
            Vrati šablon
          </button>
        </div>
      )}

      {izmena && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={sacuvaj} style={{
            background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer",
          }}>
            Sačuvaj
          </button>
          <button type="button" onClick={() => { setRedovi(ucitajReakcioniPlanSpc()); setIzmena(false); }} style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "6px 12px", cursor: "pointer",
          }}>
            Otkaži
          </button>
          <button type="button" onClick={() => setRedovi([...redovi, {
            id: `novi_${Date.now()}`,
            kategorija: "ostalo",
            situacija: "",
            akcija: "",
          }])} style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.tekst, fontSize: 10, padding: "6px 12px", cursor: "pointer",
          }}>
            + Red
          </button>
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: izmena ? "90px 1fr 1fr 40px" : "90px 1fr 1fr",
          gap: 0,
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          fontSize: 9,
          fontWeight: 700,
          color: C.sivi,
        }}>
          <div style={{ padding: "8px 10px" }}>OBLAST</div>
          <div style={{ padding: "8px 10px" }}>SITUACIJA</div>
          <div style={{ padding: "8px 10px" }}>AKCIJA</div>
          {izmena && <div />}
        </div>
        {(izmena ? redovi : redovi).map((r, i) => {
          const aktivan = aktivne.some((a) => a.id === r.id);
          return (
            <div
              key={r.id || i}
              style={{
                display: "grid",
                gridTemplateColumns: izmena ? "90px 1fr 1fr 40px" : "90px 1fr 1fr",
                borderBottom: `1px solid ${C.border}44`,
                background: aktivan ? `${C.zuta}10` : (i % 2 ? `${C.border}15` : "transparent"),
              }}
            >
              <div style={{ padding: "8px 10px", fontSize: 9, color: C.sivi }}>
                {labelKategorijeReakcije(r.kategorija)}
              </div>
              <div style={{ padding: izmena ? 4 : "8px 10px", fontSize: 10, color: C.tekst }}>
                {izmena ? (
                  <input
                    value={r.situacija}
                    onChange={(e) => {
                      const n = [...redovi];
                      n[i] = { ...n[i], situacija: e.target.value };
                      setRedovi(n);
                    }}
                    style={INP(C)}
                  />
                ) : r.situacija}
              </div>
              <div style={{ padding: izmena ? 4 : "8px 10px", fontSize: 10, color: C.tekst, fontWeight: aktivan ? 700 : 400 }}>
                {izmena ? (
                  <input
                    value={r.akcija}
                    onChange={(e) => {
                      const n = [...redovi];
                      n[i] = { ...n[i], akcija: e.target.value };
                      setRedovi(n);
                    }}
                    style={INP(C)}
                  />
                ) : r.akcija}
              </div>
              {izmena && (
                <div style={{ padding: 4, display: "flex", alignItems: "center" }}>
                  <button
                    type="button"
                    title="Obriši"
                    onClick={() => setRedovi(redovi.filter((_, j) => j !== i))}
                    style={{
                      background: "none", border: "none", color: C.crvena,
                      cursor: "pointer", fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!izmena && redovi.length === PODRAZUMEVANI_REAKCIONI_PLAN_SPC.length && (
        <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>
          {redovi.length} pravila · izmene se čuvaju u pregledaču (po korisniku/računaru)
        </div>
      )}
    </div>
  );
}
