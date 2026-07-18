import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchIzvestajKupacPodaci } from "../lib/izvestajKupacData.js";
import { preuzmiIzvestajKupacPdf, stampajIzvestajKupac } from "../lib/izvestajKupacPdf.js";
import IzvestajKupacPregled from "./IzvestajKupacPregled.jsx";

/**
 * Zajednički izveštaj za kupca — atributivne i merljive (isti tok kao KupacMerljive).
 */
export default function IzvestajKupacPanel({
  C,
  addToast,
  modul = "atributivne",
  naslov = "IZVEŠTAJ ZA KUPCA",
}) {
  const [kupci, setKupci] = useState([]);
  const [kupac, setKupac] = useState("");
  const [period, setPeriod] = useState("30");
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfRadi, setPdfRadi] = useState(false);
  const [kupciLoading, setKupciLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKupciLoading(true);
      try {
        const [kRes, rnRes] = await Promise.all([
          supabase.from("kupci")
            .select("id,naziv,sifra_kupca,skraceni_naziv")
            .eq("aktivan", true)
            .order("naziv"),
          supabase.from("radni_nalozi").select("kupac").not("kupac", "is", null),
        ]);
        if (cancelled) return;
        if (kRes.error) throw kRes.error;

        const izSifrarnika = (kRes.data || []).map((k) => ({
          id: k.id,
          naziv: String(k.naziv || "").trim(),
          sifra_kupca: String(k.sifra_kupca || "").trim(),
          skraceni_naziv: String(k.skraceni_naziv || "").trim(),
        })).filter((k) => k.naziv);

        const izRn = [...new Set(
          (rnRes.data || [])
            .map((r) => String(r.kupac || "").trim())
            .filter(Boolean),
        )];

        const mapa = new Map();
        for (const k of izSifrarnika) mapa.set(k.naziv.toLowerCase(), k);
        for (const naziv of izRn) {
          const kljuc = naziv.toLowerCase();
          if (!mapa.has(kljuc)) mapa.set(kljuc, { id: `rn-${kljuc}`, naziv });
        }

        setKupci([...mapa.values()].sort((a, b) => a.naziv.localeCompare(b.naziv, "sr")));
      } catch (e) {
        if (!cancelled) {
          addToast?.(e.message || "Greška pri učitavanju kupaca", "greska");
          setKupci([]);
        }
      } finally {
        if (!cancelled) setKupciLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [addToast]);

  useEffect(() => {
    setPodaci(null);
  }, [kupac, period]);

  const ucitaj = async () => {
    if (!kupac) return;
    setLoading(true);
    setPodaci(null);
    try {
      const data = await fetchIzvestajKupacPodaci(supabase, { kupac, period, modul });
      setPodaci(data);
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setLoading(false);
    }
  };

  const pdfOpts = () => ({ kupac, period, modul });

  const exportPDF = async () => {
    if (!podaci) return;
    setPdfRadi(true);
    try {
      await preuzmiIzvestajKupacPdf(podaci, pdfOpts());
      addToast?.("✓ PDF izveštaj za kupca", "uspeh");
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setPdfRadi(false);
    }
  };

  const stampaj = async () => {
    if (!podaci) return;
    try {
      await stampajIzvestajKupac(podaci, pdfOpts());
    } catch (e) {
      addToast(e.message, "greska");
    }
  };

  const INP_S = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 13, padding: "10px 12px", outline: "none", fontFamily: "inherit",
  };

  const BTN_PDF = {
    background: "#7c3aed", border: "none", borderRadius: 8, color: C.onAkcent,
    fontSize: 12, fontWeight: 700, padding: "11px 14px", cursor: "pointer",
  };

  return (
    <div style={{
      padding: 18,
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      boxSizing: "border-box",
    }}>
      <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{naslov}</div>
      {!kupciLoading && !kupci.length && (
        <div style={{
          background: `${C.narandzasta}18`,
          border: `1px solid ${C.narandzasta}55`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 14,
          fontSize: 11,
          color: C.tekst,
          lineHeight: 1.55,
        }}>
          <strong>Nema definisanih kupaca.</strong> Dodajte ih u{" "}
          <strong>Modul 0 — Šifrarnik → Osnovno → Kupci</strong> (dugme „+ Kupac“),
          ili unesite kupca na <strong>radnom nalogu</strong> (Atributivne/Merljive → Nalozi).
          ERP uvoz: <code>kupci.csv</code> u Šifrarnik → ERP uvoz.
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 5 }}>KUPAC</div>
          <select value={kupac} onChange={(e) => setKupac(e.target.value)}
            disabled={kupciLoading}
            style={{ ...INP_S, width: "100%", cursor: "pointer" }}>
            <option value="">{kupciLoading ? "Učitavanje…" : "— Izaberi —"}</option>
            {kupci.map((k) => (
              <option key={k.id} value={k.naziv}>
                {k.sifra_kupca ? `${k.sifra_kupca} — ${k.naziv}` : k.naziv}
                {k.skraceni_naziv ? ` (${k.skraceni_naziv})` : ""}
              </option>
            ))}
          </select>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...INP_S, cursor: "pointer" }}>
          <option value="7">7 dana</option>
          <option value="30">30 dana</option>
          <option value="90">90 dana</option>
          <option value="365">Godišnji</option>
        </select>
        <button type="button" onClick={ucitaj} disabled={!kupac || loading}
          style={{
            background: !kupac ? C.hover : C.plava, border: "none", borderRadius: 8,
            color: C.onAkcent, fontSize: 12, fontWeight: 700, padding: "11px 18px", cursor: "pointer",
          }}>
          {loading ? "…" : "Generiši"}
        </button>
        {podaci && (
          <>
            <button type="button" onClick={exportPDF} disabled={pdfRadi} style={BTN_PDF}>
              {pdfRadi ? "…" : "📄 PDF"}
            </button>
            <button type="button" onClick={stampaj} style={{ ...BTN_PDF, background: C.zelena }}>
              🖨 Štampaj
            </button>
          </>
        )}
      </div>
      <IzvestajKupacPregled podaci={podaci} C={C} modul={modul} />
    </div>
  );
}
