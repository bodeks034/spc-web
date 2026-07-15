import { useState, useEffect, useCallback } from "react";
import {
  LISTE_KLJUCEVI,
  KLASE_FIKSNE,
  TIPOVI_FIKSNI,
  fetchListeVrednosti,
  dodajListuVrednost,
  obrisiListuVrednost,
} from "../../lib/sifrarnikListeApi.js";
import { CrudShell, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";

export default function ListeVrednostiPanel({ C, addToast }) {
  const [aktivnaLista, setAktivnaLista] = useState("karakteristika");
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nova, setNova] = useState("");
  const [snima, setSnima] = useState(false);
  const INP = inpStyle(C);

  const meta = LISTE_KLJUCEVI.find((l) => l.id === aktivnaLista);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setRedovi(await fetchListeVrednosti(aktivnaLista));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast, aktivnaLista]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const dodaj = async () => {
    if (!nova.trim()) return;
    setSnima(true);
    try {
      await dodajListuVrednost({
        lista_kljuc: aktivnaLista,
        vrednost: nova.trim(),
        redosled: redovi.length + 1,
      });
      setNova("");
      addToast?.("✓ Dodata vrednost", "uspeh");
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati vrednost iz liste?")) return;
    try {
      await obrisiListuVrednost(id);
      addToast?.("Obrisano", "uspeh");
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12, lineHeight: 1.55 }}>
        <strong style={{ color: C.tekst }}>Kako dopunjavati dropdown liste</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li><strong>Karakteristike, reakcioni plan, instrument, jedinica</strong> — dodaj ovde ili pokreni migraciju <code>41_sifrarnik_liste.sql</code> (seed iz Excela).</li>
          <li><strong>Klasa</strong> — fiksno: {KLASE_FIKSNE.join(", ")} (AQL).</li>
          <li><strong>Tip</strong> — fiksno: {TIPOVI_FIKSNI.join(", ")}.</li>
          <li><strong>Linija + operacija</strong> — povezane u tabu <em>Linije</em> (sheet <code>linije</code> u SPC_atributivne.xlsx). Operacija se filtrira po izabranoj liniji.</li>
          <li><strong>Pogon (slovo — linija)</strong> — tab <em>Pogon mapa</em> (npr. A = Ulazna kontrola, B = Preseraj).</li>
          <li><strong>Mašina</strong> — tab <em>Mašine</em>; filtrira se po liniji u formi glavnog unosa.</li>
          <li>Nove dimenzije iz <em>Glavni unos</em> automatski ulaze u listu posle čuvanja reda.</li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {LISTE_KLJUCEVI.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setAktivnaLista(l.id)}
            style={{
              background: aktivnaLista === l.id ? `${C.plava}22` : C.panel,
              border: `1px solid ${aktivnaLista === l.id ? C.plava : C.border}`,
              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              fontSize: 9, fontWeight: aktivnaLista === l.id ? 700 : 400,
              color: aktivnaLista === l.id ? C.plava : C.sivi,
            }}
          >
            {l.naziv}
          </button>
        ))}
      </div>

      {meta && (
        <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>{meta.uputstvo}</div>
      )}

      <CrudShell C={C} loading={loading} count={redovi.length} tabela="sifrarnik_liste_vrednosti"
        onAdd={() => document.getElementById("nova-lista-vrednost")?.focus()}
        addLabel="+ Fokus unos">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            id="nova-lista-vrednost"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dodaj()}
            placeholder="Nova vrednost…"
            style={{ ...INP, flex: 1 }}
          />
          <button type="button" disabled={snima} onClick={dodaj} style={btnStyle(C, C.zelena, { disabled: snima })}>
            {snima ? "…" : "Dodaj"}
          </button>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <TableHead C={C} cols={["#", "VREDNOST", ""]} widths="40px 1fr 56px" />
          {redovi.map((r, i) => (
            <TableRow key={r.id} C={C} i={i} widths="40px 1fr 56px" cols={[
              r.redosled ?? i + 1,
              r.vrednost,
              <RowActions key="a" C={C} onDelete={() => obrisi(r.id)} />,
            ]} />
          ))}
        </div>
      </CrudShell>
    </div>
  );
}
