import { useEkran } from "../layout/useEkran.js";
import LogoBrend from "./LogoBrend.jsx";
import { useTabletSmena } from "../lib/TabletSmenaContext.jsx";
import { jeLinijaUloga } from "../lib/uloge.js";
import { useOfflineQueue } from "../lib/offlineQueue.js";
import { supabase } from "../lib/supabaseClient.js";

const SKRACENA_ULOGA = {
  kontrolor: "KON",
  admin: "ADM",
  supervizor: "SUP",
  operator: "OPR",
};

/** Naslov posle SPC na podstranicama — pun na tabletu, skraćen na uskom telefonu */
function naslovPodstrana(ekran) {
  if (ekran.tablet) return "KONTROLA KVALITETA";
  if (ekran.w >= 400) return "KONTROLA KVALITETA";
  if (ekran.w >= 340) return "K.KVAL.";
  return null;
}

/**
 * Zajednički header — 52px.
 * Stranice 1–4 (mob/tablet, sa ←): jedan red — ← SPC | KONTROLA KVALITETA · tema · uloga · ime · Odjava.
 * Stranica 0: logo | TRI-CORE QC | KONTROLA KVALITETA · tema · uloga · ime · Odjava.
 */
export default function AppHeader({
  korisnik,
  onOdjava,
  onNazad,
  C,
  onToggleTema,
  temaTamna,
  trakaIspod,
  desnoExtra,
  onSmena,
}) {
  const ekran = useEkran();
  const smenaIzCtx = useTabletSmena();
  const linijaUloga = jeLinijaUloga(korisnik?.uloga);
  const smenaFn = (onSmena || smenaIzCtx) && linijaUloga
    ? (onSmena || smenaIzCtx)
    : null;
  const { online, counts: offlineCounts, flushQueue } = useOfflineQueue(supabase);
  const podstrana = Boolean(onNazad) && (ekran.mob || ekran.tablet);
  const kompakt = ekran.mob || ekran.tablet;
  const padX = podstrana ? 10 : kompakt ? 12 : 20;
  const gap = podstrana ? 4 : kompakt ? 5 : 8;
  const podNaslov = podstrana ? naslovPodstrana(ekran) : "KONTROLA KVALITETA";

  const btnNazad = onNazad ? (
    <button type="button" onClick={onNazad} style={{
      background: "none", border: "none", flexShrink: 0,
      color: C.sivi, fontSize: podstrana ? 15 : kompakt ? 15 : 13,
      cursor: "pointer", padding: podstrana ? "0 4px 0 0" : kompakt ? "0 4px 0 0" : "0 8px 0 0",
    }}>←</button>
  ) : null;

  const levoBrending = (
    <>
      <LogoBrend C={C} velicina="header" />
      {podNaslov && (
        <>
          <span style={{ color: C.border, flexShrink: 0 }}>|</span>
          <span style={{
            color: C.sivi,
            fontSize: podstrana ? (ekran.tablet ? 10 : 9) : kompakt ? 9 : 10,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            minWidth: 0,
          }}>
            {podNaslov}
          </span>
        </>
      )}
    </>
  );

  const btnTema = onToggleTema ? (
    <button type="button" onClick={onToggleTema} style={{
      background: C.hover, border: `1px solid ${C.border}`,
      borderRadius: 5, flexShrink: 0, color: C.sivi,
      fontSize: podstrana ? 10 : kompakt ? 10 : 11,
      padding: podstrana ? "2px 6px" : kompakt ? "2px 6px" : "4px 10px",
      cursor: "pointer", lineHeight: 1,
    }}>
      {temaTamna ? "☀️" : "🌙"}
    </button>
  ) : null;

  const ulogaTekst = podstrana
    ? (SKRACENA_ULOGA[korisnik.uloga] || korisnik.uloga.slice(0, 3).toUpperCase())
    : korisnik.uloga.toUpperCase();

  const badgeUloga = (
    <span style={{
      background: korisnik.uloga === "admin" ? "#3d2c00" : "#0c2d48", flexShrink: 0,
      color: korisnik.uloga === "admin" ? C.zuta : C.plava,
      fontSize: podstrana ? 8 : kompakt ? 8 : 9,
      padding: podstrana ? "2px 5px" : kompakt ? "1px 5px" : "2px 8px",
      borderRadius: 20, letterSpacing: 0.5, whiteSpace: "nowrap",
    }}>{ulogaTekst}</span>
  );

  const txtIme = (
    <span style={{
      color: C.sivi, fontSize: podstrana ? 10 : kompakt ? 10 : 11, whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis",
      maxWidth: podstrana ? (ekran.tablet ? 100 : 64) : kompakt ? (onNazad ? 80 : 96) : 160,
      minWidth: 0,
    }}>{korisnik.ime}</span>
  );

  const btnOdjava = (
    <button type="button" onClick={onOdjava} style={{
      background: "none", border: `1px solid ${C.border}`,
      flexShrink: 0, borderRadius: 5, color: C.sivi,
      fontSize: podstrana ? 9 : kompakt ? 9 : 10,
      padding: podstrana ? "2px 6px" : kompakt ? "2px 6px" : "3px 10px",
      cursor: "pointer", whiteSpace: "nowrap",
    }}>Odjava</button>
  );

  const btnSmena = smenaFn ? (
    <button type="button" onClick={smenaFn} title="Zaključaj / promeni operatera (PIN)"
      style={{
        background: C.hover, border: `1px solid ${C.border}`,
        flexShrink: 0, borderRadius: 5, color: C.sivi,
        fontSize: podstrana ? 9 : kompakt ? 9 : 10,
        padding: podstrana ? "2px 6px" : kompakt ? "2px 6px" : "3px 10px",
        cursor: "pointer", whiteSpace: "nowrap",
      }}>Smena</button>
  ) : null;

  const statusMreza = linijaUloga ? (
    <>
      <span
        title={online ? "Online" : `Offline (${offlineCounts.total})`}
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
          fontSize: podstrana || kompakt ? 8 : 9,
          color: online ? C.zelena : C.crvena, fontWeight: 700,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: online ? C.zelena : C.crvena, display: "inline-block",
        }} />
        {online ? "Online" : "Offline"}
      </span>
      <button
        type="button"
        onClick={() => flushQueue()}
        title="Sinhronizuj offline red"
        style={{
          background: offlineCounts.total ? C.zuta : C.hover,
          border: `1px solid ${C.border}`,
          borderRadius: 5,
          color: offlineCounts.total ? C.onZuta : C.sivi,
          fontSize: podstrana || kompakt ? 8 : 9,
          padding: podstrana || kompakt ? "2px 6px" : "3px 8px",
          cursor: "pointer",
          fontWeight: 700,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        ↻ Sync{offlineCounts.total ? ` (${offlineCounts.total})` : ""}
      </button>
    </>
  ) : null;

  const desnoAkcije = (
    <div style={{
      display: "flex", alignItems: "center", gap,
      flexShrink: 0, flexWrap: "nowrap", minWidth: 0, justifyContent: "flex-end",
    }}>
      {statusMreza}
      {desnoExtra}
      {btnTema}
      {badgeUloga}
      {txtIme}
      {btnSmena}
      {btnOdjava}
    </div>
  );

  const prikaziTrakuIspod = trakaIspod && !podstrana;

  return (
    <>
      <div style={{
        background: C.panel,
        borderBottom: prikaziTrakuIspod ? "none" : `1px solid ${C.border}`,
        padding: `0 ${padX}px`, height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap,
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap,
          minWidth: 0, flex: "1 1 0", overflow: "hidden",
        }}>
          {btnNazad}{levoBrending}
        </div>
        {desnoAkcije}
      </div>
      {prikaziTrakuIspod}
    </>
  );
}
