import { useMemo } from "react";
import { etiketaLinije, grupisiLinije, nazivLinijeZaPrikaz } from "../../lib/linijaProizvoda.js";

/**
 * Radni režim — fokus na jednoj liniji (VOZ/PRO ili legacy).
 */
export default function SifrarnikRadnaLinijaBar({
  C,
  tipoviVozila = [],
  radnaLinija,
  onPromeni,
  onNoviDeo,
  onPreimenuj,
  desnoExtra = null,
}) {
  const { vozila, proizvodi, ostalo } = useMemo(
    () => grupisiLinije(tipoviVozila),
    [tipoviVozila],
  );

  const naziv = useMemo(() => {
    if (!radnaLinija) return "";
    const svi = [...vozila, ...proizvodi, ...ostalo];
    return svi.find((t) => t.kod === radnaLinija)?.naziv || "";
  }, [radnaLinija, vozila, proizvodi, ostalo]);

  const imaLinije = vozila.length + proizvodi.length + ostalo.length > 0;

  if (!imaLinije) return null;

  return (
    <div
      data-testid="sifrarnik-radna-linija"
      style={{
        marginBottom: 10,
        padding: "8px 12px",
        borderRadius: 8,
        flexShrink: 0,
        border: `1px solid ${radnaLinija ? `${C.plava}55` : C.border}`,
        background: radnaLinija ? `${C.plava}0d` : C.panel,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        fontSize: 10,
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px" }}>
        <span style={{ color: C.sivi, fontSize: 9, whiteSpace: "nowrap" }}>Radim na liniji:</span>
        <select
          data-testid="sifrarnik-radna-linija-select"
          value={radnaLinija || ""}
          onChange={(e) => onPromeni?.(e.target.value)}
          style={{
            flex: 1,
            minWidth: 140,
            fontSize: 11,
            padding: "5px 8px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.bg,
            color: C.tekst,
            cursor: "pointer",
          }}
        >
          <option value="">— sve linije —</option>
          {vozila.length > 0 && (
            <optgroup label="Vozila (VOZ)">
              {vozila.map((t) => (
                <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
              ))}
            </optgroup>
          )}
          {proizvodi.length > 0 && (
            <optgroup label="Proizvodi (PRO)">
              {proizvodi.map((t) => (
                <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
              ))}
            </optgroup>
          )}
          {ostalo.length > 0 && (
            <optgroup label="Ostale linije">
              {ostalo.map((t) => (
                <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {radnaLinija && (
        <>
          <span style={{ color: C.sivi, fontSize: 9, lineHeight: 1.35, flex: "1 1 160px" }}>
            Fokus: Glavni unos i Brzi start za <strong style={{ color: C.tekst }}>{radnaLinija}</strong>
            {nazivLinijeZaPrikaz(radnaLinija, naziv) ? ` (${nazivLinijeZaPrikaz(radnaLinija, naziv)})` : ""}
          </span>
          <button
            type="button"
            data-testid="sifrarnik-radna-linija-novi-deo"
            onClick={() => onNoviDeo?.(radnaLinija)}
            style={{
              background: C.zelena,
              border: "none",
              borderRadius: 6,
              color: C.onAkcent,
              fontSize: 9,
              fontWeight: 700,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            + Novi deo
          </button>
          <button
            type="button"
            onClick={() => onPreimenuj?.(radnaLinija)}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              fontSize: 9,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Preimenuj liniju
          </button>
        </>
      )}
      {desnoExtra}
    </div>
  );
}
