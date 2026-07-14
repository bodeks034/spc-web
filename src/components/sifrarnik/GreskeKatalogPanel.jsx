import { useState, useEffect, useCallback } from "react";
import { fetchGreskeKatalog, upsertGreskaKatalog, deleteGreskaKatalog } from "../../lib/sifrarnikApi.js";
import { PogonPolje, PogonTekst } from "./SifrarnikPolje.jsx";
import { usePogonOznake } from "./usePogonOznake.js";

const PRAZAN = { kategorija: "", podkategorija: "", defekt: "", opis: "", id_deo: "", pogon_kod: "" };

export default function GreskeKatalogPanel({ C, addToast }) {
  const { format: formatPogon, opcije: pogonOpcije } = usePogonOznake(addToast);
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [filter, setFilter] = useState("");
  const [idDeoFilter, setIdDeoFilter] = useState("");
  const [pogonFilter, setPogonFilter] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setRedovi(await fetchGreskeKatalog({
        idDeo: idDeoFilter || null,
        pogonKod: pogonFilter || null,
      }));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast, idDeoFilter, pogonFilter]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.kategorija?.trim()) {
      addToast?.("Kategorija je obavezna", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertGreskaKatalog(forma);
      addToast?.("✓ Greška sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati stavku iz kataloga grešaka?")) return;
    try {
      await deleteGreskaKatalog(id);
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
    return [r.kategorija, r.podkategorija, r.defekt, r.id_deo, r.pogon_kod].some(
      (s) => String(s || "").toLowerCase().includes(q),
    );
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>ID DELO</span>
          <input value={idDeoFilter} onChange={(e) => setIdDeoFilter(e.target.value.toUpperCase())} placeholder="NT-001" style={{ ...INP, width: 100 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>POGON</span>
          <select value={pogonFilter} onChange={(e) => setPogonFilter(e.target.value)}
            style={{ ...INP, width: 180, cursor: "pointer" }}>
            <option value="">Svi</option>
            {pogonOpcije.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 120 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Kat, defekt…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Greška
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.narandzasta}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px 180px", gap: 8, marginBottom: 8 }}>
            {[["Kategorija *", "kategorija"], ["Podkategorija", "podkategorija"], ["Defekt", "defekt"], ["ID deo", "id_deo"]].map(([l, k]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
                <input value={forma[k] || ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
              </label>
            ))}
            <PogonPolje C={C} label="Pogon" value={forma.pogon_kod} onChange={(v) => setForma((p) => ({ ...p, pogon_kod: v }))} opcije={pogonOpcije} />
          </div>
          <input value={forma.opis || ""} placeholder="Opis…" onChange={(e) => setForma((p) => ({ ...p, opis: e.target.value }))} style={{ ...INP, marginBottom: 8 }} />
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
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 80px 150px 56px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span>KAT.</span><span>PODKAT.</span><span>DEFEKT</span><span>DELO</span><span>POG</span><span />
          </div>
          {!prikaz.length ? (
            <div style={{ padding: 20, textAlign: "center", color: C.border, fontSize: 11 }}>Nema stavki</div>
          ) : prikaz.map((r, i) => (
            <div key={r.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 80px 150px 56px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8,
            }}>
              <span>{r.kategorija}</span>
              <span style={{ color: C.sivi }}>{r.podkategorija || "—"}</span>
              <span>{r.defekt || "—"}</span>
              <span style={{ color: C.plava, fontSize: 10 }}>{r.id_deo || "—"}</span>
              <span style={{ color: C.sivi, fontSize: 10 }}><PogonTekst kod={r.pogon_kod} format={formatPogon} /></span>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setForma({ ...r })} style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
                <button type="button" onClick={() => obrisi(r.id)} style={{ background: `${C.crvena}18`, border: `1px solid ${C.crvena}44`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer", color: C.crvena }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} stavki · atributivne kontrole (greske_katalog)</div>
    </div>
  );
}
