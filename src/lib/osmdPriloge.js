/** LL, PFMEA i Control Plan — HTML za 8D štampu. */



import {

  formatPfmeaHtml,

  formatControlPlanHtml,

  imaPfmeaCpSadrzaj,

  parsePfmeaRefRaw,

  parseControlPlanRefRaw,

  PFMEA_KOLONE,

  CP_KOLONE,

} from "./pfmeaControlPlan.js";



/** Legacy flat polja (stari Word REF format). */

export const PFMEA_POLJA = [

  { key: "proces", label: "Proces" },

  { key: "mod_greske", label: "Potencijalni mod greške" },

  { key: "efekat", label: "Potencijalni efekat" },

  { key: "otkrivanje_pre", label: "Otkrivanje (D) — pre" },

  { key: "otkrivanje_posle", label: "Otkrivanje (D) — posle" },

  { key: "rpn_pre", label: "RPN — pre" },

  { key: "rpn_posle", label: "RPN — posle" },

];



export const CP_POLJA = [

  { key: "operacija", label: "Operacija / Proces" },

  { key: "karakteristika", label: "Karakteristika" },

  { key: "metoda_kontrole", label: "Metoda kontrole" },

  { key: "ucestalost", label: "Učestalost" },

  { key: "korigovana_metoda", label: "Korigovana metoda kontrole" },

  { key: "odgovornost", label: "Odgovornost" },

];



export { PFMEA_KOLONE, CP_KOLONE };



function esc(s) {

  return String(s ?? "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");

}



export function parsePfmeaRef(raw) {

  const { fmt, redovi, summary } = parsePfmeaRefRaw(raw);

  if (fmt === 2 && redovi[0]) return { ...redovi[0] };

  return summary || {};

}



export function parseControlPlanRef(raw) {

  const { fmt, redovi, summary } = parseControlPlanRefRaw(raw);

  if (fmt === 2 && redovi[0]) return { ...redovi[0] };

  return summary || {};

}



export function serializePfmeaRef(obj) {

  const ima = obj && Object.values(obj).some((v) => String(v ?? "").trim());

  return ima ? JSON.stringify(obj) : "";

}



export function serializeControlPlanRef(obj) {

  const ima = obj && Object.values(obj).some((v) => String(v ?? "").trim());

  return ima ? JSON.stringify(obj) : "";

}



function formatListaHtml(raw) {

  const lines = String(raw ?? "")

    .split(/\n/)

    .map((l) => l.replace(/^•\s*/, "").trim())

    .filter(Boolean);

  if (!lines.length) return '<span class="empty">—</span>';

  return `<ul class="lista">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;

}



export function formatPrilogeHtml(izv) {

  const ll = String(izv?.lesson_learned ?? "").trim();

  const pfmeaHtml = formatPfmeaHtml(izv?.pfmea_ref);

  const cpHtml = formatControlPlanHtml(izv?.control_plan_ref);

  if (!ll && !pfmeaHtml && !cpHtml) return "";



  const llHtml = ll

    ? `<article class="section prilog-section">

        <div class="section-head prilog-head">

          <div class="badge prilog-badge">LL</div>

          <div class="section-title">Lesson Learned</div>

        </div>

        <div class="section-body">${formatListaHtml(ll)}</div>

      </article>`

    : "";



  const refHtml = (pfmeaHtml || cpHtml)

    ? `<article class="section prilog-section">

        <div class="section-head prilog-head">

          <div class="badge prilog-badge ref">REF</div>

          <div class="section-title">Veza sa PFMEA i Control Plan</div>

        </div>

        <div class="section-body ref-body">${pfmeaHtml}${cpHtml}</div>

      </article>`

    : "";



  return llHtml + refHtml;

}



export function deriveNaslov8d(izv) {

  const art = String(izv?.artikal_naziv_sifra || "").trim();

  const naziv = art.replace(/\s*\([^)]+\)\s*$/, "").trim()

    || String(izv?.naziv_dela || izv?.id_deo || "Deo").trim();

  return `8D Izveštaj — ${naziv}`;

}



export function derivePodnaslov8d(izv) {

  const defekt = String(izv?.defekt_nedostatak || "").trim();

  const id = String(izv?.broj_8d || izv?.id_deo || "").trim();

  if (defekt && id) return `Defekt: ${defekt} · ID: ${id}`;

  if (defekt) return `Defekt: ${defekt}`;

  if (id) return `ID: ${id}`;

  return "Metoda 8 disciplina — korektivne i preventivne akcije";

}



export { imaPfmeaCpSadrzaj };


