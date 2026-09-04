import type { NameFilter, NameOption } from "../types";

interface RandomUserResult {
  gender: "female" | "male";
  name: { first: string };
  nat: string;
}

const FALLBACK_FEMALE = [
  "Ada", "Alba", "Alice", "Amara", "Anya", "Celia", "Clara", "Dahlia", "Eden", "Eliza",
  "Eloise", "Esme", "Eva", "Flora", "Freya", "Georgia", "Hazel", "Iris", "Isla", "June",
  "Kaia", "Lena", "Lila", "Lucy", "Maeve", "Mara", "Maya", "Mina", "Nora", "Olive",
  "Opal", "Phoebe", "Romy", "Ruby", "Sadie", "Thea", "Vera", "Willa", "Zara", "Zoe",
];

const FALLBACK_MALE = [
  "Adrian", "August", "Caleb", "Callum", "Cassian", "Cian", "Eli", "Emil", "Ezra", "Felix",
  "Finn", "Hugo", "Idris", "Ira", "Jasper", "Jonah", "Jude", "Julian", "Kit", "Leo",
  "Levi", "Luca", "Mateo", "Max", "Miles", "Milo", "Nico", "Noah", "Oliver", "Orson",
  "Oscar", "Otis", "Remy", "Rhys", "Rowan", "Silas", "Theo", "Tobias", "Wes", "Wyatt",
];

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
  const query = new URLSearchParams({
    results: "80",
    inc: "name,gender,nat",
    noinfo: "",
    seed: seed.toLocaleLowerCase(),
  });
  if (filter !== "all") query.set("gender", filter);

  try {
    const response = await fetch(`https://randomuser.me/api/?${query.toString()}`);
    if (!response.ok) throw new Error(`Name API returned ${response.status}`);
    const payload = (await response.json()) as { results?: RandomUserResult[] };
    const results = payload.results ?? [];
    const names = toOptions(
      results.map((person) => ({
        name: person.name.first,
        gender: person.gender,
        origin: person.nat,
      })),
    ).slice(0, 60);
    if (names.length < 24) throw new Error("Name API returned too few unique names");
    return { names, source: "randomuser" };
  } catch (error) {
    console.warn("Using the built-in name deck because the public API was unavailable.", error);
    return { names: fallbackNames(filter), source: "fallback" };
  }
}
