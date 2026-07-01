import { useEffect, useMemo, useState } from "react";
import { bojaAnalitikaTaba, grupaZaTab } from "../../lib/analitikaNav.js";
import { opisAnalitikaTaba } from "../../lib/analitikaOpisi.js";
import { AnalitikaFilterControls } from "./AnalitikaFilterBar.jsx";
import AnalitikaTabOpis from "./AnalitikaTabOpis.jsx";

/**
 * Sticky heder Modula 2: grupe + tabovi + filter u jednom bloku,
 * mini KPI na PREGLED tabu.
 */
export default function AnalitikaHeader({
  grupe,
  tab,
  setTab,
  C,
  kompakt,
  badgePoTabu = {},
  badgePoGrupi = {},
  modul = "atributivne",
  onNavigacija,
}) {
  const dostupneGrupe = useMemo(
    () => (grupe || []).filter((g) => g.tabovi?.length > 0),
    [grupe],
  );

  const [aktivnaGrupa, setAktivnaGrupa] = useState(() => grupaZaTab(dostupneGrupe, tab));

  useEffect(() => {
    setAktivnaGrupa(grupaZaTab(dostupneGrupe, tab));
  }, [tab, dostupneGrupe]);

  const trenutnaGrupa = dostupneGrupe.find((g) => g.id === aktivnaGrupa) || dostupneGrupe[0];
  const tabovi = trenutnaGrupa?.tabovi || [];

  if (!dostupneGrupe.length) return null;

  const padH = kompakt ? 8 : 18;

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: C.panel,
      borderBottom: `1px solid ${C.border}`,
      boxShadow: `0 4px 12px ${C.bg}90`,
    }}>
      {/* Grupe */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: `${kompakt ? 6 : 8}px ${padH}px 0`,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {dostupneGrupe.map((g) => {
          const akt = g.id === aktivnaGrupa;
          const gBadge = badgePoGrupi[g.id];
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setAktivnaGrupa(g.id);
                if (!g.tabovi.some(([id]) => id === tab)) {
                  setTab(g.tabovi[0][0]);
                }
              }}
              style={{
                flexShrink: 0,
                background: akt ? `${C.plava}18` : "none",
                border: `1px solid ${akt ? C.plava : C.border}`,
                borderRadius: "6px 6px 0 0",
                borderBottom: akt ? `2px solid ${C.plava}` : `1px solid ${C.border}`,
                color: akt ? C.plava : C.sivi,
                fontSize: kompakt ? 9 : 10,
                fontWeight: 700,
                padding: kompakt ? "6px 10px" : "7px 14px",
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              {g.naziv}
              {gBadge > 0 && (
                <span style={{
                  background: C.crvena, color: "#fff", fontSize: 8,
                  borderRadius: 10, padding: "1px 5px", marginLeft: 5,
                }}>
                  {gBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabovi + filter desno */}
      <div style={{
        display: "flex",
        alignItems: "center",
        flexWrap: kompakt ? "wrap" : "nowrap",
        gap: kompakt ? 6 : 0,
        borderTop: `1px solid ${C.border}`,
        paddingRight: padH,
      }}>
        <div style={{
          display: "flex",
          flex: kompakt ? "1 1 100%" : "1 1 auto",
          minWidth: 0,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingLeft: kompakt ? 6 : 18,
        }}>
          {tabovi.map(([id, naziv]) => {
            const boja = bojaAnalitikaTaba(id, C);
            const akt = tab === id;
            const badge = badgePoTabu[id];
            const opis = opisAnalitikaTaba(id, modul);
            return (
              <button
                key={id}
                type="button"
                title={opis || naziv}
                onClick={() => setTab(id)}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  borderBottom: akt ? `2px solid ${boja}` : "2px solid transparent",
                  color: akt ? boja : C.sivi,
                  fontSize: kompakt ? 9 : 10,
                  fontWeight: 700,
                  padding: kompakt ? "8px 10px" : "10px 14px",
                  cursor: "pointer",
                  letterSpacing: 0.5,
                }}
              >
                {naziv}
                {badge > 0 && (
                  <span style={{
                    background: C.plava, color: "#fff", fontSize: 8,
                    borderRadius: 10, padding: "1px 5px", marginLeft: 5,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!kompakt && (
          <div style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0 6px 14px",
            borderLeft: `1px solid ${C.border}`,
            marginLeft: 4,
          }}>
            <AnalitikaFilterControls C={C} kompakt={false} inline modul={modul} />
          </div>
        )}
      </div>

      {kompakt && (
        <div style={{
          padding: "6px 10px 8px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          <AnalitikaFilterControls C={C} kompakt inline modul={modul} />
        </div>
      )}

      <AnalitikaTabOpis tab={tab} modul={modul} C={C} kompakt={kompakt} />
    </div>
  );
}
