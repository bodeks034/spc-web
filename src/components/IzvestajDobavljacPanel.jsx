import { useEffect, useMemo, useState } from "react";
import { fetchDobavljaci } from "../lib/dobavljaciApi.js";
import { fetchIzvestajDobavljacPodaci } from "../lib/izvestajDobavljacData.js";
import { preuzmiIzvestajDobavljacPdf, stampajIzvestajDobavljac } from "../lib/izvestajDobavljacPdf.js";
import {
  OPIS_FORMULE_KVALITETA,
  izracunajUkupnuOcenu,
  opisKlaseDobavljaca,
} from "../lib/ocenaDobavljaca.js";
import { sacuvajOcenuDobavljaca } from "../lib/ocenaDobavljacaApi.js";
import { jeKvalitetIliVise, jeAdmin } from "../lib/uloge.js";

function Tip({ tekst, children }) {
  return <span title={tekst} style={{ cursor: "help", borderBottom: "1px dotted currentColor" }}>{children}</span>;
}

function Kartica({ label, value, boja, C, title }) {
  return (
    <div title={title || undefined} style={{ background: C.panel, border: `1px solid ${boja}33`, borderRadius: 10, padding: 12, textAlign: "center" }}>
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.8 }}>{label}</div>
      <div style={{ color: boja, fontSize: 20, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Sekcija({ naslov, C, children, title }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div title={title || undefined} style={{ color: C.sivi, fontSize: 10, letterSpacing: 1, marginBottom: 8, cursor: title ? "help" : "default" }}>{naslov}</div>
      {children}
    </div>
  );
}

function bojaKlase(klasa, C) {
  if (klasa === "A") return C.zelena;
  if (klasa === "B") return C.plava;
  if (klasa === "C") return C.zuta || C.narandzasta;
  return C.crvena;
}

export default function IzvestajDobavljacPanel({ C, addToast, korisnik = null }) {
  const [dobavljaci, setDobavljaci] = useState([]);
  const [sifra, setSifra] = useState("");
  const [period, setPeriod] = useState("30");
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfRadi, setPdfRadi] = useState(false);
  const [semaFali, setSemaFali] = useState(false);

  useEffect(() => {
    fetchDobavljaci({ samoAktivni: true })
      .then(setDobavljaci)
      .catch((e) => addToast?.(e.message, "greska"));
  }, [addToast]);

  useEffect(() => { setPodaci(null); }, [sifra, period]);

  const generisi = async () => {
    setLoading(true);
    setSemaFali(false);
    try {
      setPodaci(await fetchIzvestajDobavljacPodaci({ sifraDobavljaca: sifra, period }));
    } catch (e) {
      const msg = String(e?.message || "");
      if (/prijemna_kontrola_dobavljaca|does not exist|schema cache/i.test(msg)) setSemaFali(true);
      else addToast?.(msg, "greska");
    } finally {
      setLoading(false);
    }
  };

  const pdf = async () => {
    setPdfRadi(true);
    try {
      await preuzmiIzvestajDobavljacPdf(podaci);
      addToast?.("✓ PDF izveštaj dobavljača", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPdfRadi(false);
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 12, padding: "10px 12px", fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 18, flex: 1, minHeight: 0, overflowY: "auto", boxSizing: "border-box" }}>
      <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 16 }} title="KPI prijema + periodična ocena dobavljača (Modul 2)">
        IZVEŠTAJ ZA DOBAVLJAČA
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 240 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>DOBAVLJAČ</span>
          <select value={sifra} onChange={(e) => setSifra(e.target.value)} style={INP}>
            <option value="">— Izaberi —</option>
            {dobavljaci.map((d) => <option key={d.sifra_dobavljaca} value={d.sifra_dobavljaca}>{d.sifra_dobavljaca} — {d.naziv_dobavljaca}</option>)}
          </select>
        </label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={INP}
          title="Period za KPI prijema i automatski kvalitetni skor"
        >
          <option value="7">7 dana</option><option value="30">30 dana</option>
          <option value="90">90 dana</option><option value="365">Godišnji</option>
        </select>
        <button type="button" disabled={!sifra || loading} onClick={generisi}
          style={{ background: !sifra ? C.hover : C.plava, border: "none", borderRadius: 8, color: C.onAkcent, padding: "11px 18px", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "…" : "Generiši"}
        </button>
        {podaci && <>
          <button type="button" disabled={pdfRadi} onClick={pdf}
            style={{ background: C.ljubicasta, border: "none", borderRadius: 8, color: C.onAkcent, padding: "11px 14px", fontWeight: 700, cursor: "pointer" }}>
            {pdfRadi ? "…" : "📄 PDF"}
          </button>
          <button type="button" onClick={() => stampajIzvestajDobavljac(podaci)}
            style={{ background: C.zelena, border: "none", borderRadius: 8, color: C.onAkcent, padding: "11px 14px", fontWeight: 700, cursor: "pointer" }}>
            🖨 Štampaj
          </button>
        </>}
      </div>

      {semaFali && <div style={{ marginTop: 14, padding: 12, border: `1px solid ${C.narandzasta}66`, borderRadius: 8, color: C.tekst, fontSize: 11 }}>
        Pokreni migraciju <strong>69_dobavljaci_prijemna_kontrola.sql</strong>.
      </div>}

      {podaci && (
        <Pregled
          podaci={podaci}
          C={C}
          addToast={addToast}
          korisnik={korisnik}
          onOcenaSnimljena={(istorija) => setPodaci((p) => ({ ...p, istorijaOcena: istorija }))}
        />
      )}
    </div>
  );
}

function Pregled({ podaci, C, addToast, korisnik, onOcenaSnimljena }) {
  const d = podaci.dobavljac;
  const s = podaci.stat;
  const status = d.aktivan === false ? "Neaktivan" : "Aktivan";
  return (
    <>
      <Sekcija naslov="PODACI O DOBAVLJAČU" C={C}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, padding: 12, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          {[["Šifra", d.sifra_dobavljaca], ["Naziv", d.naziv_dobavljaca], ["Država", d.drzava], ["Grad", d.grad], ["Status", status]]
            .map(([l, v]) => <div key={l}><div style={{ color: C.sivi, fontSize: 9 }}>{l.toUpperCase()}</div><div style={{ color: l === "Status" ? (d.aktivan === false ? C.crvena : C.zelena) : C.tekst, fontWeight: 600 }}>{v || "—"}</div></div>)}
        </div>
      </Sekcija>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginTop: 16 }}>
        <Kartica label="PRIJEMA" value={s.prijema} boja={C.plava} C={C} title="Broj prijemnih kontrola u periodu" />
        <Kartica label="KONTROLISANO" value={s.kontrolisano} boja={C.ljubicasta} C={C} title="Ukupan broj pregledanih jedinica" />
        <Kartica label="OK" value={s.ok} boja={C.zelena} C={C} title="Zbir OK količina iz prijemnih kontrola" />
        <Kartica label="NOK" value={s.nok} boja={C.crvena} C={C} title="Zbir NOK količina iz prijemnih kontrola" />
        <Kartica label="OK STOPA" value={`${s.okStopa}%`} boja={C.zuta} C={C} title="OK / kontrolisano × 100" />
        <Kartica label="PPM" value={s.ppm} boja={C.narandzasta} C={C} title="NOK / kontrolisano × 1.000.000" />
      </div>

      <OcenaDobavljacaKartica
        podaci={podaci}
        C={C}
        addToast={addToast}
        korisnik={korisnik}
        onOcenaSnimljena={onOcenaSnimljena}
      />

      <Sekcija naslov={`KVALITET PO MATERIJALU / DELU (${podaci.materijali.length})`} C={C}>
        <Tabela C={C} redovi={podaci.materijali} kolone={[
          ["ŠIFRA", "sifra_materijala"], ["NAZIV", "naziv_materijala"],
          ["KONTROL.", "kontrolisano"], ["OK", "ok"], ["NOK", "nok"], ["OK %", "okStopa"],
        ]} />
      </Sekcija>

      {podaci.defekti.length > 0 && <Sekcija naslov="PARETO DEFEKATA" C={C}>
        <Tabela C={C} redovi={podaci.defekti} kolone={[["DEFEKT", "defekt"], ["NOK KOL.", "kolicina"]]} />
      </Sekcija>}

      <Sekcija naslov={`PRIJEMNE KONTROLE (${podaci.kontrole.length})`} C={C}>
        <Tabela C={C} redovi={podaci.kontrole} kolone={[
          ["DATUM", "datum"], ["MATERIJAL", "sifra_materijala"], ["LOT", "broj_lota"],
          ["KONTROL.", "kontrolisano"], ["OK", "ok_kolicina"], ["NOK", "nok_kolicina"],
          ["FOTO NOK", "foto_nok"], ["STATUS", "status"],
        ]} />
      </Sekcija>

      {(() => {
        const fotoRedovi = (podaci.kontrole || []).filter((r) => String(r.foto_nok || "").startsWith("data:image"));
        if (!fotoRedovi.length) return null;
        return (
          <Sekcija naslov={`FOTO NOK DELA (${fotoRedovi.length})`} C={C}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {fotoRedovi.map((r) => (
                <div key={`foto-${r.id}`} style={{
                  background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
                }}>
                  <img
                    src={r.foto_nok}
                    alt="NOK deo"
                    style={{ width: "100%", height: 160, objectFit: "cover", display: "block", background: C.hover }}
                  />
                  <div style={{ padding: "10px 12px", fontSize: 11, color: C.tekst, lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 700 }}>{r.datum || "—"} · {r.sifra_materijala || r.id_deo || "—"}</div>
                    <div style={{ color: C.sivi }}>Lot: {r.broj_lota || "—"} · {r.status || "—"}</div>
                    {(r.defekt || r.foto_komentar) && (
                      <div style={{ marginTop: 4 }}>{r.defekt || r.foto_komentar}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Sekcija>
        );
      })()}
    </>
  );
}

function OcenaDobavljacaKartica({ podaci, C, addToast, korisnik, onOcenaSnimljena }) {
  const predlog = podaci.predlogOcene || {};
  const mozeUnos = jeKvalitetIliVise(korisnik?.uloga) || jeAdmin(korisnik?.uloga);
  const [isporuka, setIsporuka] = useState(String(predlog.isporuka ?? 100));
  const [dokumentacija, setDokumentacija] = useState(String(predlog.dokumentacija ?? 100));
  const [reakcija, setReakcija] = useState(String(predlog.reakcija ?? 100));
  const [izvor, setIzvor] = useState("rucno");
  const [obrazlozenje, setObrazlozenje] = useState("");
  const [odobreno, setOdobreno] = useState(false);
  const [snima, setSnima] = useState(false);

  useEffect(() => {
    setIsporuka(String(predlog.isporuka ?? 100));
    setDokumentacija(String(predlog.dokumentacija ?? 100));
    setReakcija(String(predlog.reakcija ?? 100));
    setObrazlozenje("");
    setOdobreno(false);
  }, [podaci.dobavljac?.sifra_dobavljaca, podaci.period, predlog.isporuka, predlog.dokumentacija, predlog.reakcija]);

  const live = useMemo(() => {
    if (predlog.kvalitet == null) return null;
    try {
      return {
        kvalitet: predlog.kvalitet,
        ...izracunajUkupnuOcenu({
          kvalitet: predlog.kvalitet,
          isporuka,
          dokumentacija,
          reakcija,
        }),
      };
    } catch {
      return null;
    }
  }, [predlog.kvalitet, isporuka, dokumentacija, reakcija]);

  const snimi = async () => {
    setSnima(true);
    try {
      const sacuvan = await sacuvajOcenuDobavljaca({
        sifraDobavljaca: podaci.dobavljac.sifra_dobavljaca,
        periodOd: podaci.datumOd,
        periodDo: podaci.periodDo,
        stat: podaci.stat,
        ocena: {
          kvalitet: predlog.kvalitet,
          isporuka,
          dokumentacija,
          reakcija,
        },
        izvor,
        obrazlozenje,
        odobreno,
        radnikId: korisnik?.radnikId,
      });
      addToast?.(
        `✓ Ocena sačuvana: ${sacuvan.ukupna_ocena} (${sacuvan.klasa}) — ${sacuvan.status}`,
        "uspeh",
      );
      onOcenaSnimljena?.([sacuvan, ...(podaci.istorijaOcena || [])]);
      setObrazlozenje("");
      setOdobreno(false);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <Sekcija
      naslov="OCENA DOBAVLJAČA"
      C={C}
      title="Ukupna ocena = kvalitet 60% + isporuka 20% + dokumentacija 10% + reakcija 10%. Aplikacija ne blokira dobavljača automatski."
    >
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
      }}>
        <div style={{ fontSize: 11, color: C.tekst, lineHeight: 1.45, marginBottom: 10 }}>
          <Tip tekst={OPIS_FORMULE_KVALITETA}>Kvalitet (60%)</Tip>{" "}
          se računa automatski iz PPM-a i odbijenih/uslovnih prijema.
          {" "}
          <Tip tekst="OTIF / rok i potpunost isporuke — ručni ili ERP unos">Isporuka (20%)</Tip>,
          {" "}
          <Tip tekst="Sertifikati, prijemnica i sledljivost — ručni ili ERP unos">dokumentacija (10%)</Tip>
          {" "}i{" "}
          <Tip tekst="Vreme odgovora i zatvaranja reklamacije / 8D — ručni ili ERP unos">reakcija (10%)</Tip>
          {" "}se unose ručno. Klasa D je samo predlog — bez automatske blokade.
        </div>

        {predlog.kvalitet == null ? (
          <div style={{ color: C.sivi, fontSize: 11 }}>
            Nema dovoljno kontrolisanih prijema za automatski kvalitetni skor u ovom periodu.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 12 }}>
              <Kartica label="KVALITET 60%" value={predlog.kvalitet} boja={C.plava} C={C} title={OPIS_FORMULE_KVALITETA} />
              <Kartica label="UKUPNO" value={live?.ukupno ?? "—"} boja={bojaKlase(live?.klasa, C)} C={C} title="Ponderisana ocena 0–100" />
              <Kartica
                label="KLASA"
                value={live?.klasa || "—"}
                boja={bojaKlase(live?.klasa, C)}
                C={C}
                title={opisKlaseDobavljaca(live?.klasa)}
              />
            </div>
            <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }} title={opisKlaseDobavljaca(live?.klasa)}>
              {opisKlaseDobavljaca(live?.klasa)} · A 90–100 · B 75–89 · C 60–74 · D &lt; 60
            </div>

            {mozeUnos ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: C.sivi, fontSize: 9 }} title="OTIF / rok i potpunost isporuke">ISPORUKA (0–100)</span>
                  <input type="number" min="0" max="100" step="0.1" value={isporuka} onChange={(e) => setIsporuka(e.target.value)} style={INP} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: C.sivi, fontSize: 9 }} title="Sertifikati, prijemnica, sledljivost">DOKUMENTACIJA (0–100)</span>
                  <input type="number" min="0" max="100" step="0.1" value={dokumentacija} onChange={(e) => setDokumentacija(e.target.value)} style={INP} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: C.sivi, fontSize: 9 }} title="Vreme odgovora i zatvaranja reklamacije / 8D">REAKCIJA (0–100)</span>
                  <input type="number" min="0" max="100" step="0.1" value={reakcija} onChange={(e) => setReakcija(e.target.value)} style={INP} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: C.sivi, fontSize: 9 }} title="Odakle dolaze skorovi isporuke, dokumentacije i reakcije">IZVOR OSTALIH OCENA</span>
                  <select value={izvor} onChange={(e) => setIzvor(e.target.value)} style={INP}>
                    <option value="rucno">Ručni unos</option>
                    <option value="erp">ERP / spoljni izvor</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                  <span style={{ color: C.sivi, fontSize: 9 }} title="Obavezno za istoriju i audit trag">OBRAZLOŽENJE *</span>
                  <input
                    value={obrazlozenje}
                    onChange={(e) => setObrazlozenje(e.target.value)}
                    placeholder="Npr. PPM u granicama, OTIF 96%, 8D zatvoren za 5 dana"
                    style={INP}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.tekst }}
                  title="Odobrena ocena je zvanični snapshot. I dalje ne menja status dobavljača automatski.">
                  <input type="checkbox" checked={odobreno} onChange={(e) => setOdobreno(e.target.checked)} />
                  Označi kao odobreno (kvalitet / nabavka)
                </label>
                <div style={{ display: "flex", alignItems: "end" }}>
                  <button
                    type="button"
                    disabled={snima || !live}
                    onClick={snimi}
                    title="Čuva snapshot ocene u istoriju. Ne blokira dobavljača."
                    style={{
                      background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
                      fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
                    }}
                  >
                    {snima ? "…" : "Sačuvaj ocenu u istoriju"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: C.sivi, fontSize: 11 }}>
                Unos i odobrenje ocene: uloge kvalitet / šef / admin.
              </div>
            )}
          </>
        )}

        {(podaci.istorijaOcena || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.8, marginBottom: 6 }} title="Poslednje sačuvane ocene za ovog dobavljača">
              ISTORIJA OCENA
            </div>
            <Tabela
              C={C}
              redovi={podaci.istorijaOcena}
              kolone={[
                ["PERIOD DO", "period_do"],
                ["UKUPNO", "ukupna_ocena"],
                ["KLASA", "klasa"],
                ["KVAL.", "kvalitet_skor"],
                ["ISP.", "isporuka_skor"],
                ["DOK.", "dokumentacija_skor"],
                ["REAK.", "reakcija_skor"],
                ["STATUS", "status"],
              ]}
            />
          </div>
        )}
      </div>
    </Sekcija>
  );
}

function Tabela({ C, redovi, kolone }) {
  if (!redovi?.length) return <div style={{ color: C.sivi, fontSize: 11 }}>Nema podataka za period.</div>;
  const cols = kolone.map((_, i) => i === 1 ? "1fr" : "minmax(80px,auto)").join(" ");
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <div style={{ minWidth: 680 }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "8px 10px", background: C.hover, color: C.sivi, fontSize: 9 }}>
          {kolone.map(([l]) => <span key={l}>{l}</span>)}
        </div>
        {redovi.map((r, i) => <div key={r.id || r.sifra_materijala || r.defekt || i} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "8px 10px", borderTop: `1px solid ${C.border}`, color: C.tekst, fontSize: 11 }}>
          {kolone.map(([l, k]) => (
            <span key={l}>
              {k === "foto_nok" && r[k]
                ? <img src={r[k]} alt="NOK deo" title={r.foto_komentar || "Foto NOK dela"} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }} />
                : (r[k] ?? "—")}
            </span>
          ))}
        </div>)}
      </div>
    </div>
  );
}
