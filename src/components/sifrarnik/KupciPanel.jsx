import { useState, useEffect, useCallback } from "react";
import { fetchKupci, upsertKupac } from "../../lib/sifrarnikApi.js";

const PRAZAN_KUPAC = {
  sifra_kupca: "",
  naziv: "",
  skraceni_naziv: "",
  drzava: "",
  grad: "",
  adresa: "",
  pib: "",
  kontakt: "",
  telefon: "",
  email: "",
  aktivan: true,
};

const POLJA = [
  ["sifra_kupca", "ŠIFRA KUPCA"],
  ["naziv", "NAZIV KUPCA", true],
  ["skraceni_naziv", "SKRAĆENI NAZIV"],
  ["drzava", "DRŽAVA"],
  ["grad", "GRAD"],
  ["adresa", "ADRESA"],
  ["pib", "PIB"],
  ["kontakt", "KONTAKT"],
  ["telefon", "TELEFON"],
  ["email", "EMAIL", false, "email"],
];

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
    const upit = filter.toLowerCase();
    return [
      k.sifra_kupca, k.naziv, k.skraceni_naziv, k.drzava, k.grad,
      k.adresa, k.pib, k.kontakt, k.telefon, k.email,
    ].some((v) => String(v || "").toLowerCase().includes(upit));
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Šifra, naziv, PIB, grad, kontakt…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN_KUPAC })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Kupac
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, marginBottom: 10 }}>
            {POLJA.map(([key, label, obavezno, type]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{label}{obavezno ? " *" : ""}</span>
                <input
                  type={type || "text"}
                  value={forma[key] || ""}
                  onChange={(e) => setForma((p) => ({ ...p, [key]: e.target.value }))}
                  style={INP}
                />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>STATUS</span>
              <select
                value={forma.aktivan === false ? "neaktivan" : "aktivan"}
                onChange={(e) => setForma((p) => ({ ...p, aktivan: e.target.value === "aktivan" }))}
                style={INP}
              >
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

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <div style={{ minWidth: 1450 }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 190px 150px 100px 110px 190px 120px 150px 130px 200px 80px 56px", background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8 }}>
            <span>ŠIFRA KUPCA</span><span>NAZIV KUPCA</span><span>SKRAĆENI NAZIV</span>
            <span>DRŽAVA</span><span>GRAD</span><span>ADRESA</span><span>PIB</span>
            <span>KONTAKT</span><span>TELEFON</span><span>EMAIL</span><span>STATUS</span><span />
          </div>
          {prikaz.map((k, i) => (
            <div key={k.id} style={{
              display: "grid", gridTemplateColumns: "110px 190px 150px 100px 110px 190px 120px 150px 130px 200px 80px 56px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8, alignItems: "center",
              opacity: k.aktivan === false ? 0.55 : 1,
            }}>
              <span>{k.sifra_kupca || "—"}</span>
              <span>{k.naziv}</span>
              <span>{k.skraceni_naziv || "—"}</span>
              <span>{k.drzava || "—"}</span>
              <span>{k.grad || "—"}</span>
              <span>{k.adresa || "—"}</span>
              <span>{k.pib || "—"}</span>
              <span>{k.kontakt || "—"}</span>
              <span>{k.telefon || "—"}</span>
              <span>{k.email || "—"}</span>
              <span style={{ color: k.aktivan !== false ? C.zelena : C.crvena, fontSize: 10 }}>{k.aktivan !== false ? "Aktivan" : "Neaktivan"}</span>
              <button type="button" onClick={() => setForma({ ...k })}
                style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
            </div>
          ))}
          </div>
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} kupaca · koristi se u radni_nalozi</div>
    </div>
  );
}
