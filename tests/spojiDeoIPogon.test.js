import { describe, it, expect } from "vitest";
import { spojiDeoIPogon } from "../src/lib/deloviAtributivni.js";

describe("spojiDeoIPogon", () => {
  it("uzima pun naziv iz šifrarnika, ne kraći naziv pogona", () => {
    const deo = spojiDeoIPogon(
      { id_deo: "5502-A", naziv_dela: "Osovina prednja", linija_id: 1, linija: { id: 1, linija: "L1" } },
      { id_deo: "5502-A", pogon_kod: "G", naziv_dela: "Osovina", linija_id: "1" },
    );
    expect(deo.naziv_dela).toBe("Osovina prednja");
    expect(deo.linija).toEqual({ id: 1, linija: "L1" });
  });

  it("pada na naziv pogona kad šifrarnik nema ime", () => {
    const deo = spojiDeoIPogon(
      { id_deo: "5502-A", naziv_dela: "5502-A" },
      { naziv_dela: "Osovina" },
    );
    expect(deo.naziv_dela).toBe("Osovina");
  });
});
