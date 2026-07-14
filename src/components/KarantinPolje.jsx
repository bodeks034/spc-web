import { tekstKarantinPolja } from "../lib/karantinProvera.js";

/** Polje u formi — uvek vidljivo: „prazan“ ili opis aktivnog HOLD-a. */
export default function KarantinPolje({
  C,
  karantin = null,
  label = "Karantin",
  lblStyle = {},
  inpStyle = {},
  style = {},
  readOnly = true,
}) {
  const aktivan = !!karantin?.aktivan;
  const tekst = tekstKarantinPolja(karantin);

  return (
    <label style={{ display: "block", margin: 0, ...style }}>
      <span style={{
        color: C.sivi,
        fontSize: 10,
        letterSpacing: 0.6,
        marginBottom: 3,
        display: "block",
        ...lblStyle,
      }}
      >
        {label}
      </span>
      <input
        readOnly={readOnly}
        value={tekst}
        title={aktivan ? tekst : "Nema aktivnog karantina za izabrani deo / RN"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: aktivan ? `${C.crvena}14` : C.input,
          border: `1px solid ${aktivan ? C.crvena : C.border}`,
          borderRadius: 5,
          color: aktivan ? C.tekst : C.sivi,
          fontWeight: aktivan ? 700 : 400,
          fontFamily: "inherit",
          outline: "none",
          ...inpStyle,
        }}
      />
    </label>
  );
}
