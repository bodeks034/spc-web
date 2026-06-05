import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchZajednickiDashboard } from "../lib/zajednickiDashboard.js";
import { queueCounts, loadQueue, ensureQueueReady } from "../lib/offlineQueue.js";
import OperativniAlarmiStrip from "./OperativniAlarmiStrip.jsx";
import { bojaNivoa } from "../lib/operativniAlarmi.js";
import {
  ucitajPodesavanjaNotifikacija,
  obradiAlarmeNotifikacije,
  zatraziBrowserDozvolu,
} from "../lib/notifikacije.js";

function KpiKartica({ label, value, boja, C, sub }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${boja}35`, borderRadius: 10,
      padding: "14px 16px", textAlign: "center", minWidth: 100, flex: "1 1 100px",
    }}>
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 6 }}>{label}</div>
      <div style={{ color: boja, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: C.border, fontSize: 8, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function ZajednickiDashboard({ C, addToast, kompakt, onIzborModula }) {
  const [period, setPeriod] = useState(kompakt ? "1" : "7");
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sakrijAlarme, setSakrijAlarme] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      await ensureQueueReady();
      const offline = queueCounts(loadQueue());
      const d = await fetchZajednickiDashboard(supabase, {
        period: Number(period),
        offlinePaketi: offline.total,
      });
      setPodaci(d);
    } catch (e) {
      addToast?.(e.message, "greska");
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [period, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    zatraziBrowserDozvolu();
  }, []);

  useEffect(() => {
    if (!podaci?.alarmi?.length) return;
    (async () => {
      const settings = await ucitajPodesavanjaNotifikacija(supabase);
      await obradiAlarmeNotifikacije(supabase, podaci.alarmi, settings);
    })();
  }, [podaci?.alarmi]);

  useEffect(() => {
    const ch = supabase.channel("dash_unified")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, () => ucitaj())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, () => ucitaj())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [ucitaj]);

  const pad = kompakt ? 0 : 0;

  return (
    <div style={{ width: "100%", maxWidth: 960, padding: pad, boxSizing: "border-box" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ color: C.tekst, fontSize: kompakt ? 12 : 14, fontWeight: 700, letterSpacing: 1 }}>
          PREGLED PROIZVODNJE
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{
              background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.tekst, fontSize: 10, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
            }}>
            <option value="1">Danas</option>
            <option value="7">7 dana</option>
            <option value="30">30 dana</option>
          </select>
          <button type="button" onClick={ucitaj} disabled={loading}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 10, padding: "6px 10px", cursor: "pointer",
            }}>
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {!sakrijAlarme && podaci?.alarmi?.length > 0 && (
        <OperativniAlarmiStrip
          alarmi={podaci.alarmi}
          C={C}
          kompakt
          onZatvori={() => setSakrijAlarme(true)}
        />
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12, padding: 24, textAlign: "center" }}>Učitavanje…</div>
      ) : !podaci ? (
        <div style={{ color: C.border, fontSize: 12, padding: 24, textAlign: "center" }}>Nema podataka</div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <KpiKartica label="RTY ATR" value={`${podaci.attr.rty}%`} boja={C.plava} C={C}
              sub={`DPMO ${podaci.attr.dpmo.toLocaleString()}`} />
            <KpiKartica label="RTY MER" value={`${podaci.merljive.rty}%`} boja={C.zelena} C={C}
              sub={`${podaci.merljive.merenja} merenja`} />
            <KpiKartica label="OEE" value={podaci.oee.prosek != null ? `${podaci.oee.prosek}%` : "—"}
              boja={podaci.oee.prosek >= 65 ? C.zelena : C.crvena} C={C}
              sub={podaci.oee.kpiBroj ? `${podaci.oee.kpiBroj} KPI unosa` : "bez KPI"} />
            <KpiKartica label="ESKALACIJE" value={podaci.eskalacije.otvorene} boja={C.zuta} C={C}
              sub="otvorene" />
            <KpiKartica label="MERILA" value={podaci.merila.istekla}
              boja={podaci.merila.istekla ? C.crvena : C.zelena} C={C}
              sub={podaci.merila.uskoro ? `+${podaci.merila.uskoro} uskoro` : "kalibracija"} />
          </div>

          {period === "1" && (
            <div style={{
              color: C.sivi, fontSize: 10, marginBottom: 12, padding: "8px 10px",
              background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
              Danas merljive: {podaci.merljive.danasUk} merenja · {podaci.merljive.danasNok} NOK
              {podaci.aktivniNalozi > 0 && ` · ${podaci.aktivniNalozi} aktivnih naloga`}
            </div>
          )}

          {podaci.topNok.length > 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 12, marginBottom: 12,
            }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 }}>TOP NOK</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {podaci.topNok.slice(0, kompakt ? 5 : 8).map((p, i) => (
                  <div key={`${p.izvor}-${p.naziv}-${i}`} style={{
                    display: "flex", justifyContent: "space-between", fontSize: 10,
                  }}>
                    <span style={{ color: C.tekst }}>
                      <span style={{ color: p.izvor === "merljive" ? C.zelena : C.plava, fontSize: 8 }}>
                        {p.izvor === "merljive" ? "±" : "✓"}
                      </span>
                      {" "}{p.naziv}
                    </span>
                    <span style={{ color: C.crvena, fontWeight: 700 }}>{p.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!kompakt && podaci.alarmi.length > 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
            }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 }}>
                SVI ALARMI ({podaci.alarmi.length})
              </div>
              {podaci.alarmi.map(a => (
                <div key={a.id} style={{
                  fontSize: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`,
                  color: bojaNivoa(a.nivo, C),
                }}>
                  <strong>{a.naslov}</strong>
                  {a.opis && <span style={{ color: C.sivi, marginLeft: 6 }}>— {a.opis}</span>}
                </div>
              ))}
            </div>
          )}

        </>
      )}
    </div>
  );
}
