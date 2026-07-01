/** Parsiranje, serijalizacija i HTML prikaz strukturiranih 8D polja. */

export const M6_KATEGORIJE = [
  { key: "ljudi", label: "Čovek", eng: "Man", ikona: "👤", boja: "#2563eb" },
  { key: "masina", label: "Mašina", eng: "Machine", ikona: "⚙", boja: "#7c3aed" },
  { key: "metod", label: "Metod", eng: "Method", ikona: "📋", boja: "#d97706" },
  { key: "materijal", label: "Materijal", eng: "Material", ikona: "📦", boja: "#059669" },
  { key: "merenje", label: "Merenje", eng: "Measurement", ikona: "📏", boja: "#0891b2" },
  { key: "okruzenje", label: "Okruženje", eng: "Environment", ikona: "🌍", boja: "#64748b" },
];

export const D6_STATUSI = ["Planirano", "U toku", "Završeno", "Odloženo"];

/** 5W1H — usklađeno sa 5w1h.xlsx */
export const D2_W1H_KOLONE = [
  { key: "inicijalni", label: "Inicijalni opis pojave/nedostatka", hint: "Kratak uvod pre detalja…", rows: 2 },
  { key: "sta", label: "Šta? (What?)", hint: "Opis pojave, proizvoda, materijala, mašine…", rows: 3 },
  { key: "kada", label: "Kada? (When?)", hint: "Početak smene, tok operacije, povremeno…", rows: 2 },
  { key: "gde", label: "Gde? (Where?)", hint: "Mašina, materijal, deo, lokacija…", rows: 2 },
  { key: "ko", label: "Ko? (Who?)", hint: "Ko ima uticaj, tim, nivo znanja…", rows: 2 },
  { key: "koji", label: "Koji? (Which?)", hint: "Trend, sporadičan, pravac kretanja…", rows: 3 },
  { key: "kako", label: "Kako? (How?)", hint: "Stanje opreme, učestalost pojave…", rows: 2 },
  { key: "kvantifikacija", label: "Kvantifikacija (količina)", hint: "Broj komada, %, učestalost, obim uticaja…", rows: 2 },
];

const D2_KLJUCEVI = D2_W1H_KOLONE.map((k) => k.key);
/** @deprecated koristi D2_W1H_KOLONE */
export const D2_KOLONE = D2_W1H_KOLONE.map(({ key, label }) => ({ key, label }));

function tryJson(raw) {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("{")) return null;
  try {
    const o = JSON.parse(s);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

export function praznoD2() {
  return { _fmt: 3, inicijalni: "", sta: "", kada: "", gde: "", ko: "", koji: "", kako: "", kvantifikacija: "" };
}

export function parseD2(raw) {
  const j = tryJson(raw);
  if (j?._fmt === 3) return { ...praznoD2(), ...j };
  if (j?._fmt === 2) {
    return {
      ...praznoD2(),
      sta: j.sta || "",
      kada: j.kada || "",
      gde: j.gde || "",
      ko: j.ko || "",
      koji: j.trend || j.koji || "",
      kako: j.koliko || j.kako || "",
    };
  }
  const t = String(raw ?? "").trim();
  if (!t) return praznoD2();
  return { ...praznoD2(), inicijalni: t };
}

export function serializeD2(obj) {
  const o = { _fmt: 3 };
  for (const k of D2_KLJUCEVI) o[k] = String(obj?.[k] ?? "").trim();
  if (!D2_KLJUCEVI.some((k) => o[k])) return "";
  return JSON.stringify(o);
}

export function praznaGrana5Why() {
  return {
    opis: "",
    why: ["", "", "", "", ""],
    korenski_uzrok: "",
    privremena: "",
    definitivna: "",
  };
}

export function praznoD4() {
  return {
    _fmt: 3,
    org_jedinica: "",
    klasifikacija: "",
    datum_pocetka: "",
    datum_zavrsetka: "",
    broj_poste: "",
    telefon: "",
    problem_naslov: "",
    opis_problema: "",
    grane: [praznaGrana5Why()],
    efekti: "",
    rezultat: "",
    m6: Object.fromEntries(M6_KATEGORIJE.map((k) => [k.key, ""])),
  };
}

function migrateD4v2(j) {
  const b = praznoD4();
  return {
    ...b,
    problem_naslov: String(j.problem || "").trim(),
    grane: [{
      ...praznaGrana5Why(),
      why: [...(j.why || b.grane[0].why)].slice(0, 5).concat(Array(5).fill("")).slice(0, 5),
      korenski_uzrok: String(j.koren || "").trim(),
      definitivna: String(j.koren || "").trim(),
    }],
    m6: { ...b.m6, ...(j.m6 || {}) },
  };
}

export function parseD4(raw) {
  const j = tryJson(raw);
  if (j?._fmt === 3) {
    const b = praznoD4();
    const grane = (j.grane || []).map((g) => ({
      opis: strMultiline(g.opis),
      why: [...(g.why || b.grane[0].why)].map((x) => strMultiline(x)).slice(0, 5)
        .concat(Array(5).fill("")).slice(0, 5),
      korenski_uzrok: strMultiline(g.korenski_uzrok || g.definitivna),
      privremena: strMultiline(g.privremena),
      definitivna: strMultiline(g.definitivna),
    }));
    const { procesi: _p, ...restJ } = j;
    return {
      ...b,
      ...restJ,
      grane: grane.length ? grane : b.grane,
      m6: { ...b.m6, ...(j.m6 || {}) },
    };
  }
  if (j?._fmt === 2) return migrateD4v2(j);
  const t = String(raw ?? "").trim();
  if (!t) return praznoD4();
  return { ...praznoD4(), opis_problema: t };
}

function textPopunjen(s) {
  return String(s ?? "").trim().length > 0;
}

function strMultiline(v) {
  return String(v ?? "");
}

function granaImaSadrzaj(g) {
  return textPopunjen(g.opis) || textPopunjen(g.korenski_uzrok) || textPopunjen(g.privremena)
    || textPopunjen(g.definitivna)
    || (g.why || []).some((w) => textPopunjen(w));
}

export function serializeD4(obj) {
  const b = praznoD4();
  const o = {
    _fmt: 3,
    org_jedinica: String(obj?.org_jedinica ?? "").trim(),
    klasifikacija: String(obj?.klasifikacija ?? "").trim(),
    datum_pocetka: String(obj?.datum_pocetka ?? "").trim(),
    datum_zavrsetka: String(obj?.datum_zavrsetka ?? "").trim(),
    broj_poste: String(obj?.broj_poste ?? "").trim(),
    telefon: String(obj?.telefon ?? "").trim(),
    problem_naslov: String(obj?.problem_naslov ?? "").trim(),
    opis_problema: strMultiline(obj?.opis_problema),
    grane: (obj?.grane || b.grane).map((g) => ({
      opis: strMultiline(g.opis),
      why: (g.why || []).map((x) => strMultiline(x)).slice(0, 5),
      korenski_uzrok: strMultiline(g.korenski_uzrok || g.definitivna),
      privremena: strMultiline(g.privremena),
      definitivna: strMultiline(g.definitivna),
    })),
    efekti: strMultiline(obj?.efekti),
    rezultat: strMultiline(obj?.rezultat),
    m6: { ...b.m6 },
  };
  for (const k of M6_KATEGORIJE) {
    o.m6[k.key] = strMultiline(obj?.m6?.[k.key]);
  }
  const ima = textPopunjen(o.problem_naslov) || textPopunjen(o.opis_problema) || o.grane.some(granaImaSadrzaj)
    || textPopunjen(o.efekti) || textPopunjen(o.rezultat)
    || M6_KATEGORIJE.some((k) => textPopunjen(o.m6[k.key]))
    || textPopunjen(o.org_jedinica) || textPopunjen(o.datum_pocetka);
  if (!ima) return "";
  if (!o.grane.length) o.grane = [praznaGrana5Why()];
  return JSON.stringify(o);
}

export function praznoD6() {
  return {
    _fmt: 3,
    redovi: [{ akcija: "", odgovorni: "", rok: "", status: "Planirano" }],
    verifikacija: [""],
  };
}

function normalizeD6Red(r) {
  return {
    akcija: String(r.akcija ?? ""),
    odgovorni: String(r.odgovorni ?? ""),
    rok: String(r.rok ?? ""),
    status: String(r.status ?? "Planirano").trim() || "Planirano",
  };
}

export function parseD6(raw) {
  const j = tryJson(raw);
  if ((j?._fmt === 2 || j?._fmt === 3) && Array.isArray(j.redovi)) {
    const verifikacija = Array.isArray(j.verifikacija)
      ? j.verifikacija.map((s) => String(s ?? ""))
      : [""];
    return {
      _fmt: 3,
      redovi: j.redovi.length
        ? j.redovi.map(normalizeD6Red)
        : praznoD6().redovi,
      verifikacija: verifikacija.length ? verifikacija : [""],
    };
  }
  const t = String(raw ?? "").trim();
  if (!t) return praznoD6();
  const redovi = t.split(/\n+/).filter(Boolean).map((lin) => {
    const delovi = lin.split("|").map((x) => x.trim());
    return {
      akcija: delovi[0] || lin,
      odgovorni: delovi[1] || "",
      rok: delovi[2] || "",
      status: delovi[3] || "Planirano",
    };
  });
  return { _fmt: 3, redovi: redovi.length ? redovi : praznoD6().redovi, verifikacija: [""] };
}

export function serializeD6(obj) {
  const redovi = (obj?.redovi || []).map(normalizeD6Red);
  const verifikacija = (obj?.verifikacija || []).map((s) => String(s ?? ""));
  const imaRed = redovi.some((r) => r.akcija.trim() || r.odgovorni.trim() || r.rok.trim());
  const imaVer = verifikacija.some((s) => s.trim());
  if (!imaRed && !imaVer && !redovi.length) return "";
  return JSON.stringify({
    _fmt: 3,
    redovi: redovi.length ? redovi : praznoD6().redovi,
    verifikacija: verifikacija.length ? verifikacija : [""],
  });
}

export function praznoD8() {
  return { _fmt: 2, tekst: "", datum_zatvaranja: "", odobrio: "" };
}

export function parseD8(raw) {
  const j = tryJson(raw);
  if (j?._fmt === 2) {
    return {
      ...praznoD8(),
      tekst: String(j.tekst ?? "").trim(),
      datum_zatvaranja: String(j.datum_zatvaranja ?? "").trim(),
      odobrio: String(j.odobrio ?? "").trim(),
    };
  }
  const t = String(raw ?? "").trim();
  if (!t) return praznoD8();
  return { ...praznoD8(), tekst: t };
}

export function serializeD8(obj) {
  const o = {
    _fmt: 2,
    tekst: String(obj?.tekst ?? "").trim(),
    datum_zatvaranja: String(obj?.datum_zatvaranja ?? "").trim(),
    odobrio: String(obj?.odobrio ?? "").trim(),
  };
  if (!o.tekst && !o.datum_zatvaranja && !o.odobrio) return "";
  return JSON.stringify(o);
}

/** Lista — svaki red = stavka (bez obzira na • ili - prefiks). */
export function parseLista(raw) {
  return String(raw ?? "")
    .split(/\n/)
    .map((l) => l.replace(/^[\s•\-–—*]+/, "").trim())
    .filter(Boolean);
}

export function serializeLista(stavke) {
  const rows = (stavke || []).map((s) => String(s ?? "").trim()).filter(Boolean);
  return rows.length ? rows.map((s) => `• ${s}`).join("\n") : "";
}

/** D3/D7 — naslov + lista stavki po grupi. */
export function praznaGrupaLista() {
  return { naslov: "", stavke: [""] };
}

export function praznoGrupaPolje(minGrupe = 1) {
  return {
    _fmt: 4,
    grupe: Array.from({ length: minGrupe }, () => praznaGrupaLista()),
  };
}

function normalizeGrupaLista(g) {
  const stavke = (g.stavke || []).map((s) => String(s ?? ""));
  return {
    naslov: String(g.naslov ?? ""),
    stavke: stavke.length ? stavke : [""],
  };
}

export function parseGrupaLista(raw, minGrupe = 1) {
  const j = tryJson(raw);
  if (j?._fmt === 4 && Array.isArray(j.grupe)) {
    const grupe = j.grupe.map(normalizeGrupaLista);
    return {
      _fmt: 4,
      grupe: grupe.length ? grupe : Array.from({ length: minGrupe }, () => praznaGrupaLista()),
    };
  }
  const lista = parseLista(raw);
  if (lista.length) {
    const grupe = Array.from({ length: minGrupe }, () => praznaGrupaLista());
    grupe[0] = { naslov: "", stavke: [...lista, ""] };
    return { _fmt: 4, grupe };
  }
  const t = String(raw ?? "").trim();
  if (!t) return praznoGrupaPolje(minGrupe);
  const grupe = Array.from({ length: minGrupe }, () => praznaGrupaLista());
  grupe[0] = { naslov: t, stavke: [""] };
  return { _fmt: 4, grupe };
}

export function serializeGrupaLista(obj) {
  const grupe = (obj?.grupe || []).map((g) => {
    const stavke = (g.stavke || []).map((s) => String(s ?? ""));
    return {
      naslov: String(g.naslov ?? ""),
      stavke: stavke.length ? stavke : [""],
    };
  });
  const hasContent = grupe.some((g) => textPopunjen(g.naslov) || g.stavke.some((s) => textPopunjen(s)));
  const hasStructure = grupe.length > 1 || grupe.some((g) => g.stavke.length > 1);
  if (!hasContent && !hasStructure) return "";
  return JSON.stringify({ _fmt: 4, grupe });
}

export function grupaListaImaSadrzaj(raw, minGrupe = 1) {
  const d = parseGrupaLista(raw, minGrupe);
  return d.grupe.some((g) => textPopunjen(g.naslov) || g.stavke.some((s) => textPopunjen(s)));
}

export function formatGrupaListaHtml(raw, minGrupe = 1) {
  const d = parseGrupaLista(raw, minGrupe);
  const blocks = d.grupe
    .filter((g) => textPopunjen(g.naslov) || g.stavke.some((s) => textPopunjen(s)))
    .map((g) => {
      let html = "";
      if (textPopunjen(g.naslov)) {
        html += `<div class="grupa-naslov">${esc(g.naslov.trim())}</div>`;
      }
      const stavke = g.stavke.map((s) => String(s).trim()).filter(Boolean);
      if (stavke.length) {
        html += `<ul class="lista">${stavke.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
      }
      return html ? `<div class="grupa-blok">${html}</div>` : "";
    })
    .filter(Boolean);
  return blocks.join("");
}

export function poljeJePopunjeno(key, raw) {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  if (key === "d2_opis_problema") return D2_KLJUCEVI.some((k) => parseD2(s)[k]);
  if (key === "d4_uzrok") {
    const d = parseD4(s);
    return !!(d.opis_problema || d.grane.some(granaImaSadrzaj)
      || d.efekti || d.rezultat
      || M6_KATEGORIJE.some((k) => d.m6[k.key])
      || d.klasifikacija || d.datum_pocetka);
  }
  if (key === "d6_implementacija") {
    const d = parseD6(s);
    return d.redovi.some((r) => r.akcija.trim() || r.odgovorni.trim() || r.rok.trim())
      || d.verifikacija.some((v) => v.trim());
  }
  if (key === "d3_privremena_akcija") return grupaListaImaSadrzaj(s, 3);
  if (key === "d7_prevencija") return grupaListaImaSadrzaj(s, 1);
  if (key === "d8_zakljucak") {
    const d = parseD8(s);
    return !!(d.tekst || d.datum_zatvaranja || d.odobrio);
  }
  if (["d1_tim", "d5_korektivna"].includes(key)) {
    return parseLista(s).length > 0;
  }
  return !!s;
}

export function brojPopunjenihOsmd(form) {
  const keys = [
    "d1_tim", "d2_opis_problema", "d3_privremena_akcija", "d4_uzrok",
    "d5_korektivna", "d6_implementacija", "d7_prevencija", "d8_zakljucak",
  ];
  return keys.filter((k) => poljeJePopunjeno(k, form[k])).length;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatListaHtml(raw) {
  const stavke = parseLista(raw);
  if (!stavke.length) return "";
  return `<ul class="lista">${stavke.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
}

export function formatTekstHtml(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  const linije = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (linije.length <= 1) return `<p>${esc(t).replace(/\n/g, "<br/>")}</p>`;
  return formatListaHtml(linije.map((l) => l.replace(/^[\s•\-–—*]+/, "")).join("\n"));
}

export function formatD2Html(raw) {
  const d = parseD2(raw);
  const stavke = D2_W1H_KOLONE.filter((k) => d[k.key]).map(
    (k) => `<div class="w1h-stavka">
      <div class="w1h-lbl">${esc(k.label)}</div>
      <div class="w1h-txt">${esc(d[k.key]).replace(/\n/g, "<br/>")}</div>
    </div>`,
  );
  if (!stavke.length) return "";
  return `<div class="sub-title">5W1H — opis problema</div>
    <div class="w1h-list">${stavke.join("")}</div>`;
}

function formatD4MetaHtml(d) {
  const meta = [];
  if (d.klasifikacija) meta.push(["Klasifikacija", d.klasifikacija === "sporadic" ? "Sporadičan" : d.klasifikacija === "sistemski" ? "Sistemski" : d.klasifikacija]);
  if (d.datum_pocetka) meta.push(["Datum početka", d.datum_pocetka]);
  if (d.datum_zavrsetka) meta.push(["Datum završetka", d.datum_zavrsetka]);
  if (!meta.length) return "";
  return `<table class="tbl meta-tbl d4-meta"><tbody>${meta.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`;
}

function formatGranaVerticalHtml(g, gi, opisProblema) {
  const delovi = [];
  if (gi > 0 && g.opis) {
    delovi.push(`<div class="why-stavka"><strong>Opis grane:</strong> ${esc(g.opis).replace(/\n/g, "<br/>")}</div>`);
  }
  if (gi === 0 && opisProblema) {
    delovi.push(`<div class="why-stavka"><strong>Opis problema:</strong> ${esc(opisProblema).replace(/\n/g, "<br/>")}</div>`);
  }
  g.why.forEach((w, i) => {
    if (w) delovi.push(`<div class="why-stavka"><strong>${i + 1}. Zašto:</strong> ${esc(w).replace(/\n/g, "<br/>")}</div>`);
  });
  if (g.privremena) delovi.push(`<div class="why-stavka"><strong>Privremena mera:</strong> ${esc(g.privremena).replace(/\n/g, "<br/>")}</div>`);
  if (g.korenski_uzrok) {
    delovi.push(`<div class="why-stavka"><strong>Korenski uzrok:</strong> ${esc(g.korenski_uzrok).replace(/\n/g, "<br/>")}</div>`);
  }
  if (g.definitivna) {
    delovi.push(`<div class="why-stavka"><strong>Definitivna mera:</strong> ${esc(g.definitivna).replace(/\n/g, "<br/>")}</div>`);
  }
  if (!delovi.length) return "";
  const naslov = gi > 0 ? `Grana ${gi + 1}` : "Analiza";
  return `<div class="why-grana"><div class="why-grana-naslov">${naslov}</div>${delovi.join("")}</div>`;
}

export function formatD4Html(raw) {
  const d = parseD4(raw);
  const delovi = [];
  const meta = formatD4MetaHtml(d);
  if (meta) delovi.push(meta);

  if (d.opis_problema || d.grane.some(granaImaSadrzaj)) {
    delovi.push(`<div class="sub-title">5 ZAŠTO — analiza</div>`);
    d.grane.forEach((g, gi) => {
      const blok = formatGranaVerticalHtml(g, gi, d.opis_problema);
      if (blok) delovi.push(blok);
    });
  }

  for (const [lbl, val] of [
    ["Efekti problema", d.efekti],
    ["Rezultat", d.rezultat],
  ]) {
    if (val) delovi.push(`<div class="d4-footer-blok"><strong>${esc(lbl)}:</strong> ${esc(val).replace(/\n/g, "<br/>")}</div>`);
  }

  const m6Redovi = M6_KATEGORIJE.map((k) => {
    const v = String(d.m6[k.key] || "").trim();
    return `<tr>
      <th class="m6-kat" style="border-left:3px solid ${k.boja}">${esc(k.label)} <span class="m6-eng">(${esc(k.eng)})</span></th>
      <td>${v ? esc(v).replace(/\n/g, "<br/>") : "<span class=\"empty\">—</span>"}</td>
    </tr>`;
  }).join("");

  if (M6_KATEGORIJE.some((k) => d.m6[k.key])) {
    delovi.push(`
      <div class="sub-title m6-wrap">Ishikawa — 6M dijagram</div>
      <table class="tbl m6-tbl">
        <thead><tr><th>Kategorija</th><th>Potencijalni uzroci</th></tr></thead>
        <tbody>${m6Redovi}</tbody>
      </table>`);
  }

  return delovi.join("") || "";
}

export function formatD6Html(raw) {
  const d = parseD6(raw);
  const redovi = d.redovi.filter((r) => r.akcija.trim() || r.odgovorni.trim() || r.rok.trim());
  const verStavke = d.verifikacija.map((s) => String(s).trim()).filter(Boolean);
  const delovi = [];
  if (redovi.length) {
    const statusKlasa = (s) => {
      const u = String(s || "").toLowerCase();
      if (u.includes("zavr")) return "st-done";
      if (u.includes("tok")) return "st-wip";
      if (u.includes("odlo")) return "st-hold";
      return "st-plan";
    };
    delovi.push(`<table class="tbl akcije-tbl">
    <thead><tr>
      <th>#</th><th>Akcija</th><th>Odgovorni</th><th>Rok</th><th>Status</th>
    </tr></thead>
    <tbody>${redovi.map((r, i) => `
      <tr>
        <td class="tc">${i + 1}</td>
        <td>${esc(r.akcija)}</td>
        <td>${esc(r.odgovorni) || "—"}</td>
        <td class="tc">${esc(r.rok) || "—"}</td>
        <td class="tc"><span class="status-pill ${statusKlasa(r.status)}">${esc(r.status)}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>`);
  }
  if (verStavke.length) {
    delovi.push(`<div class="sub-title">Verifikacija efikasnosti</div>
      <ul class="lista">${verStavke.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`);
  }
  return delovi.join("");
}

export function formatD8Html(raw) {
  const d = parseD8(raw);
  const delovi = [];
  if (d.datum_zatvaranja || d.odobrio) {
    delovi.push(`<table class="tbl meta-tbl"><tbody>
      ${d.datum_zatvaranja ? `<tr><th>Datum zatvaranja</th><td>${esc(d.datum_zatvaranja)}</td></tr>` : ""}
      ${d.odobrio ? `<tr><th>Odobrio</th><td>${esc(d.odobrio)}</td></tr>` : ""}
    </tbody></table>`);
  }
  if (d.tekst) delovi.push(formatTekstHtml(d.tekst));
  return delovi.join("");
}

export function formatPoljeHtml(key, raw) {
  if (key === "d2_opis_problema") return formatD2Html(raw);
  if (key === "d4_uzrok") return formatD4Html(raw);
  if (key === "d6_implementacija") return formatD6Html(raw);
  if (key === "d8_zakljucak") return formatD8Html(raw);
  if (key === "d3_privremena_akcija") return formatGrupaListaHtml(raw, 3);
  if (key === "d7_prevencija") return formatGrupaListaHtml(raw, 1);
  if (["d1_tim", "d5_korektivna"].includes(key)) {
    return formatListaHtml(raw);
  }
  return formatTekstHtml(raw);
}
