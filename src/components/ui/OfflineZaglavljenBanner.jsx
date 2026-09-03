import { opisPosla } from "../../lib/offlineQueue.js";

/**
 * Poslovi koji uporno padaju do sada su ćutke uvećavali brojač, pa je
 * operater mislio da je snimljeno. Ovo ih iznosi na ekran.
 */
export default function OfflineZaglavljenBanner({ zaglavljeni = [], onPokusaj, onOtvoriRed, C }) {
  if (!zaglavljeni.length) return null;
  const crvena = C?.crvena || "#dc2626";
  const prvi = zaglavljeni[0];

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="offline-zaglavljen-banner"
      style={{
        background: `${crvena}1e`,
        border: `1px solid ${crvena}88`,
        borderRadius: 8,
        padding: "10px 12px",
        margin: "0 0 10px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 220, fontSize: 12, lineHeight: 1.5, color: C?.tekst }}>
        <strong style={{ color: crvena }}>
          {zaglavljeni.length === 1
            ? "1 paket nije snimljen u bazu"
            : `${zaglavljeni.length} paketa nije snimljeno u bazu`}
        </strong>
        <div style={{ color: C?.sivi, fontSize: 11 }}>
          {opisPosla(prvi)} — {prvi?.lastError || "ponovljena greška"}
        </div>
        <div style={{ color: C?.sivi, fontSize: 11 }}>
          Podaci su sačuvani na uređaju. Javi šefu smene ako se ponovi.
        </div>
      </div>
      {onPokusaj && (
        <button
          type="button"
          onClick={onPokusaj}
          data-testid="offline-zaglavljen-pokusaj"
          style={{
            background: crvena, border: "none", borderRadius: 6, color: "#fff",
            fontSize: 12, fontWeight: 700, padding: "10px 16px", cursor: "pointer", minHeight: 40,
          }}
        >
          Pokušaj ponovo
        </button>
      )}
      {onOtvoriRed && (
        <button
          type="button"
          onClick={onOtvoriRed}
          style={{
            background: "transparent", border: `1px solid ${C?.border}`, borderRadius: 6,
            color: C?.sivi, fontSize: 12, fontWeight: 700, padding: "10px 16px",
            cursor: "pointer", minHeight: 40,
          }}
        >
          Otvori red
        </button>
      )}
    </div>
  );
}
