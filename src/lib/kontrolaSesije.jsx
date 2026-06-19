import { useState, useEffect } from "react";
import { obavestiAdminZahtev } from "./adminZahtevNotifikacije.js";
import { supabase } from "./supabaseClient.js";
import { kontrolnaListaObavezna, normalizujIdDeo } from "./kontrolaLista.js";
/** Kontrolna lista pre smene (atributivne i merljive). */
export function KontrolnaLista({
  korisnik,
  smena,
  idDeo = null,
  onZavrsena,
  C,
  naslovModul = "",
  akcent,
  ugradjen = false,
}) {
  const boja = akcent || C.plava;
  const [stavke, setStavke] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [napomena, setNapomena] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [greska, setGreska] = useState("");
  const [vecUradjena, setVecUradjena] = useState(false);

  const idNorm = normalizujIdDeo(idDeo);

  useEffect(() => {
    setVecUradjena(false);
    setLoading(true);
    (async () => {
      try {
        const danas = new Date().toISOString().split("T")[0];
        if (korisnik?.radnikId) {
          const { data: logs } = await supabase.from("kontrolna_lista_log")
            .select("id,stavke_json,zavrsena")
            .eq("radnik_id", korisnik.radnikId)
            .eq("smena", smena)
            .eq("datum", danas)
            .eq("zavrsena", true);
          const log = idNorm
            ? (logs || []).find((l) => normalizujIdDeo(l.stavke_json?.id_deo) === idNorm)
            : logs?.[0];
          if (log) { setVecUradjena(true); return; }
        }
        const { data, error } = await supabase.from("kontrolna_lista_stavke")
          .select("*").eq("aktivna", true).order("redosled");
        if (error) throw error;
        setStavke(data || []);
      } catch (e) {
        console.error("Kontrolna lista:", e.message);
        setStavke([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [korisnik?.radnikId, smena, idNorm]);

  const toggle = (id) => {
    const key = String(id);
    setChecklist(p => ({ ...p, [key]: !p[key] }));
  };

  const ukupno = stavke.length;
  const potvrdjeno = stavke.filter(s => checklist[String(s.id)]).length;
  const procenat = ukupno > 0 ? Math.round(potvrdjeno / ukupno * 100) : 0;

  const snimi = async () => {
    if (potvrdjeno < ukupno || saving) return;
    setGreska("");
    setSaving(true);
    const danas = new Date().toISOString().split("T")[0];
    const payload = {
      radnik_id: korisnik?.radnikId ?? null,
      smena,
      datum: danas,
      stavke_json: {
        items: checklist,
        napomena: napomena || null,
        modul: naslovModul || null,
        id_deo: idNorm || null,
      },
      zavrsena: true,
    };
    const { error } = await supabase.from("kontrolna_lista_log").insert(payload);
    setSaving(false);
    if (error) {
      console.error("Kontrolna lista snimi:", error.message);
      setGreska(error.message);
      return;
    }
    onZavrsena();
  };

  const kategorije = [...new Set(stavke.map(s => s.kategorija))];

  useEffect(() => {
    if (loading || stavke.length) return;
    if (!kontrolnaListaObavezna()) onZavrsena?.();
  }, [loading, stavke.length, onZavrsena]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", color: C.sivi, fontSize: 13 }}>Učitavanje...</div>
    );
  }

  if (vecUradjena) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: ugradjen ? "auto" : "60vh", gap: ugradjen ? 10 : 16,
        padding: ugradjen ? "12px 0" : "24px 16px", width: "100%" }}>
        <div style={{ fontSize: ugradjen ? 36 : 60 }}>✅</div>
        <div style={{ color: C.zelena, fontSize: ugradjen ? 14 : 20, fontWeight: 700, textAlign: "center" }}>
          Ček lista je popunjena — nastavi dalje
        </div>
        <div style={{ color: C.sivi, fontSize: ugradjen ? 10 : 13, textAlign: "center" }}>
          Smena {smena}{idNorm ? ` · ID ${idNorm}` : ""} · {new Date().toLocaleDateString("sr-RS")}
        </div>
        <button type="button" onClick={onZavrsena} style={{ background: boja, border: "none", borderRadius: ugradjen ? 8 : 10,
          color: "#fff", fontSize: ugradjen ? 12 : 14, fontWeight: 700, padding: ugradjen ? "10px 20px" : "12px 28px", cursor: "pointer" }}>
          Nastavi dalje →
        </button>
      </div>
    );
  }

  if (stavke.length === 0) {
    const obavezna = kontrolnaListaObavezna();
    if (!obavezna) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: ugradjen ? "auto" : "24vh", color: C.sivi, fontSize: 12, padding: 16 }}>
          Nema stavki kontrolne liste — nastavljam…
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⛔</div>
        <div style={{ color: C.crvena, fontSize: 16, fontWeight: 700 }}>
          {obavezna ? "Unos nije dozvoljen" : "Nema stavki u kontrolnoj listi"}
        </div>
        <div style={{ color: C.sivi, fontSize: 12, maxWidth: 400, lineHeight: 1.6 }}>
          {obavezna
            ? "Kontrolna lista nije podešena u sistemu. Obavestite administratora da uveze stavke (Admin → Excel ili SQL seed `04_kontrolna_lista_policies.sql`), pa osvežite stranicu."
            : "Uvezi stavke komandom `node scripts/import-all-docs.mjs` ili SQL seed, pa osveži stranicu."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: ugradjen ? "8px 0 12px" : "16px 16px 100px", display: "flex", flexDirection: "column", gap: ugradjen ? 10 : 16,
      maxWidth: ugradjen ? "100%" : 600, margin: ugradjen ? 0 : "0 auto", flex: ugradjen ? 1 : undefined, minHeight: ugradjen ? 0 : undefined }}>
      <div style={{ textAlign: ugradjen ? "left" : "center" }}>
        <div style={{ color: C.tekst, fontSize: ugradjen ? 13 : 18, fontWeight: 700, marginBottom: 4 }}>
          📋 {ugradjen ? "Ček lista" : "Kontrolna lista pre smene"}
          {naslovModul ? <span style={{ color: C.sivi, fontWeight: 400, fontSize: ugradjen ? 11 : 14 }}> · {naslovModul}</span> : null}
        </div>
        <div style={{ color: C.sivi, fontSize: ugradjen ? 9 : 12 }}>
          Smena {smena}{idNorm ? ` · ID ${idNorm}` : ""} · {new Date().toLocaleDateString("sr-RS")}
        </div>
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8 }}>
          <span style={{ color: C.sivi }}>Potvrđeno</span>
          <span style={{ color: procenat === 100 ? C.zelena : C.zuta, fontWeight: 700 }}>
            {potvrdjeno} / {ukupno}
          </span>
        </div>
        <div style={{ background: C.hover, borderRadius: 4, height: 8 }}>
          <div style={{
            background: procenat === 100 ? C.zelena : boja,
            width: `${procenat}%`, height: 8, borderRadius: 4, transition: "width 0.3s",
          }} />
        </div>
      </div>

      {kategorije.map(kat => (
        <div key={kat} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: C.hover, padding: "10px 16px",
            color: C.sivi, fontSize: 10, fontWeight: 700, letterSpacing: 1.5 }}>
            {kat}
          </div>
          {stavke.filter(s => s.kategorija === kat).map(s => {
            const ok = !!checklist[String(s.id)];
            return (
              <div key={s.id} onClick={() => toggle(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  borderTop: `1px solid ${C.border}`, cursor: "pointer",
                  background: ok ? `${C.zelena}10` : "transparent", transition: "background 0.2s" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${ok ? C.zelena : C.border}`,
                  background: ok ? C.zelena : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ok && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ color: ok ? C.sivi : C.tekst, fontSize: 13,
                  textDecoration: ok ? "line-through" : "none" }}>
                  {s.stavka}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>NAPOMENA (opciono)</div>
        <textarea value={napomena} onChange={e => setNapomena(e.target.value)}
          placeholder="Posebni uslovi, problemi uočeni..."
          rows={3}
          style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`,
            borderRadius: 10, color: C.tekst, fontSize: 13, padding: "12px",
            boxSizing: "border-box", outline: "none", fontFamily: "inherit", resize: "none" }} />
      </div>

      {greska && (
        <div style={{ background: `${C.crvena}18`, border: `1px solid ${C.crvena}`,
          borderRadius: 10, padding: "12px 14px", color: C.crvena, fontSize: 12, lineHeight: 1.5 }}>
          Greška pri snimanju: {greska}
        </div>
      )}

      <button type="button" onClick={snimi} disabled={potvrdjeno < ukupno || saving}
        style={{ background: potvrdjeno === ukupno ? boja : C.hover, border: "none", borderRadius: 12,
          color: potvrdjeno === ukupno ? "#fff" : C.sivi, fontSize: 16, fontWeight: 700,
          padding: "18px", cursor: potvrdjeno < ukupno || saving ? "not-allowed" : "pointer",
          boxShadow: potvrdjeno === ukupno ? `0 0 20px ${boja}40` : "none" }}>
        {saving ? "Snimanje..."
          : potvrdjeno === ukupno ? "✓ Potvrdi i nastavi sa radom"
            : `Potvrdi još ${ukupno - potvrdjeno} stavki`}
      </button>
    </div>
  );
}

/** Zahtev adminu za prekid sesije merenja. */
export function ZahtevPrekid({ korisnik, idDeo, nazivDela, preostalo, cilj, onUspeh, onOtkazati, C, podnaslov }) {
  const [razlog, setRazlog] = useState("");
  const [loading, setLoading] = useState(false);

  const posalji = async () => {
    if (!razlog.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("prekidi_zahtevi").insert({
        operater_id: korisnik.radnikId,
        id_deo: String(idDeo || "").trim().toUpperCase(),
        naziv_dela: nazivDela,
        preostalo,
        cilj,
        razlog: razlog.trim(),
        status: "ceka",
      }).select("id,id_deo,naziv_dela,preostalo,cilj,razlog,status").single();
      if (error) throw error;
      obavestiAdminZahtev(supabase, {
        tip: "prekid",
        kanali: "remote",
        zahtev: { ...data, operater_ime: korisnik.ime },
      }).catch(() => {});
      onUspeh();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: C.panel, border: `1px solid ${C.zuta}`, borderRadius: 12,
        padding: "28px 32px", maxWidth: 420, width: "90%" }}>
        <div style={{ color: C.zuta, fontSize: 20, marginBottom: 10 }}>⚠</div>
        <div style={{ color: C.tekst, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Zahtev za prekid merenja
        </div>
        {podnaslov && (
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>{podnaslov}</div>
        )}
        <div style={{ color: C.sivi, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
          Deo: <strong style={{ color: C.tekst }}>{idDeo} — {nazivDela}</strong><br />
          Preostalo: <strong style={{ color: C.crvena }}>{preostalo} / {cilj}</strong>
        </div>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 6 }}>RAZLOG PREKIDA</div>
        <textarea value={razlog} onChange={e => setRazlog(e.target.value)}
          placeholder="Npr: alat istrošen, materijal loš, vanredna situacija..."
          rows={3}
          style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
            outline: "none", fontFamily: "inherit", resize: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={posalji} disabled={!razlog.trim() || loading}
            style={{ flex: 1, background: razlog.trim() && !loading ? C.zuta : C.hover, border: "none",
              borderRadius: 8, color: razlog.trim() ? "#000" : "#666", fontSize: 13, fontWeight: 700,
              padding: "12px", cursor: razlog.trim() ? "pointer" : "not-allowed" }}>
            {loading ? "Šalje se..." : "📤 Pošalji zahtev adminu"}
          </button>
          <button type="button" onClick={onOtkazati}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.sivi, fontSize: 13, padding: "12px 16px", cursor: "pointer" }}>
            Otkaži
          </button>
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 10, textAlign: "center" }}>
          Admin će dobiti notifikaciju i odobriti ili odbiti zahtev
        </div>
      </div>
    </div>
  );
}

/** Provera odobrenog prekida za operatera + deo. */
export async function ucitajOdobrenPrekid(supabaseClient, { radnikId, idDeo }) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (deo.length < 3 || !radnikId) return null;

  const operaterId = Number(radnikId);
  if (!Number.isFinite(operaterId)) return null;

  const { data, error } = await supabaseClient.from("prekidi_zahtevi")
    .select("id,status,operater_id,id_deo,updated_at,created_at")
    .eq("id_deo", deo)
    .eq("operater_id", operaterId)
    .eq("status", "odobreno")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    console.error("ucitajOdobrenPrekid:", error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}

export async function zatvoriPrekidZahtev(supabaseClient, prekidId) {
  if (!prekidId) return;
  await supabaseClient.from("prekidi_zahtevi").update({
    status: "zatvoren",
    updated_at: new Date().toISOString(),
  }).eq("id", prekidId);
}
