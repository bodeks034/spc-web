import { useState } from "react";
import { navigacijaZaIdDeo, STATUS_DEO_LABEL } from "../../lib/sifrarnikOdrzavanje.js";

/** Globalna pretraga dela po ID u Modulu 0. */
export default function SifrarnikGlobalPretraga({ C, onNavigate, addToast }) {
  const [upit, setUpit] = useState("");
  const [trazi, setTrazi] = useState(false);

  const pretrazi = async () => {
    const id = upit.trim().toUpperCase();
    if (!id) {
      addToast?.("Unesi ID dela", "greska");
      return;
    }
    setTrazi(true);
    try {
      const rez = await navigacijaZaIdDeo(id);
      if (!rez?.pronadjen) {
        addToast?.(`Deo ${id} nije u šifrarniku`, "greska");
        return;
      }
      const korak = rez.nav || rez.koraci?.[0];
      if (korak) {
        onNavigate?.(korak.tab, korak.ctx);
        const st = STATUS_DEO_LABEL[rez.status]?.label || rez.status;
        addToast?.(`${id} · ${st}${rez.nedostaje?.length ? ` → ${korak.label || korak.tab}` : ""}`, "uspeh");
      } else {
        onNavigate?.("delovi");
        addToast?.(`${id} — otvoren pregled delova`, "info");
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setTrazi(false);
    }
  };

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 10,
    padding: "6px 10px",
    fontFamily: "inherit",
    width: 140,
  };

  return (
    <div
      data-testid="sifrarnik-global-pretraga"
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: 8,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: C.sivi, fontSize: 9, fontWeight: 700 }}>ID DELO:</span>
      <input
        value={upit}
        onChange={(e) => setUpit(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === "Enter") pretrazi(); }}
        placeholder="HAM-NM-001"
        style={INP}
        data-testid="sifrarnik-global-pretraga-input"
      />
      <button
        type="button"
        disabled={trazi}
        onClick={pretrazi}
        data-testid="sifrarnik-global-pretraga-go"
        style={{
          background: C.plava,
          border: "none",
          borderRadius: 6,
          color: C.onAkcent,
          fontSize: 10,
          fontWeight: 700,
          padding: "6px 12px",
          cursor: "pointer",
          opacity: trazi ? 0.6 : 1,
        }}
      >
        {trazi ? "…" : "Idi →"}
      </button>
    </div>
  );
}
