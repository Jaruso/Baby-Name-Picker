import { describe, expect, it } from "vitest";
import type { Room } from "../types";
import { createRoomCode, matchIds, normalizeRoomCode, unmatchedLikeIds } from "./utils";

describe("room utilities", () => {
  it("normalizes invite codes", () => {
    expect(normalizeRoomCode(" ab-c 12! ")).toBe("ABC12");
  });

  it("creates six-character, unambiguous codes", () => {
    expect(createRoomCode(() => 0)).toBe("AAAAAA");
    expect(createRoomCode(() => 0.999)).toHaveLength(6);
  });

  it("only returns names liked by both members", () => {
    const room = {
      order: ["one", "two"],
      members: { a: { name: "A", joinedAt: 1 }, b: { name: "B", joinedAt: 1 } },
      decisions: {
        a: { one: "like", two: "like" },
        b: { one: "like", two: "pass" },
      },
    } as unknown as Room;

    expect(matchIds(room)).toEqual(["one"]);
  });

  it("lists only the current user's unmatched likes, newest first", () => {
    const room = {
      order: ["one", "two", "three"],
      members: { a: { name: "A", joinedAt: 1 }, b: { name: "B", joinedAt: 1 } },
      decisions: {
        a: { one: "like", two: "like", three: "like" },
        b: { one: "like", two: "pass" },
      },
    } as unknown as Room;

    expect(unmatchedLikeIds(room, "a")).toEqual(["three", "two"]);
    expect(unmatchedLikeIds(room, "b")).toEqual([]);
  });
});
