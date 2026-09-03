/** Mali chip u AppHeader desnoExtra (KPI, NCR, LOG, …). */
export default function LinijaHeaderChip({
  C,
  boja,
  aktivan = false,
  onClick,
  title,
  children,
  testId,
  stil = null,
}) {
  const accent = boja || C.plava;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      title={title}
      style={{
        background: aktivan ? `${accent}22` : C.hover,
        border: `1px solid ${aktivan ? accent : C.border}`,
        borderRadius: 5,
        color: aktivan ? accent : C.sivi,
        fontSize: 8,
        padding: "1px 6px",
        cursor: "pointer",
        fontWeight: 700,
        flexShrink: 0,
        ...(stil || {}),
      }}
    >
      {children}
    </button>
  );
}
