import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend,
  ResponsiveContainer,
} from "recharts";

function graniceVarirajuPoTacki(podaci) {
  if (!podaci?.length) return false;
  const u0 = podaci[0].ucl;
  const c0 = podaci[0].cl;
  const l0 = podaci[0].lcl;
  return podaci.some(d => d.ucl !== u0 || d.cl !== c0 || d.lcl !== l0);
}

function SpcTooltip({ active, payload, C, sufiks, formatVrednost }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const fmt = (v) => formatVrednost(v, d);
  const van = d.upoz ? (
    <div style={{ color: C.crvena, fontWeight: 700, marginTop: 6, fontSize: 11 }}>⚠ Western Electric</div>
  ) : null;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 12,
      lineHeight: 1.55,
      maxWidth: 280,
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{d.label || "—"}</div>
      <div style={{ color: C.tekst }}>
        Vrednost: <strong style={{ color: payload[0]?.color || C.plava }}>{fmt(d.val)}{sufiks}</strong>
      </div>
      {Number.isFinite(d.ucl) && (
        <div style={{ color: C.crvena, marginTop: 4 }}>UCL: {fmt(d.ucl)}{sufiks}</div>
      )}
      {Number.isFinite(d.cl) && (
        <div style={{ color: C.zuta }}>CL: {fmt(d.cl)}{sufiks}</div>
      )}
      {Number.isFinite(d.lcl) && (
        <div style={{ color: C.zelena }}>LCL: {fmt(d.lcl)}{sufiks}</div>
      )}
      {(d.n != null || d.nok != null) && (
        <div style={{ color: C.sivi, marginTop: 6, fontSize: 11 }}>
          {d.n != null && <>n = {d.n}</>}
          {d.nok != null && <>{d.n != null ? " · " : ""}NOK = {d.nok}</>}
        </div>
      )}
      {van}
    </div>
  );
}

function LegendaTraka({ C, bojaLinije, prikaziSpec, naslovKarte }) {
  const stavke = [
    { boja: bojaLinije, label: "Vrednost", puna: true },
    { boja: C.crvena, label: "UCL", isprekid: true },
    { boja: C.zuta, label: "CL", isprekid: true },
    { boja: C.zelena, label: "LCL", isprekid: true },
  ];
  if (prikaziSpec) {
    stavke.push({ boja: "#f472b6", label: "USL / LSL", isprekid: true });
  }
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
      padding: "8px 12px",
      background: `${C.panel}`,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
    }}>
      {naslovKarte && (
        <span style={{ color: C.sivi, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginRight: 4 }}>
          {naslovKarte}
        </span>
      )}
      {stavke.map(s => (
        <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.tekst }}>
          <span style={{
            width: 22,
            height: 3,
            borderRadius: 2,
            background: s.puna ? s.boja : "transparent",
            borderTop: s.isprekid ? `2px dashed ${s.boja}` : undefined,
          }} />
          {s.label}
        </span>
      ))}
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.tekst, marginLeft: "auto" }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%", background: C.crvena, border: "2px solid #fff",
        }} />
        Van kontrole
      </span>
    </div>
  );
}

/**
 * Zajednička SPC kontrolna karta (atributivne p/np/C/u i merljive X̄/R/I/MR).
 */
export default function SpcKontrolnaGraf({
  podaci,
  bojaLinije,
  C,
  sufiks = "",
  yDomain,
  lsl,
  usl,
  formatVrednost = (v) => (Number.isFinite(v) ? String(v) : "—"),
  height = 380,
  naslovKarte,
}) {
  if (!podaci?.length) return null;

  const poTacki = graniceVarirajuPoTacki(podaci);
  const cl = podaci[0].cl;
  const ucl = podaci[0].ucl;
  const lcl = podaci[0].lcl;
  const yDom = yDomain || ["auto", "auto"];
  const sigma = Number.isFinite(ucl) && Number.isFinite(cl) ? (ucl - cl) / 3 : 0;
  const prikaziSpec = Number.isFinite(lsl) || Number.isFinite(usl);
  const xInterval = Math.max(0, Math.floor(podaci.length / 10) - 1);
  const xAngle = podaci.length > 8 ? -32 : 0;

  const Dot = (props) => {
    const { cx, cy, index } = props;
    const u = podaci[index]?.upoz;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={u ? 8 : 5}
        fill={u ? C.crvena : bojaLinije}
        stroke={u ? "#fff" : bojaLinije}
        strokeWidth={u ? 2 : 1}
        opacity={0.95}
      />
    );
  };

  const refLabel = (text, color, y) => ({
    value: `${text} ${formatVrednost(y)}${sufiks}`,
    fill: color,
    fontSize: 10,
    fontWeight: 600,
    position: "right",
  });

  const zoneY1 = Number.isFinite(lcl) ? lcl : cl - sigma * 3;
  const zoneY2 = Number.isFinite(ucl) ? ucl : cl + sigma * 3;
  const zonaOk = Number.isFinite(zoneY1) && Number.isFinite(zoneY2) && zoneY2 > zoneY1;

  return (
    <div style={{
      background: C.input,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "12px 8px 8px",
    }}>
      <LegendaTraka
        C={C}
        bojaLinije={bojaLinije}
        prikaziSpec={prikaziSpec}
        naslovKarte={naslovKarte}
      />
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={podaci} margin={{ top: 16, right: 118, bottom: xAngle ? 48 : 28, left: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={C.hover} vertical={false} opacity={0.65} />
          <XAxis
            dataKey="label"
            tick={{ fill: C.tekst, fontSize: 11 }}
            tickLine={{ stroke: C.border }}
            interval={xInterval}
            angle={xAngle}
            textAnchor={xAngle ? "end" : "middle"}
            height={xAngle ? 52 : 32}
          />
          <YAxis
            tick={{ fill: C.tekst, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: C.border }}
            domain={yDom}
            tickFormatter={v => `${formatVrednost(v)}${sufiks}`}
            width={72}
          />
          <Tooltip
            content={(
              <SpcTooltip
                C={C}
                sufiks={sufiks}
                formatVrednost={formatVrednost}
              />
            )}
            cursor={{ stroke: C.plava, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Legend
            verticalAlign="top"
            height={0}
            wrapperStyle={{ display: "none" }}
          />

          {zonaOk && !poTacki && (
            <ReferenceArea y1={zoneY1} y2={zoneY2} fill={C.zelena} fillOpacity={0.06} strokeOpacity={0} />
          )}

          {poTacki ? (
            <>
              <Line type="monotone" dataKey="ucl" stroke={C.crvena} strokeWidth={2}
                dot={false} strokeDasharray="8 4" name="UCL" connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="cl" stroke={C.zuta} strokeWidth={2}
                dot={false} strokeDasharray="5 3" name="CL" connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="lcl" stroke={C.zelena} strokeWidth={2}
                dot={false} strokeDasharray="8 4" name="LCL" connectNulls isAnimationActive={false} />
            </>
          ) : (
            <>
              {Number.isFinite(ucl) && (
                <ReferenceLine y={ucl} stroke={C.crvena} strokeWidth={2} strokeDasharray="8 4"
                  label={refLabel("UCL", C.crvena, ucl)} />
              )}
              {Number.isFinite(cl) && (
                <ReferenceLine y={cl} stroke={C.zuta} strokeWidth={2} strokeDasharray="5 3"
                  label={refLabel("CL", C.zuta, cl)} />
              )}
              {Number.isFinite(lcl) && (
                <ReferenceLine y={lcl} stroke={C.zelena} strokeWidth={2} strokeDasharray="8 4"
                  label={refLabel("LCL", C.zelena, lcl)} />
              )}
              {sigma > 0 && Number.isFinite(cl) && (
                <>
                  <ReferenceLine y={cl + sigma} stroke={C.zuta} strokeWidth={0.6} strokeDasharray="2 6" opacity={0.5} />
                  <ReferenceLine y={cl + 2 * sigma} stroke={C.crvena} strokeWidth={0.6} strokeDasharray="2 6" opacity={0.4} />
                  <ReferenceLine y={cl - sigma} stroke={C.zuta} strokeWidth={0.6} strokeDasharray="2 6" opacity={0.5} />
                  <ReferenceLine y={cl - 2 * sigma} stroke={C.crvena} strokeWidth={0.6} strokeDasharray="2 6" opacity={0.4} />
                </>
              )}
            </>
          )}

          {Number.isFinite(usl) && (
            <ReferenceLine y={usl} stroke="#f472b6" strokeWidth={1.5} strokeDasharray="4 4"
              label={{ value: `USL ${formatVrednost(usl)}${sufiks}`, fill: "#f472b6", fontSize: 10, position: "left" }} />
          )}
          {Number.isFinite(lsl) && (
            <ReferenceLine y={lsl} stroke="#f472b6" strokeWidth={1.5} strokeDasharray="4 4"
              label={{ value: `LSL ${formatVrednost(lsl)}${sufiks}`, fill: "#f472b6", fontSize: 10, position: "left" }} />
          )}

          <Line
            type="monotone"
            dataKey="val"
            stroke={bojaLinije}
            strokeWidth={3}
            dot={<Dot />}
            connectNulls
            activeDot={{ r: 9, stroke: "#fff", strokeWidth: 2 }}
            name="Vrednost"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
