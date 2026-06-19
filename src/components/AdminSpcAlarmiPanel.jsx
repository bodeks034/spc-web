import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajAktivneSpcAlarme, zatvoriSpcAlarm, zatvoriAnalitickeSpcAlarme, opisSpcAlarma, jeLinijskiSpcAlarm, jeAnalitickiSpcAlarm } from "../lib/spcAlarmWorkflow.js";
import { exportSpcAlarmReakcijaPdf } from "../lib/spcAlarmPdf.js";

const BOJA_STATUS = (C, status) => {
  if (status === "otvoren") return C.crvena;
  if (status === "karantin") return C.ljubicasta || C.plava;
  return C.zuta;
};

export default function AdminSpcAlarmiPanel({ korisnik, C, addToast }) {
  const [alarmi, setAlarmi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zatvaranjeId, setZatvaranjeId] = useState(null);
  const [komentar, setKomentar] = useState("");
  const [cistiAnalitiku, setCistiAnalitiku] = useState(false);

  const ucitaj = async () => {
    setLoading(true);
    try {
      const rows = await ucitajAktivneSpcAlarme(supabase);
      setAlarmi(rows);
    } catch (e) {
      addToast?.(e.message || "Greška učitavanja SPC alarma", "greska");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { ucitaj(); }, []);

  useEffect(() => {
    const ch = supabase.channel("admin_spc_alarmi")
      .on("postgres_changes", { event: "*", schema: "public", table: "spc_alarmi" }, () => ucitaj())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const linijski = alarmi.filter(jeLinijskiSpcAlarm);
  const analiticki = alarmi.filter(jeAnalitickiSpcAlarm);
  const linijskiOtvoreni = linijski.filter((a) => a.status === "otvoren");
  const linijskiKarantin = linijski.filter((a) => a.status === "karantin");
  const linijskiPotvrdeni = linijski.filter((a) => a.status === "potvrden");
  const analitickiAktivni = analiticki.filter((a) => a.status === "otvoren" || a.status === "potvrden");

  const ocistiAnalitiku = async () => {
    setCistiAnalitiku(true);
    try {
      const n = await zatvoriAnalitickeSpcAlarme(supabase, { radnikId: korisnik?.radnikId });
      addToast?.(n > 0 ? `✓ Zatvoreno ${n} analitičkih alarma (grafikon)` : "Nema analitičkih alarma za zatvaranje", n > 0 ? "uspeh" : "info");
      ucitaj();
    } catch (e) {
      addToast?.(e.message || "Greška", "greska");
    } finally {
      setCistiAnalitiku(false);
    }
  };

  const zatvori = async (a) => {
    if (!komentar.trim()) {
      addToast?.("Unesite komentar zatvaranja.", "greska");
      return;
    }
    try {
      await zatvoriSpcAlarm(supabase, {
        alarmId: a.id,
        radnikId: korisnik?.radnikId,
        komentar,
      });
      addToast?.(a.status === "karantin" ? "✓ Karantin pušten" : "✓ SPC alarm zatvoren", "uspeh");
      setZatvaranjeId(null);
      setKomentar("");
      ucitaj();
    } catch (e) {
      addToast?.(e.message || "Greška", "greska");
    }
  };

  const pdf = async (a) => {
    try {
      await exportSpcAlarmReakcijaPdf(a, {
        eskalacijaId: a.eskalacija_id,
        operaterIme: a.potvrdio_id ? `#${a.potvrdio_id}` : "",
        zatvorioIme: a.zatvorio_id ? `#${a.zatvorio_id}` : "",
      });
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    }
  };

  const renderAlarm = (a, { analiticki = false } = {}) => (
    <div key={a.id} style={{
      background: C.bg,
      border: `1px solid ${BOJA_STATUS(C, a.status)}55`,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <div>
          <span style={{ color: C.tekst, fontWeight: 700, fontSize: 13 }}>{a.id_deo}</span>
          <span style={{
            marginLeft: 8,
            fontSize: 9,
            fontWeight: 700,
            color: BOJA_STATUS(C, a.status),
            letterSpacing: 0.5,
          }}>
            {a.status.toUpperCase()}
          </span>
        </div>
        <span style={{ color: C.sivi, fontSize: 10 }}>
          {a.created_at ? new Date(a.created_at).toLocaleString("sr-RS") : ""}
        </span>
      </div>
      <div style={{ color: C.sivi, fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
        {analiticki && (
          <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            Analitika grafikona — ne blokira liniju
          </div>
        )}
        {opisSpcAlarma(a)}
        {a.eskalacija_id && (
          <span> · Esk. #{a.eskalacija_id}</span>
        )}
        {a.komentar_operater && (
          <div style={{ marginTop: 6, color: C.tekst, background: C.panel, padding: "6px 8px", borderRadius: 6 }}>
            Operater: {a.komentar_operater}
          </div>
        )}
        {a.komentar_zatvaranja && (
          <div style={{ marginTop: 6, color: C.tekst, background: C.panel, padding: "6px 8px", borderRadius: 6 }}>
            Zatvaranje: {a.komentar_zatvaranja}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => pdf(a)}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 11, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
          }}>
          📄 PDF reakcije
        </button>
        {zatvaranjeId === a.id ? null : (
          <button type="button" onClick={() => { setZatvaranjeId(a.id); setKomentar(""); }}
            style={{
              background: C.hover, border: `1px solid ${C.plava}`, borderRadius: 6,
              color: C.plava, fontSize: 11, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
            }}>
            {a.status === "karantin" ? "Pusti karantin" : "Zatvori alarm"}
          </button>
        )}
      </div>
      {zatvaranjeId === a.id && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={komentar}
            onChange={(e) => setKomentar(e.target.value)}
            placeholder={a.status === "karantin" ? "Obrazloženje puštanja..." : "Komentar zatvaranja..."}
            rows={2}
            style={{
              width: "100%",
              background: C.input,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.tekst,
              fontSize: 11,
              padding: 8,
              boxSizing: "border-box",
              fontFamily: "inherit",
              resize: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => zatvori(a)}
              style={{
                flex: 1, background: C.plava, border: "none", borderRadius: 6,
                color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px", cursor: "pointer",
              }}>
              {a.status === "karantin" ? "Pusti" : "Zatvori"}
            </button>
            <button type="button" onClick={() => { setZatvaranjeId(null); setKomentar(""); }}
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.sivi, fontSize: 11, padding: "8px 12px", cursor: "pointer",
              }}>
              Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          SPC ALARMI
          {(linijskiOtvoreni.length + linijskiKarantin.length) > 0 && (
            <span style={{
              background: C.crvena, color: "#fff", fontSize: 10,
              borderRadius: 10, padding: "1px 7px", marginLeft: 8,
            }}>
              {linijskiOtvoreni.length + linijskiKarantin.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {analitickiAktivni.length > 0 && (
            <button type="button" onClick={ocistiAnalitiku} disabled={cistiAnalitiku}
              style={{
                background: `${C.plava}18`, border: `1px solid ${C.plava}55`,
                borderRadius: 5, color: C.plava, fontSize: 10, padding: "4px 10px",
                cursor: cistiAnalitiku ? "wait" : "pointer", fontWeight: 700,
              }}>
              {cistiAnalitiku ? "Čistim…" : `Očisti analitičke (${analitickiAktivni.length})`}
            </button>
          )}
          <button type="button" onClick={ucitaj}
          style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: 5, color: C.sivi, fontSize: 10, padding: "4px 10px", cursor: "pointer",
          }}>
          ↻ Osveži
        </button>
        </div>
      </div>
      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje...</div>
      ) : alarmi.length === 0 ? (
        <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
          Nema aktivnih SPC alarma ✓
        </div>
      ) : (
        <>
          {linijskiKarantin.length > 0 && (
            <>
              <div style={{ color: C.ljubicasta || C.plava, fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                KARANTIN LINIJA (HOLD)
              </div>
              {linijskiKarantin.map((a) => renderAlarm(a))}
            </>
          )}
          {linijskiOtvoreni.length > 0 && (
            <>
              <div style={{ color: C.crvena, fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                LINIJA — OTVORENI (blokiraju unos)
              </div>
              {linijskiOtvoreni.map((a) => renderAlarm(a))}
            </>
          )}
          {linijskiPotvrdeni.length > 0 && (
            <>
              <div style={{ color: C.zuta, fontSize: 10, fontWeight: 700, margin: "8px 0", letterSpacing: 1 }}>
                LINIJA — POTVRĐENI (čekaju zatvaranje)
              </div>
              {linijskiPotvrdeni.map((a) => renderAlarm(a))}
            </>
          )}
          {analitickiAktivni.length > 0 && (
            <>
              <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, margin: "12px 0 8px", letterSpacing: 1 }}>
                ANALITIKA GRAFIKONA (ne blokiraju liniju)
              </div>
              {analitickiAktivni.map((a) => renderAlarm(a, { analiticki: true }))}
            </>
          )}
        </>
      )}
    </div>
  );
}
