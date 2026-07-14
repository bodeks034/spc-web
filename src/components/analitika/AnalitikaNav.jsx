import { useEffect, useMemo, useState } from "react";

import { bojaAnalitikaTaba, grupaZaTab } from "../../lib/analitikaNav.js";

import { opisAnalitikaTaba } from "../../lib/analitikaOpisi.js";



export default function AnalitikaNav({

  grupe,

  tab,

  setTab,

  C,

  kompakt,

  badgePoTabu = {},

  badgePoGrupi = {},

  modul = "atributivne",

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



  return (

    <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>

      <div style={{

        display: "flex",

        gap: 4,

        padding: kompakt ? "6px 6px 0" : "8px 18px 0",

        overflowX: "auto",

        WebkitOverflowScrolling: "touch",

        flexWrap: "nowrap",

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

                  background: C.crvena, color: C.onAkcent, fontSize: 8,

                  borderRadius: 10, padding: "1px 5px", marginLeft: 5,

                }}>

                  {gBadge}

                </span>

              )}

            </button>

          );

        })}

      </div>

      <div style={{

        display: "flex",

        paddingLeft: kompakt ? 6 : 18,

        overflowX: "auto",

        WebkitOverflowScrolling: "touch",

        flexWrap: "nowrap",

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

                  background: C.plava, color: C.onAkcent, fontSize: 8,

                  borderRadius: 10, padding: "1px 5px", marginLeft: 5,

                }}>

                  {badge}

                </span>

              )}

            </button>

          );

        })}

        <div style={{ flex: 1, minWidth: 8 }} />

      </div>

    </div>

  );

}

