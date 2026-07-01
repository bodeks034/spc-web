import KalibracijaMerilaPanel from "../KalibracijaMerilaPanel.jsx";

/** Merila + kalibracije — šifrarnik modul. */
export default function MerilaSifrarnikPanel({ C, addToast, korisnik }) {
  return (
    <div style={{ margin: "-4px 0" }}>
      <KalibracijaMerilaPanel korisnik={korisnik} C={C} addToast={addToast} />
    </div>
  );
}
