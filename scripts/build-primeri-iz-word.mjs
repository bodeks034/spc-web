#!/usr/bin/env node
/**
 * Parsira izvuceno-iz-word.txt → primeri-8d.json + osmd-word-primeri.json
 * node scripts/build-primeri-iz-word.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TXT = path.join(ROOT, "docs/knowledge/primeri-8d/izvuceno-iz-word.txt");

const { serializeD2, serializeD4, serializeD6, serializeGrupaLista, serializeLista, praznaGrana5Why } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/osmdStruktura.js")).href
);
const { validirajPrimer8d } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/troubleshootingPrimeri.js")).href
);

function cleanLine(s) {
  return String(s || "")
    .replace(/<\/w:pBdr>[\s\S]*$/g, "")
    .replace(/Generisano:.*$/g, "")
    .trim();
}

function idx(lines, pred, from = 0) {
  for (let i = from; i < lines.length; i++) {
    if (pred(lines[i], i)) return i;
  }
  return -1;
}

function sliceUntil(lines, start, endPred) {
  const out = [];
  for (let i = start; i < lines.length; i++) {
    if (endPred(lines[i], i)) break;
    out.push(lines[i]);
  }
  return out;
}

function parseM6(block) {
  const m6 = { ljudi: "", masina: "", metod: "", materijal: "", merenje: "", okruzenje: "" };
  const map = {
    "Čovek": "ljudi", "Man": "ljudi",
    "Mašina": "masina", "Machine": "masina",
    "Metoda": "metod", "Method": "metod",
    "Materijal": "materijal", "Material": "materijal",
    "Merenje": "merenje", "Measurement": "merenje",
    "Okolina": "okruzenje", "Environment": "okruzenje",
  };
  let current = null;
  for (const raw of block) {
    const line = cleanLine(raw);
    if (!line || line.startsWith("Kategorija") || line.startsWith("Potencijalni")) continue;
    if (map[line]) { current = map[line]; continue; }
    if (line.startsWith("•") && current) {
      m6[current] = [m6[current], line.replace(/^•\s*/, "")].filter(Boolean).join("\n");
    }
  }
  return m6;
}

function parseWhy(block) {
  const why = ["", "", "", "", ""];
  let wi = -1;
  for (const raw of block) {
    const line = cleanLine(raw);
    if (line === "Problem" || line.startsWith("5×ZAŠTO")) continue;
    if (/^Korenski uzrok|^Privremena protivmera|^Definitivna protivmera|^ISHIKAWA/.test(line)) break;
    const m = line.match(/^(\d)\.\s*Zašto$/);
    if (m) { wi = Number(m[1]) - 1; continue; }
    if (wi >= 0 && wi < 5 && line && !line.startsWith("5×")) {
      why[wi] = why[wi] ? `${why[wi]}\n${line}` : line;
    }
  }
  return why;
}

function parseD2W1H(block) {
  const d2 = { inicijalni: "", sta: "", kada: "", gde: "", ko: "", koji: "", kako: "" };
  const keys = {
    "INICIJALNI OPIS": "inicijalni",
    "ŠTA?": "sta", "KADA?": "kada", "GDE?": "gde", "KO?": "ko", "KOJI?": "koji", "KAKO?": "kako",
  };
  let cur = null;
  for (const raw of block) {
    const line = cleanLine(raw);
    if (!line || line.startsWith("5W1H") || line === "KVANTIFIKACIJA") continue;
    if (line === "KVANTIFIKACIJA") break;
    const hit = Object.entries(keys).find(([k]) => line.startsWith(k));
    if (hit) { cur = hit[1]; continue; }
    if (cur === "inicijalni" && line.startsWith("INICIJALNI")) continue;
    if (cur && line) d2[cur] = d2[cur] ? `${d2[cur]}\n${line}` : line;
  }
  return d2;
}

function parseKv(block) {
  const out = {};
  for (let i = 0; i < block.length - 1; i++) {
    const k = cleanLine(block[i]);
    const v = cleanLine(block[i + 1]);
    if (k && v && !k.startsWith("D") && k.length < 60) out[k] = v;
  }
  return out;
}

const STOP_KLJUC = new Set([
  "defekt", "nedostatak", "van", "merna", "tačka", "tačke", "kom", "lot", "spec", "mm",
  "the", "and", "nok", "broj", "tip", "pojave", "nedostatka",
]);

function izvuciKljuceviDefekta(defect, d2, dodatni = []) {
  const src = [defect, d2?.sta, d2?.inicijalni].filter(Boolean).join(" ");
  const raw = src.toLowerCase()
    .replace(/[±∆øØ]/g, " ")
    .split(/[\s,;/().]+/)
    .map((w) => w.replace(/^[^a-z0-9čćšđž]+|[^a-z0-9čćšđž]+$/gi, ""))
    .filter((w) => w.length > 2 && !STOP_KLJUC.has(w));
  return [...new Set([...dodatni.map((k) => k.toLowerCase()), ...raw])].slice(0, 14);
}

function parseRefSekcija(block, startLabel, stopLabels, polja) {
  const start = block.findIndex((l) => cleanLine(l) === startLabel);
  if (start < 0) return {};
  const out = {};
  const labelMap = Object.fromEntries(polja.map(([k, label]) => [label, k]));
  for (let i = start + 1; i < block.length - 1; i++) {
    const line = cleanLine(block[i]);
    if (!line || stopLabels.includes(line) || line.includes("Generisano:")) break;
    const key = labelMap[line];
    if (key) {
      out[key] = cleanLine(block[i + 1] || "");
      i++;
    }
  }
  return out;
}

function parseReport(lines, start) {
  const titleLine = cleanLine(lines[start + 1] || "");
  const subLine = cleanLine(lines[start + 2] || "");
  const partMatch = titleLine.match(/8D Izveštaj — (.+)/);
  const idMatch = subLine.match(/ID:\s*(\S+)/);
  const defMatch = subLine.match(/Defekt:\s*(.+?)\s*·/);
  const broj8d = idMatch?.[1] || "";

  const zagStart = idx(lines, (l) => l.includes("ZAGLAVLJE 8D"), start);
  const d1Start = idx(lines, (l) => /^D1\s+Tim/.test(l), zagStart);
  const zagBlock = lines.slice(zagStart + 1, d1Start);
  const zag = parseKv(zagBlock);

  const d2Start = idx(lines, (l) => l.startsWith("D2"), d1Start);
  const d3Start = idx(lines, (l) => l.startsWith("D3"), d2Start);
  const d4Start = idx(lines, (l) => l.startsWith("D4"), d3Start);
  const d5Start = idx(lines, (l) => l.startsWith("D5"), d4Start);
  const d6Start = idx(lines, (l) => l.startsWith("D6"), d5Start);
  const d7Start = idx(lines, (l) => l.startsWith("D7"), d6Start);
  const d8Start = idx(lines, (l) => l.startsWith("D8"), d7Start);
  const llStart = idx(lines, (l) => l.startsWith("LL"), d8Start);
  const refStart = idx(lines, (l) => l.startsWith("REF"), llStart);

  const d2 = parseD2W1H(lines.slice(d2Start, d3Start));
  const d3Lines = lines.slice(d3Start + 1, d4Start).filter((l) => !/^D3/.test(l));
  const d4Block = lines.slice(d4Start, d5Start);
  const why = parseWhy(d4Block);
  const ishStart = idx(d4Block, (l) => l.includes("ISHIKAWA"));
  const m6Detalj = ishStart >= 0 ? parseM6(d4Block.slice(ishStart)) : {};

  let korenski = "";
  let privremena = "";
  let definitivna = "";
  for (const raw of d4Block) {
    const l = cleanLine(raw);
    if (l === "Korenski uzrok") korenski = cleanLine(d4Block[d4Block.indexOf(raw) + 1] || "");
    if (l === "Privremena protivmera") privremena = cleanLine(d4Block[d4Block.indexOf(raw) + 1] || "");
    if (l === "Definitivna protivmera") definitivna = cleanLine(d4Block[d4Block.indexOf(raw) + 1] || "");
  }

  const d5Stavke = lines.slice(d5Start + 1, d6Start).map(cleanLine).filter((l) => l && !l.startsWith("D5"));
  const d7Block = lines.slice(d7Start + 1, d8Start);
  const d7Stavke = [];
  for (const raw of d7Block) {
    const l = cleanLine(raw);
    if (!l || l.startsWith("D7") || l.startsWith("Mere za") || l.startsWith("Kriterijumi")) continue;
    if (l.startsWith("Trajno") || l.startsWith("Ugraditi") || l.startsWith("Revidirati") || l.startsWith("Uvesti") || l.startsWith("Distribuirati") || l.startsWith("FAI") || l.startsWith("DNC") || l.startsWith("Godišnja") || l.startsWith("Tool") || l.startsWith("In-process") || l.startsWith("SPC") || l.startsWith("Process") || l.startsWith("Poka") || l.startsWith("Obavezan") || l.startsWith("100%") || l.startsWith("0 ") || l.startsWith("Cpk") || l.startsWith("3 uzastopn")) {
      d7Stavke.push(l);
    }
  }

  const d8Text = lines.slice(d8Start + 1, llStart).map(cleanLine).filter((l) => l && !l.startsWith("D8") && l !== "ZAKLJUČAK 8D IZVEŠTAJA").join("\n");

  const llStavke = lines.slice(llStart + 1, refStart).map(cleanLine).filter((l) => l && !l.startsWith("LL") && l !== "Naučene lekcije:");

  const refEnd = idx(lines, (l) => l.includes("Generisano:"), refStart + 1);
  const refBlock = lines.slice(refStart, refEnd >= 0 ? refEnd : refStart + 30);
  const pfmea = parseRefSekcija(refBlock, "PFMEA — REFERENCA", ["CONTROL PLAN — REFERENCA"], [
    ["proces", "Proces"],
    ["mod_greske", "Potencijalni mod greške"],
    ["efekat", "Potencijalni efekat"],
    ["otkrivanje_pre", "Otkrivanje (D) — pre"],
    ["otkrivanje_posle", "Otkrivanje (D) — posle"],
    ["rpn_pre", "RPN — pre"],
    ["rpn_posle", "RPN — posle"],
  ]);
  const cp = parseRefSekcija(refBlock, "CONTROL PLAN — REFERENCA", [], [
    ["operacija", "Operacija / Proces"],
    ["karakteristika", "Karakteristika"],
    ["metoda_kontrole", "Metoda kontrole"],
    ["ucestalost", "Učestalost"],
    ["korigovana_metoda", "Korigovana metoda kontrole"],
    ["odgovornost", "Odgovornost"],
  ]);

  const defect = defMatch?.[1]?.trim() || zag["Defekt / nedostatak"] || "";
  const partName = partMatch?.[1]?.trim() || zag["Naziv dela (SPC ID)"]?.replace(/\s*\([^)]+\)$/, "") || "";

  const DODATNI_KLJUC = {
    "8D-NM-001": ["pukotina", "zavara", "zavar", "vara", "visina", "haz", "spoj", "mig", "pt", "pukotina zavara"],
    "8D-SA-002": ["geometrija", "šasija", "šasije", "b7", "fikstura", "cmm", "devijacija", "tolerancija", "poprečni"],
    "8D-OS-003": ["prečnik", "rukavac", "osovina", "cnc", "insert", "tool", "podmjer", "struganje", "os-ø2"],
    "8D-NME-004": ["otvor", "bušenje", "offset", "fai", "poziciona", "p-4l", "pričvršćivanje", "program", "cmm"],
  };

  const kljucevi = izvuciKljuceviDefekta(defect, d2, DODATNI_KLJUC[broj8d] || []);

  const d4Json = serializeD4({
    problem_naslov: defect,
    opis_problema: d2.inicijalni || defect,
    grane: [{
      ...praznaGrana5Why(),
      opis: defect,
      why,
      privremena,
      definitivna: korenski || definitivna,
    }],
    m6: m6Detalj,
    rezultat: definitivna,
  });

  const d6Rows = [];
  const d6Lines = lines.slice(d6Start, d7Start);
  for (let i = 0; i < d6Lines.length; i++) {
    if (/^\d+$/.test(cleanLine(d6Lines[i]))) {
      d6Rows.push({
        akcija: cleanLine(d6Lines[i + 1] || ""),
        odgovorni: cleanLine(d6Lines[i + 2] || ""),
        rok: cleanLine(d6Lines[i + 3] || ""),
        status: cleanLine(d6Lines[i + 4] || "Planirano"),
      });
    }
  }

  const full = {
    broj_8d: broj8d,
    id_deo: broj8d.split("-").slice(0, 2).join("-") || broj8d,
    naziv_dela: partName,
    defekt_nedostatak: defect,
    artikal_naziv_sifra: `${partName} (${broj8d})`,
    kolicina_reklamacije: zag["Količina u reklamaciji"] || "",
    kupac_ime_id: zag["Kupac / Korisnik"] || "",
    datum_prijema_reklamacije: parseDatum(zag["Datum prijema reklamacije"]),
    datum_otvaranja_8d: parseDatum(zag["Datum otvaranja 8D"]),
    datum_cilj_zatvaranja: parseDatum(zag["Ciljani datum zatvaranja"]),
    status: "zavrsen",
    d1_tim: serializeLista(lines.slice(d1Start + 1, d2Start).filter((l) => !/^(D1|ČLANOVI)/.test(l)).map(cleanLine).filter(Boolean)),
    d2_opis_problema: serializeD2(d2),
    d3_privremena_akcija: serializeGrupaLista({
      _fmt: 4,
      grupe: [{ naslov: "Containment", stavke: [...d3Lines.map(cleanLine).filter(Boolean), ""] }],
    }),
    d4_uzrok: d4Json,
    d5_korektivna: serializeLista(d5Stavke),
    d6_implementacija: serializeD6({ _fmt: 2, redovi: d6Rows }),
    d7_prevencija: serializeGrupaLista({
      _fmt: 4,
      grupe: [{ naslov: "D7 — Preventivne mere", stavke: [...d7Stavke, ""] }],
    }),
    d8_zakljucak: d8Text,
    lesson_learned: serializeLista(llStavke),
    pfmea_ref: JSON.stringify(pfmea),
    control_plan_ref: JSON.stringify(cp),
  };

  const sablon = {
    id: broj8d.toLowerCase(),
    kljucevi,
    problem: defect,
    uzrok: why[1] || "",
    korenskiUzrok: korenski,
    privremena,
    resenje: d5Stavke[0] || definitivna,
    m6: dominantM6(m6Detalj),
    m6Detalj,
    why,
    d2,
    d7Stavke,
    proces: defect.includes("mm") || defect.includes("prečnik") || defect.includes("Cpk") ? "merljive" : "atributivne",
    izvor: `Word: 8D_Izvestaji_Industrijski_Dijelovi.docx (${broj8d})`,
  };

  return { full, sablon };
}

function dominantM6(m6) {
  const order = ["metod", "masina", "merenje", "materijal", "ljudi", "okruzenje"];
  return order.find((k) => m6[k]?.trim()) || "metod";
}

function parseDatum(s) {
  const m = String(s || "").match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function main() {
  const raw = await fs.readFile(TXT, "utf8");
  const lines = raw.split(/\n/).map(cleanLine).filter(Boolean);

  const starts = [];
  lines.forEach((l, i) => {
    if (l === "KONTROLA KVALITETA · SPC" && lines[i + 1]?.startsWith("8D Izveštaj")) starts.push(i);
  });

  const reports = starts.map((s) => parseReport(lines, s));
  const primeri = [];
  const greske = [];

  for (const r of reports) {
    const v = validirajPrimer8d(r.sablon, primeri.length);
    if (v.ok) primeri.push(v.primer);
    else greske.push(...v.greske);
  }

  await fs.writeFile(
    path.join(ROOT, "src/data/primeri-8d.json"),
    `${JSON.stringify({ verzija: 1, opis: "4 industrijska 8D iz Word dokumenta", primeri }, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(ROOT, "src/data/osmd-word-primeri.json"),
    `${JSON.stringify({ verzija: 1, izvor: "8D_Izvestaji_Industrijski_Dijelovi.docx", primeri: reports.map((r) => r.full) }, null, 2)}\n`,
    "utf8",
  );

  console.log(`✓ ${primeri.length} šablona → src/data/primeri-8d.json`);
  console.log(`✓ ${reports.length} punih 8D → src/data/osmd-word-primeri.json`);
  if (greske.length) console.warn("Greške:", greske.join("; "));
}

main().catch((e) => { console.error(e); process.exit(1); });
