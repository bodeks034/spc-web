import {
  OBRAZAC_SEKCIJE,
  NCR_STATUS_EXCEL,
  NCR_OZBILJNOST,
  NCR_KATEGORIJA_6M,
  NCR_DA_NE,
  ncrPoljeOptsLinija,
} from "../../lib/ncrObrazacPolja.js";

function Polje({ keyName, label, opts = {}, form, setForm, greske, C, INP }) {
  if (!keyName) return <div />;
  const obavezno = opts.obavezno;
  const err = greske[keyName];
  const lblStyle = { fontSize: 10, color: err ? C.crvena : C.sivi, display: "block" };
  const bg = obavezno ? `${C.zuta || "#fef3c7"}33` : "transparent";
  const borderColor = err ? C.crvena : C.border;

  if (opts.tip === "textarea") {
    return (
      <label style={{ ...lblStyle, gridColumn: opts.span ? `span ${opts.span}` : undefined }}>
        {label}{obavezno ? " *" : ""}
        <textarea
          data-testid={`ncr-f-${keyName}`}
          style={{
            ...INP,
            minHeight: keyName === "opis" ? 120 : 52,
            background: bg,
            borderColor,
          }}
          value={form[keyName] || ""}
          onChange={(e) => setForm({ ...form, [keyName]: e.target.value })}
        />
        {err && <span style={{ color: C.crvena, fontSize: 9 }}>{err}</span>}
      </label>
    );
  }

  if (opts.tip === "status") {
    if (opts.readOnly) {
      return (
        <label style={lblStyle}>
          {label} *
          <input
            data-testid="ncr-f-status"
            readOnly
            style={{ ...INP, background: `${C.sivi}11`, borderColor, opacity: 0.85 }}
            value="OPEN"
          />
        </label>
      );
    }
    return (
      <label style={lblStyle}>
        {label} *
        <select data-testid="ncr-f-status" style={{ ...INP, background: bg, borderColor }}
          value={form.status || "open"}
          onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {NCR_STATUS_EXCEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
  }

  if (opts.tip === "ozbiljnost") {
    return (
      <label style={lblStyle}>
        {label} *
        <select style={{ ...INP, background: bg, borderColor }} value={form.ozbiljnost || "Medium"}
          onChange={(e) => setForm({ ...form, ozbiljnost: e.target.value })}>
          {NCR_OZBILJNOST.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }

  if (opts.tip === "6m") {
    return (
      <label style={lblStyle}>
        {label}
        <select style={INP} value={form.kategorija_6m || ""}
          onChange={(e) => setForm({ ...form, kategorija_6m: e.target.value })}>
          <option value="">—</option>
          {NCR_KATEGORIJA_6M.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
  }

  if (opts.tip === "dane") {
    return (
      <label style={lblStyle}>
        {label}
        <select style={INP} value={form[keyName] || "NE"}
          onChange={(e) => setForm({ ...form, [keyName]: e.target.value })}>
          {NCR_DA_NE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
  }

  if (opts.tip === "klasa_sc") {
    return (
      <label style={lblStyle}>
        {label}
        <select style={INP} value={form.karakteristika_klasa || ""}
          data-testid="ncr-f-klasa-sc"
          onChange={(e) => setForm({ ...form, karakteristika_klasa: e.target.value })}>
          <option value="">— (nije SC/CC)</option>
          <option value="SC">SC — Specijalna karakteristika</option>
          <option value="CC">CC — Kritična karakteristika</option>
          <option value="Standard">Standard</option>
        </select>
      </label>
    );
  }

  if (opts.tip === "bool") {
    return (
      <label style={{ ...lblStyle, display: "flex", alignItems: "center", gap: 8, paddingTop: 16 }}>
        <input type="checkbox" checked={!!form[keyName]}
          onChange={(e) => setForm({ ...form, [keyName]: e.target.checked })} />
        {label}
      </label>
    );
  }

  const inputType = opts.tip === "date" ? "date" : opts.tip === "number" ? "number" : "text";
  const readOnly = opts.readOnly;

  return (
    <label style={lblStyle}>
      {label}{obavezno ? " *" : ""}
      <input
        type={inputType}
        data-testid={keyName === "id_deo" ? "ncr-id-deo" : keyName === "opis" ? "ncr-opis" : `ncr-f-${keyName}`}
        readOnly={readOnly}
        list={keyName === "id_deo" ? "ncr-dela" : keyName === "pogon" ? "ncr-pogoni" : undefined}
        style={{ ...INP, background: readOnly ? `${C.sivi}11` : bg, borderColor, opacity: readOnly ? 0.85 : 1 }}
        value={form[keyName] ?? ""}
        onChange={(e) => {
          let v = e.target.value;
          if (keyName === "id_deo") v = v.toUpperCase();
          setForm({ ...form, [keyName]: v });
        }}
      />
      {err && <span data-testid={`ncr-greska-${keyName}`} style={{ color: C.crvena, fontSize: 9 }}>{err}</span>}
    </label>
  );
}

export default function NcrObrazacForma({
  form, setForm, greske, C, sviDelovi, pogoni = [], onSnimi, onStampaj, onStampajPrazan, onOtvori8D, busy,
  rezimLinija = false,
}) {
  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    color: C.tekst,
    fontSize: 11,
    padding: "5px 7px",
    width: "100%",
    boxSizing: "border-box",
  };

  if (!form) {
    return (
      <div style={{ padding: 24, color: C.sivi, fontSize: 11, textAlign: "center" }}>
        Izaberi red u Registru ili klikni + Novi NCR.
      </div>
    );
  }

  return (
    <div data-testid="ncr-obrazac" style={{ paddingBottom: 16 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>NCR – IZVEŠTAJ O NEUSAGLAŠENOSTI</div>
          <div style={{ fontSize: 9, color: C.sivi, marginTop: 4 }}>
            {form.broj_ncr || "Novi zapis"} · podaci se automatski upisuju u Registar pri čuvanju
            {rezimLinija && " · status OPEN — zatvaranje u Modulu 2"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" data-testid="ncr-snimi" disabled={busy} onClick={onSnimi}
            style={{
              background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
              padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>
            Sačuvaj
          </button>
          <button type="button" disabled={busy || !onStampaj} onClick={onStampaj}
            style={{
              background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,
              padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>
            Štampaj
          </button>
          {onStampajPrazan && (
            <button type="button" data-testid="ncr-stampaj-prazan-forma" disabled={busy} onClick={onStampajPrazan}
              title="Prazan obrazac za ručno popunjavanje"
              style={{
                background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.sivi, padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
              }}>
              Prazan obrazac
            </button>
          )}
          {onOtvori8D && form.id && !rezimLinija && (
            <button type="button" data-testid="ncr-otvori-8d" onClick={() => onOtvori8D(form)}
              style={{
                background: `${C.plava}22`, border: `1px solid ${C.plava}`, borderRadius: 6,
                color: C.plava, padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
              }}>
              Otvori 8D
            </button>
          )}
        </div>
      </div>

      {OBRAZAC_SEKCIJE.map((sek) => (
        <div key={sek.id} style={{
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          marginBottom: 10,
          overflow: "hidden",
          opacity: rezimLinija && !["A", "B", "C", "D"].includes(sek.id) ? 0.72 : 1,
        }}>
          <div style={{
            background: rezimLinija && !["A", "B", "C", "D"].includes(sek.id) ? "#f8fafc" : "#f1f5f9",
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: "#1e293b",
            borderBottom: `1px solid ${C.border}`,
          }}>
            {sek.naslov}
            {rezimLinija && !["A", "B", "C", "D"].includes(sek.id) && (
              <span style={{ fontWeight: 400, color: C.sivi, marginLeft: 8 }}>(Modul 2 — inženjer)</span>
            )}
          </div>
          <div style={{ padding: 8 }}>
            {sek.redovi.map((red, ri) => (
              <div key={ri} style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: ri < sek.redovi.length - 1 ? 8 : 0,
              }}>
                {red.map(([keyName, label, opts]) => (
                  <Polje
                    key={`${sek.id}-${keyName || ri}`}
                    keyName={keyName}
                    label={label}
                    opts={rezimLinija ? ncrPoljeOptsLinija(sek.id, opts || {}) : (opts || {})}
                    form={form}
                    setForm={setForm}
                    greske={greske}
                    C={C}
                    INP={INP}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 9, color: C.sivi, marginTop: 8 }}>
        {rezimLinija
          ? "Popunite podatke sa linije (A–D) i sačuvajte. Inženjer nastavlja dispoziciju, 8D i zatvaranje u Modulu 2 → Analitika → NCR."
          : "Žuta polja su obavezna. NCR se zatvara tek kada su containment, dispozicija i verifikacija završeni."}
      </div>

      {sviDelovi.length > 0 && (
        <datalist id="ncr-dela">
          {sviDelovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
        </datalist>
      )}
      {pogoni.length > 0 && (
        <datalist id="ncr-pogoni">
          {pogoni.map((p) => <option key={p} value={p} />)}
        </datalist>
      )}
    </div>
  );
}
