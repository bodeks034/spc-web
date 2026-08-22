/** Validacija redova Glavnog unosa pre snimanja / propagacije. */
import { normalizujIdDeo, jePunIdDeo } from "./idDeoUtil.js";
import { jeRedCeloVozilo } from "./glavniUnosSheetTip.js";

function tipMerljiva(tip) {
  return String(tip || "").toLowerCase().includes("merljiv");
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Array} redovi — staging redovi (trenutni sheet ili svi)
 * @returns {{ ok: boolean, greske: string[], upozorenja: string[] }}
 */
export function validirajRedovePrePropagacije(redovi) {
  const greske = [];
  const upozorenja = [];
  const rnPoDeo = new Map();
  const idSaKar = new Set();
  const idBezKar = new Set();

  for (let i = 0; i < (redovi || []).length; i += 1) {
    const r = redovi[i];
    const redBr = i + 1;
    const id = normalizujIdDeo(r?.id_deo);

    if (!id) {
      if (String(r?.karakteristika || "").trim()) {
        greske.push(`Red ${redBr}: karakteristika bez ID dela.`);
      }
      continue;
    }

    if (!jePunIdDeo(id)) {
      greske.push(`Red ${redBr}: ID „${r.id_deo}" nije u punom formatu.`);
    }

    if (!String(r?.karakteristika || "").trim()) {
      idBezKar.add(id);
      continue;
    }

    idSaKar.add(id);

    if (tipMerljiva(r.tip)) {
      const lsl = num(r.lsl);
      const usl = num(r.usl);
      if (lsl == null && usl == null) {
        greske.push(`Red ${redBr} (${id} · ${r.karakteristika}): Merljiva bez LSL/USL.`);
      }
    }

    if (r.radni_nalog) {
      const kljuc = `${id}|${String(r.radni_nalog).trim().toUpperCase()}|${String(r.linija || "").trim()}`;
      if (rnPoDeo.has(kljuc)) {
        upozorenja.push(`Dupli RN „${r.radni_nalog}" za ${id} / ${r.linija || "linija?"}.`);
      }
      rnPoDeo.set(kljuc, redBr);
    }

    if (jeRedCeloVozilo(r) && tipMerljiva(r.tip)) {
      upozorenja.push(`Red ${redBr} (${id}): celo vozilo obično je Atributivna, ne Merljiva.`);
    }
  }

  for (const id of idBezKar) {
    if (idSaKar.has(id)) continue;
    upozorenja.push(`ID ${id} nema nijednu popunjenu karakteristiku na sheetu.`);
  }

  return { ok: greske.length === 0, greske, upozorenja };
}
