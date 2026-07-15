import { useState, useEffect, useCallback } from "react";
import { fetchLinije, upsertLinija, deleteLinija } from "../../lib/sifrarnikApi.js";
import { inpStyle, btnStyle, btnGhost } from "./sifrarnikPanelStyle.js";
import { useEkran } from "../../layout/useEkran.js";
import { DatalistPolje, ReadonlyPolje, SelectMasinaPolje, SlikaPolje, SelectPolje, OperacijaPolje, PogonPolje, UgaoGranicaPolje } from "./SifrarnikPolje.jsx";
import { isUgao } from "../../lib/varijabilneUtils.js";

const PRAZAN = { linija: "", proces: "", operacija: "", greske: "" };

export default function LinijePanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const INP = inpStyle(C);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchLinije()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertLinija(forma);
      addToast?.("✓ Linija sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati liniju?")) return;
    try { await deleteLinija(id); addToast?.("Obrisano", "uspeh"); await ucitaj(); }
    catch (e) { addToast?.(e.message, "greska"); }
  };

  return (
    <CrudShell C={C} loading={loading} count={lista.length} tabela="linije"
      onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Linija">
      {forma && (
        <FormGrid C={C} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
          fields={[
            ["Linija *", "linija"], ["Proces", "proces"], ["Operacija", "operacija"], ["Greške (ref)", "greske"],
          ]} forma={forma} setForma={setForma} />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C} cols={["ID", "LINIJA", "PROCES", "OPERACIJA", ""]} widths="40px 1fr 1fr 1fr 56px" />
        {lista.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} cols={[
            r.id, r.linija, r.proces || "—", r.operacija || "—",
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={() => obrisi(r.id)} />,
          ]} widths="40px 1fr 1fr 1fr 56px" />
        ))}
      </div>
    </CrudShell>
  );
}

export function CrudShell({ C, loading, count, tabela, onAdd, addLabel, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: C.sivi, fontSize: 10 }}>{loading ? "Učitavanje…" : `${count} redova`}</span>
        <button type="button" onClick={onAdd} style={btnStyle(C, C.zelena)}>{addLabel}</button>
      </div>
      {children}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>tabela {tabela}</div>
    </div>
  );
}

export function FormGrid({
  C, fields, forma, setForma, onSave, onCancel, snima, cols = 2,
  fieldMeta = {}, opcije = {}, addToast, secondaryAction = null,
  hideActions = false,
}) {
  const { mob, linijaUredjaj } = useEkran();
  const gridCols = mob ? 1 : (linijaUredjaj ? Math.min(cols, 2) : cols);
  const INP = inpStyle(C);

  const renderPolje = ([l, k]) => {
    const meta = fieldMeta[k] || {};

    if (meta.readOnly) {
      return (
        <ReadonlyPolje key={k} C={C} label={l} value={forma[k]} hint={meta.hint} />
      );
    }

    if (meta.type === "granica") {
      if (isUgao(forma.jedinica)) {
        return (
          <UgaoGranicaPolje
            key={k}
            C={C}
            label={l}
            value={forma[k]}
            onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          />
        );
      }
      return (
        <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
          <input
            type="number"
            step="any"
            value={forma[k] ?? ""}
            onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))}
            style={INP}
          />
        </label>
      );
    }

    if (meta.type === "slika") {
      const idKey = meta.idKey || "id_deo";
      return (
        <SlikaPolje
          key={k}
          C={C}
          label={l}
          value={forma[k]}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          idDeo={forma[idKey]}
          modul={meta.modul || "merljive"}
          voziloSop={!!meta.voziloSop}
          voziloDijagram={!!meta.voziloDijagram}
          sidePanel={meta.sidePanel ?? null}
          addToast={addToast}
        />
      );
    }

    if (meta.type === "pogon") {
      return (
        <PogonPolje
          key={k}
          C={C}
          label={l}
          value={forma[k]}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          opcije={opcije.pogon || []}
        />
      );
    }

    if (meta.type === "masina") {
      return (
        <SelectMasinaPolje
          key={k}
          C={C}
          label={l}
          value={forma[k] ?? ""}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          masine={opcije.masina || []}
          linija={forma.linija}
        />
      );
    }

    if (meta.type === "select") {
      const lista = meta.opcijeKey ? (opcije[meta.opcijeKey] || []) : (meta.opcije || []);
      const onChange = meta.opcijeKey === "linija"
        ? (v) => setForma((p) => ({
          ...p,
          linija: v,
          operacija: p.linija !== v ? "" : p.operacija,
        }))
        : (v) => setForma((p) => ({ ...p, [k]: v }));
      const value = meta.opcijeKey === "linija" ? forma.linija : forma[k];
      return (
        <SelectPolje
          key={k}
          C={C}
          label={l}
          value={value}
          onChange={onChange}
          opcije={lista}
        />
      );
    }

    if (meta.type === "datalist") {
      const lista = meta.opcijeKey ? (opcije[meta.opcijeKey] || []) : (meta.opcije || []);
      return (
        <DatalistPolje
          key={k}
          C={C}
          id={`${k}-${l}`}
          label={l}
          value={forma[k]}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          opcije={lista}
          placeholder={meta.placeholder || "Upiši ili izaberi…"}
        />
      );
    }

    if (meta.type === "operacija") {
      return (
        <OperacijaPolje
          key={k}
          C={C}
          label={l}
          value={forma[k]}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          linija={forma.linija}
          linijaOperacija={opcije.linijaOperacija}
          sveOperacije={opcije.operacija}
        />
      );
    }

    if (meta.opcije) {
      const lista = opcije[meta.opcije] || [];
      return (
        <SelectPolje
          key={k}
          C={C}
          label={l}
          value={forma[k]}
          onChange={(v) => setForma((p) => ({ ...p, [k]: v }))}
          opcije={lista}
        />
      );
    }

    return (
      <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
        <input
          value={forma[k] ?? ""}
          onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))}
          style={INP}
        />
      </label>
    );
  };

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 8, marginBottom: hideActions ? 0 : 8 }}>
        {fields.map(renderPolje)}
      </div>
      {!hideActions && (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={snima} onClick={onSave} style={btnStyle(C, C.zelena, { disabled: snima })}>{snima ? "…" : "Sačuvaj"}</button>
        {secondaryAction && (
          <button
            type="button"
            disabled={snima || secondaryAction.disabled}
            onClick={secondaryAction.onClick}
            style={btnStyle(C, C.plava, { disabled: snima || secondaryAction.disabled })}
          >
            {secondaryAction.label}
          </button>
        )}
        <button type="button" onClick={onCancel} style={{ ...btnStyle(C, C.hover), color: C.sivi, background: "none", border: `1px solid ${C.border}` }}>Otkaži</button>
      </div>
      )}
    </div>
  );
}

export function TableHead({ C, cols, widths }) {
  const grid = widths || cols.map(() => "1fr").join(" ");
  return (
    <div style={{ display: "grid", gridTemplateColumns: grid, background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8 }}>
      {cols.map((c) => <span key={c}>{c}</span>)}
    </div>
  );
}

export function TableRow({ C, i, cols, widths, onClick, highlight }) {
  const grid = widths || cols.map(() => "1fr").join(" ");
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(e); } : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: grid,
        padding: "8px 10px",
        borderTop: i ? `1px solid ${C.border}` : "none",
        fontSize: 11,
        gap: 8,
        alignItems: "center",
        cursor: onClick ? "pointer" : undefined,
        background: highlight ? `${C.zelena}12` : undefined,
      }}
    >
      {cols.map((c, j) => <span key={j}>{c}</span>)}
    </div>
  );
}

export function RowActions({ C, onEdit, onDelete }) {
  const stop = (e) => e.stopPropagation();
  return (
    <div style={{ display: "flex", gap: 4 }} onClick={stop} onKeyDown={stop}>
      {onEdit && <button type="button" onClick={(e) => { stop(e); onEdit(e); }} style={btnGhost(C)}>✎</button>}
      {onDelete && <button type="button" onClick={(e) => { stop(e); onDelete(e); }} style={{ ...btnGhost(C), color: C.crvena, borderColor: `${C.crvena}44` }}>×</button>}
    </div>
  );
}
