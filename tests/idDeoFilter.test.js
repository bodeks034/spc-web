import { describe, it, expect } from "vitest";
import { odgovaraFilteruIdDeo } from "../src/lib/idDeoUtil.js";

const demo = {
  id_deo: "DEMO-5502",
  radni_nalog: "RN-2026-DEMO5502-A",
  naziv_dela: "Nosač motora (demo)",
};

describe("filter punog ID dela", () => {
  it("pun ID ne hvata tuđi RN koji sadrži isti niz", () => {
    expect(odgovaraFilteruIdDeo(
      demo.id_deo,
      "5502-A",
      [demo.radni_nalog, demo.naziv_dela],
    )).toBe(false);
  });

  it("pun ID hvata samo isti id_deo", () => {
    expect(odgovaraFilteruIdDeo("5502-A", "5502-a", [demo.radni_nalog])).toBe(true);
    expect(odgovaraFilteruIdDeo(demo.id_deo, "DEMO-5502", [])).toBe(true);
  });

  it("kraći upit i dalje traži podstring u RN i nazivu", () => {
    expect(odgovaraFilteruIdDeo(demo.id_deo, "nosač", [demo.naziv_dela])).toBe(true);
    expect(odgovaraFilteruIdDeo(demo.id_deo, "5502", [demo.radni_nalog])).toBe(true);
  });
});
