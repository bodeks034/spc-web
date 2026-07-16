import { describe, it, expect } from "vitest";
import { jeMreznaGreska, jeDupliClientId } from "../src/lib/dbGreske.js";
import { stampajClientIdNaRedove, noviClientId } from "../src/lib/offlineQueue.js";
import { validanPinFormat } from "../src/lib/tabletPin.js";

describe("jeMreznaGreska", () => {
  it("prepoznaje Failed to fetch", () => {
    expect(jeMreznaGreska({ message: "Failed to fetch" })).toBe(true);
  });
  it("ne tretira constraint grešku kao mrežu", () => {
    expect(jeMreznaGreska({ message: "duplicate key value violates unique constraint" })).toBe(false);
  });
  it("TypeError je mrežna", () => {
    expect(jeMreznaGreska(Object.assign(new TypeError("fetch failed"), { message: "fetch failed" }))).toBe(true);
  });
});

describe("jeDupliClientId", () => {
  it("prepoznaje dupli client_id", () => {
    expect(jeDupliClientId({ message: "duplicate key value violates unique constraint \"kontrolni_log_client_id_uidx\"" })).toBe(true);
  });
});

describe("stampajClientIdNaRedove", () => {
  it("dodaje client_id i čuva postojeći", () => {
    const fixed = noviClientId();
    const out = stampajClientIdNaRedove([{ a: 1 }, { a: 2, client_id: fixed }]);
    expect(out[0].client_id).toBeTruthy();
    expect(out[1].client_id).toBe(fixed);
  });
});

describe("validanPinFormat", () => {
  it("prihvata 4–6 cifara", () => {
    expect(validanPinFormat("1234")).toBe(true);
    expect(validanPinFormat("123456")).toBe(true);
    expect(validanPinFormat("12")).toBe(false);
    expect(validanPinFormat("abcd")).toBe(false);
  });
});
