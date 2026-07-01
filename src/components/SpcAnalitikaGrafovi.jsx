import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

/** Zajednički stil SPC analitičkih grafikona (Pareto, RTY, smena, histogram…). */
export function spcOsOkvir(C) {
  return {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "12px 10px 8px",
  };
}

export function spcMargin(overrides = {}) {
  return { top: 14, right: 24, bottom: 36, left: 8, ...overrides };
}

export function spcGrid(C) {
  return <CartesianGrid strokeDasharray="4 4" stroke={C.hover} vertical={false} opacity={0.65} />;
}

export function spcXAxis(C, { dataKey = "label", dataLength = 0, angle } = {}) {
  const autoAngle = angle ?? (dataLength > 8 ? -32 : 0);
  return (
    <XAxis
      dataKey={dataKey}
      tick={{ fill: C.tekst, fontSize: 11 }}
      tickLine={{ stroke: C.border }}
      interval={Math.max(0, Math.floor(dataLength / 10) - 1)}
      angle={autoAngle}
      textAnchor={autoAngle ? "end" : "middle"}
      height={autoAngle ? 52 : 32}
    />
  );
}

export function spcYAxis(C, { tickFormatter, domain, width = 56, orientation, yAxisId } = {}) {
  return (
    <YAxis
      yAxisId={yAxisId}
      orientation={orientation}
      tick={{ fill: C.tekst, fontSize: 11 }}
      tickLine={false}
      axisLine={{ stroke: C.border }}
      domain={domain}
      tickFormatter={tickFormatter}
      width={width}
    />
  );
}

export function spcLegend(C) {
  return (
    <Legend
      verticalAlign="top"
      wrapperStyle={{ color: C.tekst, fontSize: 11, paddingBottom: 8 }}
      iconType="plainline"
      iconSize={14}
    />
  );
}

function AnalitikaTooltip({ active, payload, label, C, sufiks = "", redoviExtra }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 12,
      lineHeight: 1.55,
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 6 }}>{label || d?.label || d?.datum || d?.naziv || "—"}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || C.tekst }}>
          {p.name}: <strong>{p.value}{sufiks}</strong>
        </div>
      ))}
      {redoviExtra?.map(([k, v]) => (
        <div key={k} style={{ color: C.sivi, fontSize: 11, marginTop: 4 }}>{k}: {v}</div>
      ))}
    </div>
  );
}

export function SpcGrafLegendaTraka({ C, stavke }) {
  if (!stavke?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10, fontSize: 11, color: C.tekst }}>
      {stavke.map(s => (
        <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 20,
            height: 3,
            borderRadius: 2,
            background: s.puna ? s.boja : "transparent",
            borderTop: s.isprekid ? `2px dashed ${s.boja}` : undefined,
          }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function SpcGrafPanel({ C, naslov, podnaslov, legenda, height = 280, children, style }) {
  return (
    <div style={{ ...spcOsOkvir(C), marginBottom: 16, ...style }}>
      {naslov && (
        <div style={{ marginBottom: legenda ? 6 : 10, padding: "0 4px" }}>
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{naslov}</div>
          {podnaslov && <div style={{ color: C.sivi, fontSize: 10, marginTop: 3 }}>{podnaslov}</div>}
        </div>
      )}
      {legenda}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Pareto: stubci + kumulativna linija (80%). */
export function SpcParetoGraf({
  data, C, height = 320, boje, kumKey = "kum", countKey = "count", labelKey = "naziv",
}) {
  if (!data?.length) return null;
  const BOJE = boje || [C.crvena, C.narandzasta, C.zuta, C.plava, C.ljubicasta, "#22d3ee", "#f472b6", "#a3e635"];
  return (
    <SpcGrafPanel
      C={C}
      height={height}
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.plava, label: "Broj grešaka / NOK", puna: true },
          { boja: C.zuta, label: "Kumulativ %", isprekid: true },
          { boja: C.sivi, label: "Cilj 80%", isprekid: true },
        ]} />
      )}
    >
      <ComposedChart data={data} margin={spcMargin({ right: 64, bottom: 56 })}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: labelKey, dataLength: data.length })}
        {spcYAxis(C, { yAxisId: "l", width: 52 })}
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`}
          tick={{ fill: C.tekst, fontSize: 11 }} width={48} axisLine={{ stroke: C.border }} />
        <Tooltip content={<AnalitikaTooltip C={C} sufiks="%" />} cursor={{ stroke: C.plava, strokeDasharray: "4 4" }} />
        {spcLegend(C)}
        <Bar yAxisId="l" dataKey={countKey} name="Broj" radius={[5, 5, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => <Cell key={i} fill={BOJE[i % BOJE.length]} opacity={0.9} />)}
        </Bar>
        <Line yAxisId="r" type="monotone" dataKey={kumKey} stroke={C.zuta} strokeWidth={2.5}
          dot={{ fill: C.zuta, r: 5 }} name="Kumulativ %" connectNulls />
        <ReferenceLine yAxisId="r" y={80} stroke={C.sivi} strokeDasharray="6 3"
          label={{ value: "80%", fill: C.sivi, fontSize: 10, position: "right" }} />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** Jednostavan Pareto / NOK po poziciji (samo stubci). */
export function SpcStubciGraf({
  data, C, height = 280, dataKey = "count", labelKey = "naziv", boja = null, name = "NOK",
}) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel C={C} height={height}>
      <BarChart data={data} margin={spcMargin({ bottom: 48 })}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: labelKey, dataLength: data.length })}
        {spcYAxis(C)}
        <Tooltip content={<AnalitikaTooltip C={C} />} cursor={{ fill: `${C.plava}15` }} />
        <Bar dataKey={dataKey} name={name} radius={[5, 5, 0, 0]} maxBarSize={52}>
          {data.map((_, i) => (
            <Cell key={i} fill={boja || C.crvena} opacity={0.92 - i * 0.05} />
          ))}
        </Bar>
      </BarChart>
    </SpcGrafPanel>
  );
}

/** OK / NOK stubci (stacked ili grupisani). */
export function SpcOkNokBarGraf({
  data, C, height = 280, xKey = "s", stacked = true, naslov,
}) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel
      C={C}
      naslov={naslov}
      height={height}
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.zelena, label: "OK", puna: true },
          { boja: C.crvena, label: "NOK", puna: true },
        ]} />
      )}
    >
      <BarChart data={data} margin={spcMargin()}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: xKey, dataLength: data.length, angle: 0 })}
        {spcYAxis(C)}
        <Tooltip content={<AnalitikaTooltip C={C} />} cursor={{ fill: `${C.plava}12` }} />
        {spcLegend(C)}
        <Bar dataKey="ok" fill={C.zelena} name="OK" stackId={stacked ? "a" : undefined} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="nok" fill={C.crvena} name="NOK" stackId={stacked ? "a" : undefined} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </SpcGrafPanel>
  );
}

/** FPY % + p % NOK trend (dual Y) — jedna faza. */
export function SpcRtyTrendGraf({
  data, C, height = 340, xKey = "label", prikaziRefernce = true,
  serijaNaziv = "FPY %",
}) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel
      C={C}
      height={height}
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.zelena, label: serijaNaziv, puna: true },
          { boja: C.crvena, label: "p % NOK", isprekid: true },
          { boja: "#a3e635", label: "4σ (99.38%)", isprekid: true },
        ]} />
      )}
    >
      <ComposedChart data={data} margin={spcMargin({ right: 56, bottom: 48 })}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: xKey, dataLength: data.length })}
        {spcYAxis(C, { yAxisId: "l", domain: [0, 100], tickFormatter: v => `${v}%`, width: 48 })}
        <YAxis yAxisId="r" orientation="right" domain={[0, "auto"]}
          tick={{ fill: C.tekst, fontSize: 11 }} width={48} axisLine={{ stroke: C.border }}
          tickFormatter={v => `${v}%`} />
        <Tooltip content={<AnalitikaTooltip C={C} sufiks="%" />} />
        {spcLegend(C)}
        {prikaziRefernce && (
          <>
            <ReferenceLine yAxisId="l" y={99.38} stroke="#a3e635" strokeDasharray="4 6" opacity={0.75}
              label={{ value: "4σ", fill: "#a3e635", fontSize: 9, position: "right" }} />
            <ReferenceLine yAxisId="l" y={95} stroke={C.zelena} strokeDasharray="4 3" opacity={0.6}
              label={{ value: "95%", fill: C.zelena, fontSize: 9, position: "right" }} />
          </>
        )}
        <Line yAxisId="l" type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={3}
          dot={{ fill: C.zelena, r: 5 }} name={serijaNaziv} connectNulls activeDot={{ r: 8 }} />
        <Line yAxisId="r" type="monotone" dataKey="p" stroke={C.crvena} strokeWidth={2}
          dot={{ fill: C.crvena, r: 4 }} name="p % NOK" strokeDasharray="6 3" connectNulls />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

function PpmDpmoTooltip({ active, payload, label, C }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 12,
      lineHeight: 1.55,
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 6 }}>
        {label || d?.label || d?.datum || "—"}
      </div>
      {d?.n > 0 && (
        <div style={{ color: C.sivi, fontSize: 11, marginBottom: 4 }}>
          n = {d.n} · NOK = {d.nok ?? "—"}
        </div>
      )}
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || C.tekst }}>
          {p.name}: <strong>{Number(p.value).toLocaleString("sr-RS")}</strong>
        </div>
      ))}
    </div>
  );
}

/** PPM / DPMO trend po danu (stubci + linija kad se razlikuju). */
export function SpcPpmDpmoTrendGraf({
  data,
  C,
  height = 280,
  xKey = "label",
  naslov = "PPM / DPMO po danu",
}) {
  if (!data?.length) return null;
  const imaRazliku = data.some(
    (d) => d.ppm != null && d.dpmo != null && Number(d.ppm) !== Number(d.dpmo),
  );
  const maxVal = Math.max(...data.flatMap(d => [Number(d.dpmo) || 0, Number(d.ppm) || 0]), 1);

  return (
    <SpcGrafPanel
      C={C}
      naslov={naslov}
      height={height}
      podnaslov={imaRazliku
        ? "PPM = neispravni komadi/mil. · DPMO = defekti/mil. (kad ima više defekata po komadu)"
        : "PPM i DPMO su identični (jedna prilika po merenju/komadu)"}
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.ljubicasta, label: imaRazliku ? "DPMO" : "PPM / DPMO", puna: true },
          ...(imaRazliku ? [{ boja: C.narandzasta, label: "PPM", isprekid: true }] : []),
        ]} />
      )}
    >
      <ComposedChart data={data} margin={spcMargin({ right: 16, bottom: 48 })}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: xKey, dataLength: data.length })}
        {spcYAxis(C, {
          domain: [0, Math.ceil(maxVal * 1.12)],
          tickFormatter: v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)),
          width: 52,
        })}
        <Tooltip content={<PpmDpmoTooltip C={C} />} cursor={{ fill: `${C.ljubicasta}12` }} />
        {spcLegend(C)}
        <Bar
          dataKey="dpmo"
          fill={C.ljubicasta}
          name={imaRazliku ? "DPMO" : "PPM / DPMO"}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
        />
        {imaRazliku && (
          <Line
            type="monotone"
            dataKey="ppm"
            stroke={C.narandzasta}
            strokeWidth={2.5}
            dot={{ fill: C.narandzasta, r: 5 }}
            name="PPM"
            connectNulls
          />
        )}
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** FPY trend jedna linija (SPC karta / dashboard faze). */
export function SpcRtyJednaLinija({
  data, C, height = 220, xKey = "datum", naslov, serijaNaziv = "FPY %",
}) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel C={C} naslov={naslov} height={height}>
      <ComposedChart data={data} margin={spcMargin({ bottom: 44 })}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: xKey, dataLength: data.length })}
        {spcYAxis(C, { domain: [0, 100], tickFormatter: v => `${v}%` })}
        <Tooltip content={<AnalitikaTooltip C={C} sufiks="%" />} />
        <ReferenceLine y={95} stroke={C.zelena} strokeDasharray="4 3" label={{ value: "95%", fill: C.zelena, fontSize: 9 }} />
        <ReferenceLine y={80} stroke={C.zuta} strokeDasharray="4 3" label={{ value: "80%", fill: C.zuta, fontSize: 9 }} />
        <Line type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={2.5} dot={{ fill: C.zelena, r: 5 }} name={serijaNaziv} />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** Histogram + Gaus + LSL/USL. */
export function SpcHistogramGraf({
  histData, C, gr = {}, histPaket = {}, formatVrednost, binZaVrednost, height = 340,
}) {
  if (!histData?.length) return null;
  const fmt = formatVrednost || (v => (Number.isFinite(v) ? String(v) : "—"));
  const bin = binZaVrednost || (() => undefined);

  return (
    <SpcGrafPanel
      C={C}
      height={height}
      podnaslov="Ljubičasta: Gaus N(μ,σ²) · plavi stubovi: učestanost"
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.plava, label: "Učestanost", puna: true },
          { boja: C.ljubicasta, label: "Gaus (teor.)", isprekid: true },
          { boja: C.zelena, label: "LSL", isprekid: true },
          { boja: C.crvena, label: "USL", isprekid: true },
          { boja: C.zuta, label: "Nominal", isprekid: true },
        ]} />
      )}
    >
      <ComposedChart data={histData} margin={spcMargin({ bottom: 52, right: 16 })}>
        {spcGrid(C)}
        <XAxis dataKey="bin" tick={{ fill: C.tekst, fontSize: 9 }} angle={-28} textAnchor="end" height={52} />
        {spcYAxis(C, { width: 48 })}
        <Tooltip
          contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
          formatter={(v, name) => [
            name === "gauss" ? +Number(v).toFixed(3) : v,
            name === "gauss" ? "Gaus (teor.)" : "Učestanost",
          ]}
        />
        {spcLegend(C)}
        <Bar dataKey="count" name="Učestanost" fill={C.plava} fillOpacity={0.88} radius={[4, 4, 0, 0]} maxBarSize={40} />
        {histPaket.sigma > 0 && (
          <Line type="monotone" dataKey="gauss" name="Gaus N(μ,σ²)" stroke={C.ljubicasta}
            strokeWidth={2.5} dot={false} connectNulls />
        )}
        {Number.isFinite(gr.lsl) && (
          <ReferenceLine x={bin(histData, gr.lsl)} stroke={C.zelena} strokeDasharray="5 3"
            label={{ value: `LSL ${fmt(gr.lsl)}`, fill: C.zelena, fontSize: 9, position: "insideTopLeft" }} />
        )}
        {Number.isFinite(gr.usl) && (
          <ReferenceLine x={bin(histData, gr.usl)} stroke={C.crvena} strokeDasharray="5 3"
            label={{ value: `USL ${fmt(gr.usl)}`, fill: C.crvena, fontSize: 9, position: "insideTopRight" }} />
        )}
        {Number.isFinite(gr.nominala) && (
          <ReferenceLine x={bin(histData, gr.nominala)} stroke={C.zuta} strokeDasharray="3 4"
            label={{ value: "Nom.", fill: C.zuta, fontSize: 9 }} />
        )}
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** Jednostavan trend (npr. stabilnost p %). */
export function SpcTrendLinijaGraf({
  data, C, height = 280, xKey = "datum", yKey = "p", boja, naziv = "p % NOK",
  tickFormatterX, referencaX, sufiksY = "%",
}) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel C={C} height={height}>
      <ComposedChart data={data} margin={spcMargin({ bottom: 48 })}>
        {spcGrid(C)}
        <XAxis
          dataKey={xKey}
          tick={{ fill: C.tekst, fontSize: 10 }}
          angle={-36}
          textAnchor="end"
          height={52}
          tickFormatter={tickFormatterX}
        />
        {spcYAxis(C, { tickFormatter: v => `${v}${sufiksY}` })}
        <Tooltip content={<AnalitikaTooltip C={C} sufiks={sufiksY} />} />
        {referencaX && <ReferenceLine x={referencaX} stroke={C.crvena} strokeDasharray="6 3" strokeWidth={2} />}
        <Line type="monotone" dataKey={yKey} stroke={boja || C.zelena} strokeWidth={2.5}
          dot={{ r: 5, fill: boja || C.zelena }} name={naziv} connectNulls />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** OC kriva (više Ac linija). */
export function SpcOcKrivaGraf({ data, C, ac, height = 340 }) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel
      C={C}
      height={height}
      naslov="OC kriva — verovatnoća prihvatanja"
      podnaslov={`n i Ac=${ac} · % neispravnih u lotu (osa X)`}
      legenda={(
        <SpcGrafLegendaTraka C={C} stavke={[
          { boja: C.plava, label: `Ac=${ac}`, puna: true },
          { boja: `${C.zelena}cc`, label: `Ac=${Math.max(0, ac - 1)}`, isprekid: true },
          { boja: `${C.narandzasta}cc`, label: `Ac=${ac + 1}`, isprekid: true },
          { boja: C.zelena, label: "Pa=95%", isprekid: true },
        ]} />
      )}
    >
      <ComposedChart data={data} margin={spcMargin({ bottom: 40, right: 20 })}>
        {spcGrid(C)}
        <XAxis
          dataKey="p"
          tick={{ fill: C.tekst, fontSize: 11 }}
          tickFormatter={v => `${v}%`}
          label={{ value: "% neispravnih u lotu", fill: C.sivi, fontSize: 10, position: "insideBottom", offset: -8 }}
        />
        {spcYAxis(C, { domain: [0, 100], tickFormatter: v => `${v}%`, width: 48 })}
        <Tooltip content={<AnalitikaTooltip C={C} sufiks="%" />} />
        {spcLegend(C)}
        <ReferenceLine y={95} stroke={C.zelena} strokeDasharray="5 3"
          label={{ value: "Pa 95%", fill: C.zelena, fontSize: 9 }} />
        <ReferenceLine y={10} stroke={C.crvena} strokeDasharray="5 3"
          label={{ value: "Pa 10%", fill: C.crvena, fontSize: 9 }} />
        <Line type="monotone" dataKey="pa5" stroke={C.zelena} strokeWidth={1.5}
          dot={false} name={`Ac=${Math.max(0, ac - 1)}`} strokeDasharray="5 3" connectNulls />
        <Line type="monotone" dataKey="pa" stroke={C.plava} strokeWidth={3}
          dot={{ fill: C.plava, r: 5 }} name={`Ac=${ac}`} connectNulls />
        <Line type="monotone" dataKey="pa10" stroke={C.narandzasta} strokeWidth={1.5}
          dot={false} name={`Ac=${ac + 1}`} strokeDasharray="5 3" connectNulls />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** Stabilnost procesa — p % NOK kroz vreme + proseci polovina. */
export function SpcStabilnostGraf({ podaci, C, height = 300 }) {
  if (!podaci?.niz?.length) return null;
  const boja = podaci.shift ? C.narandzasta : C.zelena;
  return (
    <SpcGrafPanel C={C} height={height} naslov="p % NOK po danu">
      <ComposedChart data={podaci.niz} margin={spcMargin({ bottom: 48, right: 72 })}>
        {spcGrid(C)}
        <XAxis
          dataKey="datum"
          tick={{ fill: C.tekst, fontSize: 10 }}
          angle={-36}
          textAnchor="end"
          height={52}
          interval={Math.max(0, Math.floor(podaci.niz.length / 8) - 1)}
          tickFormatter={v => v?.substring(5) || ""}
        />
        {spcYAxis(C, { tickFormatter: v => `${v}%`, domain: [0, "auto"] })}
        <Tooltip content={<AnalitikaTooltip C={C} sufiks="%" />} />
        {podaci.shift && podaci.niz[Math.floor(podaci.niz.length / 2)] && (
          <ReferenceLine
            x={podaci.niz[Math.floor(podaci.niz.length / 2)].datum}
            stroke={C.crvena}
            strokeDasharray="6 3"
            strokeWidth={2}
            label={{ value: "Promena", fill: C.crvena, fontSize: 10, position: "top" }}
          />
        )}
        <ReferenceLine y={parseFloat(podaci.m1)} stroke={C.plava} strokeDasharray="5 3"
          label={{ value: `x̄₁=${podaci.m1}%`, fill: C.plava, fontSize: 9, position: "right" }} />
        {podaci.shift && (
          <ReferenceLine y={parseFloat(podaci.m2)} stroke={C.crvena} strokeDasharray="5 3"
            label={{ value: `x̄₂=${podaci.m2}%`, fill: C.crvena, fontSize: 9, position: "right" }} />
        )}
        <Line type="monotone" dataKey="p" stroke={boja} strokeWidth={2.5}
          dot={{ r: 5, fill: boja }} name="p % NOK" connectNulls activeDot={{ r: 8 }} />
      </ComposedChart>
    </SpcGrafPanel>
  );
}

/** Sigma benchmark stubci. */
export function SpcSigmaBarGraf({ data, C, height = 240, accentBoja }) {
  if (!data?.length) return null;
  return (
    <SpcGrafPanel C={C} naslov="DPMO po sigma nivou" height={height}>
      <BarChart data={data} margin={spcMargin()}>
        {spcGrid(C)}
        {spcXAxis(C, { dataKey: "nivo", dataLength: data.length, angle: 0 })}
        {spcYAxis(C, { tickFormatter: v => v.toLocaleString() })}
        <Tooltip content={<AnalitikaTooltip C={C} />} />
        <Bar dataKey="sigma" name="DPMO" radius={[5, 5, 0, 0]} maxBarSize={48}>
          {data.map((b, i) => (
            <Cell key={b.nivo || i} fill={b.trenutni ? accentBoja : C.plava} opacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </SpcGrafPanel>
  );
}
