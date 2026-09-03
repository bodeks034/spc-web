/**
 * Ravna traka tabova za linijski režim (atributivne + merljive).
 * Analitika i dalje koristi AnalitikaHeader.
 */
export default function LinijaTabTraka({
  C,
  tab,
  onTabChange,
  tabovi = [],
  kompakt = false,
  bojaTaba,
  badgePoTabu = null,
  desnoSlot = null,
  borderTop = false,
  borderBottom = true,
  paddingLeft,
  paddingX,
}) {
  const padL = paddingLeft != null
    ? paddingLeft
    : (paddingX != null ? paddingX : (kompakt ? 6 : 18));
  const padX = paddingX != null ? paddingX : null;

  return (
    <div
      data-testid="linija-tab-traka"
      style={{
        display: "flex",
        borderBottom: borderBottom ? `1px solid ${C.border}` : undefined,
        borderTop: borderTop ? `1px solid ${C.border}` : undefined,
        background: borderBottom ? C.panel : undefined,
        paddingLeft: padX == null ? padL : undefined,
        padding: padX != null ? `0 ${padX}px` : undefined,
        flexWrap: "nowrap",
        overflowX: kompakt ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {tabovi.map(([id, naziv]) => {
        const aktivan = tab === id;
        const boja = bojaTaba ? bojaTaba(id) : C.plava;
        const badge = badgePoTabu?.[id];
        return (
          <button
            key={id}
            type="button"
            data-testid={`tab-${id}`}
            onClick={() => onTabChange(id)}
            style={{
              background: "none",
              border: "none",
              flexShrink: 0,
              borderBottom: aktivan ? `2px solid ${boja}` : "2px solid transparent",
              color: aktivan ? boja : C.sivi,
              fontSize: kompakt ? 9 : 10,
              fontWeight: 700,
              padding: kompakt ? "8px 10px" : "10px 14px",
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            {naziv}
            {badge != null && badge !== 0 && badge !== "" && (
              <span style={{
                background: C.plava,
                color: C.onAkcent,
                fontSize: 8,
                borderRadius: 10,
                padding: "1px 5px",
                marginLeft: 5,
              }}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
      {desnoSlot != null && (
        <>
          <div style={{ flex: 1, minWidth: 8 }} />
          {typeof desnoSlot === "string" ? (
            <span style={{
              color: C.sivi,
              fontSize: 9,
              alignSelf: "center",
              paddingRight: 12,
              flexShrink: 0,
            }}>
              {desnoSlot}
            </span>
          ) : desnoSlot}
        </>
      )}
    </div>
  );
}
