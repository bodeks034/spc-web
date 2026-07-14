import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LicencaStatusPanel from "../src/components/LicencaStatusPanel.jsx";
import { TEME } from "../src/lib/teme.js";

const C = TEME.tamna;

describe("LicencaStatusPanel", () => {
  it("samoStatus prikazuje samo aktivnu licencu", () => {
    const html = renderToStaticMarkup(
      createElement(LicencaStatusPanel, { licenca: { ok: true }, C, samoStatus: true }),
    );
    expect(html).toContain('data-samo-status="1"');
    expect(html).toContain("Licenca: Aktivna");
    expect(html).not.toContain("Tenant");
    expect(html).not.toContain("MODULI");
  });

  it("samoStatus prikazuje offline grace", () => {
    const html = renderToStaticMarkup(
      createElement(LicencaStatusPanel, {
        licenca: { ok: true, offlineGrace: true },
        C,
        samoStatus: true,
      }),
    );
    expect(html).toContain("Keš (mreža nedostupna)");
  });
});
