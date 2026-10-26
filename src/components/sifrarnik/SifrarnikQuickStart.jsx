import { useMemo, useState } from "react";
import { GLAVNI_UNOS_SHEET_TIP } from "../../lib/glavniUnosSheetTip.js";
import { etiketaLinije, grupisiLinije, jeLinijaProizvod, jeLinijaVozila, nazivLinijeZaPrikaz } from "../../lib/linijaProizvoda.js";
import {
  iskljuciQuickStartTrajno,
  quickStartSakrivenSesija,
  quickStartTrajnoIskljucen,
  sakrijQuickStartSesija,
} from "../../lib/sifrarnikQuickStart.js";

/** Brzi start — linija vozila/proizvoda + 3 koraka do kompletnog dela. */
export default function SifrarnikQuickStart({
  C,
  onNavigate,
  tipoviVozila = [],
  skriveno = false,
  radnaLinija = "",
  prikaziTehnicko = false,
}) {
  const [offSesija, setOffSesija] = useState(() => quickStartSakrivenSesija());

  const { vozila, proizvodi } = useMemo(() => {
    const g = grupisiLinije(tipoviVozila);
    if (!radnaLinija) return g;
    const filtriraj = (lista) => lista.filter((t) => t.kod === radnaLinija);
    return {
      vozila: filtriraj(g.vozila),
      proizvodi: filtriraj(g.proizvodi),
    };
  }, [tipoviVozila, radnaLinija]);

  const fokusBoja = jeLinijaProizvod(radnaLinija)
    ? (C.zelena || "#22c55e")
    : jeLinijaVozila(radnaLinija)
      ? C.plava
      : C.sivi;

  if (skriveno || offSesija || quickStartTrajnoIskljucen()) return null;

  const dismissSesija = () => {
    sakrijQuickStartSesija();
    setOffSesija(true);
  };

  const dismissTrajno = () => {
    iskljuciQuickStartTrajno();
    setOffSesija(true);
  };

  const otvoriLiniju = (linijaKod, tip = GLAVNI_UNOS_SHEET_TIP.PROJEKAT) => {
    onNavigate?.("glavni_unos", {
      otvoriWizard: true,
      wizardLinija: linijaKod,
      wizardTip: tip,
      wizardAutoPotvrdi: true,
    });
  };

  const koraci = [
    { n: 1, label: "Linija + deo", tab: "glavni_unos", hint: "VOZ / PRO → + Novi deo", action: () => onNavigate?.("glavni_unos", { otvoriWizard: true, wizardAutoPotvrdi: false }) },
    { n: 2, label: "Glavni unos", tab: "glavni_unos", hint: "Dimenzije + greške" },
    { n: 3, label: "Objavi", tab: "glavni_unos", hint: "Propagacija u Merljive/RN" },
  ];

  const tile = (t, boja) => {
    const aktivan = radnaLinija === t.kod;
    return (
    <button
      key={t.kod}
      type="button"
      data-testid={`quickstart-linija-${t.kod}`}
      onClick={() => otvoriLiniju(t.kod)}
      title={etiketaLinije(t.kod, t.naziv)}
      style={{
        background: aktivan ? `${boja}22` : C.panel,
        border: `1px solid ${aktivan ? boja : `${boja}55`}`,
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        fontSize: 9,
        textAlign: "left",
        minWidth: 88,
        fontWeight: aktivan ? 700 : 400,
      }}
    >
      <span style={{ color: boja, fontWeight: 700 }}>{t.kod}</span>
      {nazivLinijeZaPrikaz(t.kod, t.naziv) ? (
        <span style={{ display: "block", color: C.sivi, fontSize: 8, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
          {nazivLinijeZaPrikaz(t.kod, t.naziv)}
        </span>
      ) : null}
    </button>
    );
  };

  return (
    <div
      data-testid="sifrarnik-quick-start"
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${C.plava}44`,
        background: `${C.plava}0d`,
        fontSize: 10,
        lineHeight: 1.45,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.tekst, fontSize: 11 }}>
          {radnaLinija ? `Brzi start — ${radnaLinija}` : "Brzi start — linija → novi deo"}
        </strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            data-testid="sifrarnik-quick-start-dismiss"
            onClick={dismissSesija}
            style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 9 }}
          >
            Sakrij
          </button>
          <button
            type="button"
            data-testid="sifrarnik-quick-start-dismiss-perm"
            onClick={dismissTrajno}
            style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 9 }}
            title="Ne prikazuj Brzi start pri sledećem otvaranju Modula 0"
          >
            Ne prikazuj više
          </button>
        </div>
      </div>

      {radnaLinija && (
        <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8, lineHeight: 1.45 }}>
          Fokus na liniji <strong style={{ color: fokusBoja }}>{radnaLinija}</strong>.
          {" "}Za sve linije izaberi <em>Sve linije</em> u padajućem meniju iznad.
        </div>
      )}

      {!radnaLinija && vozila.length === 0 && proizvodi.length === 0 && (
        <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8, lineHeight: 1.45 }}>
          {prikaziTehnicko ? (
            <>
              Nema linija <code>VOZ-XX</code> / <code>PRO-XX</code> — pokreni migraciju{" "}
              <code>87_tipovi_linije_privremene.sql</code> (Napredno → Održavanje).
            </>
          ) : (
            <>Nema konfigurisanih linija — kontaktiraj administratora za postavljanje VOZ/PRO linija.</>
          )}
        </div>
      )}

      {vozila.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>Vozila — delovi vezani za vozilo:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {vozila.map((t) => tile(t, C.plava))}
          </div>
        </div>
      )}

      {proizvodi.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>Proizvodi — ne ugrađuju se u vozilo:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {proizvodi.map((t) => tile(t, C.zelena || "#22c55e"))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button"
          data-testid="quickstart-opsti-deo"
          onClick={() => otvoriLiniju(null, GLAVNI_UNOS_SHEET_TIP.OPSTI)}
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            cursor: "pointer",
            fontSize: 9,
            color: C.tekst,
          }}
        >
          + Opšti deo
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("vozila")}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            cursor: "pointer",
            fontSize: 9,
            color: C.sivi,
          }}
        >
          Preimenuj liniju → Tipovi linija
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {koraci.map((k) => (
          <button
            key={k.n}
            type="button"
            data-testid={`sifrarnik-quick-start-${k.tab}`}
            onClick={() => (k.action ? k.action() : onNavigate?.(k.tab))}
            style={{
              flex: "1 1 140px",
              textAlign: "left",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            <span style={{ color: C.plava, fontWeight: 700 }}>{k.n}. </span>
            <span style={{ color: C.tekst, fontWeight: 700 }}>{k.label}</span>
            <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 2 }}>{k.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
