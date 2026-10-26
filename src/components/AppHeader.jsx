import { useEkran } from "../layout/useEkran.js";
import LogoBrend from "./LogoBrend.jsx";
import { useTabletSmena } from "../lib/TabletSmenaContext.jsx";
import { jeLinijaUloga } from "../lib/uloge.js";
import { useOfflineQueue } from "../lib/offlineQueue.js";
import { supabase } from "../lib/supabaseClient.js";
import OfflineZaglavljenBanner from "./ui/OfflineZaglavljenBanner.jsx";

const SKRACENA_ULOGA = {
  kontrolor: "KON",
  admin: "ADM",
  supervizor: "SUP",
  operator: "OPR",
};

/**
 * Podnaslov pored logotipa. Na uskom redu (←, tabovi, odjava) pun tekst
 * se seče na „KONTRO…“, pa se skraćuje ili sakriva.
 */
function naslovKvaliteta(w, podstrana) {
  if (podstrana) {
    if (w >= 1100) return "KONTROLA KVALITETA";
    if (w >= 760) return "K.KVAL.";
    return null;
  }
  if (w >= 720) return "KONTROLA KVALITETA";
  if (w >= 480) return "K.KVAL.";
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
  const { online, counts: offlineCounts, flushQueue, zaglavljeni } = useOfflineQueue(supabase);
  const imaOffline = offlineCounts.total > 0;
  const imaZaglavljen = (zaglavljeni?.length || 0) > 0;
  const prikaziSync = linijaUloga || imaOffline || imaZaglavljen;
  const podstrana = Boolean(onNazad) && (ekran.mob || ekran.tablet);
  const kompakt = ekran.mob || ekran.tablet;
  const padX = podstrana ? 10 : kompakt ? 12 : 20;
  const gap = podstrana ? 4 : kompakt ? 5 : 8;
  const podNaslov = naslovKvaliteta(ekran.w, podstrana);

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
          <span
            title={podNaslov === "KONTROLA KVALITETA" ? undefined : "KONTROLA KVALITETA"}
            style={{
              color: C.sivi,
              fontSize: podstrana ? (ekran.tablet ? 10 : 9) : kompakt ? 9 : 10,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
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

  const statusMreza = prikaziSync ? (
    <>
      <span
        data-testid="header-mreza-status"
        title={online
          ? (imaZaglavljen ? "Zaglavljeni paketi" : imaOffline ? `Offline red: ${offlineCounts.total}` : "Online")
          : `Offline (${offlineCounts.total})`}
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
          fontSize: podstrana || kompakt ? 8 : 9,
          color: !online || imaZaglavljen ? C.crvena : imaOffline ? (C.zuta || C.narandzasta) : C.zelena,
          fontWeight: 700,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: !online || imaZaglavljen ? C.crvena : imaOffline ? (C.zuta || C.narandzasta) : C.zelena,
          display: "inline-block",
        }} />
        {!online ? "Offline" : imaZaglavljen ? "Zaglavljen" : imaOffline ? "Sync" : "Online"}
      </span>
      <button
        type="button"
        data-testid="header-sync-btn"
        onClick={() => flushQueue()}
        title={imaZaglavljen
          ? "Pokušaj ponovo za zaglavljene pakete"
          : "Sinhronizuj offline red"}
        style={{
          background: imaZaglavljen ? C.crvena : imaOffline ? (C.zuta || C.narandzasta) : C.hover,
          border: `1px solid ${C.border}`,
          borderRadius: 5,
          color: imaZaglavljen || imaOffline ? (C.onAkcent || "#fff") : C.sivi,
          fontSize: podstrana || kompakt ? 8 : 9,
          padding: podstrana || kompakt ? "2px 6px" : "3px 8px",
          cursor: "pointer",
          fontWeight: 700,
          flexShrink: 0,
          whiteSpace: "nowrap",
          minHeight: 28,
        }}
      >
        ↻ Sync{imaZaglavljen
          ? ` !${zaglavljeni.length}`
          : imaOffline ? ` (${offlineCounts.total})` : ""}
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

  const prikaziTrakuIspod = Boolean(trakaIspod);

  return (
    <>
      <div style={{
        background: C.panel,
        borderBottom: (prikaziTrakuIspod || imaZaglavljen) ? "none" : `1px solid ${C.border}`,
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
      {imaZaglavljen && (
        <div
          data-testid="header-zaglavljen-banner"
          style={{
            padding: `6px ${padX}px 8px`,
            background: C.panel,
            borderBottom: prikaziTrakuIspod ? "none" : `1px solid ${C.border}`,
          }}
        >
          <OfflineZaglavljenBanner
            zaglavljeni={zaglavljeni}
            onPokusaj={() => flushQueue()}
            C={C}
          />
        </div>
      )}
      {prikaziTrakuIspod}
    </>
  );
}
