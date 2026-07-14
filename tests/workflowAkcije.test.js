import { describe, it, expect, beforeEach } from "vitest";
import {
  WORKFLOW_TIP,
  akcijaZaOperativniAlarm,
  sacuvajSpoljnuNavigacijuTab,
  procitajSpoljnuNavigacijuTab,
  tabZaMerilaKalibraciju,
} from "../src/lib/workflowAkcije.js";

describe("akcijaZaOperativniAlarm", () => {
  it("eskalacije_otvorene vodi na eskalacije tab", () => {
    const wf = akcijaZaOperativniAlarm({ id: "eskalacije_otvorene", nivo: "srednji" });
    expect(wf.akcija).toBe(WORKFLOW_TIP.ESKALACIJE);
    expect(wf.label).toBe("Eskalacije");
  });

  it("eskalacije_stare (visok nivo) i dalje vodi na eskalacije, ne NCR", () => {
    const wf = akcijaZaOperativniAlarm({ id: "eskalacije_stare", nivo: "visok" });
    expect(wf.akcija).toBe(WORKFLOW_TIP.ESKALACIJE);
  });

  it("koristi izabrani deo iz filtera za NCR i eskalacije", () => {
    const ctx = { idDeo: "MRAP-001", modul: "atributivne" };
    const ncr = akcijaZaOperativniAlarm({ id: "nok_danas", nivo: "visok" }, ctx);
    expect(ncr.payload.id_deo).toBe("MRAP-001");
    const esk = akcijaZaOperativniAlarm({ id: "eskalacije_otvorene", nivo: "srednji" }, ctx);
    expect(esk.akcija).toBe(WORKFLOW_TIP.ESKALACIJE);
    expect(esk.payload.idDeo).toBe("MRAP-001");
    const kpi = akcijaZaOperativniAlarm({ id: "oee_nizak", nivo: "srednji" }, ctx);
    expect(kpi.payload.idDeo).toBe("MRAP-001");
  });

  it("kal_istekla vodi na merila/kalibraciju tab", () => {
    const atr = akcijaZaOperativniAlarm({ id: "kal_istekla", nivo: "visok" }, { modul: "atributivne" });
    expect(atr.akcija).toBe(WORKFLOW_TIP.KALIBRACIJA);
    expect(atr.label).toBe("Merila / kalibracija");
    expect(atr.payload.merilaPodtab).toBe("kalibracija");

    const mer = akcijaZaOperativniAlarm({ id: "kal_istekla", nivo: "visok" }, { modul: "merljive" });
    expect(mer.akcija).toBe(WORKFLOW_TIP.KALIBRACIJA);
  });

  it("msa_kasni vodi na MSA hub (merljive)", () => {
    const wf = akcijaZaOperativniAlarm({ id: "msa_kasni", nivo: "visok" });
    expect(wf.akcija).toBe(WORKFLOW_TIP.KALIBRACIJA);
    expect(wf.label).toBe("MSA / merila");
    expect(wf.payload.modul).toBe("merljive");
    expect(wf.payload.merilaPodtab).toBe("msa");
  });
});

describe("tabZaMerilaKalibraciju", () => {
  it("oba modula → MSA hub tab", () => {
    expect(tabZaMerilaKalibraciju("atributivne")).toBe("msa");
    expect(tabZaMerilaKalibraciju("merljive")).toBe("msa");
    expect(tabZaMerilaKalibraciju("varijabilne")).toBe("msa");
  });
});

describe("spoljna navigacija tab", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("čuva i čita tab sa NCR prefill-om", () => {
    sacuvajSpoljnuNavigacijuTab("ncr", { prefillNcr: { id_deo: "ABC" }, modul: "atributivne" });
    const nav = procitajSpoljnuNavigacijuTab("atributivne");
    expect(nav.tab).toBe("ncr");
    expect(nav.prefillNcr).toEqual({ id_deo: "ABC" });
    expect(sessionStorage.getItem("spc_tab_atr")).toBeNull();
  });
});
