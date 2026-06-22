/**

 * Traka na glavnom unosu merenja — FAI režim (prvo parče), kompaktno u jednom redu.

 */

export default function FaiUnosTraka({

  C,

  idDeo,

  brojDimenzija = 0,

  kompletno = false,

  snima = false,

  mozeOdobri = false,

  cekaOdobrenje = false,

  stranica = 0,

  ukupnoStranica = 1,

  onPrethodnaStranica,

  onSledecaStranica,

  onSacuvaj,

  onOdobri,

  kompakt = false,

}) {

  const pad = kompakt ? "4px 7px" : "5px 9px";

  const fs = kompakt ? 9 : 10;

  const btnPad = kompakt ? "4px 7px" : "5px 9px";

  const btnFs = kompakt ? 9 : 10;



  const btnBase = {

    background: C.panel,

    border: `1px solid ${C.border}`,

    borderRadius: 5,

    color: C.tekst,

    fontSize: btnFs,

    fontWeight: 700,

    padding: btnPad,

    cursor: "pointer",

    fontFamily: "inherit",

    whiteSpace: "nowrap",

    flexShrink: 0,

    lineHeight: 1.2,

  };



  if (!brojDimenzija && !cekaOdobrenje) {

    return (

      <div style={{

        flexShrink: 0,

        background: `${C.crvena}14`,

        border: `1px solid ${C.crvena}55`,

        borderRadius: kompakt ? 6 : 8,

        padding: pad,

        marginBottom: kompakt ? 3 : 5,

        fontSize: fs,

        color: C.crvena,

        lineHeight: 1.3,

      }}>

        <strong>FAI · parče 1</strong>

        {" "}· nema dimenzija sa <code style={{ fontSize: fs }}>nivo_kontrole = DA</code> ({idDeo})

      </div>

    );

  }



  const imaViseStranica = ukupnoStranica > 1;



  return (

    <div style={{

      flexShrink: 0,

      background: `${C.zuta}14`,

      border: `1px solid ${C.zuta}55`,

      borderRadius: kompakt ? 6 : 8,

      padding: pad,

      marginBottom: kompakt ? 3 : 5,

      display: "flex",

      alignItems: "center",

      gap: kompakt ? 4 : 6,

      flexWrap: "nowrap",

      overflow: "hidden",

      minHeight: 0,

    }}>

      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>

        <div style={{

          color: C.zuta,

          fontSize: fs,

          fontWeight: 700,

          whiteSpace: "nowrap",

          overflow: "hidden",

          textOverflow: "ellipsis",

        }}>

          FAI · prvo parče 1

          {kompletno && !cekaOdobrenje && (

            <span style={{ color: C.zelena, marginLeft: 6, fontSize: fs - 1 }}>✓</span>

          )}

        </div>

        <div style={{

          color: C.sivi,

          fontSize: fs - 1,

          marginTop: 1,

          whiteSpace: "nowrap",

          overflow: "hidden",

          textOverflow: "ellipsis",

        }}>

          <code style={{ fontSize: fs - 1, color: C.tekst }}>nivo_kontrole = DA</code>

          {" "}· {idDeo} · {brojDimenzija} dim · 5 polja

          {imaViseStranica && !cekaOdobrenje && ` · ${stranica + 1}/${ukupnoStranica}`}

        </div>

      </div>



      {cekaOdobrenje ? (

        <>

          <span style={{ color: C.zuta, fontSize: fs - 1, fontWeight: 600, flexShrink: 0 }}>

            Čeka odobrenje

          </span>

          {mozeOdobri && (

            <button

              type="button"

              disabled={snima}

              onClick={() => onOdobri?.()}

              style={{

                ...btnBase,

                background: C.zelena,

                border: "none",

                color: "#fff",

                cursor: snima ? "wait" : "pointer",

                opacity: snima ? 0.7 : 1,

              }}

            >

              {snima ? "…" : "Odobri"}

            </button>

          )}

        </>

      ) : (

        <>

          {imaViseStranica && (

            <>

              <button

                type="button"

                disabled={stranica <= 0}

                onClick={onPrethodnaStranica}

                title="Prethodnih 5 dimenzija"

                style={{

                  ...btnBase,

                  opacity: stranica <= 0 ? 0.4 : 1,

                  cursor: stranica <= 0 ? "not-allowed" : "pointer",

                  minWidth: kompakt ? 28 : 32,

                }}

              >

                ←

              </button>

              <span style={{ color: C.sivi, fontSize: fs - 1, flexShrink: 0 }}>

                {stranica + 1}/{ukupnoStranica}

              </span>

              <button

                type="button"

                disabled={stranica >= ukupnoStranica - 1}

                onClick={onSledecaStranica}

                title="Sledećih 5 dimenzija"

                style={{

                  ...btnBase,

                  opacity: stranica >= ukupnoStranica - 1 ? 0.4 : 1,

                  cursor: stranica >= ukupnoStranica - 1 ? "not-allowed" : "pointer",

                  minWidth: kompakt ? 28 : 32,

                }}

              >

                →

              </button>

            </>

          )}

          <button

            type="button"

            disabled={snima || !kompletno}

            onClick={() => onSacuvaj?.(false)}

            style={{

              ...btnBase,

              background: kompletno ? C.plava : C.hover,

              border: "none",

              color: kompletno ? "#fff" : C.sivi,

              cursor: snima || !kompletno ? "not-allowed" : "pointer",

              opacity: snima ? 0.7 : 1,

            }}

          >

            {snima ? "…" : "Sačuvaj FAI"}

          </button>

          {mozeOdobri && (

            <button

              type="button"

              disabled={snima || !kompletno}

              onClick={() => onOdobri?.()}

              title="Odobri FAI i pušti seriju"

              style={{

                ...btnBase,

                background: C.zelena,

                border: "none",

                color: "#fff",

                cursor: snima || !kompletno ? "not-allowed" : "pointer",

                opacity: snima || !kompletno ? 0.55 : 1,

              }}

            >

              Odobri

            </button>

          )}

        </>

      )}

    </div>

  );

}


