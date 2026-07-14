import { koloneZaGrupu } from "../lib/varijabilneUtils.js";

export function danasSrMerljive() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function prazneKoloneMerljive(n) {
  return koloneZaGrupu([], "", "", n);
}
