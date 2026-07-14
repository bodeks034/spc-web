import { describe, it, expect } from "vitest";
import { sviKandidatiSlike } from "../src/lib/slikePaths.js";

describe("slikePaths", () => {
  it("mapira MRAP_SOP.jpg na lokalni dijagram vozila", () => {
    const { lokalni } = sviKandidatiSlike("atributivne", "MRAP_SOP.jpg", "MRAP-001");
    expect(lokalni).toContain("/vozilo/dijagrami/MRAP.png");
  });

  it("fallback po id_deo dodaje kandidate sa ekstenzijama", () => {
    const { lokalni } = sviKandidatiSlike("atributivne", "", "MRAP-001");
    expect(lokalni.some((p) => p.includes("MRAP-001"))).toBe(true);
  });
});
