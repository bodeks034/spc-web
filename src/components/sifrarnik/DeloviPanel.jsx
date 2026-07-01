import { useState, useEffect, useCallback } from "react";
import { fetchDelovi, upsertDeo } from "../../lib/sifrarnikApi.js";

const PRAZAN = {
  id_deo: "", naziv_dela: "", karakteristika: "", tip_kontrole: "deo",
  vozilo_katalog_id: "", kom_za_kontrolu: 30, aktivan: true, napomena: "",
};

export default function DeloviPanel({ C, addToast, onStampaj }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipFilter, setTipFilter] = useState("svi");
  const [filter, setFilter] = useState("");
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const tip = tipFilter === "svi" ? null : tipFilter;
      setLista(await fetchDelovi({ tipKontrole: tip, samoAktivni: false }));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast, tipFilter]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.id_deo?.trim()) {
      addToast?.("ID dela je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertDeo(forma);
      addToast?.("✓ Deo sačuvan", "uspeh");
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

  const prikaz = lista.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [d.id_deo, d.naziv_dela, d.karakteristika, d.vozilo_katalog_id].some(
      (s) => String(s || "").toLowerCase().includes(q),
    );
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>TIP</span>
          <select value={tipFilter} onChange={(e) => setTipFilter(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
            <option value="svi">Svi</option>
            <option value="deo">Delovi (komponente)</option>
            <option value="vozilo">Celo vozilo</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ID, naziv…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Deo
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
            {[["ID deo *", "id_deo"], ["Naziv *", "naziv_dela"], ["Karakteristika", "karakteristika"]].map(([l, k]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
                <input value={forma[k] || ""} disabled={!!forma._postojeci && k === "id_deo"}
                  onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>TIP KONTROLE</span>
              <select value={forma.tip_kontrole || "deo"} onChange={(e) => setForma((p) => ({ ...p, tip_kontrole: e.target.value }))} style={{ ...INP, cursor: "pointer" }}>
                <option value="deo">deo</option>
                <option value="vozilo">vozilo</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>VOZILO KATALOG ID</span>
              <input value={forma.vozilo_katalog_id || ""} onChange={(e) => setForma((p) => ({ ...p, vozilo_katalog_id: e.target.value }))} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>KOM ZA KONTROLU</span>
              <input type="number" value={forma.kom_za_kontrolu ?? 30} onChange={(e) => setForma((p) => ({ ...p, kom_za_kontrolu: e.target.value }))} style={INP} />
            </label>
          </div>
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
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 56px 70px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span>ID</span><span>NAZIV</span><span>TIP</span><span>KOM</span><span>AKT</span><span />
          </div>
          {!prikaz.length ? (
            <div style={{ padding: 20, textAlign: "center", color: C.border, fontSize: 11 }}>Nema delova</div>
          ) : prikaz.map((d, i) => (
            <div key={d.id_deo} style={{
              display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 56px 70px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8, alignItems: "center",
              opacity: d.aktivan === false ? 0.55 : 1,
            }}>
              <span style={{ fontWeight: 700, color: C.plava }}>{d.id_deo}</span>
              <span>{d.naziv_dela}</span>
              <span style={{ color: C.sivi, fontSize: 10 }}>{d.tip_kontrole || "deo"}</span>
              <span style={{ color: C.sivi }}>{d.kom_za_kontrolu ?? "—"}</span>
              <span style={{ color: d.aktivan !== false ? C.zelena : C.crvena, fontSize: 10 }}>{d.aktivan !== false ? "DA" : "NE"}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setForma({ ...d, _postojeci: true })}
                  style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
                {onStampaj && (
                  <button type="button" onClick={() => onStampaj(d)} title="Barkod"
                    style={{ background: `${C.zelena}22`, border: `1px solid ${C.zelena}55`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer", color: C.zelena }}>▦</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} / {lista.length} · tabela delovi</div>
    </div>
  );
}
