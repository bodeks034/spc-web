import { labelPogona } from "../lib/pogonSop.js";
import { kratakNazivPogona } from "../lib/pogonKodovi.js";
import { useEkran } from "../lib/useEkran.js";

/**
 * Izbor pogona A–H kada isti id_deo ima više SOP redova (npr. NM-001).
 * omoguceniPogoni: Set ili niz pogona sa RN/podacima — ostali su neaktivni.
 */
export default function PogonIzborPanel({
  C,
  pogoni = [],
  pogonKod = "",
  onIzaberi,
  omoguceniPogoni = null,
  kompakt = false,
  obavezan = false,
  akcent,
}) {
  const ekran = useEkran();
  const mobTab = ekran.mob || ekran.tablet;
  const boja = akcent || C.zelena;

  if (!pogoni.length || pogoni.length === 1) return null;

  const omogucenSet = omoguceniPogoni instanceof Set
    ? omoguceniPogoni
    : omoguceniPogoni
      ? new Set(omoguceniPogoni)
      : null;

  const jeOmogucen = (k) => !omogucenSet || omogucenSet.has(k);

  const stil = mobTab
    ? (ekran.mob
      ? {
          outerPadding: "4px 5px",
          outerRadius: 6,
          labelSize: 7,
          labelMb: 3,
          gap: 3,
          slovo: 10,
          naziv: 7,
          btnPad: "3px 1px",
          btnRadius: 5,
          btnBorder: 1,
          minH: 30,
          mikro: true,
        }
      : {
          outerPadding: "5px 6px",
          outerRadius: 7,
          labelSize: 8,
          labelMb: 4,
          gap: 4,
          slovo: 11,
          naziv: 8,
          btnPad: "4px 2px",
          btnRadius: 5,
          btnBorder: 1,
          minH: 34,
          mikro: false,
        })
    : kompakt
      ? {
          outerPadding: "5px 6px",
          outerRadius: 6,
          labelSize: 8,
          labelMb: 4,
          gap: 4,
          slovo: 10,
          naziv: 7,
          btnPad: "4px 2px",
          btnRadius: 5,
          btnBorder: 1,
          minH: 32,
          mikro: true,
        }
      : {
          outerPadding: "8px 10px",
          outerRadius: 8,
          labelSize: 10,
          labelMb: 5,
          gap: 5,
          slovo: 13,
          naziv: 9,
          btnPad: "6px 4px",
          btnRadius: 7,
          btnBorder: 1.5,
          minH: 40,
          mikro: false,
        };

  const cols = pogoni.length <= 4 ? pogoni.length : 4;
  const nemaOmogucenih = omogucenSet && !pogoni.some((k) => omogucenSet.has(k));

  return (
    <div style={{
      background: obavezan && !pogonKod ? `${C.zuta}14` : C.panel,
      border: `1px solid ${obavezan && !pogonKod ? `${C.zuta}88` : C.border}`,
      borderRadius: stil.outerRadius,
      padding: stil.outerPadding,
      maxWidth: mobTab ? "100%" : undefined,
      boxSizing: "border-box",
    }}>
      <div style={{
        color: obavezan && !pogonKod ? C.zuta : C.sivi,
        fontSize: stil.labelSize,
        fontWeight: 700,
        letterSpacing: 0.6,
        marginBottom: stil.labelMb,
        lineHeight: 1.1,
        textTransform: "uppercase",
      }}>
        {obavezan && !pogonKod ? "Pogon *" : "Pogon"}
      </div>
      {nemaOmogucenih && (
        <div style={{
          fontSize: stil.naziv,
          color: C.sivi,
          marginBottom: stil.labelMb,
          lineHeight: 1.2,
        }}>
          Nema aktivnog RN za ovaj deo — uvezi radne naloge u šifrarniku.
        </div>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: stil.gap,
      }}>
        {pogoni.map((k) => {
          const aktivan = k === pogonKod;
          const omogucen = jeOmogucen(k);
          const kratko = kratakNazivPogona(k, { mikro: stil.mikro });
          const punNaziv = labelPogona(k);
          const title = omogucen
            ? punNaziv
            : `${punNaziv} — nema RN${omogucenSet ? " / podataka" : ""} za ovaj deo`;

          return (
            <button
              key={k}
              type="button"
              disabled={!omogucen}
              onClick={() => omogucen && onIzaberi?.(k)}
              title={title}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                background: !omogucen
                  ? C.hover
                  : aktivan
                    ? `${boja}22`
                    : C.input,
                border: `${stil.btnBorder}px solid ${
                  !omogucen
                    ? C.border
                    : aktivan
                      ? boja
                      : C.border
                }`,
                borderRadius: stil.btnRadius,
                color: !omogucen ? C.sivi : C.tekst,
                cursor: omogucen ? "pointer" : "not-allowed",
                opacity: omogucen ? 1 : 0.38,
                padding: stil.btnPad,
                minHeight: stil.minH,
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{
                fontWeight: 800,
                fontSize: stil.slovo,
                lineHeight: 1,
                color: !omogucen ? C.sivi : aktivan ? boja : C.tekst,
                letterSpacing: 0.5,
              }}>
                {k}
              </span>
              <span style={{
                fontWeight: 500,
                fontSize: stil.naziv,
                lineHeight: 1.05,
                color: !omogucen ? C.sivi : aktivan ? boja : C.sivi,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                padding: "0 1px",
              }}>
                {kratko}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
