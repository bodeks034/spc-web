import { useCallback, useEffect, useMemo, useState } from "react";
import {
  UPUTSTVO_KATEGORIJE,
  dokumentiZaUlogu,
  obukaPaketDokumenti,
} from "../lib/uputstvoKatalog.js";
import {
  ucitajUputstvoDokument,
  otvoriZaStampu,
  pdfIzUputstvaDokumenata,
  spojiZaStampu,
} from "../lib/uputstvoRender.js";

export default function UputstvoHub({ C, korisnik, onZatvori }) {
  const dostupni = useMemo(
    () => dokumentiZaUlogu(korisnik?.uloga),
    [korisnik?.uloga],
  );
  const [kategorija, setKategorija] = useState("obuka-operater");
  const [izabraniId, setIzabraniId] = useState(null);
  const [oznaceni, setOznaceni] = useState(() => new Set());
  const [pregled, setPregled] = useState(null);
  const [greska, setGreska] = useState("");
  const [ucitava, setUcitava] = useState(false);
  const [pdfRadi, setPdfRadi] = useState(false);

  const uKategoriji = useMemo(
    () => dostupni.filter((d) => d.kategorija === kategorija),
    [dostupni, kategorija],
  );

  const vidljiveKategorije = useMemo(
    () => UPUTSTVO_KATEGORIJE.filter((k) => dostupni.some((d) => d.kategorija === k.id)),
    [dostupni],
  );

  useEffect(() => {
    if (!vidljiveKategorije.length) return;
    if (!vidljiveKategorije.some((k) => k.id === kategorija)) {
      setKategorija(vidljiveKategorije[0].id);
    }
  }, [vidljiveKategorije, kategorija]);

  useEffect(() => {
    const prvi = uKategoriji[0];
    if (prvi && !izabraniId) setIzabraniId(prvi.id);
    if (prvi && izabraniId && !uKategoriji.some((d) => d.id === izabraniId)) {
      setIzabraniId(prvi.id);
    }
  }, [uKategoriji, izabraniId]);

  const aktivni = dostupni.find((d) => d.id === izabraniId) || null;

  const ucitajPregled = useCallback(async (doc) => {
    if (!doc) return;
    setUcitava(true);
    setGreska("");
    try {
      const p = await ucitajUputstvoDokument(doc);
      setPregled(p);
    } catch (e) {
      setGreska(e.message || String(e));
      setPregled(null);
    } finally {
      setUcitava(false);
    }
  }, []);

  useEffect(() => {
    if (aktivni) ucitajPregled(aktivni);
  }, [aktivni, ucitajPregled]);

  const toggleOznaka = (id) => {
    setOznaceni((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const oznaciObukaPaket = () => {
    const ids = obukaPaketDokumenti(korisnik?.uloga).map((d) => d.id);
    setOznaceni(new Set(ids));
  };

  const izabraniDocs = dostupni.filter((d) => oznaceni.has(d.id));

  const stampaj = () => {
    if (!pregled || !aktivni) return;
    otvoriZaStampu(pregled.html, aktivni.naslov);
  };

  const stampajIzabrano = async () => {
    if (!izabraniDocs.length) return;
    setPdfRadi(true);
    setGreska("");
    try {
      const ucitano = [];
      for (const d of izabraniDocs) {
        const p = await ucitajUputstvoDokument(d);
        ucitano.push({ ...p, naslov: d.naslov, id: d.id });
      }
      if (ucitano.length === 1) {
        otvoriZaStampu(ucitano[0].html, ucitano[0].naslov);
        return;
      }
      const samoHtml = ucitano.every((u) => u.tip === "html");
      if (samoHtml) {
        await pdfIzUputstvaDokumenata(izabraniDocs);
        return;
      }
      otvoriZaStampu(
        spojiZaStampu(ucitano),
        `Obuka — ${ucitano.length} dok.`,
      );
    } catch (e) {
      setGreska(e.message || String(e));
    } finally {
      setPdfRadi(false);
    }
  };

  /** PDF uvek za trenutno otvoreni dokument (ne za čekiran paket). */
  const preuzmiPdf = async () => {
    if (!aktivni) return;
    setPdfRadi(true);
    setGreska("");
    try {
      await pdfIzUputstvaDokumenata([aktivni]);
    } catch (e) {
      setGreska(e.message || String(e));
    } finally {
      setPdfRadi(false);
    }
  };

  const pdfIzabrano = async () => {
    if (!izabraniDocs.length) return;
    setPdfRadi(true);
    setGreska("");
    try {
      await pdfIzUputstvaDokumenata(izabraniDocs);
    } catch (e) {
      setGreska(e.message || String(e));
    } finally {
      setPdfRadi(false);
    }
  };

  const otvoriUNovom = () => {
    if (!aktivni) return;
    window.open(aktivni.fajl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Uputstvo"
      data-testid="uputstvo-hub"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        padding: 12, boxSizing: "border-box",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onZatvori?.(); }}
    >
      <div style={{
        background: C.bg, color: C.tekst,
        border: `1px solid ${C.border}`, borderRadius: 12,
        width: "100%", maxWidth: 1200, maxHeight: "100%",
        display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: `1px solid ${C.border}`, gap: 8, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>📘 Uputstvo i obuka</div>
            <div style={{ color: C.sivi, fontSize: 10, marginTop: 2 }}>
              Pregled materijala · štampa · PDF
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn C={C} onClick={oznaciObukaPaket} sekundarno>Obuka paket</Btn>
            <Btn C={C} onClick={stampaj} disabled={!pregled || pdfRadi} zeleni title="Štampa otvoreni dokument">
              Štampaj
            </Btn>
            <Btn C={C} onClick={preuzmiPdf} disabled={!aktivni || pdfRadi} zeleni title="PDF otvorenog dokumenta">
              {pdfRadi ? "PDF…" : "PDF"}
            </Btn>
            <Btn
              C={C}
              onClick={stampajIzabrano}
              disabled={!izabraniDocs.length || pdfRadi}
              sekundarno
              title="Štampa / PDF svih čekiranih"
            >
              Štampaj izabrano ({izabraniDocs.length})
            </Btn>
            <Btn
              C={C}
              onClick={pdfIzabrano}
              disabled={!izabraniDocs.length || pdfRadi}
              sekundarno
              title="PDF svih čekiranih dokumenata"
            >
              PDF izabrano
            </Btn>
            <Btn C={C} onClick={onZatvori}>Zatvori</Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, flex: 1, minHeight: 0 }}>
          <aside style={{
            width: 280, flexShrink: 0, borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", minHeight: 0,
          }}>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 4, padding: 8,
              borderBottom: `1px solid ${C.border}`,
            }}>
              {vidljiveKategorije.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKategorija(k.id)}
                  style={{
                    fontSize: 9, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                    border: `1px solid ${kategorija === k.id ? C.plava : C.border}`,
                    background: kategorija === k.id ? `${C.plava}22` : C.panel,
                    color: kategorija === k.id ? C.tekst : C.sivi,
                  }}
                >
                  {k.ikon} {k.naziv.split("—")[0].trim()}
                </button>
              ))}
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: 8 }}>
              {uKategoriji.map((d) => {
                const akt = d.id === izabraniId;
                const oz = oznaceni.has(d.id);
                return (
                  <div
                    key={d.id}
                    style={{
                      marginBottom: 6, padding: 8, borderRadius: 8,
                      border: `1px solid ${akt ? C.plava : C.border}`,
                      background: akt ? `${C.plava}15` : C.panel,
                    }}
                  >
                    <label style={{ display: "flex", gap: 6, alignItems: "flex-start", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={oz}
                        onChange={() => toggleOznaka(d.id)}
                        style={{ marginTop: 3 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => setIzabraniId(d.id)}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{d.naslov}</div>
                        <div style={{ fontSize: 9, color: C.sivi, marginTop: 2 }}>{d.opis}</div>
                        {d.obukaPaket && (
                          <span style={{
                            fontSize: 8, color: C.zuta, marginTop: 4, display: "inline-block",
                          }}>obuka paket</span>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
              {!uKategoriji.length && (
                <div style={{ color: C.sivi, fontSize: 10 }}>Nema dokumenata za vašu ulogu.</div>
              )}
            </div>
          </aside>

          <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            {aktivni && (
              <div style={{
                padding: "8px 12px", borderBottom: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{aktivni.naslov}</div>
                <Btn C={C} sekundarno onClick={otvoriUNovom}>Otvori fajl</Btn>
              </div>
            )}
            {greska && (
              <div style={{ padding: 12, color: C.crvena, fontSize: 11 }}>{greska}</div>
            )}
            {ucitava && (
              <div style={{ padding: 24, color: C.sivi, fontSize: 11 }}>Učitavam…</div>
            )}
            {!ucitava && pregled && aktivni?.tip === "html" && (
              <iframe
                title={aktivni.naslov}
                src={aktivni.fajl}
                style={{ flex: 1, border: "none", background: "#fff", minHeight: 320 }}
              />
            )}
            {!ucitava && pregled && aktivni?.tip === "markdown" && (
              <div
                style={{
                  flex: 1, overflowY: "auto", padding: 16,
                  background: "#d0d0d0", minHeight: 0,
                }}
              >
                <div
                  className="uputstvo-pregled list-beli"
                  style={{
                    background: "#fff", color: "#111",
                    fontFamily: "'Segoe UI', sans-serif", fontSize: 13, lineHeight: 1.5,
                    maxWidth: 820, margin: "0 auto",
                    padding: "28px 32px",
                    border: "1px solid #ccc",
                    boxShadow: "0 1px 6px rgba(0,0,0,.12)",
                    minHeight: "100%",
                    boxSizing: "border-box",
                  }}
                  dangerouslySetInnerHTML={{ __html: pregled.html }}
                />
              </div>
            )}
          </main>
        </div>

        <style>{`
          .uputstvo-pregled h1 { font-size: 1.35rem; margin: 0 0 0.75rem; color: #000; border-bottom: 1.5px solid #222; padding-bottom: 6px; }
          .uputstvo-pregled h2 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #000; border-bottom: 1px solid #222; padding-bottom: 3px; }
          .uputstvo-pregled h3 { font-size: 1rem; margin: 0.75rem 0 0.35rem; color: #000; }
          .uputstvo-pregled p { margin: 0.4rem 0; }
          .uputstvo-pregled ul, .uputstvo-pregled ol { margin: 0.4rem 0 0.4rem 1.2rem; }
          .uputstvo-pregled code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
          .uputstvo-pregled pre { background: #f5f5f5; padding: 8px; overflow: auto; border: 1px solid #ccc; }
          .uputstvo-pregled blockquote { border-left: 3px solid #333; margin: 0.5rem 0; padding-left: 10px; color: #333; }
          .uputstvo-pregled a { color: #0c5c8a; }
          .uputstvo-pregled table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 12px; background: #fff; }
          .uputstvo-pregled th, .uputstvo-pregled td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; background: #fff; }
          .uputstvo-pregled th { background: #e8f2ec; font-weight: 700; }
          @media print {
            @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
            body { background: #fff !important; }
            .uputstvo-hub-chrome { display: none !important; }
            .uputstvo-pregled.list-beli {
              box-shadow: none !important;
              border: none !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function Btn({ C, children, onClick, disabled, primarno, sekundarno, zeleni, title }) {
  const bg = zeleni
    ? (C.zelena || "#1a6b3c")
    : primarno
      ? `${C.plava}33`
      : sekundarno
        ? C.hover
        : C.panel;
  const border = zeleni
    ? (C.zelena || "#1a6b3c")
    : primarno
      ? C.plava
      : C.border;
  const color = zeleni ? (C.onAkcent || "#fff") : C.tekst;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontSize: 10, padding: "6px 10px", borderRadius: 6, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontWeight: (primarno || zeleni) ? 700 : 400,
      }}
    >
      {children}
    </button>
  );
}
