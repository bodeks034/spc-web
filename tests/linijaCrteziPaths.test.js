import { describe, expect, it } from "vitest";
import {
  kodoviLinijaIzTipova,
  podrazumevaneLinije,
  putanjaLinijeRel,
  putanjaLinijeWeb,
} from "../src/lib/linijaCrteziPaths.js";

describe("linijaCrteziPaths", () => {
  it("podrazumevane linije 01-10", () => {
    const { vozila, proizvodi } = podrazumevaneLinije();
    expect(vozila).toHaveLength(10);
    expect(vozila[0]).toBe("VOZ-01");
    expect(proizvodi[9]).toBe("PRO-10");
  });

  it("putanja po kategoriji", () => {
    expect(putanjaLinijeRel("VOZ-03")).toBe("public/sifrarnik/linije/vozila/VOZ-03");
    expect(putanjaLinijeRel("PRO-01")).toBe("public/sifrarnik/linije/proizvodi/PRO-01");
    expect(putanjaLinijeRel("MRAP")).toBeNull();
  });

  it("web putanja za dijagram", () => {
    expect(putanjaLinijeWeb("VOZ-01", "dijagram", "silueta.png"))
      .toBe("/sifrarnik/linije/vozila/VOZ-01/dijagram/silueta.png");
  });

  it("kodovi iz tipova", () => {
    expect(kodoviLinijaIzTipova([
      { kod: "PRO-02" },
      { kod: "VOZ-01" },
      { kod: "MRAP" },
    ])).toEqual(["PRO-02", "VOZ-01"]);
  });
});
