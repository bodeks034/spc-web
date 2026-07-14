/** PFMEA skale S · O · D · RPN — oblacići za Modul 2 (Analitika). */
import { MomentPfmeaOblaciciRed } from "../moment/MomentPfmeaOblacic.jsx";

const PFMEA_SKALE_IDS = ["S", "O", "D", "RPN"];

export default function PfmeaSkaleOblacici({ C, kompakt = false, naslov }) {
  return (
    <MomentPfmeaOblaciciRed
      C={C}
      ids={PFMEA_SKALE_IDS}
      kompakt={kompakt}
      naslov={naslov}
    />
  );
}

export { PFMEA_SKALE_IDS };
