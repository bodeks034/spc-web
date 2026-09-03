import AppHeader from "../AppHeader.jsx";
import { KontrolnaLista } from "../../lib/kontrolaSesije.jsx";
import useAppStore from "../../lib/appStore.js";

/**
 * Poka-yoke shell: header + kontrolna lista pre unosa na liniji.
 * korisnik i tema dolaze iz appStore-a (App.jsx ih sinhronizuje).
 */
export default function KontrolnaListaGate({
  C: CProp,
  korisnik: korisnikProp,
  onOdjava,
  onNazad,
  onToggleTema,
  temaTamna,
  smena,
  naslovModul,
  akcent,
  onZavrsena,
  minHeight = "100dvh",
}) {
  const storeC = useAppStore((s) => s.temaC);
  const storeKorisnik = useAppStore((s) => s.korisnik);
  const C = CProp || storeC;
  const korisnik = korisnikProp || storeKorisnik;
  if (!C) return null;

  return (
    <div
      data-testid="kontrolna-lista-gate"
      style={{
        minHeight,
        background: C.bg,
        fontFamily: "'IBM Plex Mono', monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppHeader
        korisnik={korisnik}
        onOdjava={onOdjava}
        onNazad={onNazad}
        C={C}
        onToggleTema={onToggleTema}
        temaTamna={temaTamna}
      />
      <KontrolnaLista
        korisnik={korisnik}
        smena={Number(smena)}
        naslovModul={naslovModul}
        akcent={akcent}
        onZavrsena={onZavrsena}
        C={C}
      />
    </div>
  );
}
