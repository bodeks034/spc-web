import { describe, it, expect } from "vitest";
import { imaSadrzajPredajeSmene } from "../src/lib/smenaPogonaPregled.js";

describe("imaSadrzajPredajeSmene", () => {
  it("true kada ima merenja", () => {
    expect(imaSadrzajPredajeSmene({ imaPodatke: true, ukupno: { n: 10 } })).toBe(true);
  });

  it("true sa napomenom bez merenja", () => {
    expect(imaSadrzajPredajeSmene({ imaPodatke: false }, { napomena: "Zastoj na montaži" })).toBe(true);
  });

  it("true sa alarmima", () => {
    expect(imaSadrzajPredajeSmene({ alarmi: [{ id: 1 }] })).toBe(true);
  });

  it("false bez ikakvog sadržaja", () => {
    expect(imaSadrzajPredajeSmene({ imaPodatke: false })).toBe(false);
  });
});
