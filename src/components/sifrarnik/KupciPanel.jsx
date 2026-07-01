import { useState, useEffect, useCallback } from "react";
import { fetchKupci, upsertKupac } from "../../lib/sifrarnikApi.js";

export default function KupciPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [filter, setFilter] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setLista(await fetchKupci());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.naziv?.trim()) {
      addToast?.("Naziv kupca je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertKupac(forma);
      addToast?.("✓ Kupac sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };

  const prikaz = lista.filter((k) => {
    if (!filter.trim()) return true;
    return String(k.naziv).toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Naziv kupca…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ naziv: "", aktivan: true })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Kupac
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>NAZIV KUPCA *</span>
            <input value={forma.naziv || ""} onChange={(e) => setForma((p) => ({ ...p, naziv: e.target.value }))} style={INP} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11, color: C.tekst }}>
            <input type="checkbox" checked={forma.aktivan !== false} onChange={(e) => setForma((p) => ({ ...p, aktivan: e.target.checked }))} />
            Aktivan
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={snima} onClick={snimi}
              style={{ background: C.zelena, border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>
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
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 56px", background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8 }}>
            <span>NAZIV</span><span>AKTIVAN</span><span />
          </div>
          {prikaz.map((k, i) => (
            <div key={k.id} style={{
              display: "grid", gridTemplateColumns: "1fr 70px 56px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8, alignItems: "center",
              opacity: k.aktivan === false ? 0.55 : 1,
            }}>
              <span>{k.naziv}</span>
              <span style={{ color: k.aktivan !== false ? C.zelena : C.crvena, fontSize: 10 }}>{k.aktivan !== false ? "DA" : "NE"}</span>
              <button type="button" onClick={() => setForma({ ...k })}
                style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} kupaca · koristi se u radni_nalozi</div>
    </div>
  );
}
