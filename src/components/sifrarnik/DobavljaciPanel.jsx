import { useCallback, useEffect, useState } from "react";
import { fetchDobavljaci, upsertDobavljac } from "../../lib/dobavljaciApi.js";

const PRAZAN = {
  sifra_dobavljaca: "",
  naziv_dobavljaca: "",
  drzava: "",
  grad: "",
  aktivan: true,
};

export default function DobavljaciPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [forma, setForma] = useState(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setLista(await fetchDobavljaci());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertDobavljac(forma);
      addToast?.("✓ Dobavljač sačuvan", "uspeh");
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
  const q = filter.trim().toLowerCase();
  const prikaz = lista.filter((r) => !q || [
    r.sifra_dobavljaca, r.naziv_dobavljaca, r.drzava, r.grad,
  ].some((v) => String(v || "").toLowerCase().includes(q)));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 180 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Šifra, naziv, država ili grad…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Dobavljač
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 10 }}>
            {[
              ["sifra_dobavljaca", "ŠIFRA DOBAVLJAČA *"],
              ["naziv_dobavljaca", "NAZIV DOBAVLJAČA *"],
              ["drzava", "DRŽAVA"],
              ["grad", "GRAD"],
            ].map(([key, label]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
                <input value={forma[key] || ""}
                  disabled={key === "sifra_dobavljaca" && Boolean(forma.updated_at)}
                  onChange={(e) => setForma((p) => ({ ...p, [key]: e.target.value }))}
                  style={{ ...INP, opacity: key === "sifra_dobavljaca" && forma.updated_at ? 0.65 : 1 }} />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>STATUS</span>
              <select value={forma.aktivan === false ? "neaktivan" : "aktivan"}
                onChange={(e) => setForma((p) => ({ ...p, aktivan: e.target.value === "aktivan" }))}
                style={INP}>
                <option value="aktivan">Aktivan</option>
                <option value="neaktivan">Neaktivan</option>
              </select>
            </label>
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

      {loading ? <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div> : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px 130px 90px 56px", background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8 }}>
            <span>ŠIFRA DOBAVLJAČA</span><span>NAZIV DOBAVLJAČA</span>
            <span>DRŽAVA</span><span>GRAD</span><span>STATUS</span><span />
          </div>
          {prikaz.map((r, i) => (
            <div key={r.sifra_dobavljaca} style={{
              display: "grid", gridTemplateColumns: "130px 1fr 110px 130px 90px 56px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none",
              fontSize: 11, gap: 8, alignItems: "center", opacity: r.aktivan === false ? 0.55 : 1,
            }}>
              <span style={{ color: C.plava, fontWeight: 700 }}>{r.sifra_dobavljaca}</span>
              <span>{r.naziv_dobavljaca}</span><span>{r.drzava || "—"}</span><span>{r.grad || "—"}</span>
              <span style={{ color: r.aktivan === false ? C.crvena : C.zelena }}>
                {r.aktivan === false ? "Neaktivan" : "Aktivan"}
              </span>
              <button type="button" onClick={() => setForma({ ...r })}
                style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} dobavljača</div>
    </div>
  );
}
