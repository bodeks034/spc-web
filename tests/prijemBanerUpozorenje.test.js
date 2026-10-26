import { describe, it, expect } from "vitest";
import { prijemBanerUpozorenje } from "../src/components/PrijemMerenjeKontekst.jsx";

describe("prijemBanerUpozorenje", () => {
  it("ćuti dok deo ili pogon nisu izabrani", () => {
    expect(prijemBanerUpozorenje({ idDeo: "", idDeoPrijema: "5502-A", pogonKod: "" })).toBeNull();
    expect(prijemBanerUpozorenje({ idDeo: "5502-A", idDeoPrijema: "5502-A", pogonKod: "" })).toBeNull();
    expect(prijemBanerUpozorenje({ idDeo: "5502-A", idDeoPrijema: "5502-A", pogonKod: "A" })).toBeNull();
  });

  it("traži ulaznu kontrolu samo kad je deo isti, a pogon nije A", () => {
    expect(prijemBanerUpozorenje({ idDeo: "5502-A", idDeoPrijema: "5502-A", pogonKod: "G" })).toBe("pogon");
  });

  it("javlja tuđi deo", () => {
    expect(prijemBanerUpozorenje({ idDeo: "NT-001", idDeoPrijema: "5502-A", pogonKod: "A" })).toBe("id");
  });
});
