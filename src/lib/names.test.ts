import { describe, expect, it, vi } from "vitest";
import {
  ALLOWED_NAME_NATIONALITIES,
  buildNameApiUrl,
  fetchNameBatch,
  isAllowedEnglishName,
  NAME_BATCH_SIZE,
} from "./names";

describe("name API request", () => {
  it("only requests English-speaking Western national datasets", () => {
    const url = new URL(buildNameApiUrl("all", "Room42"));

    expect(url.pathname).toBe("/api/1.4/");
    expect(url.searchParams.get("nat")).toBe(ALLOWED_NAME_NATIONALITIES.join(","));
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.has("gender")).toBe(false);
  });

  it("preserves a selected gender filter", () => {
    const url = new URL(buildNameApiUrl("female", "Room42", 7));

    expect(url.searchParams.get("gender")).toBe("female");
    expect(url.searchParams.get("page")).toBe("7");
  });

  it("only accepts names from the curated English-language deck", () => {
    expect(isAllowedEnglishName("Charlotte")).toBe(true);
    expect(isAllowedEnglishName("William")).toBe(true);
    expect(isAllowedEnglishName("Miguel")).toBe(false);
    expect(isAllowedEnglishName("Noémie")).toBe(false);
    expect(isAllowedEnglishName("Arnaud")).toBe(false);
  });

  it("removes names already reviewed in the room from later batches", async () => {
    const originalFetch = globalThis.fetch;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };

    try {
      const first = await fetchNameBatch("female", "Room42");
      const second = await fetchNameBatch(
        "female",
        "Room42",
        first.nextPage,
        first.names.map(({ name }) => name),
      );

      expect(first.names).toHaveLength(NAME_BATCH_SIZE);
      expect(second.names).toHaveLength(NAME_BATCH_SIZE);
      expect(second.names.some(({ name }) => first.names.some((firstName) => firstName.name === name))).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      warning.mockRestore();
    }
  });
});
