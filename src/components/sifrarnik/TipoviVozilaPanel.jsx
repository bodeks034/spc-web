import { useState, useEffect, useCallback } from "react";
import { fetchTipoviVozila, upsertTipVozila } from "../../lib/sifrarnikApi.js";
import { resetTipoviVozilaCache } from "../../lib/useVoziloDijagramSrc.js";
import { FormGrid } from "./LinijePanel.jsx";

const PRAZAN = {
  kod: "", naziv: "", prefiks_id_deo: "", slika_sop: "", dijagram_src: "", napomena: "", aktivan: true,
};

const VOZILO_FIELD_META = {
  slika_sop: { type: "slika", modul: "atributivne", idKey: "kod", voziloSop: true },
  dijagram_src: { type: "slika", modul: "atributivne", idKey: "kod", voziloDijagram: true },
};

export default function TipoviVozilaPanel({ C, addToast, voziloKod, onIzaberiVozilo }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setLista(await fetchTipoviVozila());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.kod?.trim()) {
      addToast?.("Kod tipa vozila je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertTipVozila(forma);
      resetTipoviVozilaCache();
      addToast?.("✓ Tip vozila sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const fieldMeta = {
    ...VOZILO_FIELD_META,
    ...(forma?._postojeci ? { kod: { readOnly: true } } : {}),
  };

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: C.tekst }}>Dijagram za unos</strong> — silueta sa zonama K/M/T (PNG bez krugova).
        Uvezi sliku ili upiši putanju npr. <code>/vozilo/dijagrami/MRAP.png</code>.
        {" "}SOP crtež ide u Storage <code>atributivne/</code> (posebno polje).
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: C.sivi, fontSize: 10 }}>{lista.length} tipova vozila</span>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{
            background: C.zelena, border: "none", borderRadius: 6, color: "#fff",
            fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
          }}>
          + Novi tip
        </button>
      </div>

      {forma && (
        <FormGrid
          C={C}
          cols={2}
          forma={forma}
          setForma={setForma}
          fields={[
            ["Kod *", "kod"],
            ["Naziv *", "naziv"],
            ["Prefiks ID dela", "prefiks_id_deo"],
            ["Dijagram (silueta)", "dijagram_src"],
            ["SOP crtež", "slika_sop"],
            ["Napomena", "napomena"],
          ]}
          fieldMeta={fieldMeta}
          addToast={addToast}
          onSave={snimi}
          onCancel={() => setForma(null)}
          snima={snima}
        />
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr 64px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span>KOD</span><span>NAZIV</span><span>DIJAGRAM</span><span>SOP</span><span />
          </div>
          {lista.map((t, i) => (
            <div key={t.kod} style={{
              display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr 64px",
              padding: "9px 10px", borderTop: i ? `1px solid ${C.border}` : "none",
              fontSize: 11, gap: 8, alignItems: "center",
              background: voziloKod === t.kod ? `${C.plava}12` : "transparent",
            }}>
              <span style={{ fontWeight: 700, color: C.plava }}>{t.kod}</span>
              <span>{t.naziv}</span>
              <span style={{ color: C.sivi, fontSize: 9 }} title={t.dijagram_src || ""}>
                {t.dijagram_src ? (t.dijagram_src.length > 28 ? `${t.dijagram_src.slice(0, 26)}…` : t.dijagram_src) : "—"}
              </span>
              <span style={{ color: C.sivi, fontSize: 9 }}>{t.slika_sop || "—"}</span>
              <button type="button" onClick={() => { onIzaberiVozilo?.(t.kod); setForma({ ...t, _postojeci: true }); }}
                style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "4px 6px", cursor: "pointer", color: C.tekst }}>
                Izmeni
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
