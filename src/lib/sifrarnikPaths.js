/**
 * Jedan radni folder — excel rad izmenjen (glavni unos + sifrarnik-paket).
 */
import path from "node:path";

export const EXCEL_RAD_DIR = "excel rad izmenjen";

export function excelRadBase(root) {
  return path.join(root, EXCEL_RAD_DIR);
}

export function sifrarnikPaketDir(root) {
  return path.join(excelRadBase(root), "sifrarnik-paket");
}

export function sifrarnikCsvDir(root) {
  return path.join(sifrarnikPaketDir(root), "csv");
}

export function glavniUnosPath(root) {
  return path.join(excelRadBase(root), "glavni unos.xlsx");
}

export function merljiveXlsxPath(root) {
  return path.join(sifrarnikPaketDir(root), "SPC_merljive.xlsx");
}

export function atributivneXlsxPath(root) {
  return path.join(sifrarnikPaketDir(root), "SPC_atributivne.xlsx");
}
