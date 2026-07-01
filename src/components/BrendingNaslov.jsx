import LogoBrend from "./LogoBrend.jsx";
import DevelopedBy from "./DevelopedBy.jsx";

/**
 * Brending — ikona + TRI-CORE QC tekst.
 * varijanta: "login" | "pocetna" | "kompakt"
 */
export default function BrendingNaslov({ C, varijanta = "pocetna", dobrodoslica }) {
  const login = varijanta === "login";
  const kompakt = varijanta === "kompakt";

  if (login) {
    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <LogoBrend C={C} velicina="login" showSlogan />
        <div style={{ marginTop: 16 }}>
          <DevelopedBy C={C} centar prikaz="firma" />
        </div>
        {dobrodoslica && (
          <div style={{ color: C.sivi, fontSize: 11, marginTop: 10 }}>
            Dobrodošli, {dobrodoslica}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <LogoBrend
        C={C}
        velicina={kompakt ? "mali" : "srednji"}
        showSlogan={!kompakt}
        vertikalno={false}
      />
      {dobrodoslica && (
        <div style={{ color: C.sivi, fontSize: 11, marginTop: 8 }}>
          Dobrodošli, {dobrodoslica}
        </div>
      )}
    </div>
  );
}
