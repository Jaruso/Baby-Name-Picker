import type { NameFilter, NameOption } from "../types";

interface RandomUserResult {
  gender: "female" | "male";
  name: { first: string };
  nat: string;
}

export const ALLOWED_NAME_NATIONALITIES = ["us", "gb", "ie", "ca", "au", "nz"] as const;

const FALLBACK_FEMALE = [
  "Abigail", "Alice", "Amelia", "Anna", "Audrey", "Beatrice", "Beth", "Caroline", "Catherine", "Charlotte",
  "Clara", "Claire", "Eleanor", "Eliza", "Elizabeth", "Ella", "Emily", "Emma", "Evelyn", "Florence",
  "Georgia", "Grace", "Hannah", "Harriet", "Hazel", "Helen", "Holly", "Jane", "Julia", "Lucy",
  "Madeline", "Margaret", "Nora", "Olivia", "Rose", "Ruby", "Sophie", "Victoria", "Violet", "Willa",
];

const FALLBACK_MALE = [
  "Adam", "Andrew", "Arthur", "Benjamin", "Charles", "Christopher", "Daniel", "Edward", "Elias", "Elliot",
  "Ethan", "Finn", "Frederick", "George", "Henry", "Hugh", "Jack", "James", "John", "Joseph",
  "Julian", "Leo", "Liam", "Louis", "Luke", "Matthew", "Miles", "Nathan", "Nicholas", "Noah",
  "Oliver", "Oscar", "Owen", "Peter", "Samuel", "Simon", "Theodore", "Thomas", "William", "Wyatt",
];

const ENGLISH_NAME_ALLOWLIST = new Set(
  [...FALLBACK_FEMALE, ...FALLBACK_MALE].map((name) => name.toLocaleLowerCase()),
);

function toOptions(
  values: Array<{ name: string; gender: "female" | "male"; origin: string }>,
): NameOption[] {
  const seen = new Set<string>();
  return values
    .filter(({ name }) => {
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ name, gender, origin }, index) => ({
      id: `n-${index}-${name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")}`,
      name,
      gender,
      origin,
    }));
}

function fallbackNames(filter: NameFilter): NameOption[] {
  const female = FALLBACK_FEMALE.map((name) => ({ name, gender: "female" as const, origin: "US" }));
  const male = FALLBACK_MALE.map((name) => ({ name, gender: "male" as const, origin: "US" }));
  if (filter === "female") return toOptions(female);
  if (filter === "male") return toOptions(male);

  const mixed = female.flatMap((value, index) => [value, male[index]]);
  return toOptions(mixed).slice(0, 60);
}

export async function fetchNameDeck(
  filter: NameFilter,
  seed: string,
): Promise<{ names: NameOption[]; source: "randomuser" | "fallback" }> {
  const apiUrl = buildNameApiUrl(filter, seed);

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Name API returned ${response.status}`);
    const payload = (await response.json()) as { results?: RandomUserResult[] };
    const allowedNationalities = new Set(ALLOWED_NAME_NATIONALITIES.map((code) => code.toUpperCase()));
    const results = (payload.results ?? []).filter(
      (person) => allowedNationalities.has(person.nat) && isAllowedEnglishName(person.name.first),
    );
    const apiNames = toOptions(
      results.map((person) => ({
        name: person.name.first,
        gender: person.gender,
        origin: person.nat,
      })),
    );
    const apiNameSet = new Set(apiNames.map((name) => name.name.toLocaleLowerCase()));
    const fillNames = fallbackNames(filter).filter(
      (name) => !apiNameSet.has(name.name.toLocaleLowerCase()),
    );
    const limit = filter === "all" ? 60 : 40;
    return {
      names: [...apiNames, ...fillNames].slice(0, limit),
      source: apiNames.length ? "randomuser" : "fallback",
    };
  } catch (error) {
    console.warn("Using the built-in name deck because the public API was unavailable.", error);
    return { names: fallbackNames(filter), source: "fallback" };
  }
}

export function buildNameApiUrl(filter: NameFilter, seed: string): string {
  const query = new URLSearchParams({
    results: "500",
    inc: "name,gender,nat",
    noinfo: "",
    seed: seed.toLocaleLowerCase(),
    nat: ALLOWED_NAME_NATIONALITIES.join(","),
  });
  if (filter !== "all") query.set("gender", filter);
  return `https://randomuser.me/api/1.4/?${query.toString()}`;
}

export function isAllowedEnglishName(name: string): boolean {
  return ENGLISH_NAME_ALLOWLIST.has(name.toLocaleLowerCase());
}
