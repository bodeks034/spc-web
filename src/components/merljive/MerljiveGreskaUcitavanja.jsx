import { idSpremanZaUcitavanje } from "../../lib/varijabilneUtils.js";

/** Vidljiva greška kad ID nije učitan (linija + analitika). */
export default function MerljiveGreskaUcitavanja({
  C, idDeo, ucitava, ucitavaDeo, nalogUcitava, poruka, greskaDb, trebaIzborPogona,
  karakteristikeBroj = 0, mozeAdmin = false, kompakt = false,
}) {
  if (!idDeo || !idSpremanZaUcitavanje(idDeo) || ucitava) return null;
  const ucitavaSada = ucitavaDeo || nalogUcitava;
  const imaGresku = !!(poruka || greskaDb);
  const praznaBaza = karakteristikeBroj === 0;

  const ucitavanjePanel = (tekst = "Učitavam NM/NT šifrarnik…") => (
    <div style={{
      flex: kompakt ? undefined : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: kompakt ? 16 : 24,
      color: C.sivi,
      fontSize: kompakt ? 12 : 13,
      minHeight: kompakt ? 80 : 120,
      width: kompakt ? "100%" : undefined,
    }}>
      {tekst}
    </div>
  );

  if (!imaGresku && !praznaBaza) {
    return ucitavanjePanel(ucitavaSada ? "Učitavam deo i radni nalog…" : "Učitavam NM/NT šifrarnik…");
  }

  if (!imaGresku && praznaBaza && ucitavaSada) {
    return ucitavanjePanel();
  }

  const kutija = (sadrzaj, extra = null) => (
    <div style={{
      flex: kompakt ? undefined : 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: kompakt ? "12px 10px" : 24,
      margin: kompakt ? "8px 0" : "8px 14px 0",
      background: `${C.crvena}12`,
      border: `2px solid ${C.crvena}`,
      borderRadius: 12,
      textAlign: "center",
      minHeight: kompakt ? undefined : 120,
      width: kompakt ? "100%" : undefined,
    }}>
      <div style={{ fontSize: kompakt ? 22 : 28 }}>⚠</div>
      <div style={{ color: C.crvena, fontWeight: 700, fontSize: kompakt ? 12 : 14 }}>
        Merljive karakteristike nisu učitane
      </div>
      <div style={{ color: C.tekst, fontSize: kompakt ? 11 : 12, lineHeight: 1.6, maxWidth: 420 }}>
        {sadrzaj}
      </div>
      {extra}
    </div>
  );
  const tekst = poruka || greskaDb || (
    <>
      Admin → uvezi <strong style={{ color: C.tekst }}>SPC_merljive.xlsx</strong>
      {" "}(tab <code>karakteristike_merljive</code>), pa Ctrl+F5.
      {trebaIzborPogona ? " Izaberi pogon (A = Ulazna kontrola, B = Preseraj, …)." : null}
    </>
  );
  const brojUKesu = (mozeAdmin || karakteristikeBroj > 0) && (
    <div style={{ marginTop: 8, color: C.sivi, fontSize: kompakt ? 10 : 11 }}>
      U aplikaciji je učitano{" "}
      <strong style={{ color: karakteristikeBroj > 0 ? C.zelena : C.crvena }}>
        {karakteristikeBroj}
      </strong>
      {" "}redova iz baze
      {karakteristikeBroj === 0 && mozeAdmin ? " — Admin → Excel → Uvezi merljive, pa Ctrl+F5" : "."}
    </div>
  );
  return kutija(
    <>
      {tekst}
      {brojUKesu}
    </>,
    ucitavaSada ? (
      <div style={{ color: C.sivi, fontSize: kompakt ? 10 : 11, marginTop: 4 }}>
        Proveravam ponovo…
      </div>
    ) : null,
  );
}
