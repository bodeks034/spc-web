import { useEffect, useState, useCallback } from "react";

import { supabase } from "../lib/supabaseClient.js";

import { fetchSefSmenaPregled, bojaFpyKpi } from "../lib/sefSmenaDashboard.js";
import { fetchSmenaPogonaPregled } from "../lib/smenaPogonaPregled.js";
import { NCR_CAPA_TOOLTIP } from "../lib/analitikaOpisi.js";
import SchemaAlarmBanner from "./SchemaAlarmBanner.jsx";



function KpiKartica({ C, label, vrednost, jedinica = "", boja, onClick, testId, title }) {

  const Tag = onClick ? "button" : "div";

  return (

    <Tag

      type={onClick ? "button" : undefined}

      data-testid={testId}

      title={title}

      onClick={onClick}

      style={{

        background: C.panel,

        border: `1px solid ${C.border}`,

        borderRadius: 8,

        padding: "12px 14px",

        minWidth: 100,

        flex: "1 1 120px",

        cursor: onClick ? "pointer" : "default",

        textAlign: "left",

        fontFamily: "inherit",

      }}

    >

      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>

      <div style={{ color: boja || C.tekst, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>

        {vrednost ?? "—"}{jedinica}

      </div>

    </Tag>

  );

}



/** Dashboard za šefa smene — današnji KPI, alarmi, TOP NOK. */

export default function SefSmenaDashboard({

  C,

  smena = null,

  linija = "",

  idDeo = "",

  filterPeriod = 1,

  onNavigacija,

  onOtvoriAdmin,

}) {

  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);
  const [smenaPogon, setSmenaPogon] = useState(null);

  const ucitaj = useCallback(async () => {

    setLoading(true);

    try {

      const d = await fetchSefSmenaPregled(supabase, {

        smena,

        linija,

        idDeo,

        period: filterPeriod,

      });

      setPodaci(d);

      if (smena) {
        try {
          const sp = await fetchSmenaPogonaPregled(supabase, { smena, linija: linija || undefined });
          setSmenaPogon(sp);
        } catch {
          setSmenaPogon(null);
        }
      } else {
        setSmenaPogon(null);
      }

    } catch {

      setPodaci(null);
      setSmenaPogon(null);

    } finally {

      setLoading(false);

    }

  }, [smena, linija, idDeo, filterPeriod]);



  useEffect(() => {

    ucitaj();

    const t = setInterval(ucitaj, 60000);

    return () => clearInterval(t);

  }, [ucitaj]);



  useEffect(() => {

    const ch = supabase.channel("sef_smena_dash")

      .on("postgres_changes", { event: "*", schema: "public", table: "spc_alarmi" }, () => ucitaj())

      .on("postgres_changes", { event: "*", schema: "public", table: "ncr_capa" }, () => ucitaj())

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, () => ucitaj())

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, () => ucitaj())

      .subscribe();

    return () => { supabase.removeChannel(ch); };

  }, [ucitaj]);



  if (loading && !podaci) {

    return (

      <div data-testid="sef-smena-dashboard" style={{ color: C.sivi, fontSize: 11, padding: 12 }}>

        Učitavam pregled smene…

      </div>

    );

  }

  if (!podaci) return null;



  const bojaFpy = bojaFpyKpi(podaci.fpy, C);

  const nav = onNavigacija ? (tab) => () => onNavigacija({ tab }) : undefined;



  return (

    <div data-testid="sef-smena-dashboard" style={{ marginBottom: 16 }}>

      <SchemaAlarmBanner C={C} onOtvoriAdmin={onOtvoriAdmin} />

      <div style={{

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        marginBottom: 10,

        gap: 8,

        flexWrap: "wrap",

      }}>

        <div style={{

          color: C.tekst,

          fontSize: 12,

          fontWeight: 700,

          letterSpacing: 0.5,

        }}>

          PREGLED SMENE — {podaci.danas}

          {smena ? ` · S${smena}` : ""}

        </div>

        <button

          type="button"

          onClick={ucitaj}

          disabled={loading}

          data-testid="sef-smena-osvezi"

          style={{

            background: C.hover,

            border: `1px solid ${C.border}`,

            borderRadius: 6,

            color: C.sivi,

            fontSize: 10,

            padding: "4px 10px",

            cursor: loading ? "wait" : "pointer",

            fontFamily: "inherit",

          }}

        >

          {loading ? "…" : "↻"}

        </button>

      </div>



      {smenaPogon?.ukupno?.n > 0 && (
        <div
          data-testid="sef-smena-podela"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
            fontSize: 9,
          }}
        >
          {[
            ["Ukupno", smenaPogon.ukupno],
            ["Atributivne", smenaPogon.attr],
            ["Merljive", smenaPogon.merljive],
          ].map(([label, st]) => (
            <div
              key={label}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "6px 10px",
                minWidth: 100,
              }}
            >
              <div style={{ color: C.sivi, fontSize: 8, marginBottom: 2 }}>{label}</div>
              <div style={{ color: C.tekst, fontWeight: 700 }}>
                {st.fpy != null ? `${st.fpy}%` : "—"} · {st.n} uzoraka
              </div>
            </div>
          ))}
        </div>
      )}



      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>

        <KpiKartica C={C} label="FPY" vrednost={podaci.fpy} jedinica="%" boja={bojaFpy} testId="sef-kpi-fpy" />

        <KpiKartica C={C} label="OEE" vrednost={podaci.oee} jedinica="%" boja={C.plava} testId="sef-kpi-oee" />

        <KpiKartica

          C={C}

          label="Moment OK"

          vrednost={podaci.momentPctOk}

          jedinica={podaci.momentPctOk != null ? "%" : ""}

          boja={podaci.momentPctOk >= 95 ? C.zelena : C.narandzasta || C.zuta}

          testId="sef-kpi-moment"

        />

        <KpiKartica

          C={C}

          label="SPC alarmi"

          vrednost={podaci.spcAlarmi.length}

          boja={podaci.spcAlarmi.length ? C.crvena : C.zelena}

          onClick={podaci.spcAlarmi.length && nav ? nav("odobrenja") : undefined}

          testId="sef-kpi-spc"

        />

        <KpiKartica

          C={C}

          label="NCR otvoreni"

          title={NCR_CAPA_TOOLTIP}

          vrednost={podaci.ncrOtvoreni?.length ?? 0}

          boja={(podaci.ncrOtvoreni?.length ?? 0) ? C.narandzasta || C.zuta : C.zelena}

          onClick={(podaci.ncrOtvoreni?.length ?? 0) && nav ? nav("ncr") : undefined}

          testId="sef-kpi-ncr"

        />

        <KpiKartica

          C={C}

          label="Eskalacije"

          vrednost={podaci.eskOtvorene}

          boja={podaci.eskOtvorene ? C.narandzasta || C.zuta : C.zelena}

          onClick={podaci.eskOtvorene && nav ? nav("eskalacije") : undefined}

          testId="sef-kpi-esk"

        />

      </div>



      {podaci.topNok?.length > 0 && (

        <div style={{

          background: C.panel,

          border: `1px solid ${C.border}`,

          borderRadius: 8,

          padding: 12,

          marginBottom: 10,

        }}>

          <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, marginBottom: 8 }}>TOP NOK</div>

          {podaci.topNok.slice(0, 5).map((t, i) => (

            <div key={i} style={{ fontSize: 10, color: C.tekst, marginBottom: 4 }}>

              {t.naziv || t.izvor} — <strong>{t.count}</strong>

              <span style={{ color: C.sivi }}> ({t.izvor})</span>

            </div>

          ))}

        </div>

      )}



      {podaci.ncrOtvoreni?.length > 0 && (

        <div style={{

          background: `${C.zuta}10`,

          border: `1px solid ${C.zuta}44`,

          borderRadius: 8,

          padding: 12,

          marginBottom: 10,

        }}>

          <div style={{ color: C.zuta, fontSize: 9, fontWeight: 700, marginBottom: 8 }} title={NCR_CAPA_TOOLTIP}>

            OTVORENI NCR

          </div>

          {podaci.ncrOtvoreni.slice(0, 5).map((n) => (

            <button

              key={n.id}

              type="button"

              data-testid={`sef-ncr-${n.broj_ncr}`}

              onClick={nav ? nav("ncr") : undefined}

              style={{

                display: "block",

                width: "100%",

                textAlign: "left",

                background: "none",

                border: "none",

                fontSize: 10,

                color: C.tekst,

                marginBottom: 4,

                padding: "2px 0",

                cursor: nav ? "pointer" : "default",

                fontFamily: "inherit",

              }}

            >

              {n.broj_ncr} · {n.id_deo} · [{n.status}]

            </button>

          ))}

        </div>

      )}



      {podaci.spcAlarmi.length > 0 && (

        <div style={{

          background: `${C.crvena}10`,

          border: `1px solid ${C.crvena}44`,

          borderRadius: 8,

          padding: 12,

        }}>

          <div style={{ color: C.crvena, fontSize: 9, fontWeight: 700, marginBottom: 8 }}>

            OTVORENI SPC ALARMI

          </div>

          {podaci.spcAlarmi.slice(0, 5).map((a) => (

            <button

              key={a.id}

              type="button"

              data-testid={`sef-alarm-${a.id}`}

              onClick={nav ? nav("odobrenja") : undefined}

              style={{

                display: "block",

                width: "100%",

                textAlign: "left",

                background: "none",

                border: "none",

                fontSize: 10,

                color: C.tekst,

                marginBottom: 4,

                padding: "2px 0",

                cursor: nav ? "pointer" : "default",

                fontFamily: "inherit",

              }}

            >

              {a.id_deo || "—"} · {a.pravilo} · {a.tip_karte || "—"}

            </button>

          ))}

        </div>

      )}

    </div>

  );

}


