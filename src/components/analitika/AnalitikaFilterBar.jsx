import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchLinijeZaAnalitikuFilter } from "../../lib/analitikaFilterData.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";

const sel = (C, aktivan, kompakt, { minWidth, maxWidth } = {}) => ({
  background: C.input,
  border: `1px solid ${aktivan ? C.plava : C.border}`,
  borderRadius: 6,
  color: C.tekst,
  fontSize: kompakt ? 9 : 10,
  padding: kompakt ? "5px 8px" : "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  minWidth: minWidth ?? (kompakt ? 72 : 88),
  maxWidth: maxWidth ?? (kompakt ? 120 : 160),
});

export function AnalitikaFilterControls({ C, kompakt, inline = false, modul = "atributivne" }) {
  const filter = useAnalitikaFilter();
  const [delovi, setDelovi] = useState([]);
  const [linije, setLinije] = useState([]);
  const [karakteristike, setKarakteristike] = useState([]);
  const [linijeUcitava, setLinijeUcitava] = useState(true);

  useEffect(() => {
    let alive = true;
    setLinijeUcitava(true);

    Promise.all([
      supabase.from("delovi").select("id_deo,naziv_dela").order("id_deo"),
      supabase.from("sop_deo_varijabilni").select("id_deo,naziv_dela").order("id_deo"),
      fetchLinijeZaAnalitikuFilter(),
      modul === "merljive"
        ? supabase.from("karakteristike_merljive").select("id_deo,pozicija").order("pozicija")
        : Promise.resolve({ data: [] }),
    ]).then(([dRes, sRes, linijeRows, kRes]) => {
      if (!alive) return;
      const mapa = new Map();
      [...(dRes.data || []), ...(sRes.data || [])].forEach((d) => {
        if (d?.id_deo) mapa.set(d.id_deo, d);
      });
      setDelovi([...mapa.values()].sort((a, b) => String(a.id_deo).localeCompare(String(b.id_deo))));
      setLinije(linijeRows || []);
      setKarakteristike(kRes?.data || []);
    }).finally(() => {
      if (alive) setLinijeUcitava(false);
    });

    return () => { alive = false; };
  }, [modul]);

  const idDeo = filter?.idDeo ?? "";
  const pozicija = filter?.pozicija ?? "";
  const setPozicija = filter?.setPozicija;

  const pozicijeDeo = idDeo
    ? [...new Set(
      karakteristike
        .filter((k) => k.id_deo === idDeo)
        .map((k) => k.pozicija)
        .filter(Boolean),
    )].sort((a, b) => String(a).localeCompare(String(b)))
    : [];

  useEffect(() => {
    if (!setPozicija) return;
    if (pozicija && idDeo && pozicijeDeo.length && !pozicijeDeo.includes(pozicija)) {
      setPozicija("");
    }
  }, [idDeo, pozicija, pozicijeDeo, setPozicija]);

  if (!filter) return null;

  const {
    period, setPeriod,
    smena, setSmena,
    setIdDeo,
    linija, setLinija,
  } = filter;

  const imaFilter = idDeo || smena || linija || pozicija || period !== "7";

  return (
    <div style={{
      display: "flex",
      flexWrap: inline && !kompakt ? "nowrap" : "wrap",
      gap: kompakt ? 4 : 6,
      alignItems: "center",
      flexShrink: 0,
    }}>
      {!inline && (
        <span style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, flexShrink: 0 }}>FILTER</span>
      )}
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        style={sel(C, period !== "7", kompakt, { minWidth: kompakt ? 76 : 92, maxWidth: kompakt ? 100 : 120 })}
        title="Period"
      >
        <option value="1">Danas</option>
        <option value="7">7 dana</option>
        <option value="30">30 dana</option>
        <option value="90">90 dana</option>
      </select>
      <select
        value={smena}
        onChange={(e) => setSmena(e.target.value)}
        style={sel(C, !!smena, kompakt, { minWidth: kompakt ? 100 : 118, maxWidth: kompakt ? 130 : 148 })}
        title="Smena"
      >
        <option value="">Sve smene</option>
        <option value="1">Smena 1</option>
        <option value="2">Smena 2</option>
        <option value="3">Smena 3</option>
      </select>
      <select
        value={idDeo}
        onChange={(e) => {
          setIdDeo(e.target.value);
          filter.setPozicija("");
        }}
        style={sel(C, !!idDeo, kompakt, { minWidth: kompakt ? 80 : 96, maxWidth: kompakt ? 110 : 130 })}
        title="ID dela"
      >
        <option value="">Svi delovi</option>
        {delovi.map((d) => (
          <option key={d.id_deo} value={d.id_deo}>{d.id_deo}</option>
        ))}
      </select>
      {modul === "merljive" && (
        <select
          value={pozicija}
          onChange={(e) => filter.setPozicija(e.target.value)}
          disabled={!idDeo}
          style={sel(C, !!pozicija, kompakt, {
            minWidth: kompakt ? 88 : 104,
            maxWidth: kompakt ? 130 : 160,
            opacity: idDeo ? 1 : 0.55,
          })}
          title={idDeo ? "Karakteristika (dimenzija)" : "Prvo izaberi deo"}
        >
          <option value="">Sve dimenzije</option>
          {pozicijeDeo.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
      <select
        value={linija}
        onChange={(e) => setLinija(e.target.value)}
        style={sel(C, !!linija, kompakt, { minWidth: kompakt ? 88 : 104, maxWidth: kompakt ? 140 : 180 })}
        title={linijeUcitava ? "Učitavanje linija…" : "Linija"}
      >
        <option value="">Sve linije</option>
        {linije.map((l) => (
          <option key={l.id || l.naziv} value={l.naziv}>{l.naziv}</option>
        ))}
      </select>
      {imaFilter && (
        <button
          type="button"
          onClick={() => {
            setPeriod("7");
            setSmena("");
            setIdDeo("");
            setLinija("");
            filter.setPozicija("");
          }}
          style={{
            background: "none", border: "none", color: C.sivi,
            fontSize: 9, cursor: "pointer", padding: "2px 4px",
          }}
          title="Reset filtera"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Samostalna traka (legacy) — koristi AnalitikaHeader umesto ovoga. */
export default function AnalitikaFilterBar({ C, kompakt }) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      padding: kompakt ? "8px 10px" : "8px 18px",
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <AnalitikaFilterControls C={C} kompakt={kompakt} inline={false} />
    </div>
  );
}
