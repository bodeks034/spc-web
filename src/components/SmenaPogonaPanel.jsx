import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchSmenaPogonaPregled, dIsoSmena, imaSadrzajPredajeSmene } from "../lib/smenaPogonaPregled.js";
import { bojaFpyKpi } from "../lib/sefSmenaDashboard.js";
import { generisiPredajaSmenePdfPogon, generisiPredajaSmenePdf } from "../lib/predajaSmenePdf.js";
import { LAB_FPY_PCT } from "../lib/rtyFpy.js";
import { loadQueueAsync, queueCounts } from "../lib/offlineQueue.js";

function StatKolona({ C, naslov, stat, istaknuto, bojaNaslov }) {
  const fpyBoja = bojaFpyKpi(stat?.fpy, C);
  return (
    <div
      data-testid={`smena-kolona-${naslov.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        flex: "1 1 140px",
        background: istaknuto ? `${C.plava || C.zuta}12` : C.bg,
        border: `1px solid ${istaknuto ? (C.plava || C.zuta) + "55" : C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        minWidth: 130,
      }}
    >
      <div style={{
        color: bojaNaslov || C.sivi,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1,
        marginBottom: 8,
      }}>
        {naslov}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 8 }}>UZORCI</div>
          <div style={{ color: C.tekst, fontWeight: 700, fontSize: 16 }}>{stat?.n ?? 0}</div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 8 }}>{LAB_FPY_PCT}</div>
          <div style={{ color: fpyBoja, fontWeight: 700, fontSize: 16 }}>
            {stat?.fpy != null ? `${stat.fpy}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 8 }}>OK</div>
          <div style={{ color: C.zelena, fontWeight: 700 }}>{stat?.ok ?? 0}</div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 8 }}>NOK</div>
          <div style={{ color: C.crvena, fontWeight: 700 }}>{stat?.nok ?? 0}</div>
        </div>
      </div>
      {(stat?.dpmo > 0) && (
        <div style={{ color: C.sivi, fontSize: 8, marginTop: 6 }}>
          DPMO: {stat.dpmo.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function TabelaPoPogonima({ C, redovi }) {
  if (!redovi?.length) return null;
  return (
    <div
      data-testid="smena-po-pogonima"
      style={{
        marginBottom: 12,
        overflowX: "auto",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
        <thead>
          <tr style={{ background: C.bg, color: C.sivi, textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Pogon</th>
            <th style={{ padding: "6px 8px" }}>Atributivne</th>
            <th style={{ padding: "6px 8px" }}>Merljive</th>
            <th style={{ padding: "6px 8px" }}>Ukupno FPY</th>
          </tr>
        </thead>
        <tbody>
          {redovi.map((p) => (
            <tr key={p.pogon} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: "6px 8px", color: C.tekst, fontWeight: 700 }}>{p.label}</td>
              <td style={{ padding: "6px 8px", color: C.tekst }}>
                {p.attr?.n ? `${p.attr.n} · ${p.attr.fpy}%` : "—"}
              </td>
              <td style={{ padding: "6px 8px", color: C.tekst }}>
                {p.merljive?.n ? `${p.merljive.n} · ${p.merljive.fpy}%` : "—"}
              </td>
              <td style={{ padding: "6px 8px", color: bojaFpyKpi(p.ukupno?.fpy, C), fontWeight: 700 }}>
                {p.ukupno?.fpy != null ? `${p.ukupno.fpy}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SmenaPogonaPanel({
  C,
  korisnik,
  addToast,
  smena: smenaProp,
  datum: datumProp,
  linija = "",
  kompaktan = false,
  modulKontekst = null,
  prikaziModulPdf = false,
  onSmenaChange,
}) {
  const [smena, setSmena] = useState(() => Number(smenaProp) || 1);
  const [datum, setDatum] = useState(() => datumProp || dIsoSmena());
  const [pogonKod, setPogonKod] = useState("");
  const [napomena, setNapomena] = useState("");
  const [pod, setPod] = useState(null);
  const [offlineInfo, setOfflineInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (smenaProp != null) setSmena(Number(smenaProp) || 1);
  }, [smenaProp]);

  useEffect(() => {
    if (datumProp) setDatum(datumProp);
  }, [datumProp]);

  useEffect(() => {
    loadQueueAsync().then((q) => setOfflineInfo(queueCounts(q))).catch(() => setOfflineInfo(null));
  }, []);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSmenaPogonaPregled(supabase, {
        datum,
        smena,
        linija: linija || undefined,
        pogonKod: pogonKod || undefined,
      });
      setPod(data);
    } catch (e) {
      console.error("fetchSmenaPogonaPregled", e);
      setPod(null);
      addToast?.("Greška učitavanja pregleda smene", "greska");
    } finally {
      setLoading(false);
    }
  }, [datum, smena, linija, pogonKod, addToast]);

  useEffect(() => { osvezi(); }, [osvezi]);

  const promeniSmenu = (s) => {
    setSmena(s);
    onSmenaChange?.(s);
  };

  const pdfOpts = () => ({
    korisnik,
    smena,
    datum,
    linija: linija || null,
    pogonKod: pogonKod || null,
    napomena,
    offlineInfo,
    addToast: addToast || ((msg, tip) => console[tip === "greska" ? "error" : "log"](msg)),
  });

  const mozePdf = imaSadrzajPredajeSmene(pod, { napomena, offlineInfo });

  const handlePdfPogon = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await generisiPredajaSmenePdfPogon(supabase, pdfOpts());
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePdfModul = async (modul) => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await generisiPredajaSmenePdf(supabase, { ...pdfOpts(), modul });
    } finally {
      setPdfBusy(false);
    }
  };

  const inp = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 10,
    padding: "6px 8px",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      data-testid="smena-pogona-panel"
      style={{
        background: kompaktan ? "transparent" : C.panel,
        border: kompaktan ? "none" : `1px solid ${C.border}`,
        borderRadius: kompaktan ? 0 : 12,
        padding: kompaktan ? 0 : 14,
        marginBottom: kompaktan ? 10 : 0,
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10,
      }}>
        <div>
          <div style={{ color: C.tekst, fontSize: kompaktan ? 10 : 12, fontWeight: 700 }}>
            {kompaktan ? "SMENA — ceo pogon" : "PREGLED SMENE — ceo pogon"}
          </div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
            {datum} · smena {smena}
            {pogonKod ? ` · pogon ${pogonKod}` : " · svi pogoni"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            data-testid="smena-pogon-filter"
            value={pogonKod}
            onChange={(e) => setPogonKod(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 140, cursor: "pointer" }}
            title="Pogon = faza proizvodnje (A ulazna, B preseraj, C karoserija…)"
          >
            <option value="">Svi pogoni</option>
            {(pod?.listaPogona || []).map((p) => (
              <option key={p.kod} value={p.kod}>{p.label}</option>
            ))}
          </select>
          <input
            type="date"
            data-testid="smena-datum"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={{ ...inp, width: "auto" }}
          />
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`smena-btn-${s}`}
              onClick={() => promeniSmenu(s)}
              style={{
                background: smena === s ? C.plava : C.hover,
                border: `1px solid ${smena === s ? C.plava : C.border}`,
                borderRadius: 6,
                color: smena === s ? C.onAkcent : C.sivi,
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              S{s}
            </button>
          ))}
          <button
            type="button"
            onClick={osvezi}
            disabled={loading}
            data-testid="smena-osvezi"
            style={{
              background: C.hover,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              fontSize: 10,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {loading && !pod ? (
        <div style={{ color: C.sivi, fontSize: 11, padding: "8px 0" }}>Učitavanje pregleda smene…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <StatKolona C={C} naslov="UKUPNO" stat={pod?.ukupno} istaknuto bojaNaslov={C.plava} />
            <StatKolona
              C={C}
              naslov="ATRIBUTIVNE"
              stat={pod?.attr}
              istaknuto={modulKontekst === "atributivne"}
              bojaNaslov={modulKontekst === "atributivne" ? C.zuta : C.sivi}
            />
            <StatKolona
              C={C}
              naslov="MERLJIVE"
              stat={pod?.merljive}
              istaknuto={modulKontekst === "merljive"}
              bojaNaslov={modulKontekst === "merljive" ? C.zuta : C.sivi}
            />
          </div>

          {!kompaktan && !pogonKod && pod?.poPogon?.length > 0 && (
            <TabelaPoPogonima C={C} redovi={pod.poPogon} />
          )}

          {!kompaktan && (pod?.radniNalozi?.length > 0 || offlineInfo?.total > 0) && (
            <div style={{
              fontSize: 9,
              color: C.sivi,
              marginBottom: 10,
              padding: "8px 10px",
              background: C.bg,
              borderRadius: 8,
              lineHeight: 1.5,
            }}>
              {pod?.radniNalozi?.length > 0 && (
                <div>
                  Aktivni RN: <strong style={{ color: C.tekst }}>{pod.radniNalozi.length}</strong>
                  {" · "}
                  {pod.radniNalozi.slice(0, 4).map((n) => n.broj_naloga).join(", ")}
                  {pod.radniNalozi.length > 4 ? "…" : ""}
                </div>
              )}
              {offlineInfo?.total > 0 && (
                <div style={{ color: C.narandzasta || C.zuta, marginTop: 4 }}>
                  Offline red: {offlineInfo.total} paketa · {offlineInfo.stavki} stavki
                </div>
              )}
            </div>
          )}

          {!kompaktan && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.sivi, fontSize: 8, marginBottom: 4, letterSpacing: 0.5 }}>
                NAPOMENA ZA SLEDEĆU SMENU (ide u PDF)
              </div>
              <textarea
                data-testid="smena-napomena"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                rows={3}
                placeholder="Otvoreni problemi, zastoji, škart van SPC…"
                style={{ ...inp, resize: "vertical", minHeight: 56 }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              data-testid="smena-pdf-pogon"
              onClick={handlePdfPogon}
              disabled={pdfBusy}
              style={{
                background: mozePdf && !pdfBusy ? "#7c3aed" : C.hover,
                border: "none",
                borderRadius: 8,
                color: mozePdf && !pdfBusy ? C.onAkcent : C.sivi,
                fontSize: 10,
                fontWeight: 700,
                padding: "8px 14px",
                cursor: pdfBusy ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: pdfBusy ? 0.85 : 1,
              }}
            >
              {pdfBusy ? "Generišem PDF…" : `📄 Predaja smene — ${pogonKod ? `pogon ${pogonKod}` : "svi pogoni"}`}
            </button>
            {prikaziModulPdf && modulKontekst === "atributivne" && (
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => handlePdfModul("atributivne")}
                style={{
                  background: C.hover,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.sivi,
                  fontSize: 10,
                  padding: "8px 12px",
                  cursor: pdfBusy ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                PDF samo atributivne
              </button>
            )}
            {prikaziModulPdf && modulKontekst === "merljive" && (
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => handlePdfModul("merljive")}
                style={{
                  background: C.hover,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.sivi,
                  fontSize: 10,
                  padding: "8px 12px",
                  cursor: pdfBusy ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                PDF samo merljive
              </button>
            )}
          </div>

          {!mozePdf && !loading && (
            <div style={{ color: C.sivi, fontSize: 9, marginTop: 8, lineHeight: 1.5 }}>
              Nema merenja za {datum} · smena {smena}.
              Proverite godinu (npr. 2025-06-19) i smenu S1/S2/S3.
              Možete upisati napomenu i ipak generisati PDF.
            </div>
          )}
        </>
      )}
    </div>
  );
}
