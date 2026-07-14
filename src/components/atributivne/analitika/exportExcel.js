import { supabase } from "../../../lib/supabaseClient.js";
import { exportKontrolniLogExcel, downloadWorkbook } from "../../../lib/excelSync.js";

export async function exportExcel(idDeo, datumOd, datumDo, addToast) {
  try {
    const wb = await exportKontrolniLogExcel(supabase, idDeo, datumOd, datumDo);
    if (!wb) { addToast("Nema podataka za export", "greska"); return; }
    downloadWorkbook(wb, `SPC_${idDeo}_${datumOd || "sve"}_${datumDo || ""}.xlsx`);
    addToast("✓ Exportovano u Excel (.xlsx)", "uspeh");
  } catch (e) { addToast(e.message, "greska"); }
}
