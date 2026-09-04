import { describe, expect, it } from "vitest";
import { parseActiveSession } from "./activeSession";

describe("saved room sessions", () => {
  it("accepts a valid room code and nickname", () => {
    expect(parseActiveSession({ code: "KC9QWY", nickname: "  Jordan  " })).toEqual({
      code: "KC9QWY",
      nickname: "Jordan",
    });
  });

  it("rejects malformed saved data", () => {
    expect(parseActiveSession({ code: "invalid", nickname: "Jordan" })).toBeNull();
    expect(parseActiveSession({ code: "KC9QWY", nickname: "" })).toBeNull();
    expect(parseActiveSession(null)).toBeNull();
  });
});
