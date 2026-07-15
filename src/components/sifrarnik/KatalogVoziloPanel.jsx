import { useState, useEffect, useCallback } from "react";
import { fetchTipoviVozila, fetchKatalogVozilo, upsertDefektVozilo, deleteDefektVozilo } from "../../lib/sifrarnikApi.js";

const PRAZAN = { kategorija: "", podkategorija: "", defekt: "" };

export default function KatalogVoziloPanel({ C, addToast, voziloKod, onVoziloChange }) {
  const [tipovi, setTipovi] = useState([]);
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [filter, setFilter] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        fetchTipoviVozila(),
        fetchKatalogVozilo(voziloKod),
      ]);
      setTipovi(t);
      setRedovi(r);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast, voziloKod]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.kategorija?.trim() || !forma?.defekt?.trim()) {
      addToast?.("Kategorija i defekt su obavezni", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertDefektVozilo({ ...forma, vozilo_id: voziloKod });
      addToast?.("✓ Defekt sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati defekt iz kataloga?")) return;
    try {
      await deleteDefektVozilo(id);
      addToast?.("Obrisano", "uspeh");
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };

  const prikaz = redovi.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [r.kategorija, r.podkategorija, r.defekt].some((s) => String(s).toLowerCase().includes(q));
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>TIP VOZILA</span>
          <select value={voziloKod} onChange={(e) => onVoziloChange?.(e.target.value)} style={{ ...INP, minWidth: 140, cursor: "pointer" }}>
            {tipovi.map((t) => <option key={t.kod} value={t.kod}>{t.kod} — {t.naziv}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Kat, podkat, defekt…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Defekt
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, marginBottom: 8 }}>
            {[["Kategorija *", "kategorija"], ["Podkategorija", "podkategorija"], ["Defekt *", "defekt"]].map(([l, k]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
                <input value={forma[k] || ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={snima} onClick={snimi}
              style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>
              {snima ? "…" : "Sačuvaj"}
            </button>
            <button type="button" onClick={() => setForma(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, fontSize: 11, padding: "8px 14px", cursor: "pointer" }}>
              Otkaži
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 2fr 56px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span>KATEGORIJA</span><span>PODKAT.</span><span>DEFEKT</span><span />
          </div>
          {!prikaz.length ? (
            <div style={{ padding: 20, textAlign: "center", color: C.border, fontSize: 11 }}>Nema defekata za {voziloKod}</div>
          ) : prikaz.map((r, i) => (
            <div key={r.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 2fr 56px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8,
            }}>
              <span>{r.kategorija}</span>
              <span style={{ color: C.sivi }}>{r.podkategorija || "—"}</span>
              <span>{r.defekt}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setForma({ ...r })} title="Izmeni"
                  style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
                <button type="button" onClick={() => obrisi(r.id)} title="Obriši"
                  style={{ background: `${C.crvena}18`, border: `1px solid ${C.crvena}44`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer", color: C.crvena }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} / {redovi.length} defekata · tabela katalog_gresaka_vozilo</div>
    </div>
  );
}
