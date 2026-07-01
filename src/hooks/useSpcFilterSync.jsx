import { useEffect, useRef } from "react";

/** Sinhronizuje SPC karte sa filter trake Modula 2 (deo, smena; period samo po zahtevu). */
export function useSpcFilterSync(spoljniFilter, {
  setIdDeo,
  setDatumOd,
  setDatumDo,
  setSmena,
  setPozicija,
}) {
  const prevKey = useRef("");
  const datumiInicijalizovani = useRef(false);

  useEffect(() => {
    if (!spoljniFilter) return;

    // Vrati ponašanje pre auto-sync perioda: prazni datumi = sva merenja u bazi
    if (!datumiInicijalizovani.current && spoljniFilter.aktivan && !spoljniFilter.primeniPeriod) {
      setDatumOd("");
      setDatumDo("");
      datumiInicijalizovani.current = true;
    }

    const key = JSON.stringify(spoljniFilter);
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (spoljniFilter.idDeo) {
      setIdDeo(spoljniFilter.idDeo);
    }
    if (setPozicija && spoljniFilter.pozicija !== undefined) {
      setPozicija(spoljniFilter.pozicija || "");
    }
    if (spoljniFilter.smena !== undefined && spoljniFilter.smena !== "") {
      setSmena(spoljniFilter.smena);
    }
    if (spoljniFilter.primeniPeriod) {
      if (spoljniFilter.datumOd !== undefined) {
        setDatumOd(spoljniFilter.datumOd || "");
      }
      if (spoljniFilter.datumDo !== undefined) {
        setDatumDo(spoljniFilter.datumDo || "");
      }
    }
  }, [spoljniFilter, setIdDeo, setDatumOd, setDatumDo, setSmena, setPozicija]);
}

export function SpcFilterTrakaBaner({ spoljniFilter, C, onPrimeniPeriod }) {
  if (!spoljniFilter?.aktivan) return null;
  const delovi = [
    spoljniFilter.idDeo && `Deo: ${spoljniFilter.idDeo}`,
    spoljniFilter.pozicija && `Kar: ${spoljniFilter.pozicija}`,
    spoljniFilter.smena && `S${spoljniFilter.smena}`,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{
      background: `${C.plava}12`,
      border: `1px solid ${C.plava}35`,
      borderRadius: 8,
      padding: "6px 12px",
      marginBottom: 12,
      fontSize: 10,
      color: C.sivi,
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <span>
        Filter iz trake Modula 2{delovi ? `: ${delovi}` : ""}.
        {" "}Datumi ispod su nezavisni — SPC koristi celu istoriju merenja (više tačaka na karti).
      </span>
      {onPrimeniPeriod && !spoljniFilter.primeniPeriod && (
        <button
          type="button"
          onClick={onPrimeniPeriod}
          style={{
            background: "none",
            border: `1px solid ${C.plava}`,
            borderRadius: 6,
            color: C.plava,
            fontSize: 9,
            fontWeight: 700,
            padding: "4px 8px",
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          Primeni period iz filtera
        </button>
      )}
    </div>
  );
}
