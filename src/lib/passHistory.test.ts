import { describe, expect, it } from "vitest";
import { forgetPass, latestAvailablePass, rememberPass } from "./passHistory";

describe("recent pass history", () => {
  it("keeps only the three most recent unique passes", () => {
    let history: string[] = [];
    history = rememberPass(history, "one");
    history = rememberPass(history, "two");
    history = rememberPass(history, "three");
    history = rememberPass(history, "four");

    expect(history).toEqual(["two", "three", "four"]);
    expect(rememberPass(history, "three")).toEqual(["two", "four", "three"]);
  });

  it("finds the newest pass that still exists in the room decisions", () => {
    expect(latestAvailablePass(["one", "two", "three"], (id) => id !== "three")).toBe("two");
  });

  it("removes an undone pass from history", () => {
    expect(forgetPass(["one", "two", "three"], "two")).toEqual(["one", "three"]);
  });
});
