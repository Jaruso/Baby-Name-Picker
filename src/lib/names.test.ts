import { describe, expect, it } from "vitest";
import { ALLOWED_NAME_NATIONALITIES, buildNameApiUrl, isAllowedEnglishName } from "./names";

describe("name API request", () => {
  it("only requests English-speaking Western national datasets", () => {
    const url = new URL(buildNameApiUrl("all", "Room42"));

    expect(url.pathname).toBe("/api/1.4/");
    expect(url.searchParams.get("nat")).toBe(ALLOWED_NAME_NATIONALITIES.join(","));
    expect(url.searchParams.has("gender")).toBe(false);
  });

  it("preserves a selected gender filter", () => {
    const url = new URL(buildNameApiUrl("female", "Room42"));

    expect(url.searchParams.get("gender")).toBe("female");
  });

  it("only accepts names from the curated English-language deck", () => {
    expect(isAllowedEnglishName("Charlotte")).toBe(true);
    expect(isAllowedEnglishName("William")).toBe(true);
    expect(isAllowedEnglishName("Miguel")).toBe(false);
    expect(isAllowedEnglishName("Noémie")).toBe(false);
    expect(isAllowedEnglishName("Arnaud")).toBe(false);
  });
});
