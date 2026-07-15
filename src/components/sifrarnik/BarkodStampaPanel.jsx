import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchDelovi, upsertBarkodProfil,
} from "../../lib/sifrarnikApi.js";
import {
  BARKOD_FORMATI, TIPOVI_KODA, ETIKETA_DIMENZIJE, dimenzijaPoId,
  buildSadrzajBarkoda, generisiEtiketaSlike, etiketaHtmlBlok, stampajEtikete,
} from "../../lib/barkodEtiketa.js";
import { useEkran } from "../../layout/useEkran.js";

export default function BarkodStampaPanel({ C, addToast, pocetniDeo }) {
  const { linijaUredjaj } = useEkran();
  const [delovi, setDelovi] = useState([]);
  const [idDeo, setIdDeo] = useState(pocetniDeo?.id_deo || "");
  const [deo, setDeo] = useState(pocetniDeo || null);
  const [format, setFormat] = useState("id");
  const [tipKoda, setTipKoda] = useState("oba");
  const [radniNalog, setRadniNalog] = useState("");
  const [smena, setSmena] = useState("1");
  const [kolicina, setKolicina] = useState(1);
  const [dimenzijaId, setDimenzijaId] = useState("standard");
  const [customSirinaMm, setCustomSirinaMm] = useState("90");
  const [preview, setPreview] = useState(null);
  const [generise, setGenerise] = useState(false);
  const [stampanje, setStampanje] = useState(false);

  const ucitajDelove = useCallback(async () => {
    try {
      const d = await fetchDelovi({ samoAktivni: true });
      setDelovi(d);
      if (pocetniDeo?.id_deo) {
        const match = d.find((x) => x.id_deo === pocetniDeo.id_deo) || pocetniDeo;
        setDeo(match);
        setIdDeo(match.id_deo);
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  }, [addToast, pocetniDeo]);

  useEffect(() => { ucitajDelove(); }, [ucitajDelove]);

  useEffect(() => {
    if (pocetniDeo?.id_deo) {
      setDeo(pocetniDeo);
      setIdDeo(pocetniDeo.id_deo);
    }
  }, [pocetniDeo]);

  const sadrzaj = buildSadrzajBarkoda({
    idDeo,
    format,
    radniNalog,
    smena: smena ? Number(smena) : 1,
  });

  const dim = useMemo(
    () => dimenzijaPoId(dimenzijaId, customSirinaMm),
    [dimenzijaId, customSirinaMm],
  );

  const osveziPregled = useCallback(async () => {
    if (!idDeo || !sadrzaj) {
      setPreview(null);
      return;
    }
    setGenerise(true);
    try {
      const slike = await generisiEtiketaSlike({
        sadrzaj, tipKoda, dimenzijaId, customSirinaMm,
      });
      setPreview({ ...slike, sadrzaj, dim: slike.dim || dim });
    } catch (e) {
      addToast?.(e.message, "greska");
      setPreview(null);
    } finally {
      setGenerise(false);
    }
  }, [idDeo, sadrzaj, tipKoda, dimenzijaId, customSirinaMm, addToast]);

  useEffect(() => {
    const t = setTimeout(osveziPregled, 300);
    return () => clearTimeout(t);
  }, [osveziPregled]);

  const izaberiDeo = (val) => {
    setIdDeo(val);
    setDeo(delovi.find((d) => d.id_deo === val) || null);
  };

  const sacuvajProfil = async () => {
    if (!idDeo) return;
    try {
      await upsertBarkodProfil({
        id_deo: idDeo,
        format,
        radni_nalog: radniNalog,
        tip_koda: tipKoda,
        sadrzaj_barkoda: sadrzaj,
      }, deo || {});
      addToast?.("✓ Barkod profil sačuvan", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const stampaj = async () => {
    if (!idDeo || !sadrzaj) {
      addToast?.("Izaberite deo i format", "greska");
      return;
    }
    setStampanje(true);
    try {
      const slike = await generisiEtiketaSlike({
        sadrzaj, tipKoda, dimenzijaId, customSirinaMm,
      });
      const printDim = slike.dim || dim;
      const blok = etiketaHtmlBlok({
        idDeo,
        naziv: deo?.naziv_dela,
        tipKontrole: deo?.tip_kontrole || "deo",
        sadrzaj,
        opis: BARKOD_FORMATI.find((f) => f.id === format)?.naziv || format,
        qrUrl: slike.qrUrl,
        codeUrl: slike.codeUrl,
        dim: printDim,
      });
      const n = Math.max(1, Math.min(50, Number(kolicina) || 1));
      stampajEtikete(Array(n).fill(blok), `Barkod — ${idDeo}`, { dim: printDim });
      addToast?.(`Štampa ${n} etiketa · ${printDim.sirinaMm} mm`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setStampanje(false);
    }
  };

  const deloviVozilo = useMemo(
    () => delovi.filter((d) => d.tip_kontrole === "vozilo"),
    [delovi],
  );
  const deloviObicni = useMemo(
    () => delovi.filter((d) => d.tip_kontrole !== "vozilo"),
    [delovi],
  );

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: linijaUredjaj ? "1fr" : "1fr 1fr",
      gap: 16,
      alignItems: "start",
    }}>
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>DELO ({delovi.length} aktivnih)</span>
            <select value={idDeo} onChange={(e) => izaberiDeo(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
              <option value="">— izaberite —</option>
              {deloviVozilo.length > 0 && (
                <optgroup label="Celo vozilo">
                  {deloviVozilo.map((d) => (
                    <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela || d.id_deo}</option>
                  ))}
                </optgroup>
              )}
              {deloviObicni.length > 0 && (
                <optgroup label="Delovi">
                  {deloviObicni.map((d) => (
                    <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela || d.id_deo}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>FORMAT SADRŽAJA</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
              {BARKOD_FORMATI.map((f) => (
                <option key={f.id} value={f.id}>{f.naziv} — {f.opis}</option>
              ))}
            </select>
          </label>

          {(format === "id_rn" || format === "puna") && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>RADNI NALOG</span>
              <input value={radniNalog} onChange={(e) => setRadniNalog(e.target.value)} placeholder="RN-2024-015" style={INP} />
            </label>
          )}

          {format === "puna" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>SMENA</span>
              <input value={smena} onChange={(e) => setSmena(e.target.value)} type="number" min={1} max={3} style={INP} />
            </label>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>TIP KODA</span>
            <select value={tipKoda} onChange={(e) => setTipKoda(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
              {TIPOVI_KODA.map((t) => (
                <option key={t.id} value={t.id}>{t.naziv}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>DIMENZIJA ETIKETE</span>
            <select value={dimenzijaId} onChange={(e) => setDimenzijaId(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
              {ETIKETA_DIMENZIJE.map((d) => (
                <option key={d.id} value={d.id}>{d.naziv}</option>
              ))}
            </select>
          </label>

          {dimenzijaId === "custom" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>ŠIRINA ETIKETE (mm)</span>
              <input
                value={customSirinaMm}
                onChange={(e) => setCustomSirinaMm(e.target.value)}
                type="number"
                min={35}
                max={120}
                step={1}
                placeholder="90"
                style={INP}
              />
            </label>
          )}

          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "6px 10px", fontSize: 9, color: C.sivi,
          }}>
            Štampa: <strong style={{ color: C.tekst }}>{dim.sirinaMm} mm</strong>
            {dimenzijaId !== "standard" && " · prilagođeni QR i barkod"}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>BROJ ETIKETA</span>
            <input value={kolicina} onChange={(e) => setKolicina(e.target.value)} type="number" min={1} max={50} style={INP} />
          </label>

          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "8px 10px", fontSize: 10, wordBreak: "break-all",
          }}>
            <span style={{ color: C.sivi }}>Sadržaj: </span>
            <code style={{ color: C.plava }}>{sadrzaj || "—"}</code>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={stampanje || !idDeo} onClick={stampaj}
              style={{
                background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
                fontSize: 11, fontWeight: 700, padding: "9px 16px", cursor: "pointer",
                opacity: stampanje || !idDeo ? 0.6 : 1,
              }}>
              {stampanje ? "…" : "Štampaj"}
            </button>
            <button type="button" disabled={!idDeo} onClick={sacuvajProfil}
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.tekst, fontSize: 11, padding: "9px 14px", cursor: "pointer",
              }}>
              Sačuvaj profil
            </button>
          </div>
        </div>
      </div>

      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 16, minHeight: 200, textAlign: "center",
      }}>
        <div style={{ color: C.sivi, fontSize: 9, marginBottom: 12 }}>
          PREGLED ETIKETE · {preview?.dim?.sirinaMm || dim.sirinaMm} mm
        </div>
        {!idDeo ? (
          <div style={{ color: C.border, fontSize: 11 }}>Izaberite deo</div>
        ) : generise ? (
          <div style={{ color: C.sivi, fontSize: 11 }}>Generišem…</div>
        ) : preview ? (
          <div style={{
            display: "inline-block",
            maxWidth: "100%",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: Math.max(6, Math.round((preview.dim?.paddingMm || 8) * 0.85)),
            background: C.onAkcent,
            width: `${Math.min(preview.dim?.sirinaMm || dim.sirinaMm, 100)}mm`,
            margin: "0 auto",
            textAlign: "left",
          }}>
            <div style={{ fontWeight: 700, fontSize: preview.dim?.fontId || 14, marginBottom: 2, color: "#111" }}>{idDeo}</div>
            <div style={{ fontSize: preview.dim?.fontNaziv || 10, color: "#555", marginBottom: 10 }}>{deo?.naziv_dela}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {preview.qrUrl && (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={preview.qrUrl}
                    alt="QR"
                    style={{ maxWidth: `${preview.dim?.qrImgMaxMm || 38}mm`, width: "100%", height: "auto" }}
                  />
                  <div style={{ fontSize: 8, color: C.sivi }}>QR</div>
                </div>
              )}
              {preview.codeUrl && (
                <div style={{ textAlign: "center", flex: "1 1 100%" }}>
                  <img
                    src={preview.codeUrl}
                    alt="Code128"
                    style={{ maxWidth: `${preview.dim?.codeImgMaxMm || 80}mm`, width: "100%", height: "auto" }}
                  />
                  <div style={{ fontSize: 8, color: C.sivi }}>Code 128</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 9, color: C.sivi, marginTop: 8, wordBreak: "break-all" }}>
              {preview.sadrzaj}
            </div>
          </div>
        ) : (
          <div style={{ color: C.border, fontSize: 11 }}>Nema pregleda</div>
        )}
      </div>
    </div>
  );
}
