import { useState, useEffect, useCallback } from "react";

import { formatujDatumLicence, normalizujModuli } from "../lib/licenca.js";

import { supabase } from "../lib/supabaseClient.js";

import { ucitajLicencaKvote, formatPrikazKvote } from "../lib/licencaKvotaPrikaz.js";



/** Pregled licence (read-only) — admin; `samoStatus` za liniju (operater/kontrolor). */
export default function LicencaStatusPanel({ licenca, C, kompakt = false, samoStatus = false }) {

  const moduli = normalizujModuli(licenca?.moduli);

  const ok = licenca?.ok !== false;

  const boja = ok ? (licenca?.offlineGrace ? C.zuta : C.zelena) : C.crvena;

  const [kvote, setKvote] = useState({ aktivniKorisnici: null, registrovaniUredjaji: null });



  const osveziKvote = useCallback(async () => {

    const k = await ucitajLicencaKvote(supabase);

    setKvote(k);

  }, []);



  useEffect(() => {
    if (samoStatus) return;
    osveziKvote();
  }, [osveziKvote, samoStatus]);

  if (samoStatus) {
    const statusTekst = ok
      ? (licenca?.offlineGrace ? "Keš (mreža nedostupna)" : "Aktivna")
      : "Blokirana";
    return (
      <div
        data-testid="licenca-status-panel"
        data-samo-status="1"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "8px 12px",
          fontSize: 10,
          color: boja,
          letterSpacing: 0.4,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: boja,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600 }}>Licenca: {statusTekst}</span>
      </div>
    );
  }



  const korisniciPrikaz = formatPrikazKvote(kvote.aktivniKorisnici, licenca?.max_korisnika);

  const uredjajiPrikaz = formatPrikazKvote(kvote.registrovaniUredjaji, licenca?.max_uredjaja);



  const red = (label, vrednost, accent, hint = null) => (

    <div style={{

      display: "flex",

      justifyContent: "space-between",

      gap: 12,

      padding: kompakt ? "6px 0" : "8px 0",

      borderBottom: `1px solid ${C.hover}`,

      fontSize: kompakt ? 10 : 11,

    }}>

      <span style={{ color: C.sivi }}>{label}</span>

      <span style={{ textAlign: "right" }}>

        <span style={{ color: accent || C.tekst, fontWeight: 600 }}>{vrednost}</span>

        {hint && (

          <span style={{ display: "block", color: C.sivi, fontSize: 9, fontWeight: 400, marginTop: 2 }}>

            {hint}

          </span>

        )}

      </span>

    </div>

  );



  const kvotaBoja = (k) => {

    if (!k || k.ucitava) return C.sivi;

    if (k.greska) return C.sivi;

    if (k.prekoraceno) return C.crvena;

    if (k.naLimitu) return C.zuta;

    return C.zelena;

  };



  const hintUredjaji = kvote.registrovaniUredjaji === null && !uredjajiPrikaz.ucitava

    ? "Pokreni 65_licenca_uredjaji.sql"

    : uredjajiPrikaz.hint || null;



  const hintKorisnici = korisniciPrikaz.greska

    ? "Nije moguće učitati (proveri RLS radnici)"

    : (korisniciPrikaz.hint || null);



  return (

    <div

      data-testid="licenca-status-panel"

      style={{

        background: C.panel,

        border: `1px solid ${boja}44`,

        borderRadius: 10,

        padding: kompakt ? "12px 14px" : "16px 18px",

      }}

    >

      <div style={{

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        gap: 8,

        marginBottom: kompakt ? 8 : 12,

      }}

      >

        <div style={{

          color: boja,

          fontSize: kompakt ? 11 : 12,

          fontWeight: 700,

          letterSpacing: 1,

        }}

        >

          📜 LICENCA {licenca?.offlineGrace ? "· OFFLINE GRACE" : ""}

        </div>

        <button

          type="button"

          onClick={osveziKvote}

          style={{

            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 5,

            color: C.sivi, fontSize: 9, padding: "2px 8px", cursor: "pointer",

          }}

        >

          ↻

        </button>

      </div>



      {red("Status", ok ? (licenca?.offlineGrace ? "Keš (mreža nedostupna)" : "Aktivna") : "Blokirana", boja)}

      {licenca?.vazi_do && red("Važi do", formatujDatumLicence(licenca.vazi_do))}

      {licenca?.tenant_id && red("Tenant", licenca.tenant_id)}

      {licenca?.deployment && red("Okruženje", licenca.deployment)}



      {red(

        "Aktivni korisnici",

        korisniciPrikaz.tekst,

        kvotaBoja(korisniciPrikaz),

        hintKorisnici,

      )}

      {red(

        "Registrovani uređaji",

        uredjajiPrikaz.tekst,

        kvotaBoja(uredjajiPrikaz),

        hintUredjaji,

      )}



      {licenca?.max_korisnika != null && (

        red("Limit korisnika", String(licenca.max_korisnika), C.sivi)

      )}

      {licenca?.max_uredjaja != null && (

        red("Limit uređaja", String(licenca.max_uredjaja), C.sivi)

      )}



      {licenca?.napomena && red("Napomena", licenca.napomena, C.sivi)}

      {licenca?.kod && !ok && red("Kod", licenca.kod, C.crvena)}



      <div style={{ marginTop: 10, fontSize: 9, color: C.sivi, letterSpacing: 0.8 }}>MODULI</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>

        {[

          ["atributivne", "Atributivne"],

          ["varijabilne", "Merljive"],

          ["admin", "Admin"],

        ].map(([id, label]) => {

          const uklj = moduli[id] !== false;

          return (

            <span key={id} style={{

              fontSize: 9,

              padding: "4px 8px",

              borderRadius: 6,

              border: `1px solid ${uklj ? C.zelena : C.border}`,

              color: uklj ? C.zelena : C.sivi,

              background: uklj ? `${C.zelena}12` : C.hover,

            }}>

              {uklj ? "✓" : "✗"} {label}

            </span>

          );

        })}

      </div>



      {licenca?.slojevi && (

        <div style={{ marginTop: 10, fontSize: 9, color: C.border }}>

          Slojevi: server {licenca.slojevi.server ? "✓" : "—"}

          {licenca.slojevi.fajl ? ` · fajl ${licenca.slojevi.fajl}` : ""}

        </div>

      )}

    </div>

  );

}


