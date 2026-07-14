import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { dISO } from "../../lib/atributivneUnosHelper.js";
import {
  filtrirajLogRedove,
  offlineMerljiviRedovi,
  spojiOfflineINadRedove,
  brojOfflineStavki,
} from "../../lib/logPregledHelper.js";
import LogPregledFilter from "../LogPregledFilter.jsx";

export default function MerljiveLogPregled({
  C, ekran, padGlavni, addToast,
  pocetniDatum = null,
  pocetnaSmena = "1",
  queue = [],
  online = true,
}) {
  const [logD, setLogD] = useState([]);
  const [loadLog, setLoadLog] = useState(false);
  const [filterDatum, setFilterDatum] = useState(() => pocetniDatum || dISO());
  const [filterSmena, setFilterSmena] = useState(() => String(pocetnaSmena || "1"));

  const ucitajLog = useCallback(async () => {
    setLoadLog(true);
    try {
      let q = supabase
        .from("merenja_varijabilna")
        .select("datum,smena,id_deo,pozicija,vrednost_raw,status,linija,kontrolor,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filterDatum) q = q.eq("datum", filterDatum);
      if (filterSmena && filterSmena !== "sve") q = q.eq("smena", Number(filterSmena));
      const { data, error } = await q;
      if (error) throw error;
      setLogD(data || []);
    } catch (e) {
      addToast(e.message, "greska");
      setLogD([]);
    } finally {
      setLoadLog(false);
    }
  }, [addToast, filterDatum, filterSmena]);

  useEffect(() => { ucitajLog(); }, [ucitajLog]);

  const offlineRows = useMemo(
    () => filtrirajLogRedove(offlineMerljiviRedovi(queue), {
      datum: filterDatum,
      smena: filterSmena,
    }),
    [queue, filterDatum, filterSmena],
  );

  const prikaz = useMemo(
    () => spojiOfflineINadRedove(offlineRows, logD),
    [offlineRows, logD],
  );

  const offlineUkupno = brojOfflineStavki(queue, "merljive");

  return (
    <div style={{ flex: 1, overflow: "auto", padding: padGlavni, minHeight: 0 }}>
      <LogPregledFilter
        C={C}
        datum={filterDatum}
        onDatumChange={setFilterDatum}
        smena={filterSmena}
        onSmenaChange={setFilterSmena}
        onOsvezi={ucitajLog}
        onDanas={() => {
          setFilterDatum(pocetniDatum || dISO());
          setFilterSmena(String(pocetnaSmena || "1"));
        }}
        loading={loadLog}
        offlineStavki={offlineRows.length}
        online={online}
        ukupnoPrikazano={prikaz.length}
      />
      {loadLog ? (
        <div style={{ color: C.sivi, fontSize: 12 }}>Učitavam log…</div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{
            width: "100%",
            minWidth: ekran.mob ? 560 : 0,
            borderCollapse: "collapse",
            fontSize: ekran.mob ? 9 : 10,
          }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                {["", "Datum", "Smena", "ID", "Dimenzija", "Vrednost", "Status", "Linija"].map((h) => (
                  <th key={h || "off"} style={{ padding: "6px 8px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prikaz.map((r, i) => (
                <tr
                  key={r._offline ? `off-${r._jobId}-${i}` : `db-${r.created_at}-${i}`}
                  style={{
                    borderBottom: `1px solid ${C.hover}`,
                    background: r._offline ? `${C.zuta}14` : "transparent",
                  }}
                >
                  <td style={{ padding: "5px 8px", fontSize: 9 }}>
                    {r._offline && <span title="Offline — čeka sinhronizaciju">📶</span>}
                  </td>
                  <td style={{ padding: "5px 8px" }}>{r.datum}</td>
                  <td style={{ padding: "5px 8px" }}>{r.smena}</td>
                  <td style={{ padding: "5px 8px" }}>{r.id_deo}</td>
                  <td style={{ padding: "5px 8px" }}>{r.pozicija}</td>
                  <td style={{ padding: "5px 8px" }}>{r.vrednost_raw}</td>
                  <td style={{ padding: "5px 8px", color: r.status === "NOK" ? C.crvena : C.zelena }}>
                    {r.status}
                  </td>
                  <td style={{ padding: "5px 8px" }}>{r.linija}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loadLog && !prikaz.length && (
        <div style={{ color: C.border, textAlign: "center", padding: 40 }}>
          Nema unosa za izabrani filter
          {offlineUkupno > 0 && filterDatum !== (pocetniDatum || dISO())
            ? ` (${offlineUkupno} u offline redu za druge datume)`
            : ""}
        </div>
      )}
    </div>
  );
}
