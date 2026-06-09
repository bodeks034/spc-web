import { getBrending } from "../lib/brending.js";
import LogoFirme from "./LogoFirme.jsx";

/**
 * Logo levo + naziv aplikacije / firme desno.
 * varijanta: "login" | "pocetna" | "kompakt"
 */
export default function BrendingNaslov({ C, varijanta = "pocetna", dobrodoslica }) {
  const b = getBrending();
  const login = varijanta === "login";
  const kompakt = varijanta === "kompakt";

  const velicinaLoga = login ? "veliki" : kompakt ? "srednji" : "srednji";
  const gap = login ? 18 : kompakt ? 12 : 16;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap,
      textAlign: "left",
      width: "100%",
    }}>
      <div style={{ flexShrink: 0 }}>
        <LogoFirme velicina={velicinaLoga} C={C} centar={false} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          color: login ? C.plava : C.tekst,
          fontSize: login ? 17 : kompakt ? 14 : 17,
          fontWeight: 700,
          letterSpacing: login ? 1.2 : 0.8,
          lineHeight: 1.25,
          textTransform: login ? "uppercase" : "none",
        }}>
          {b.nazivAplikacije}
        </div>
        {b.nazivFirme && (
          <div style={{
            color: C.sivi,
            fontSize: login ? 10 : 10,
            marginTop: 4,
            letterSpacing: 0.3,
            lineHeight: 1.4,
          }}>
            {b.nazivFirme}
          </div>
        )}
        {dobrodoslica && (
          <div style={{ color: C.sivi, fontSize: 11, marginTop: 6 }}>
            Dobrodošli, {dobrodoslica}
          </div>
        )}
      </div>
    </div>
  );
}
