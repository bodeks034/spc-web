import { useState, useEffect, useCallback } from "react";
import { fetchTipoviVozila, fetchDelovi, upsertDeo } from "../../lib/sifrarnikApi.js";
import { FormGrid } from "./LinijePanel.jsx";
import { inpStyle } from "./sifrarnikPanelStyle.js";

const VOZILO_DELO_META = {
  slika_naziv: { type: "slika", modul: "atributivne" },
  id_deo: { readOnly: true },
};

export default function DeloviVoziloPanel({ C, addToast, voziloKod, onVoziloChange, onStampaj }) {
  const [tipovi, setTipovi] = useState([]);
  const [delovi, setDelovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([
        fetchTipoviVozila(),
        fetchDelovi({ tipKontrole: "vozilo", voziloKatalogId: voziloKod }),
      ]);
      setTipovi(t);
      setDelovi(d);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast, voziloKod]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.id_deo?.trim()) {
      addToast?.("ID dela je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertDeo({
        ...forma,
        tip_kontrole: "vozilo",
        vozilo_katalog_id: voziloKod,
      });
      addToast?.("✓ Deo vozila sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const INP = inpStyle(C);

  const prikaz = delovi.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [d.id_deo, d.naziv_dela, d.karakteristika, d.slika_naziv].some(
      (s) => String(s || "").toLowerCase().includes(q),
    );
  });

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>
        Delovi sa <code>tip_kontrole=vozilo</code> — crtež / SOP slika po ID delu (Storage <code>atributivne/</code>).
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>TIP VOZILA</span>
          <select value={voziloKod} onChange={(e) => onVoziloChange?.(e.target.value)} style={{ ...INP, minWidth: 140, cursor: "pointer" }}>
            {tipovi.map((t) => <option key={t.kod} value={t.kod}>{t.kod} — {t.naziv}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ID, naziv, slika…" style={INP} />
        </label>
        <button type="button" onClick={ucitaj}
          style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.tekst, fontSize: 10, padding: "8px 12px", cursor: "pointer" }}>
          Osveži
        </button>
      </div>

      {forma && (
        <FormGrid
          C={C}
          cols={3}
          forma={forma}
          setForma={setForma}
          fields={[
            ["ID deo", "id_deo"],
            ["Naziv dela", "naziv_dela"],
            ["Karakteristika", "karakteristika"],
            ["Crtež / slika", "slika_naziv"],
            ["Kom za kontrolu", "kom_za_kontrolu"],
          ]}
          fieldMeta={VOZILO_DELO_META}
          addToast={addToast}
          onSave={snimi}
          onCancel={() => setForma(null)}
          snima={snima}
        />
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px 90px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span>ID DELO</span><span>NAZIV</span><span>KARAKTERISTIKA</span><span>SLIKA</span><span />
          </div>
          {!prikaz.length ? (
            <div style={{ padding: 20, textAlign: "center", color: C.border, fontSize: 11 }}>
              Nema delova tip_kontrole=vozilo za {voziloKod}
            </div>
          ) : prikaz.map((d, i) => (
            <div key={d.id_deo} style={{
              display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px 90px",
              padding: "9px 10px", borderTop: i ? `1px solid ${C.border}` : "none",
              fontSize: 11, gap: 8, alignItems: "center",
            }}>
              <span style={{ fontWeight: 700, color: C.plava }}>{d.id_deo}</span>
              <span>{d.naziv_dela || "—"}</span>
              <span style={{ color: C.sivi, fontSize: 10 }}>{d.karakteristika || "—"}</span>
              <span style={{ color: C.sivi, fontSize: 9 }}>{d.slika_naziv || "—"}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setForma({ ...d })}
                  style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>
                  ✎
                </button>
                <button type="button" onClick={() => onStampaj?.(d)}
                  style={{
                    background: C.zelena, border: "none", borderRadius: 5, color: C.onAkcent,
                    fontSize: 9, fontWeight: 700, padding: "5px 8px", cursor: "pointer",
                  }}>
                  Barkod
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>
        {prikaz.length} delova · vozilo_katalog_id = {voziloKod}
      </div>
    </div>
  );
}
