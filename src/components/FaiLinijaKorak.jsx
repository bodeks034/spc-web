import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { snimiFaiUnos, odobriFai, faiBrojMerenjaIzKolone } from "../lib/faiWorkflow.js";
import { proveriOkNok } from "../lib/varijabilneUtils.js";
import { jeKvalitetIliVise, jeAdmin } from "../lib/uloge.js";

function fmtNominal(k) {
  if (k.nominalDec != null && Number.isFinite(k.nominalDec)) {
    const j = k.jedinica ? ` ${k.jedinica}` : "";
    return `${k.nominalDec}${j}`;
  }
  return "—";
}

function mapKoloneFai(kolone) {
  return (kolone || []).map((k) => {
    const n = faiBrojMerenjaIzKolone(k);
    return {
      pozicija: k.naziv,
      nazivMere: k.nazivMere || "",
      instrument: k.instrument || "",
      faiBrojMerenja: n,
      vrednosti: Array(n).fill(""),
      lsl: k.lslDec,
      usl: k.uslDec,
      lslText: k.lslText,
      uslText: k.uslText,
      nominalText: fmtNominal(k),
      jedinica: k.jedinica,
    };
  });
}

/** Modul 1 — FAI (prvo parče) samo za dimenzije označene u šifrarniku. */
export default function FaiLinijaKorak({
  C, korisnik, idDeo, pogonKod, radniNalog, smena, koloneFai = [],
  onOdobreno, addToast,
}) {
  const [merenja, setMerenja] = useState(() => mapKoloneFai(koloneFai));
  const [komentar, setKomentar] = useState("");
  const [snima, setSnima] = useState(false);
  const [poslednjiId, setPoslednjiId] = useState(null);

  useEffect(() => {
    setMerenja(mapKoloneFai(koloneFai));
    setPoslednjiId(null);
  }, [koloneFai]);

  useEffect(() => {
    if (!koloneFai?.length) onOdobreno?.({ status: "preskoceno" });
  }, [koloneFai, onOdobreno]);

  const mozeOdobri = jeAdmin(korisnik?.uloga) || jeKvalitetIliVise(korisnik?.uloga);
  const ukupnoPolja = merenja.reduce((s, m) => s + m.vrednosti.length, 0);

  const evaluiraj = () => {
    const out = [];
    for (const m of merenja) {
      for (const v of m.vrednosti) {
        if (!String(v).trim()) continue;
        const st = proveriOkNok(v, m.lsl, m.usl, m.jedinica);
        out.push({ pozicija: m.pozicija, vrednost: v, status: st });
      }
    }
    return out;
  };

  const posalji = async (odobri) => {
    const ev = evaluiraj();
    if (!ev.length) {
      addToast?.("Unesite FAI merenja", "greska");
      return;
    }
    if (ev.length < ukupnoPolja) {
      addToast?.(`Unesite sva FAI merenja (${ev.length}/${ukupnoPolja})`, "greska");
      return;
    }
    const imaNok = ev.some((e) => e.status === "NOK");
    if (odobri && imaNok && !mozeOdobri) {
      addToast?.("FAI ima NOK — samo kvalitet može odobriti", "greska");
      return;
    }
    setSnima(true);
    try {
      let rec;
      if (poslednjiId && odobri) {
        rec = await odobriFai(supabase, poslednjiId, korisnik);
      } else {
        rec = await snimiFaiUnos(supabase, {
          idDeo, pogonKod, radniNalog, smena,
          merenja: ev,
          komentar,
          korisnik,
          odobri: odobri && (!imaNok || mozeOdobri),
        });
        setPoslednjiId(rec.id);
      }
      if (rec.status === "odobren") {
        addToast?.("✓ FAI odobren — možete puštati seriju", "uspeh");
        onOdobreno?.(rec);
      } else {
        addToast?.(imaNok ? "FAI sa NOK — čeka kvalitet" : "FAI sačuvan — čeka odobrenje", "info");
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  if (!merenja.length) return null;

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.tekst, fontSize: 14, padding: "10px 12px",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflow: "auto", gap: 12 }}>
      <div style={{ color: C.zuta, fontSize: 12, fontWeight: 700 }}>PRVO PARČE (FAI)</div>
      <div style={{ color: C.sivi, fontSize: 11, lineHeight: 1.5 }}>
        Izmerite <strong>prvo parče</strong> za {idDeo}
        {pogonKod ? ` · pogon ${pogonKod}` : ""}.
        {" "}Dimenzije sa <code style={{ fontSize: 10 }}>nivo_kontrole = DA</code>.
        Broj merenja po dimenziji: kolona <code style={{ fontSize: 10 }}>fai_broj_merenja</code> u šifrarniku
        (prazno = 1, nezavisno od veličine lota).
      </div>

      {merenja.map((m, mi) => {
        const uneta = m.vrednosti.filter((v) => String(v).trim());
        const stPos = uneta.length
          ? uneta.every((v) => proveriOkNok(v, m.lsl, m.usl, m.jedinica) === "OK")
            ? "OK"
            : uneta.some((v) => proveriOkNok(v, m.lsl, m.usl, m.jedinica) === "NOK")
              ? "NOK"
              : null
          : null;
        return (
          <div key={m.pozicija} style={{
            background: C.panel,
            border: `1px solid ${stPos === "NOK" ? C.crvena : stPos === "OK" ? C.zelena : C.border}`,
            borderRadius: 10, padding: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{m.pozicija}</div>
              <span style={{ color: C.sivi, fontSize: 9, flexShrink: 0 }}>
                FAI ×{m.faiBrojMerenja}
              </span>
            </div>
            {m.nazivMere && (
              <div style={{ color: C.sivi, fontSize: 10, marginBottom: 6 }}>{m.nazivMere}</div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              marginBottom: 8,
              fontSize: 10,
            }}>
              <div style={{ background: C.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>NOMINAL</div>
                <div style={{ color: C.tekst, fontWeight: 700 }}>{m.nominalText}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>LSL</div>
                <div style={{ color: C.plava, fontWeight: 700 }}>{m.lslText ?? m.lsl}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>USL</div>
                <div style={{ color: C.plava, fontWeight: 700 }}>{m.uslText ?? m.usl}</div>
              </div>
            </div>
            {m.instrument && m.instrument !== "-" && (
              <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>Instrument: {m.instrument}</div>
            )}
            {m.vrednosti.map((v, vi) => {
              const st = String(v).trim()
                ? proveriOkNok(v, m.lsl, m.usl, m.jedinica)
                : null;
              return (
                <input
                  key={vi}
                  value={v}
                  onChange={(e) => {
                    setMerenja((prev) => {
                      const cp = [...prev];
                      cp[mi] = { ...cp[mi], vrednosti: [...cp[mi].vrednosti] };
                      cp[mi].vrednosti[vi] = e.target.value;
                      return cp;
                    });
                  }}
                  placeholder={`FAI ${vi + 1}/${m.faiBrojMerenja} · ${m.pozicija}`}
                  style={{
                    ...INP,
                    marginBottom: 6,
                    borderColor: st === "NOK" ? C.crvena : st === "OK" ? C.zelena : C.border,
                  }}
                />
              );
            })}
          </div>
        );
      })}

      <textarea value={komentar} onChange={(e) => setKomentar(e.target.value)} placeholder="Komentar FAI…" rows={2}
        style={{ ...INP, resize: "none" }} />

      <button type="button" disabled={snima} onClick={() => posalji(false)}
        style={{ background: C.plava, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, padding: 14, cursor: "pointer" }}>
        {snima ? "Snima…" : "Sačuvaj FAI"}
      </button>
      <button type="button" disabled={snima} onClick={() => posalji(true)}
        style={{ background: C.zelena, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, padding: 14, cursor: "pointer" }}>
        {mozeOdobri ? "Odobri FAI i pušti seriju" : "Pošalji na odobrenje"}
      </button>
    </div>
  );
}
