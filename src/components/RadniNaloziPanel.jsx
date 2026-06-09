import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  parsirajRadniNaloziCsv,
  upsertRadniNalozi,
  ERP_CSV_KOLONE,
} from "../lib/radniNaloziUvoz.js";

export default function RadniNaloziPanel({ C, addToast, sviDelovi }) {
  const [nalozi, setNalozi] = useState([]);
  const [kupci, setKupci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(false);
  const [filter, setFilter] = useState("aktivan");
  const [csvPreview, setCsvPreview] = useState(null);
  const [uvozi, setUvozi] = useState(false);
  const [nov, setNov] = useState({
    broj_naloga: "",
    id_deo: "",
    naziv_dela: "",
    kolicina: "",
    kupac: "",
    rok_isporuke: "",
    napomena: "",
  });

  const osvezi = useCallback(async () => {
    const [n, k] = await Promise.all([
      supabase.from("radni_nalozi").select("*").order("created_at", { ascending: false }),
      supabase.from("kupci").select("id,naziv").eq("aktivan", true),
    ]);
    setNalozi(n.data || []);
    setKupci(k.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const stat = {
    aktivni: nalozi.filter((n) => n.status === "aktivan").length,
    ukupno: nalozi.length,
  };

  const snimi = async () => {
    if (!nov.broj_naloga || !nov.id_deo) return;
    const payload = {
      ...nov,
      broj_naloga: nov.broj_naloga.toUpperCase(),
      id_deo: nov.id_deo.toUpperCase(),
      kolicina: nov.kolicina ? Number(nov.kolicina) : null,
      status: "aktivan",
    };
    const { data, error } = await supabase
      .from("radni_nalozi")
      .upsert(payload, { onConflict: "broj_naloga" })
      .select()
      .single();
    if (!error) {
      await osvezi();
      setForma(false);
      addToast("✓ Radni nalog sačuvan", "uspeh");
      setNov({
        broj_naloga: "",
        id_deo: "",
        naziv_dela: "",
        kolicina: "",
        kupac: "",
        rok_isporuke: "",
        napomena: "",
      });
    } else addToast(error.message, "greska");
  };

  const uvozCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parsirajRadniNaloziCsv(ev.target.result);
      setCsvPreview({ ...parsed, imeFajla: file.name });
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const uvozSnimi = async () => {
    if (!csvPreview?.redovi?.length || uvozi) return;
    setUvozi(true);
    const res = await upsertRadniNalozi(supabase, csvPreview.redovi);
    setUvozi(false);
    if (!res.ok) {
      addToast(res.error?.message || "Greška pri uvozu", "greska");
      return;
    }
    const aktivni = csvPreview.redovi.filter((r) => r.status === "aktivan").length;
    addToast(`✓ Uvezeno ${res.upsertovano} naloga (${aktivni} aktivnih)`, "uspeh");
    setCsvPreview(null);
    osvezi();
  };

  const statusBoja = { aktivan: C.zelena, zavrsen: C.sivi, otkazan: C.crvena };
  const filtrirani = nalozi.filter((n) => filter === "svi" || n.status === filter);

  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.tekst,
    fontSize: 13,
    padding: "10px 12px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            RADNI NALOZI (ERP)
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4 }}>
            Aktivnih: {stat.aktivni} · Ukupno u bazi: {stat.ukupno}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.sivi,
            fontSize: 12,
            fontWeight: 700,
            padding: "9px 14px",
            cursor: "pointer",
          }}>
            📎 CSV uvoz (ERP)
            <input type="file" accept=".csv,text/csv" onChange={uvozCSV} style={{ display: "none" }} />
          </label>
          <button
            type="button"
            onClick={() => setForma(true)}
            style={{
              background: C.plava,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "9px 16px",
              cursor: "pointer",
            }}
          >
            + Novi nalog
          </button>
        </div>
      </div>

      {csvPreview && (
        <div style={{
          background: "#0c2d48",
          border: `1px solid ${C.plava}40`,
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}>
          <div style={{ color: C.plava, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            📋 {csvPreview.imeFajla} — {csvPreview.validnih} / {csvPreview.ukupno} naloga
          </div>
          {csvPreview.greske?.length > 0 && (
            <div style={{ color: C.zuta, fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
              {csvPreview.greske.slice(0, 5).map((g) => <div key={g}>⚠ {g}</div>)}
              {csvPreview.greske.length > 5 && (
                <div>… +{csvPreview.greske.length - 5} upozorenja</div>
              )}
            </div>
          )}
          <div style={{
            maxHeight: 120,
            overflow: "auto",
            fontSize: 10,
            color: C.sivi,
            marginBottom: 10,
            fontFamily: "monospace",
          }}>
            {csvPreview.redovi.slice(0, 8).map((r) => (
              <div key={r.broj_naloga}>
                {r.broj_naloga} · {r.id_deo} · {r.kolicina ?? "—"} · {r.status}
                {r.kupac ? ` · ${r.kupac}` : ""}
              </div>
            ))}
            {csvPreview.redovi.length > 8 && (
              <div>… +{csvPreview.redovi.length - 8} redova</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={uvozSnimi}
              disabled={uvozi || !csvPreview.redovi.length}
              style={{
                background: uvozi ? C.hover : C.plava,
                border: "none",
                borderRadius: 7,
                color: uvozi ? C.sivi : "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 16px",
                cursor: uvozi ? "not-allowed" : "pointer",
              }}
            >
              {uvozi ? "Uvozim…" : `✓ Upsert ${csvPreview.validnih} naloga`}
            </button>
            <button
              type="button"
              onClick={() => setCsvPreview(null)}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                color: C.sivi,
                fontSize: 12,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Otkaži
            </button>
          </div>
          <div style={{ color: C.border, fontSize: 9, marginTop: 8, lineHeight: 1.5 }}>
            Kolone: {ERP_CSV_KOLONE.join(" · ")}
            <br />
            Isti broj naloga se ažurira (upsert). Vidi docs/UPUTSTVO_ERP_RADNI_NALOZI.md
          </div>
        </div>
      )}

      {forma && (
        <div style={{
          background: C.panel,
          border: `1px solid ${C.plava}30`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Novi radni nalog</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["BROJ NALOGA", "broj_naloga", "RN-2026-101"],
              ["KUPAC", "kupac", ""],
              ["KOLIČINA", "kolicina", ""],
              ["ROK ISPORUKE", "rok_isporuke", ""],
            ].map(([l, k, ph]) => (
              <div key={k}>
                <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>{l}</div>
                {k === "rok_isporuke"
                  ? <input type="date" value={nov[k]} onChange={(e) => setNov((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
                  : k === "kupac"
                    ? (
                      <select value={nov[k]} onChange={(e) => setNov((p) => ({ ...p, [k]: e.target.value }))} style={{ ...INP, cursor: "pointer" }}>
                        <option value="">-- Izaberi --</option>
                        {kupci.map((kp) => <option key={kp.id} value={kp.naziv}>{kp.naziv}</option>)}
                      </select>
                    )
                    : <input value={nov[k]} onChange={(e) => setNov((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={INP} />}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>ID DELA</div>
            <select
              value={nov.id_deo}
              onChange={(e) => {
                const d = sviDelovi.find((x) => x.id_deo === e.target.value);
                setNov((p) => ({ ...p, id_deo: e.target.value, naziv_dela: d?.naziv_dela || "" }));
              }}
              style={{ ...INP, cursor: "pointer" }}
            >
              <option value="">-- Izaberi deo --</option>
              {sviDelovi.map((d) => (
                <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={snimi}
              disabled={!nov.broj_naloga || !nov.id_deo}
              style={{
                flex: 1,
                background: nov.broj_naloga && nov.id_deo ? C.plava : C.hover,
                border: "none",
                borderRadius: 8,
                color: nov.broj_naloga && nov.id_deo ? "#fff" : C.sivi,
                fontSize: 13,
                fontWeight: 700,
                padding: "11px",
                cursor: "pointer",
              }}
            >
              Snimi
            </button>
            <button
              type="button"
              onClick={() => setForma(false)}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.sivi,
                fontSize: 13,
                padding: "11px 16px",
                cursor: "pointer",
              }}
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["aktivan", "Aktivni"], ["zavrsen", "Završeni"], ["otkazan", "Otkazani"], ["svi", "Svi"]].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            style={{
              background: filter === v ? C.plava : "none",
              border: `1px solid ${filter === v ? C.plava : C.border}`,
              borderRadius: 8,
              color: filter === v ? "#fff" : C.sivi,
              fontSize: 11,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12, padding: 20 }}>Učitavanje...</div>
      ) : !filtrirani.length ? (
        <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
          Nema naloga — uvezi CSV iz ERP-a
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 80px 1fr 80px 100px 80px",
            background: C.hover,
            padding: "9px 14px",
            fontSize: 9,
            color: C.sivi,
            gap: 8,
            letterSpacing: 1,
          }}>
            <span>BROJ NALOGA</span>
            <span>ID DELA</span>
            <span>NAZIV</span>
            <span>KOL.</span>
            <span>KUPAC</span>
            <span>STATUS</span>
          </div>
          {filtrirani.map((n) => (
            <div
              key={n.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 80px 1fr 80px 100px 80px",
                padding: "9px 14px",
                borderTop: `1px solid ${C.border}`,
                fontSize: 11,
                gap: 8,
                alignItems: "center",
              }}
            >
              <span style={{ color: C.plava, fontWeight: 700 }}>{n.broj_naloga}</span>
              <span style={{ color: C.tekst }}>{n.id_deo}</span>
              <span style={{ color: C.sivi, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {n.naziv_dela}
              </span>
              <span style={{ color: C.tekst }}>{n.kolicina}</span>
              <span style={{ color: C.sivi }}>{n.kupac || "—"}</span>
              <span style={{ color: statusBoja[n.status] || C.sivi, fontWeight: 700, fontSize: 10 }}>
                {(n.status || "").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
