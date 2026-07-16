import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  potvrdiSpcAlarm,
  zatvoriSpcAlarm,
  karantinSpcAlarm,
  opisSpcAlarma,
} from "../lib/spcAlarmWorkflow.js";
import { kreirajNcrIzAlarma, fetchNcrPoAlarmu } from "../lib/ncrCapa.js";
import { jeAdmin, jeKvalitetIliVise } from "../lib/uloge.js";
import { predloziAkcijeZaAlarm } from "../lib/reakcioniPlanSpc.js";
import { objasniLinijskiNokAlarm } from "../lib/spcAlarmPragovi.js";

/** Blokirajući modal na liniji kad je SPC van kontrole — obavezan komentar. */
export default function SpcAlarmBlokada({
  alarm,
  korisnik,
  nazivDela = "",
  radniNalog = "",
  C,
  onPotvrdjeno,
  onZatvoreno,
  onKarantin,
  onZahtevPrekid,
  onOsvezi,
  onNcrKreiran,
  podnaslov = "",
}) {
  const [komentar, setKomentar] = useState("");
  const [loading, setLoading] = useState(false);
  const [greska, setGreska] = useState("");
  const [ncrInfo, setNcrInfo] = useState(null);
  const [ncrBusy, setNcrBusy] = useState(false);

  useEffect(() => {
    if (!alarm?.id) return;
    fetchNcrPoAlarmu(supabase, alarm.id).then(setNcrInfo).catch(() => {});
  }, [alarm?.id]);

  const jeKarantin = alarm?.status === "karantin";
  const mozeZatvoriti = jeAdmin(korisnik?.uloga) || jeKvalitetIliVise(korisnik?.uloga);

  const posleAkcije = async (cb) => {
    await onOsvezi?.();
    cb?.();
  };

  const potvrdi = async () => {
    if (!komentar.trim()) {
      setGreska("Unesite šta ste proverili / uradili pre nastavka.");
      return;
    }
    setLoading(true);
    setGreska("");
    try {
      await potvrdiSpcAlarm(supabase, {
        alarmId: alarm.id,
        radnikId: korisnik?.radnikId,
        komentar,
      });
      await posleAkcije(onPotvrdjeno);
    } catch (e) {
      const msg = String(e.message || "");
      if (msg.includes("JSON object") || msg.includes("više ne postoji")) {
        await posleAkcije(onPotvrdjeno);
        return;
      }
      setGreska(msg || "Greška pri potvrdi alarma.");
      await onOsvezi?.();
    } finally {
      setLoading(false);
    }
  };

  const karantin = async () => {
    if (!komentar.trim()) {
      setGreska("Unesite razlog za karantin (HOLD lota/RN).");
      return;
    }
    setLoading(true);
    setGreska("");
    try {
      await karantinSpcAlarm(supabase, {
        alarm,
        radnikId: korisnik?.radnikId,
        komentar,
        radniNalog,
      });
      await posleAkcije(onKarantin);
    } catch (e) {
      setGreska(e.message || "Greška pri karantinu.");
      await onOsvezi?.();
    } finally {
      setLoading(false);
    }
  };

  const zatvori = async () => {
    if (!komentar.trim()) {
      setGreska("Komentar zatvaranja je obavezan.");
      return;
    }
    setLoading(true);
    setGreska("");
    try {
      await zatvoriSpcAlarm(supabase, {
        alarmId: alarm.id,
        radnikId: korisnik?.radnikId,
        komentar,
      });
      await posleAkcije(onZatvoreno);
    } catch (e) {
      const msg = String(e.message || "");
      if (msg.includes("JSON object")) {
        await posleAkcije(onZatvoreno);
        return;
      }
      setGreska(msg || "Greška pri zatvaranju alarma.");
      await onOsvezi?.();
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v) => (v == null || v === "" ? "—" : Number(v).toFixed(4));
  const predlogAkcija = predloziAkcijeZaAlarm(alarm);
  const objasnjenjePraga = objasniLinijskiNokAlarm(alarm);

  const kreirajNcr = async () => {
    setNcrBusy(true);
    try {
      const { row, vecPostojao } = await kreirajNcrIzAlarma(supabase, alarm, {
        kreiraoId: korisnik?.radnikId,
      });
      setNcrInfo(row);
      onNcrKreiran?.(row);
      setGreska(vecPostojao ? `NCR već postoji: ${row.broj_ncr}` : "");
    } catch (e) {
      setGreska(e.message || "NCR nije kreiran.");
    } finally {
      setNcrBusy(false);
    }
  };

  const btnBase = {
    borderRadius: 7,
    fontWeight: 700,
    padding: "8px 10px",
    fontFamily: "inherit",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spc-alarm-naslov"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 12000,
        padding: 10,
        boxSizing: "border-box",
      }}
    >
      <div style={{
        background: C.panel,
        border: `2px solid ${jeKarantin ? C.ljubicasta || C.plava : C.crvena}`,
        borderRadius: 12,
        padding: "12px 14px",
        maxWidth: 420,
        width: "100%",
        maxHeight: "min(92vh, 640px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}>
          <span style={{
            color: jeKarantin ? (C.ljubicasta || C.plava) : C.crvena,
            fontSize: 18,
            lineHeight: 1,
          }}>
            {jeKarantin ? "🔒" : "⛔"}
          </span>
          <div id="spc-alarm-naslov" style={{ color: C.tekst, fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
            {jeKarantin ? "KARANTIN — proizvodnja obustavljena" : "SPC van kontrole — obustava unosa"}
          </div>
        </div>
        {podnaslov && (
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 6 }}>{podnaslov}</div>
        )}
        {jeKarantin && (
          <div style={{
            color: C.ljubicasta || C.plava,
            fontSize: 10,
            marginBottom: 8,
            background: `${C.plava}18`,
            padding: "6px 8px",
            borderRadius: 6,
            lineHeight: 1.4,
          }}>
            Deo/RN su u HOLD-u. Nastavak rada samo nakon odobrenja kvaliteta/admina.
            {alarm.eskalacija_id && (
              <span> Eskalacija #{alarm.eskalacija_id}.</span>
            )}
          </div>
        )}
        <div style={{
          color: C.sivi,
          fontSize: 11,
          marginBottom: 8,
          lineHeight: 1.45,
          background: C.bg,
          borderRadius: 7,
          padding: "7px 9px",
          border: `1px solid ${C.border}`,
        }}>
          Deo: <strong style={{ color: C.tekst }}>{alarm.id_deo}</strong>
          {nazivDela ? ` — ${nazivDela}` : ""}
          {radniNalog ? (
            <>
              {" · "}RN: <strong style={{ color: C.tekst }}>{radniNalog}</strong>
            </>
          ) : null}
          <br />
          {opisSpcAlarma(alarm)}
          <br />
          Vrednost: <strong style={{ color: C.crvena }}>{fmt(alarm.vrednost)}</strong>
          {" · "}UCL {fmt(alarm.ucl)} · LCL {fmt(alarm.lcl)}
          {alarm.created_at && (
            <span style={{ fontSize: 9, color: C.sivi }}>
              {" · "}{new Date(alarm.created_at).toLocaleString("sr-RS")}
            </span>
          )}
          {jeKarantin && alarm.komentar_operater && (
            <>
              <br />
              <span style={{ color: C.tekst }}>Razlog: {alarm.komentar_operater}</span>
            </>
          )}
        </div>
        {objasnjenjePraga && !jeKarantin && (
          <div style={{
            marginBottom: 8,
            padding: "6px 8px",
            borderRadius: 7,
            border: `1px solid ${C.zuta}44`,
            background: `${C.zuta}12`,
            fontSize: 10,
            color: C.tekst,
            lineHeight: 1.4,
          }}>
            <div style={{ color: C.zuta, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 2 }}>
              ZAŠTO JE UNOS BLOKIRAN?
            </div>
            {objasnjenjePraga}
          </div>
        )}
        {predlogAkcija.length > 0 && (
          <div style={{
            marginBottom: 8, padding: "6px 8px", borderRadius: 7,
            border: `1px solid ${C.zuta}55`, background: `${C.zuta}10`,
            maxHeight: 72,
            overflowY: "auto",
          }}>
            <div style={{ color: C.zuta, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 3 }}>
              REAKCIONI PLAN
            </div>
            {predlogAkcija.map((r) => (
              <div key={r.id} style={{ fontSize: 10, color: C.tekst, marginBottom: 2, lineHeight: 1.35 }}>
                <span style={{ color: C.sivi }}>{r.situacija}</span>
                {" → "}
                <strong>{r.akcija}</strong>
              </div>
            ))}
          </div>
        )}
        {!jeKarantin && (
          <>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>
              OBAVEZAN KOMENTAR
            </div>
            <textarea
              value={komentar}
              onChange={(e) => { setKomentar(e.target.value); setGreska(""); }}
              placeholder="Npr: proverena alatna postavka, uzrok identifikovan..."
              rows={2}
              style={{
                width: "100%",
                background: C.input,
                border: `1px solid ${greska ? C.crvena : C.border}`,
                borderRadius: 7,
                color: C.tekst,
                fontSize: 12,
                padding: "7px 9px",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                minHeight: 48,
              }}
            />
          </>
        )}
        {jeKarantin && mozeZatvoriti && (
          <>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>
              KOMENTAR PUŠTANJA (kvalitet/admin)
            </div>
            <textarea
              value={komentar}
              onChange={(e) => { setKomentar(e.target.value); setGreska(""); }}
              placeholder="Obrazloženje puštanja iz karantina..."
              rows={2}
              style={{
                width: "100%",
                background: C.input,
                border: `1px solid ${greska ? C.crvena : C.border}`,
                borderRadius: 7,
                color: C.tekst,
                fontSize: 12,
                padding: "7px 9px",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                minHeight: 48,
              }}
            />
          </>
        )}
        {greska && (
          <div style={{ color: C.crvena, fontSize: 10, marginTop: 4 }}>{greska}</div>
        )}
        {ncrInfo && (
          <div style={{
            marginTop: 6, fontSize: 10, color: C.zelena, fontWeight: 700,
            padding: "4px 8px", border: `1px solid ${C.zelena}44`, borderRadius: 6,
          }}>
            NCR: {ncrInfo.broj_ncr}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {!jeKarantin && (
            <>
              <button
                type="button"
                onClick={potvrdi}
                disabled={!komentar.trim() || loading}
                style={{
                  ...btnBase,
                  background: komentar.trim() && !loading ? C.zelena : C.hover,
                  border: "none",
                  color: komentar.trim() ? C.onAkcent : C.sivi,
                  fontSize: 12,
                  cursor: komentar.trim() && !loading ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Snima se..." : "✓ Potvrdi i nastavi unos"}
              </button>
              <button
                type="button"
                onClick={karantin}
                disabled={!komentar.trim() || loading}
                style={{
                  ...btnBase,
                  background: komentar.trim() && !loading ? (C.ljubicasta || "#7c3aed") : C.hover,
                  border: "none",
                  color: komentar.trim() ? C.onAkcent : C.sivi,
                  fontSize: 11,
                  cursor: komentar.trim() && !loading ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Snima se..." : "🔒 Karantin (HOLD lot/RN)"}
              </button>
            </>
          )}
          {typeof onZahtevPrekid === "function" && !jeKarantin && (
            <button
              type="button"
              onClick={onZahtevPrekid}
              disabled={loading}
              style={{
                ...btnBase,
                background: C.hover,
                border: `1px solid ${C.zuta}`,
                color: C.zuta,
                fontSize: 11,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              📤 Zahtev za prekid serije
            </button>
          )}
          {mozeZatvoriti && (
            <button
              type="button"
              onClick={zatvori}
              disabled={!komentar.trim() || loading}
              style={{
                ...btnBase,
                background: "none",
                border: `1px solid ${C.plava}`,
                color: C.plava,
                fontSize: 11,
                cursor: komentar.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              {jeKarantin ? "Pusti iz karantina (kvalitet/admin)" : "Zatvori alarm (kvalitet/admin)"}
            </button>
          )}
          {mozeZatvoriti && !ncrInfo && (
            <button
              type="button"
              data-testid="alarm-blokada-ncr"
              onClick={kreirajNcr}
              disabled={ncrBusy || loading}
              style={{
                ...btnBase,
                background: C.hover,
                border: `1px solid ${C.narandzasta || C.zuta}`,
                color: C.narandzasta || C.zuta,
                fontSize: 11,
                cursor: ncrBusy ? "wait" : "pointer",
              }}
            >
              {ncrBusy ? "Kreiram NCR…" : "+ Kreiraj NCR iz alarma"}
            </button>
          )}
        </div>
        <div style={{ color: C.sivi, fontSize: 9, marginTop: 8, textAlign: "center", lineHeight: 1.35 }}>
          {jeKarantin
            ? "Linija ostaje blokirana dok kvalitet/admin ne pusti deo iz karantina."
            : "Unos je blokiran. Karantin šalje eskalaciju i HOLD lota/RN."}
        </div>
      </div>
    </div>
  );
}
