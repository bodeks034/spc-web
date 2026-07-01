/** Kompaktna metrika — zajednički stil za SPC snapshot i KPI pregled. */
export function AnalitikaMetrika({ label, value, boja, C, onClick, title, sub, uRedu = false, spcVece = false }) {
  const klik = typeof onClick === "function";
  const Tag = klik ? "button" : "div";
  return (
    <Tag
      type={klik ? "button" : undefined}
      onClick={onClick}
      title={title || (sub ? `${label}: ${value} · ${sub}` : undefined)}
      style={{
        background: C.bg,
        border: `1px solid ${(boja || C.border)}35`,
        borderRadius: 8,
        padding: spcVece ? "10px 6px" : uRedu ? "8px 4px" : "8px 12px",
        minWidth: uRedu || spcVece ? 0 : 72,
        width: uRedu || spcVece ? "100%" : undefined,
        maxWidth: uRedu || spcVece ? "100%" : undefined,
        margin: uRedu || spcVece ? 0 : undefined,
        display: uRedu || spcVece ? "flex" : undefined,
        flexDirection: uRedu || spcVece ? "column" : undefined,
        alignItems: uRedu || spcVece ? "center" : undefined,
        justifyContent: uRedu || spcVece ? "center" : undefined,
        boxSizing: "border-box",
        textAlign: "center",
        cursor: klik ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div style={{
        color: C.sivi,
        fontSize: spcVece ? 8 : uRedu ? 7 : 8,
        letterSpacing: 0.6,
        marginBottom: 4,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {label}
      </div>
      <div style={{
        color: boja || C.tekst,
        fontSize: spcVece ? 16 : uRedu ? 14 : 15,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
      }}>
        {value ?? "—"}
      </div>
      {sub && (
        <div style={{
          color: C.border,
          fontSize: 7,
          marginTop: 4,
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {sub}
        </div>
      )}
    </Tag>
  );
}

export default AnalitikaMetrika;
