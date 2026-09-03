import { describe, it, expect } from "vitest";
import { kontrolnaListaObavezna } from "../src/lib/kontrolaLista.js";

describe("kontrolna lista poka-yoke", () => {
  it("je uvek obavezna (nema soft bypass)", () => {
    expect(kontrolnaListaObavezna()).toBe(true);
  });
});
