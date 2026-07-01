/** Zaglavlje 8D izveštaja — polja, prikaz i payload. */

export const KLASE_GRESKE = [
  { value: "", label: "—" },
  { value: "kriticna", label: "Kritična (Critical)" },
  { value: "glavna", label: "Glavna (Major)" },
  { value: "manja", label: "Manja (Minor)" },
];

export const BEZBEDNOST_OPCIJE = [
  { value: "", label: "—" },
  { value: "da", label: "DA" },
  { value: "ne", label: "NE" },
];

export const ZAGLAVLJE_8D_POLJA = [
  { key: "broj_8d", label: "Broj 8D izveštaja", ph: "npr. 2026-REK-042", type: "text" },
  { key: "broj_reklamacije", label: "Broj reklamacije kupca", ph: "npr. NCR-99381", type: "text" },
  { key: "kupac_ime_id", label: "Ime / ID kupca", ph: "npr. AutoKomponente d.o.o. (Kupac ID: 4402)", type: "text" },
  { key: "kupac_lokacija", label: "Lokacija kupca", ph: "Fabrika / grad / adresa…", type: "text" },
  { key: "kupac_kontakt", label: "Kontakt osoba / auditor (kupac)", ph: "Ime i uloga kontakta…", type: "text" },
  { key: "artikal_naziv_sifra", label: "Naziv i šifra artikla", ph: "npr. Plastično kućište senzora (Šifra: PK-992)", type: "text" },
  { key: "lot_serijski", label: "Serijski broj / Lot (šarža)", ph: "npr. Lot br. 1205", type: "text" },
  { key: "otpremnica_rn", label: "Broj otpremnice / RN", ph: "npr. OTP-26-0881 / RN-552", type: "text" },
  { key: "kolicina_reklamacije", label: "Količina u reklamaciji", ph: "npr. 150 komada (od isporučenih 2.000)", type: "text" },
  { key: "datum_prijema_reklamacije", label: "Datum prijema reklamacije", type: "date" },
  { key: "datum_otvaranja_8d", label: "Datum otvaranja 8D", type: "date" },
  { key: "datum_cilj_zatvaranja", label: "Ciljani datum zatvaranja", type: "date" },
  { key: "klasa_greske", label: "Klasa greške", type: "klasa" },
  { key: "bezbednost_problem", label: "Bezbednost", type: "bezbednost" },
];

export const ZAGLAVLJE_8D_KLJUCEVI = ZAGLAVLJE_8D_POLJA.map((p) => p.key);

export function praznoZaglavlje8d() {
  return Object.fromEntries(ZAGLAVLJE_8D_KLJUCEVI.map((k) => [k, ""]));
}

export function zaglavljeIzIzvestaja(izv = {}) {
  const b = praznoZaglavlje8d();
  for (const k of ZAGLAVLJE_8D_KLJUCEVI) {
    b[k] = String(izv?.[k] ?? "").trim();
  }
  return b;
}

export function zaglavljeImaSadrzaj(izv = {}) {
  return ZAGLAVLJE_8D_KLJUCEVI.some((k) => String(izv?.[k] ?? "").trim());
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function nazivKlaseGreske(v) {
  const k = String(v ?? "").trim();
  return KLASE_GRESKE.find((o) => o.value === k)?.label || k || "—";
}

export function nazivBezbednosti(v) {
  const k = String(v ?? "").trim().toLowerCase();
  if (k === "da") return "DA";
  if (k === "ne") return "NE";
  return "—";
}

function formatDatumPrikaz(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function vrednostPolja(key, izv) {
  const raw = String(izv?.[key] ?? "").trim();
  if (!raw) return "";
  if (key === "klasa_greske") return nazivKlaseGreske(raw);
  if (key === "bezbednost_problem") return nazivBezbednosti(raw);
  if (key.startsWith("datum_")) return formatDatumPrikaz(raw);
  return raw;
}

/** HTML tabela zaglavlja za PDF / štampu. */
export function formatZaglavljeHtml(izv, { statusHtml = "" } = {}) {
  const redovi = ZAGLAVLJE_8D_POLJA.map((p) => {
    const v = vrednostPolja(p.key, izv);
    return `<tr><th>${esc(p.label)}</th><td>${v ? esc(v) : '<span class="empty">—</span>'}</td></tr>`;
  }).join("");

  const defekt = String(izv?.defekt_nedostatak ?? "").trim();
  const defektRed = defekt
    ? `<tr><th>${esc("Defekt / nedostatak")}</th><td>${esc(defekt)}</td></tr>`
    : "";

  const interni = [];
  if (izv?.id_deo) interni.push(["Interni ID dela (SPC)", izv.id_deo]);
  if (izv?.naziv_dela) interni.push(["Naziv dela (SPC)", izv.naziv_dela]);
  if (statusHtml) interni.push(["Status izveštaja", statusHtml]);
  const interniRedovi = interni.map(([l, v]) =>
    `<tr class="zaglavlje-interno"><th>${esc(l)}</th><td>${typeof v === "string" ? esc(v) : v}</td></tr>`,
  ).join("");

  return `
    <div class="zaglavlje-wrap">
      <div class="sub-title">Zaglavlje 8D izveštaja</div>
      <table class="tbl zaglavlje-tbl">
        <tbody>${redovi}${defektRed}${interniRedovi}</tbody>
      </table>
    </div>`;
}

export function danasIsoDatum() {
  return new Date().toISOString().split("T")[0];
}
