import * as XLSX from "xlsx";
import { parseMomentListObjekti } from "./momentKljucList.js";

const SHEET_JOB_MAP = {
  "modul 3b motor": "Motor",
  "modul 3c menjac": "Menjac",
  "modul 3d vesanje": "Vesanje",
  "modul 3a sasija": "Karoserija",
  "modul 3 torque specificacion": null,
};

function mapRowFromSheet(row, sheetName, defaultJob) {
  const get = (...keys) => {
    for (const k of keys) {
      const hit = Object.entries(row).find(([h]) => String(h).toLowerCase().includes(k));
      if (hit && hit[1] != null && hit[1] !== "") return String(hit[1]).trim();
    }
    return "";
  };

  const partId = get("part_id", "id_deo");
  const moment = get("moment", "targettorque");
  const ugao = get("ugao", "angle");
  const poz = get("pozicija", "position");
  const sklop = get("sklop", "subsystem") || defaultJob || sheetName;

  return {
    id_deo: partId,
    kod_job: defaultJob || sklop,
    naziv_job: get("naziv dela", "part_name", "naziv"),
    operacija: get("operacija", "operation") || "MON-FINAL",
    torque_id: get("torque_id"),
    redosled: null,
    poz_br: poz ? (poz.match(/^\d+/) ? poz.match(/^\d+/)[0] : poz) : "",
    poz_opis: poz,
    sklop,
    vijak: get("vijak", "bolt"),
    klasa_vijka: get("klasa", "grade"),
    cilj_nm: moment.replace(/[^\d.,-]/g, "").replace(",", "."),
    ugao_cilj: ugao,
    tol_pct: get("tol"),
    klasifikacija: "VSK",
    tool_kod: get("alat", "tool"),
    program_kod: get("program"),
    napomena: get("note", "napomena"),
  };
}

export function parseModul3Workbook(wb) {
  const svi = [];
  for (const sheetName of wb.SheetNames) {
    const lower = sheetName.toLowerCase();
    if (!lower.includes("modul 3") && !lower.includes("torque spec")) continue;
    const defaultJob = SHEET_JOB_MAP[lower] ?? null;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    let rbr = 0;
    for (const row of rows) {
      const mapped = mapRowFromSheet(row, sheetName, defaultJob);
      if (!mapped.id_deo && !mapped.cilj_nm) continue;
      rbr += 1;
      mapped.redosled = rbr;
      svi.push(mapped);
    }
  }
  return parseMomentListObjekti(svi);
}

export function parseMomentListWorkbook(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return parseMomentListObjekti(rows);
}

export function ucitajMomentXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const modul3 = parseModul3Workbook(wb);
  if (modul3.length) return modul3;
  return parseMomentListWorkbook(wb);
}

export function izveziMomentListSablon(redovi = []) {
  const hdr = [
    "id_deo", "kod_job", "naziv_job", "operacija", "redosled", "prolaz", "poz_br", "poz_opis",
    "sklop", "vijak", "klasa_vijka", "cilj_nm", "tol_min", "tol_max", "tol_pct",
    "ugao_cilj", "ugao_tol", "tip", "klasifikacija", "tool_kod", "program_kod",
    "torque_id", "dijagram", "vendor_profil", "sekvenca_sablon", "napomena",
  ];
  const data = [hdr];
  const src = redovi.length ? redovi : [{
    id_deo: "MRAP1-001", kod_job: "Motor", naziv_job: "Sklop motor", operacija: "MON-FINAL",
    redosled: 1, prolaz: 1, poz_br: "1", poz_opis: "Glava — vijak 1", sklop: "Motor",
    vijak: "M11", klasa_vijka: "10.9", cilj_nm: 40, tol_min: 36, tol_max: 44,
    tip: "NM", klasifikacija: "VSK", tool_kod: "TK003", program_kod: "P003",
    torque_id: "T000056", dijagram: "Sklop_01_Motor.svg", vendor_profil: "atlas",
  }];
  for (const r of src) {
    data.push(hdr.map((h) => r[h] ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Moment_list");
  XLSX.writeFile(wb, "moment_kljuc_sablon.xlsx");
}
