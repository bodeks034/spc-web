import { clearSveSesije } from "./spcSesija.js";

/** Briše lokalne draft-ove posle odjave / uspešne prijave. */
export function ocistiUnosDraft() {
  localStorage.removeItem("spc_draft_id");
  localStorage.removeItem("spc_draft_g");
  localStorage.removeItem("spc_draft_p");
  localStorage.removeItem("spc_rn");
  clearSveSesije();
}
