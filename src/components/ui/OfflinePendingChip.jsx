/** Žuti chip kad ima paketa u offline redu (nije nužno zaglavljen). */
export default function OfflinePendingChip({ C, online, total = 0, stavki = 0 }) {
  if (online || !(total > 0)) return null;
  return (
    <div
      data-testid="offline-pending-chip"
      style={{
        background: "#3d2c00",
        border: `1px solid ${C.zuta}30`,
        borderRadius: 5,
        padding: "7px 10px",
        fontSize: 10,
        color: C.zuta,
      }}
    >
      📶 {total} paketa u offline redu
      {stavki > 0 ? ` (${stavki} stavki)` : ""}
    </div>
  );
}
