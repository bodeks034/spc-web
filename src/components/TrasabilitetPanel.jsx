import { useState, useEffect } from "react";

import { supabase } from "../lib/supabaseClient.js";

import { ucitajTrasabilitet, preuzmiTrasabilitetPdf, filtrirajLanacPoKomadu } from "../lib/trasabilitetIzvestaj.js";
import { getAktivnaSesija } from "../lib/spcSesija.js";
import { fetchKpiFilterOpcijeZaDeo } from "../lib/kpiUnos.js";
import { procitajNavigacijuTrasabilitet } from "../lib/workflowAkcije.js";

function danasIsoLokalno() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function danasMinusLokalno(dana) {
  const d = new Date();
  d.setDate(d.getDate() - dana);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}



function LanacTabela({ C, lanac }) {

  if (!lanac?.length) {

    return (

      <div style={{ fontSize: 10, color: C.sivi, padding: "8px 0" }}>

        Nema događaja za izabrane filtere.

      </div>

    );

  }

  const th = {

    textAlign: "left",

    padding: "6px 8px",

    fontSize: 9,

    color: C.sivi,

    borderBottom: `1px solid ${C.border}`,

    fontWeight: 700,

    letterSpacing: 0.4,

    textTransform: "uppercase",

  };

  const td = {

    padding: "5px 8px",

    fontSize: 9,

    color: C.tekst,

    borderBottom: `1px solid ${C.border}44`,

    verticalAlign: "top",

    lineHeight: 1.4,

  };

  return (

    <div style={{ overflowX: "auto", marginTop: 8 }}>

      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>

        <thead>

          <tr>

            <th style={th}>Vreme</th>

            <th style={th}>Tip</th>

            <th style={th}>RN</th>

            <th style={th}>Lot/VIN</th>

            <th style={th}>Operacija</th>

            <th style={th}>Alat</th>

            <th style={th}>Operater</th>

          </tr>

        </thead>

        <tbody>

          {lanac.slice(0, 80).map((d, i) => (

            <tr key={`${d.ts}-${i}`}>

              <td style={td}>{d.ts ? String(d.ts).slice(0, 16).replace("T", " ") : "—"}</td>

              <td style={td}>{d.tip}</td>

              <td style={td}>{d.rn}</td>

              <td style={{ ...td, fontWeight: d.lot !== "—" ? 600 : 400 }}>{d.lot}</td>

              <td style={td}>{d.operacija}</td>

              <td style={td}>{d.alat}</td>

              <td style={td}>{d.operater}</td>

            </tr>

          ))}

        </tbody>

      </table>

      {lanac.length > 80 && (

        <div style={{ fontSize: 9, color: C.sivi, marginTop: 6 }}>

          Prikazano 80 od {lanac.length} — pun lanac u PDF-u.

        </div>

      )}

    </div>

  );

}



export default function TrasabilitetPanel({ C, addToast, modul = "merljive", pocetniIdDeo = "" }) {

  const [idDeo, setIdDeo] = useState(() => String(pocetniIdDeo || "").trim().toUpperCase());

  const [vinLot, setVinLot] = useState("");

  const [koristiSesiju, setKoristiSesiju] = useState(true);
  const [datumOd, setDatumOd] = useState(() => danasMinusLokalno(30));
  const [datumDo, setDatumDo] = useState(() => danasIsoLokalno());
  const [smenaFilter, setSmenaFilter] = useState("");
  const [filterOpcije, setFilterOpcije] = useState({ stavke: [], datumi: [], smene: [] });
  const [podaci, setPodaci] = useState(null);
  const [lanacSirovi, setLanacSirovi] = useState([]);

  const [loading, setLoading] = useState(false);

  const [pdfBusy, setPdfBusy] = useState(false);



  useEffect(() => {

    const id = String(pocetniIdDeo || "").trim().toUpperCase();

    if (id) setIdDeo(id);

    const nav = procitajNavigacijuTrasabilitet();
    if (nav) {
      if (nav.idDeo) setIdDeo(nav.idDeo);
      if (nav.vinLot) setVinLot(nav.vinLot);
      if (nav.datumOd) setDatumOd(nav.datumOd);
      if (nav.datumDo) setDatumDo(nav.datumDo);
    }

  }, [pocetniIdDeo]);

  useEffect(() => {
    const id = String(idDeo || "").trim().toUpperCase();
    if (id.length < 3) {
      setFilterOpcije({ stavke: [], datumi: [], smene: [] });
      return;
    }
    let ok = true;
    (async () => {
      const opcije = await fetchKpiFilterOpcijeZaDeo(supabase, { modul, idDeo: id });
      if (ok) setFilterOpcije(opcije);
    })();
    return () => { ok = false; };
  }, [idDeo, modul]);



  const ucitaj = async () => {

    if (!idDeo.trim()) {

      addToast?.("Unesite ID dela", "greska");

      return;

    }

    setLoading(true);

    const sesija = koristiSesiju ? getAktivnaSesija(modul)?.sesija_id : null;

    const r = await ucitajTrasabilitet(supabase, {

      idDeo: idDeo.trim(),

      sesijaId: sesija,

      vinLot: vinLot.trim() || null,

      datumOd: datumOd || null,

      datumDo: datumDo || null,

    });

    setLoading(false);

    if (r.greska) {

      addToast?.(r.greska, "greska");

      setPodaci(null);
      setLanacSirovi([]);
      return;

    }

    setPodaci(r);
    setLanacSirovi(r.lanacSirovi || r.lanac || []);

  };



  const vrednostKomada = (k) => String(
    k.vin || (k.lot !== "—" ? k.lot : k.kljuc) || "",
  ).trim().toUpperCase();

  const izaberiKomad = (k) => {
    const q = vrednostKomada(k);
    if (!q) return;
    setVinLot(q);
    if (!podaci) return;
    const lanac = filtrirajLanacPoKomadu(lanacSirovi, q);
    setPodaci((p) => (p ? { ...p, lanac, vinLot: q } : p));
  };

  const ocistiVinFilter = () => {
    setVinLot("");
    if (!podaci) return;
    setPodaci((p) => (p ? { ...p, lanac: lanacSirovi, vinLot: null } : p));
  };



  const preuzmiPdf = async () => {

    if (!podaci) {

      addToast?.("Prvo učitajte podatke", "greska");

      return;

    }

    setPdfBusy(true);

    try {

      await preuzmiTrasabilitetPdf(podaci, C);

      addToast?.("PDF preuzet", "uspeh");

    } catch (e) {

      addToast?.(e.message || "Greška pri PDF-u", "greska");

    } finally {

      setPdfBusy(false);

    }

  };



  const INP = {

    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,

    color: C.tekst, fontSize: 12, padding: "8px 10px", width: "100%", boxSizing: "border-box",

  };



  return (

    <div style={{

      background: C.panel,

      border: `1px solid ${C.border}`,

      borderRadius: 12,

      padding: 18,

      maxWidth: 960,

      display: "flex",

      flexDirection: "column",

      gap: 12,

    }}>

      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>

        TRASABILITET IZVEŠTAJ

      </div>

      <p style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, margin: 0 }}>

        Lanac po komadu: RN → lot/VIN → operacija → alat → operater. PDF za kupca / audit.

      </p>



      <div style={{

        display: "flex",

        gap: 8,

        flexWrap: "wrap",

        alignItems: "center",

        padding: "10px 12px",

        background: C.hover,

        borderRadius: 8,

        border: `1px solid ${C.border}`,

      }}>

        <input

          style={{ ...INP, flex: "1 1 140px" }}

          value={idDeo}

          onChange={e => setIdDeo(e.target.value.toUpperCase())}

          placeholder="ID delo"

          onKeyDown={(e) => e.key === "Enter" && ucitaj()}

        />

        <input

          style={{ ...INP, flex: "1 1 140px" }}

          value={vinLot}

          onChange={e => setVinLot(e.target.value.toUpperCase())}

          placeholder="VIN / lot / serija (opciono)"

          data-testid="trasabilitet-vin-lot"

          onKeyDown={(e) => e.key === "Enter" && ucitaj()}

        />

        {vinLot && (
          <button
            type="button"
            onClick={ocistiVinFilter}
            title="Prikaži sve komade"
            style={{
              background: C.hover,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              padding: "8px 10px",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕ VIN
          </button>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi, whiteSpace: "nowrap" }}>

          <input type="checkbox" checked={koristiSesiju} onChange={e => setKoristiSesiju(e.target.checked)} />

          Samo aktivna sesija

        </label>

        <select style={{ ...INP, flex: "0 1 100px" }} value={smenaFilter} onChange={(e) => setSmenaFilter(e.target.value)}>
          <option value="">Sve smene</option>
          {(filterOpcije.smene.length ? filterOpcije.smene : ["1", "2", "3"]).map((s) => (
            <option key={s} value={s}>S{s}</option>
          ))}
        </select>

        <label style={{ fontSize: 10, color: C.sivi }}>
          Od
          <input
            type="date"
            style={{ ...INP, flex: "0 1 130px", display: "block", marginTop: 4 }}
            value={datumOd}
            onChange={(e) => setDatumOd(e.target.value)}
          />
        </label>

        <label style={{ fontSize: 10, color: C.sivi }}>
          Do
          <input
            type="date"
            style={{ ...INP, flex: "0 1 130px", display: "block", marginTop: 4 }}
            value={datumDo}
            onChange={(e) => setDatumDo(e.target.value)}
          />
        </label>

        <button

          type="button"

          onClick={ucitaj}

          disabled={loading}

          style={{

            background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,

            padding: "10px 18px", fontWeight: 700, fontSize: 11, cursor: "pointer",

            minWidth: 88,

          }}

        >

          {loading ? "…" : "Učitaj"}

        </button>

        <button
          type="button"
          onClick={async () => {
            if (!podaci || !vinLot.trim()) {
              addToast?.("Unesite VIN/lot za ISO PDF", "greska");
              return;
            }
            setPdfBusy(true);
            try {
              const { preuzmiTrasabilitetPdfPoLotu } = await import("../lib/trasabilitetIzvestaj.js");
              await preuzmiTrasabilitetPdfPoLotu(podaci, vinLot.trim());
              addToast?.("ISO PDF po lotu preuzet", "uspeh");
            } catch (e) {
              addToast?.(e.message, "greska");
            } finally {
              setPdfBusy(false);
            }
          }}
          disabled={!podaci || !vinLot.trim() || pdfBusy}
          title="ISO trasabilitet samo za uneti lot/VIN"
          style={{
            background: podaci && vinLot.trim() ? C.hover : C.bg,
            border: `2px solid ${C.border}`,
            borderRadius: 6,
            color: C.tekst,
            padding: "10px 14px",
            fontWeight: 700,
            fontSize: 10,
            cursor: podaci && vinLot.trim() ? "pointer" : "not-allowed",
          }}
        >
          ISO PDF
        </button>

        <button

          type="button"

          onClick={preuzmiPdf}

          disabled={!podaci || pdfBusy}

          title={podaci ? "Preuzmi PDF izveštaj" : "Učitajte podatke pre PDF-a"}

          style={{

            background: podaci ? C.zelena : C.hover,

            border: `2px solid ${podaci ? C.zelena : C.border}`,

            borderRadius: 6,

            color: podaci ? C.onAkcent : C.sivi,

            padding: "10px 20px",

            fontWeight: 800,

            fontSize: 12,

            cursor: podaci ? "pointer" : "not-allowed",

            minWidth: 100,

            letterSpacing: 0.5,

          }}

        >

          {pdfBusy ? "…" : "⬇ PDF"}

        </button>

      </div>



      {podaci && (

        <>

          <div style={{ fontSize: 10, color: C.tekst, lineHeight: 1.8 }}>

            <div><strong>Merenja:</strong> {podaci.merenja.length}</div>

            <div><strong>Moment protokol:</strong> {podaci.momenti?.length ?? 0}</div>

            <div><strong>SPC alarmi:</strong> {podaci.alarmi?.length ?? 0}</div>

            <div><strong>NCR / CAPA:</strong> {podaci.ncr?.length ?? 0}</div>

            <div><strong>KPI:</strong> {podaci.kpi.length}</div>

            <div><strong>Kontrolni log:</strong> {podaci.log.length}</div>

            <div><strong>Komada u lancu:</strong> {podaci.poKomadu?.length ?? 0}</div>

            {podaci.sesijaId && <div style={{ color: C.sivi }}>Sesija: {podaci.sesijaId}</div>}

            {podaci.vinLot && <div style={{ color: C.sivi }}>Filter komad: {podaci.vinLot}</div>}

            {podaci.ncrGreska && (

              <div style={{ color: C.narandzasta || C.zuta, marginTop: 6 }}>

                NCR tabela: pokrenite 59_ncr_capa.sql u Supabase

              </div>

            )}

          </div>



          {podaci.poKomadu?.length > 0 && (

            <div style={{

              background: C.hover,

              border: `1px solid ${C.border}`,

              borderRadius: 8,

              padding: "10px 12px",

            }}>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.tekst, marginBottom: 6 }}>

                Po komadu ({podaci.poKomadu.length}) — klik za filter

              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

                {podaci.poKomadu.map((k) => {
                  const v = vrednostKomada(k);
                  const aktivan = vinLot && v === String(vinLot).trim().toUpperCase();
                  return (
                  <button
                    key={k.kljuc}
                    type="button"
                    onClick={() => izaberiKomad(k)}
                    title={`Filtriraj lanac: ${v}`}
                    style={{
                      fontSize: 9,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: aktivan ? `${C.plava}22` : C.panel,
                      border: `1px solid ${aktivan ? C.plava : C.border}`,
                      color: aktivan ? C.plava : C.tekst,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >

                    {k.vin ? `VIN ${k.vin}` : (k.lot !== "—" ? `Lot ${k.lot}` : k.kljuc)}

                    {" · "}{k.dogadjaji.length} dog.

                  </button>
                  );
                })}

              </div>

            </div>

          )}



          <div>

            <div style={{ fontSize: 10, fontWeight: 700, color: C.tekst }}>

              Lanac proizvodnje — RN → lot → operacija → alat → operater

            </div>

            <LanacTabela C={C} lanac={podaci.lanac} />

          </div>

        </>

      )}

    </div>

  );

}

