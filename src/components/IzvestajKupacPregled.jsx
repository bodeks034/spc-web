import { LAB_FPY_PCT } from "../lib/rtyFpy.js";
import { ocenaIsporuke } from "../lib/izvestajKupacPdf.js";
import { statusKupcaTekst } from "../lib/izvestajKupacData.js";

function Sekcija({ naslov, C, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>{naslov}</div>
      {children}
    </div>
  );
}

function Tabela({ kolone, redovi, C, keyFn }) {
  if (!redovi?.length) return null;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: kolone.map((k) => k.w).join(" "),
        background: C.hover, padding: "8px 14px", fontSize: 9, color: C.sivi, gap: 8,
      }}>
        {kolone.map((k) => <span key={k.key || k.label}>{k.label}</span>)}
      </div>
      {redovi.map((r, i) => (
        <div key={keyFn ? keyFn(r, i) : i} style={{
          display: "grid",
          gridTemplateColumns: kolone.map((k) => k.w).join(" "),
          padding: "8px 14px", borderTop: `1px solid ${C.border}`, fontSize: 11, gap: 8, alignItems: "center",
        }}>
          {kolone.map((k) => (
            <span key={k.key || k.label} style={{ color: k.boja ? k.boja(r) : C.tekst }}>
              {k.fmt ? k.fmt(r) : (r[k.key] ?? "—")}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function statusBoja(status, C) {
  const s = String(status || "").toUpperCase();
  if (s.includes("ISPUNJENO") || s === "OK") return C.zelena;
  if (s.includes("GRANIČNO") || s === "PAŽNJA") return C.zuta;
  if (s.includes("KRIT") || s.includes("ISPOD") || s === "ZAHTEVA") return C.crvena;
  return C.tekst;
}

function PodaciKupcaBlok({ info, C }) {
  if (!info) return null;
  const polja = [
    ["Šifra kupca", info.sifra_kupca],
    ["Naziv kupca", info.naziv],
    ["Skraćeni naziv", info.skraceni_naziv],
    ["Država", info.drzava],
    ["Grad", info.grad],
    ["Adresa", info.adresa],
    ["PIB", info.pib],
    ["Kontakt", info.kontakt],
    ["Telefon", info.telefon],
    ["Email", info.email],
    ["Status", statusKupcaTekst(info)],
  ];
  return (
    <Sekcija naslov="PODACI O KUPCU" C={C}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}>
        {polja.map(([label, vrednost]) => (
          <div key={label}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.6, marginBottom: 2 }}>{label.toUpperCase()}</div>
            <div style={{
              color: label === "Status"
                ? (info.aktivan === false ? C.crvena : C.zelena)
                : C.tekst,
              fontSize: 12,
              fontWeight: label === "Naziv kupca" || label === "Status" ? 700 : 500,
              wordBreak: "break-word",
            }}>
              {vrednost || "—"}
            </div>
          </div>
        ))}
      </div>
    </Sekcija>
  );
}

export default function IzvestajKupacPregled({ podaci, C, modul = "atributivne" }) {
  if (!podaci) return null;

  const statusIsp = ocenaIsporuke(podaci.stat);
  const merljive = modul === "merljive";

  return (
    <>
      <PodaciKupcaBlok info={podaci.kupacInfo || { naziv: podaci.kupac }} C={C} />

      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: "10px 14px", marginBottom: 16, fontSize: 11,
      }}>
        <span style={{ color: C.sivi }}>Status isporuke: </span>
        <span style={{
          color: statusBoja(statusIsp, C), fontWeight: 700,
        }}>{statusIsp}</span>
        <span style={{ color: C.sivi, marginLeft: 16 }}>
          NCR: {podaci.ncr?.length || 0} · 8D: {podaci.osmd?.length || 0}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          [merljive ? "MERENJA" : "MERENO", podaci.stat.n, C.plava],
          ["OK", podaci.stat.ok, C.zelena],
          ["NOK", podaci.stat.nok, C.crvena],
          [LAB_FPY_PCT, `${podaci.stat.rty}%`, C.zuta],
          ["DPMO", podaci.stat.dpmo, C.ljubicasta],
        ].map(([n, v, b]) => (
          <div key={n} style={{
            background: C.panel, border: `1px solid ${b}25`, borderRadius: 10,
            padding: "12px", textAlign: "center",
          }}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>{n}</div>
            <div style={{ color: b, fontSize: 20, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      {podaci.nalozi?.length > 0 && (
        <Sekcija naslov={`RADNI NALOZI (${podaci.nalozi.length})`} C={C}>
          <Tabela
            C={C}
            redovi={podaci.nalozi}
            keyFn={(r) => r.broj_naloga || r.id_deo}
            kolone={[
              { label: "NALOG", w: "120px", key: "broj_naloga", boja: () => C.plava },
              { label: "ID DELA", w: "80px", key: "id_deo" },
              { label: "NAZIV", w: "1fr", key: "naziv_dela", boja: () => C.sivi },
              { label: "KOL.", w: "60px", key: "kolicina" },
            ]}
          />
        </Sekcija>
      )}

      {podaci.poDeo?.length > 0 && (
        <Sekcija naslov={`KVALITET PO DELU (${podaci.poDeo.length})`} C={C}>
          <Tabela
            C={C}
            redovi={podaci.poDeo}
            keyFn={(r) => r.id_deo}
            kolone={[
              { label: "ID DELA", w: "90px", key: "id_deo" },
              { label: "MERENO", w: "70px", key: "mereno" },
              { label: "OK", w: "50px", key: "ok" },
              { label: "NOK", w: "50px", key: "nok", boja: () => C.crvena },
              { label: "FPY %", w: "60px", key: "rty" },
              { label: "PPM", w: "70px", key: "ppm" },
            ]}
          />
        </Sekcija>
      )}

      {podaci.ciljevi?.length > 0 && (
        <Sekcija naslov="CILJEVI — STVARNO VS CILJ" C={C}>
          <Tabela
            C={C}
            redovi={podaci.ciljevi}
            keyFn={(r) => r.id_deo}
            kolone={[
              { label: "DELO", w: "80px", key: "id_deo" },
              { label: "FPY %", w: "60px", key: "rty_stvarno" },
              { label: "CILJ %", w: "60px", key: "rty_cilj" },
              { label: "PPM", w: "70px", key: "dpmo_stvarno" },
              { label: "CILJ", w: "70px", key: "dpmo_cilj" },
              { label: "STATUS", w: "1fr", key: "status", boja: (r) => statusBoja(r.status, C) },
            ]}
          />
        </Sekcija>
      )}

      {podaci.trend?.length > 0 && (
        <Sekcija naslov={`TREND PO DANU (${podaci.trend.length})`} C={C}>
          <Tabela
            C={C}
            redovi={podaci.trend.slice(-14)}
            keyFn={(r) => r.datum}
            kolone={[
              { label: "DATUM", w: "90px", key: "datum" },
              { label: "MERENO", w: "70px", key: "n" },
              { label: "FPY %", w: "60px", fmt: (r) => `${r.rty}%` },
              { label: "DPMO", w: "80px", key: "dpmo" },
            ]}
          />
        </Sekcija>
      )}

      {podaci.defekti?.length > 0 && (
        <Sekcija naslov={merljive ? "TOP NOK PO DIMENZIJI" : "TOP DEFEKTI (PARETO)"} C={C}>
          <Tabela
            C={C}
            redovi={podaci.defekti}
            keyFn={(r) => r.defekt}
            kolone={[
              { label: "DEFEKT", w: "1fr", key: "defekt" },
              { label: "NOK", w: "60px", key: "kolicina", boja: () => C.crvena },
            ]}
          />
        </Sekcija>
      )}

      {podaci.spcSummary?.length > 0 && (
        <Sekcija naslov={`SPC Cp/Cpk (${podaci.spcSummary.length})`} C={C}>
          <Tabela
            C={C}
            redovi={podaci.spcSummary.slice(0, 20)}
            keyFn={(r) => `${r.id_deo}-${r.pozicija}`}
            kolone={[
              { label: "DELO", w: "80px", key: "id_deo" },
              { label: "POZ.", w: "50px", key: "pozicija" },
              { label: "Cp", w: "50px", key: "cp" },
              { label: "Cpk", w: "50px", key: "cpk" },
              { label: "STATUS", w: "1fr", key: "status", boja: (r) => statusBoja(r.status, C) },
            ]}
          />
        </Sekcija>
      )}

      <Sekcija naslov={`OTVORENI NCR (${podaci.ncr?.length || 0})`} C={C}>
        {podaci.ncr?.length ? (
          <Tabela
            C={C}
            redovi={podaci.ncr}
            keyFn={(r) => r.broj_ncr}
            kolone={[
              { label: "NCR", w: "100px", key: "broj_ncr", boja: () => C.plava },
              { label: "DELO", w: "70px", key: "id_deo" },
              { label: "STATUS", w: "80px", key: "status" },
              { label: "OPIS", w: "1fr", fmt: (r) => String(r.opis || "").slice(0, 60) },
            ]}
          />
        ) : (
          <div style={{ color: C.zelena, fontSize: 11 }}>Nema otvorenih NCR ✓</div>
        )}
      </Sekcija>

      <Sekcija naslov={`OTVORENI 8D (${podaci.osmd?.length || 0})`} C={C}>
        {podaci.osmd?.length ? (
          <Tabela
            C={C}
            redovi={podaci.osmd}
            keyFn={(r) => r.id}
            kolone={[
              { label: "8D", w: "70px", fmt: (r) => r.broj_8d || r.id },
              { label: "DELO", w: "70px", key: "id_deo" },
              { label: "STATUS", w: "80px", key: "status" },
              { label: "OPIS", w: "1fr", fmt: (r) => String(r.d2_opis_problema || "").slice(0, 70) },
            ]}
          />
        ) : (
          <div style={{ color: C.zelena, fontSize: 11 }}>Nema otvorenih 8D ✓</div>
        )}
      </Sekcija>
    </>
  );
}
