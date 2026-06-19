import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  potvrdiSpcAlarm,
  zatvoriSpcAlarm,
  karantinSpcAlarm,
  opisSpcAlarma,
} from "../lib/spcAlarmWorkflow.js";
import { jeAdmin, jeKvalitetIliVise } from "../lib/uloge.js";

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
  podnaslov = "",
}) {
  const [komentar, setKomentar] = useState("");
  const [loading, setLoading] = useState(false);
  const [greska, setGreska] = useState("");

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
        padding: 16,
      }}
    >
      <div style={{
        background: C.panel,
        border: `2px solid ${jeKarantin ? C.ljubicasta || C.plava : C.crvena}`,
        borderRadius: 14,
        padding: "24px 28px",
        maxWidth: 460,
        width: "100%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}>
        <div style={{ color: jeKarantin ? (C.ljubicasta || C.plava) : C.crvena, fontSize: 28, marginBottom: 8 }}>
          {jeKarantin ? "🔒" : "⛔"}
        </div>
        <div id="spc-alarm-naslov" style={{ color: C.tekst, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {jeKarantin ? "KARANTIN — proizvodnja obustavljena" : "SPC van kontrole — obustava unosa"}
        </div>
        {podnaslov && (
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>{podnaslov}</div>
        )}
        {jeKarantin && (
          <div style={{
            color: C.ljubicasta || C.plava,
            fontSize: 11,
            marginBottom: 10,
            background: `${C.plava}18`,
            padding: "8px 10px",
            borderRadius: 6,
            lineHeight: 1.5,
          }}>
            Deo/RN su u HOLD-u. Nastavak rada samo nakon odobrenja kvaliteta/admina.
            {alarm.eskalacija_id && (
              <span> Eskalacija #{alarm.eskalacija_id}.</span>
            )}
          </div>
        )}
        <div style={{
          color: C.sivi,
          fontSize: 12,
          marginBottom: 14,
          lineHeight: 1.65,
          background: C.bg,
          borderRadius: 8,
          padding: "10px 12px",
          border: `1px solid ${C.border}`,
        }}>
          Deo: <strong style={{ color: C.tekst }}>{alarm.id_deo}</strong>
          {nazivDela ? ` — ${nazivDela}` : ""}
          {radniNalog ? (
            <>
              <br />
              RN: <strong style={{ color: C.tekst }}>{radniNalog}</strong>
            </>
          ) : null}
          <br />
          {opisSpcAlarma(alarm)}
          <br />
          Vrednost: <strong style={{ color: C.crvena }}>{fmt(alarm.vrednost)}</strong>
          {" · "}UCL {fmt(alarm.ucl)} · LCL {fmt(alarm.lcl)}
          <br />
          <span style={{ fontSize: 10 }}>
            {alarm.created_at
              ? new Date(alarm.created_at).toLocaleString("sr-RS")
              : ""}
          </span>
          {jeKarantin && alarm.komentar_operater && (
            <>
              <br />
              <span style={{ color: C.tekst }}>Razlog: {alarm.komentar_operater}</span>
            </>
          )}
        </div>
        {!jeKarantin && (
          <>
            <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.1, marginBottom: 6 }}>
              OBAVEZAN KOMENTAR
            </div>
            <textarea
              value={komentar}
              onChange={(e) => { setKomentar(e.target.value); setGreska(""); }}
              placeholder="Npr: proverena alatna postavka, uzrok identifikovan, uzorak ponovo meren..."
              rows={3}
              style={{
                width: "100%",
                background: C.input,
                border: `1px solid ${greska ? C.crvena : C.border}`,
                borderRadius: 8,
                color: C.tekst,
                fontSize: 13,
                padding: "10px 12px",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
              }}
            />
          </>
        )}
        {jeKarantin && mozeZatvoriti && (
          <>
            <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.1, marginBottom: 6 }}>
              KOMENTAR PUŠTANJA (kvalitet/admin)
            </div>
            <textarea
              value={komentar}
              onChange={(e) => { setKomentar(e.target.value); setGreska(""); }}
              placeholder="Obrazloženje puštanja iz karantina..."
              rows={3}
              style={{
                width: "100%",
                background: C.input,
                border: `1px solid ${greska ? C.crvena : C.border}`,
                borderRadius: 8,
                color: C.tekst,
                fontSize: 13,
                padding: "10px 12px",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
              }}
            />
          </>
        )}
        {greska && (
          <div style={{ color: C.crvena, fontSize: 11, marginTop: 6 }}>{greska}</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {!jeKarantin && (
            <>
              <button
                type="button"
                onClick={potvrdi}
                disabled={!komentar.trim() || loading}
                style={{
                  background: komentar.trim() && !loading ? C.zelena : C.hover,
                  border: "none",
                  borderRadius: 8,
                  color: komentar.trim() ? "#fff" : "#666",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "12px",
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
                  background: komentar.trim() && !loading ? (C.ljubicasta || "#7c3aed") : C.hover,
                  border: "none",
                  borderRadius: 8,
                  color: komentar.trim() ? "#fff" : "#666",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "11px",
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
                background: C.hover,
                border: `1px solid ${C.zuta}`,
                borderRadius: 8,
                color: C.zuta,
                fontSize: 12,
                fontWeight: 700,
                padding: "10px",
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
                background: "none",
                border: `1px solid ${C.plava}`,
                borderRadius: 8,
                color: C.plava,
                fontSize: 12,
                fontWeight: 700,
                padding: "10px",
                cursor: komentar.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              {jeKarantin ? "Pusti iz karantina (kvalitet/admin)" : "Zatvori alarm (kvalitet/admin)"}
            </button>
          )}
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
          {jeKarantin
            ? "Linija ostaje blokirana dok kvalitet/admin ne pusti deo iz karantina."
            : "Unos je blokiran. Karantin šalje eskalaciju i HOLD lota/RN."}
        </div>
      </div>
    </div>
  );
}
