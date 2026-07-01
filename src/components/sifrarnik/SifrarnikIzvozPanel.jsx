import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { exportMasterWorkbook, downloadWorkbook } from "../../lib/excelSync.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

/** Samo izvoz backup-a — unos isključivo kroz tabove u aplikaciji. */
export default function SifrarnikIzvozPanel({ C, addToast }) {
  const [busy, setBusy] = useState(false);

  const izvoz = async () => {
    setBusy(true);
    try {
      const book = await exportMasterWorkbook(supabase);
      downloadWorkbook(book, `SPC_sifrarnik_backup_${dISO()}.xlsx`);
      addToast?.("✓ Backup Excel preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, color: C.sivi, fontSize: 11, lineHeight: 1.65 }}>
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Backup (opciono)</div>
      <p>
        Svi šifrarnici se unose kroz tabove u ovom modulu — Excel nije potreban za rad.
        Po potrebi možete preuzeti kopiju svih tabela za arhivu ili migraciju.
      </p>
      <button type="button" disabled={busy} onClick={izvoz} style={btnStyle(C, C.plava, { disabled: busy })}>
        {busy ? "Izvoz…" : "⬇ Preuzmi backup Excel"}
      </button>
    </div>
  );
}
