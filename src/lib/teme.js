/** Palete boja — tamna / svetla tema (ublažen kontrast, bez čistog #000 / #fff). */

export const TEME = {
  tamna: {
    bg: "#232d40",
    panel: "#2b374d",
    border: "#455a73",
    plava: "#6eb0ff",
    zelena: "#4cc764",
    crvena: "#ff6b63",
    zuta: "#e0ad3a",
    narandzasta: "#f59a52",
    tekst: "#e4eaf4",
    sivi: "#9baabf",
    ljubicasta: "#c9a0ff",
    ok: "#1a3d28",
    nok: "#3d1a1a",
    input: "#1e2738",
    hover: "#35465f",
    /** Tekst na obojenim dugmadima / badge-ovima (ne čist #fff). */
    onAkcent: "#f2f6fb",
    /** Tekst na žutoj podlozi (upozorenje, FAI). */
    onZuta: "#2a3441",
    naziv: "tamna",
  },
  svetla: {
    bg: "#e2e6ed",
    panel: "#ebeff4",
    border: "#b4becd",
    plava: "#0860ca",
    zelena: "#1a7f37",
    crvena: "#c8323c",
    zuta: "#8f6500",
    narandzasta: "#b34d00",
    tekst: "#283242",
    sivi: "#556070",
    ljubicasta: "#5e3da8",
    ok: "#b5e8c8",
    nok: "#f0d0d0",
    input: "#d9dfe8",
    hover: "#cfd6e0",
    onAkcent: "#f8fafc",
    onZuta: "#283242",
    naziv: "svetla",
  },
};

/** Zajednički stil primarnog dugmeta na obojenoj podlozi. */
export function stilDugmeAkcent(C, boja, extra = {}) {
  return {
    background: boja,
    border: "none",
    borderRadius: 6,
    color: C.onAkcent,
    fontWeight: 700,
    cursor: "pointer",
    ...extra,
  };
}

/** Ternarni tekst: aktivan na obojenoj podlozi vs. neaktivan. */
export function bojaNaAkcentu(C, aktivno, neaktivno) {
  return aktivno ? C.onAkcent : (neaktivno ?? C.sivi);
}
