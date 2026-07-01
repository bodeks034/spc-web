/** Zajednički stilovi za šifrarnik panele. */
export function inpStyle(C, extra = {}) {
  return {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "7px 10px",
    fontFamily: "inherit",
    boxSizing: "border-box",
    ...extra,
  };
}

export function btnStyle(C, boja, { disabled = false } = {}) {
  return {
    background: boja,
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function btnGhost(C) {
  return {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 9,
    padding: "2px 6px",
    cursor: "pointer",
    color: C.tekst,
  };
}
