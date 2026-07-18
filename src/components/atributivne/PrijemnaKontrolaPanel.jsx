import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDobavljaci,
  fetchMaterijaliDobavljaca,
  fetchPrijemneKontrole,
  upsertPrijemnaKontrola,
  syncPrijemnaIzKontrolnogLoga,
} from "../../lib/dobavljaciApi.js";
import FotoNokUnos from "../FotoNokUnos.jsx";

const danas = () => new Date().toISOString().slice(0, 10);
const PRAZAN = {
  datum: danas(),
  sifra_dobavljaca: "",
  sifra_materijala: "",
  id_deo: "",
  broj_lota: "",
  broj_dokumenta: "",
  primljeno: "",
  kontrolisano: "",
  ok_kolicina: "",
  nok_kolicina: "",
  defekt: "",
  foto_nok: null,
  foto_komentar: "",
  status: "otvoreno",
  napomena: "",
};

const STATUS_LABEL = {
  prihvaceno: "Prihvaćeno",
  uslovno: "Uslovno",
  odbijeno: "Odbijeno",
  otvoreno: "Otvoreno",
};

export default function PrijemnaKontrolaPanel({ C, addToast, onPokreniKontrolu }) {
  const [lista, setLista] = useState([]);
  const [dobavljaci, setDobavljaci] = useState([]);
  const [materijali, setMaterijali] = useState([]);
  const [forma, setForma] = useState(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [snima, setSnima] = useState(false);
  const [syncId, setSyncId] = useState(null);
  const [semaFali, setSemaFali] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    setSemaFali(false);
    try {
      const [d, m, p] = await Promise.all([
        fetchDobavljaci({ samoAktivni: true }),
        fetchMaterijaliDobavljaca(),
        fetchPrijemneKontrole(),
      ]);
      setDobavljaci(d);
      setMaterijali(m);
      setLista(p);
    } catch (e) {
      const msg = String(e?.message || "");
      if (/prijemna_kontrola_dobavljaca|does not exist|schema cache/i.test(msg)) {
        setSemaFali(true);
      } else {
        addToast?.(msg, "greska");
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const dobavljacMapa = useMemo(
    () => new Map(dobavljaci.map((d) => [d.sifra_dobavljaca, d.naziv_dobavljaca])),
    [dobavljaci],
  );
  const materijaliZaFormu = materijali.filter((m) =>
    !forma?.sifra_dobavljaca || m.sifra_dobavljaca === forma.sifra_dobavljaca);

  const snimi = async () => {
    setSnima(true);
    try {
      const sacuvan = await upsertPrijemnaKontrola(forma);
      addToast?.("✓ Prijem dobavljača sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
      return sacuvan;
    } catch (e) {
      addToast?.(e.message, "greska");
      return null;
    } finally {
      setSnima(false);
    }
  };

  const pokreniKontrolu = async (red) => {
    let zapis = red;
    if (!zapis?.id) {
      if (!forma) {
        addToast?.("Sačuvaj prijem pre pokretanja kontrole", "greska");
        return;
      }
      setSnima(true);
      try {
        zapis = await upsertPrijemnaKontrola(forma);
        setForma(null);
        await ucitaj();
      } catch (e) {
        addToast?.(e.message, "greska");
        return;
      } finally {
        setSnima(false);
      }
    }
    const idDeo = String(zapis?.id_deo || "").trim();
    if (!idDeo) {
      addToast?.("Za Ulaznu kontrolu unesi ID deo na prijemu", "greska");
      return;
    }
    if (typeof onPokreniKontrolu !== "function") {
      addToast?.("Navigacija ka unosu nije dostupna u ovom režimu", "greska");
      return;
    }
    onPokreniKontrolu(zapis);
  };

  const osveziIzKontrole = async (id) => {
    setSyncId(id);
    try {
      const r = await syncPrijemnaIzKontrolnogLoga(id);
      addToast?.(
        `✓ Iz Ulazne kontrole: OK ${r.ok} · NOK ${r.nok} · kontrolisano ${r.kontrolisano}`,
        "uspeh",
      );
      await ucitaj();
      if (forma?.id === id) setForma(r.prijem);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSyncId(null);
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };
  const q = filter.trim().toLowerCase();
  const prikaz = lista.filter((r) => !q || [
    r.sifra_dobavljaca, dobavljacMapa.get(r.sifra_dobavljaca), r.sifra_materijala,
    r.id_deo, r.broj_lota, r.broj_dokumenta, r.defekt, r.status,
  ].some((v) => String(v || "").toLowerCase().includes(q)));

  if (semaFali) {
    return (
      <div style={{ padding: 16, border: `1px solid ${C.narandzasta}66`, borderRadius: 8, color: C.tekst, fontSize: 11 }}>
        Pokreni migraciju <strong>69_dobavljaci_prijemna_kontrola.sql</strong>, zatim osveži stranicu.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        marginBottom: 12, padding: "10px 12px", borderRadius: 8,
        border: `1px solid ${C.plava}33`, background: `${C.plava}0d`, fontSize: 11, color: C.tekst, lineHeight: 1.45,
      }}>
        <strong>Prijem dobavljača</strong> = lot / prijemnica (količine + odluka).
        {" "}
        <strong>Ulazna kontrola (pogon A)</strong> = detaljan unos karakteristika po komadu.
        {" "}
        Tok: sačuvaj prijem → <em>Pokreni kontrolu</em> → snimi OK/NOK u Unosu → količine se vrate ovde.
        Odluka Prihvaćeno / Uslovno / Odbijeno ostaje ovde.
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 190 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Dobavljač, materijal, deo, lot, defekt…" style={INP} />
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN, datum: danas() })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Novi prijem
        </button>
      </div>

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginBottom: 10 }}>
            <Polje label="DATUM *"><input type="date" value={forma.datum || ""} onChange={(e) => setForma((p) => ({ ...p, datum: e.target.value }))} style={INP} /></Polje>
            <Polje label="DOBAVLJAČ *">
              <select value={forma.sifra_dobavljaca || ""} onChange={(e) => setForma((p) => ({ ...p, sifra_dobavljaca: e.target.value, sifra_materijala: "" }))} style={INP}>
                <option value="">— Izaberi —</option>
                {dobavljaci.map((d) => <option key={d.sifra_dobavljaca} value={d.sifra_dobavljaca}>{d.sifra_dobavljaca} — {d.naziv_dobavljaca}</option>)}
              </select>
            </Polje>
            <Polje label="MATERIJAL">
              <select value={forma.sifra_materijala || ""} onChange={(e) => setForma((p) => ({ ...p, sifra_materijala: e.target.value }))} style={INP}>
                <option value="">— Nije izabrano —</option>
                {materijaliZaFormu.map((m) => <option key={m.sifra_materijala} value={m.sifra_materijala}>{m.sifra_materijala} — {m.naziv_materijala}</option>)}
              </select>
            </Polje>
            {[
              ["id_deo", "ID DEO (za Ulaznu kontrolu)"],
              ["broj_lota", "BROJ LOTA"],
              ["broj_dokumenta", "DOKUMENT / PRIJEMNICA"],
            ].map(([key, label]) => (
              <Polje key={key} label={label}><input value={forma[key] || ""} onChange={(e) => setForma((p) => ({ ...p, [key]: e.target.value }))} style={INP} /></Polje>
            ))}
            {[
              ["primljeno", "PRIMLJENO"],
              ["kontrolisano", "KONTROLISANO"],
              ["ok_kolicina", "OK"],
              ["nok_kolicina", "NOK"],
            ].map(([key, label]) => (
              <Polje key={key} label={label}><input type="number" min="0" step="any" value={forma[key] ?? ""} onChange={(e) => setForma((p) => ({ ...p, [key]: e.target.value }))} style={INP} /></Polje>
            ))}
            <Polje label="DEFEKT"><input value={forma.defekt || ""} onChange={(e) => setForma((p) => ({ ...p, defekt: e.target.value }))} style={INP} /></Polje>
            <Polje label="STATUS PRIJEMA (odluka)">
              <select value={forma.status || "otvoreno"} onChange={(e) => setForma((p) => ({ ...p, status: e.target.value }))} style={INP}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Polje>
            <Polje label="NAPOMENA"><input value={forma.napomena || ""} onChange={(e) => setForma((p) => ({ ...p, napomena: e.target.value }))} style={INP} /></Polje>
          </div>
          <div style={{ maxWidth: 420, marginBottom: 10 }}>
            <FotoNokUnos
              C={C}
              foto={forma.foto_nok}
              komentar={forma.foto_komentar}
              onFoto={(foto_nok) => setForma((p) => ({ ...p, foto_nok }))}
              onKomentar={(foto_komentar) => setForma((p) => ({ ...p, foto_komentar }))}
              onGreska={(poruka) => addToast?.(poruka, "greska")}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={snima} onClick={snimi}
              style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>
              {snima ? "…" : "Sačuvaj prijem"}
            </button>
            <button type="button" disabled={snima} onClick={() => pokreniKontrolu(forma)}
              style={{ background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>
              Pokreni Ulaznu kontrolu
            </button>
            {forma.id && (
              <button type="button" disabled={syncId === forma.id} onClick={() => osveziIzKontrole(forma.id)}
                style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.tekst, fontSize: 11, padding: "8px 14px", cursor: "pointer" }}>
                {syncId === forma.id ? "…" : "Osveži OK/NOK iz kontrole"}
              </button>
            )}
            <button type="button" onClick={() => setForma(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, fontSize: 11, padding: "8px 14px", cursor: "pointer" }}>
              Otkaži
            </button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div> : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <div style={{ minWidth: 1480 }}>
            <div style={{ display: "grid", gridTemplateColumns: "90px 170px 100px 90px 100px 100px 75px 75px 60px 60px 56px 100px 150px", background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8 }}>
              <span>DATUM</span><span>DOBAVLJAČ</span><span>MATERIJAL</span><span>ID DEO</span><span>LOT</span>
              <span>DOKUMENT</span><span>PRIMLJ.</span><span>KONT.</span><span>OK</span><span>NOK</span><span>FOTO</span><span>STATUS</span><span />
            </div>
            {prikaz.map((r, i) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "90px 170px 100px 90px 100px 100px 75px 75px 60px 60px 56px 100px 150px", padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8, alignItems: "center" }}>
                <span>{r.datum}</span><span>{r.sifra_dobavljaca} · {dobavljacMapa.get(r.sifra_dobavljaca) || "—"}</span>
                <span>{r.sifra_materijala || "—"}</span><span>{r.id_deo || "—"}</span>
                <span>{r.broj_lota || "—"}</span><span>{r.broj_dokumenta || "—"}</span>
                <span>{r.primljeno}</span><span>{r.kontrolisano}</span>
                <span style={{ color: C.zelena }}>{r.ok_kolicina}</span><span style={{ color: Number(r.nok_kolicina) ? C.crvena : C.sivi }}>{r.nok_kolicina}</span>
                <span>{r.foto_nok ? <img src={r.foto_nok} alt="NOK deo" title={r.foto_komentar || "Foto NOK dela"} style={{ width: 44, height: 34, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.border}` }} /> : "—"}</span>
                <span style={{ color: r.status === "odbijeno" ? C.crvena : r.status === "uslovno" ? C.zuta : C.zelena }}>{STATUS_LABEL[r.status] || r.status}</span>
                <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setForma({ ...r })}
                    style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
                  <button type="button" onClick={() => pokreniKontrolu(r)} title="Otvori Ulaznu kontrolu (pogon A)"
                    style={{ background: `${C.plava}22`, border: `1px solid ${C.plava}`, borderRadius: 4, color: C.plava, fontSize: 9, fontWeight: 700, padding: "2px 5px", cursor: "pointer" }}>Kontrola</button>
                  <button type="button" disabled={syncId === r.id} onClick={() => osveziIzKontrole(r.id)} title="Preuzmi OK/NOK iz atributivnog unosa"
                    style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>
                    {syncId === r.id ? "…" : "↻"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>{prikaz.length} prijema dobavljača</div>
    </div>
  );
}

function Polje({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: "inherit", opacity: 0.65, fontSize: 9 }}>{label}</span>
      {children}
    </label>
  );
}
