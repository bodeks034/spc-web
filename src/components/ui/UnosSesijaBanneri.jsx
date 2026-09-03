import NacrtVracanjeBanner from "./NacrtVracanjeBanner.jsx";

/**
 * Nacrt radne liste (+ opcioni children: AQL, prijem…).
 * Zaglavljeni offline paketi se prikazuju u AppHeader-u (jedno mesto).
 */
export default function UnosSesijaBanneri({
  C,
  nacrt = null,
  opis = "",
  onVrati,
  onOdbaci,
  margin,
  children = null,
  // legacy — zaglavljen je u AppHeader; zadržano da ne lomi pozive
  zaglavljeni: _zaglavljeni,
  onPokusaj: _onPokusaj,
} = {}) {
  const imaNacrt = !!nacrt;
  if (!imaNacrt && !children) return null;

  const wrap = (node, key) => (
    margin != null
      ? <div key={key} style={{ margin }}>{node}</div>
      : node
  );

  return (
    <>
      {imaNacrt && wrap(
        <NacrtVracanjeBanner
          nacrt={nacrt}
          opis={opis}
          onVrati={onVrati}
          onOdbaci={onOdbaci}
          C={C}
        />,
        "nacrt",
      )}
      {children}
    </>
  );
}
