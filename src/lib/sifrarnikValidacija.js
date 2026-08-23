/** Validacioni izveštaj šifrarnika — CSV pre objave / go-live. */
import { supabase } from "./supabaseClient.js";
import {
  fetchAktivniDeloviSaStatusom,
  fetchDuplikatiKarakteristike,
  jeSpremanZaBatchObjavu,
} from "./sifrarnikOdrzavanje.js";

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function generisiValidacioniIzvestaj() {
  const stavke = [];
  const { stavke: deloviStavke } = await fetchAktivniDeloviSaStatusom();
  const dups = await fetchDuplikatiKarakteristike({ limit: 100 });

  for (const { deo, status, opts, nedostaje } of deloviStavke) {
    if (status === "kompletan") continue;
    stavke.push({
      tip: "delimicno",
      id_deo: deo.id_deo,
      status,
      problem: (nedostaje || []).join("; "),
    });
    if (!deo.slika_naziv?.trim()) {
      stavke.push({ tip: "nema_crtez", id_deo: deo.id_deo, status, problem: "Nema crteža" });
    }
    if (jeSpremanZaBatchObjavu(deo, opts) && status !== "kompletan") {
      stavke.push({ tip: "spreman_za_objavu", id_deo: deo.id_deo, status, problem: "Spreman za batch objavu" });
    }
  }

  for (const d of dups.slice(0, 50)) {
    stavke.push({
      tip: "duplikat",
      id_deo: d.idDeo,
      status: "",
      problem: `Dupli ${d.pogon}/${d.pozicija} (${d.broj}×)`,
    });
  }

  return stavke;
}

export function validacioniIzvestajUCsv(stavke) {
  const header = ["tip", "id_deo", "status", "problem"].join(",");
  const redovi = (stavke || []).map((s) => [
    csvEscape(s.tip),
    csvEscape(s.id_deo),
    csvEscape(s.status),
    csvEscape(s.problem),
  ].join(","));
  return `\uFEFF${[header, ...redovi].join("\n")}`;
}

export function preuzmiValidacioniCsv(stavke) {
  const csv = validacioniIzvestajUCsv(stavke);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sifrarnik_validacija_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
