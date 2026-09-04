import { describe, expect, it } from "vitest";
import type { Room } from "../types";
import { enabledStyleOptions, nameOptionsForStyle } from "./nameStyles";
import { roomName, roomNameIds } from "./utils";

describe("name styles", () => {
  it("provides a substantial, filter-aware bundled collection", () => {
    expect(nameOptionsForStyle("modern", "all").length).toBeGreaterThan(80);
    expect(nameOptionsForStyle("french", "female").every(({ gender }) => gender === "female")).toBe(true);
    expect(nameOptionsForStyle("nordic", "male").every(({ gender }) => gender === "male")).toBe(true);
  });

  it("adds enabled styles after the room deck without repeating an existing name", () => {
    const room = {
      filter: "all",
      order: ["n-juniper"],
      names: { "n-juniper": { id: "n-juniper", name: "Juniper", gender: "female", origin: "US" } },
      styles: { modern: true },
    } as unknown as Room;

    const styleNames = enabledStyleOptions(room);
    const ids = roomNameIds(room);

    expect(styleNames.some(({ name }) => name === "Juniper")).toBe(false);
    expect(ids).toContain("n-juniper");
    expect(ids.some((id) => id.startsWith("style-modern-"))).toBe(true);
    expect(roomName(room, ids.find((id) => id.startsWith("style-modern-")) ?? "")?.name).toBeTruthy();
  });
});
