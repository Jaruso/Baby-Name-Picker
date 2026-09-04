import type { NameFilter, NameOption } from "../types";

interface RandomUserResult {
  gender: "female" | "male";
  name: { first: string };
  nat: string;
}

export const ALLOWED_NAME_NATIONALITIES = ["us", "gb", "ie", "ca", "au", "nz"] as const;
export const NAME_BATCH_SIZE = 36;

const FALLBACK_FEMALE = [
  "Abigail", "Alice", "Amelia", "Anna", "Audrey", "Beatrice", "Beth", "Caroline", "Catherine", "Charlotte",
  "Clara", "Claire", "Eleanor", "Eliza", "Elizabeth", "Ella", "Emily", "Emma", "Evelyn", "Florence",
  "Georgia", "Grace", "Hannah", "Harriet", "Hazel", "Helen", "Holly", "Jane", "Julia", "Lucy",
  "Madeline", "Margaret", "Nora", "Olivia", "Rose", "Ruby", "Sophie", "Victoria", "Violet", "Willa",
  "Ada", "Adelaide", "Alexandra", "Alexis", "Alison", "Alyssa", "Annabelle", "Anne", "April", "Arabella",
  "Ashley", "Aubrey", "Autumn", "Ava", "Bella", "Bethany", "Brianna", "Brooke", "Camilla", "Cara",
  "Cecilia", "Celia", "Chloe", "Christina", "Cora", "Daisy", "Daphne", "Delilah", "Diana", "Dorothy",
  "Edith", "Elise", "Ellen", "Elsie", "Erin", "Esther", "Eva", "Faith", "Felicity", "Fiona",
  "Freya", "Gabrielle", "Genevieve", "Gillian", "Gwen", "Hailey", "Heather", "Heidi", "Iris", "Isabel",
  "Isabella", "Isla", "Jasmine", "Jennifer", "Jessica", "Joanna", "Josephine", "Joy", "Katherine", "Kayla",
  "Keira", "Laura", "Lauren", "Leah", "Lila", "Lillian", "Lily", "Louisa", "Louise", "Lydia",
  "Mabel", "Maeve", "Maria", "Martha", "Mary", "Matilda", "Maya", "Megan", "Mia", "Molly",
  "Natalie", "Nicole", "Paige", "Penelope", "Phoebe", "Rachel", "Rebecca", "Ruth", "Sadie", "Sarah",
  "Scarlett", "Stella", "Summer", "Susan", "Sylvia", "Tessa", "Thea", "Valerie", "Vivian", "Zoe",
];

const FALLBACK_MALE = [
  "Adam", "Andrew", "Arthur", "Benjamin", "Charles", "Christopher", "Daniel", "Edward", "Elias", "Elliot",
  "Ethan", "Finn", "Frederick", "George", "Henry", "Hugh", "Jack", "James", "John", "Joseph",
  "Julian", "Leo", "Liam", "Louis", "Luke", "Matthew", "Miles", "Nathan", "Nicholas", "Noah",
  "Oliver", "Oscar", "Owen", "Peter", "Samuel", "Simon", "Theodore", "Thomas", "William", "Wyatt",
  "Aaron", "Adrian", "Albert", "Alexander", "Alfred", "Alistair", "Anthony", "Archie", "Asher", "Austin",
  "Blake", "Bradley", "Brandon", "Caleb", "Callum", "Cameron", "Carl", "Cedric", "Christian", "Colin",
  "Connor", "Damian", "David", "Dean", "Dominic", "Douglas", "Dylan", "Edmund", "Edwin", "Emmett",
  "Eric", "Evan", "Felix", "Francis", "Franklin", "Gabriel", "Gavin", "Graham", "Grant", "Gregory",
  "Hamish", "Harrison", "Harvey", "Howard", "Ian", "Isaac", "Jacob", "Jason", "Jasper", "Jonathan",
  "Joshua", "Kenneth", "Laurence", "Leonard", "Lewis", "Logan", "Marcus", "Mark", "Martin", "Maxwell",
  "Michael", "Morgan", "Neil", "Patrick", "Paul", "Philip", "Quentin", "Raymond", "Reuben", "Richard",
  "Robert", "Robin", "Roger", "Rory", "Rupert", "Ryan", "Scott", "Sebastian", "Seth", "Spencer",
  "Stephen", "Tobias", "Tristan", "Victor", "Vincent", "Walter", "Wesley", "Wilfred", "Xavier", "Zachary",
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
    .map(({ name, gender, origin }) => ({
      id: `n-${name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")}`,
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

  const mixed: Array<{ name: string; gender: "female" | "male"; origin: string }> = [];
  for (let index = 0; index < Math.max(female.length, male.length); index += 1) {
    if (female[index]) mixed.push(female[index]);
    if (male[index]) mixed.push(male[index]);
  }
  return toOptions(mixed);
}

export interface NameBatch {
  names: NameOption[];
  source: "randomuser" | "fallback";
  nextPage: number;
  exhausted: boolean;
}

export async function fetchNameBatch(
  filter: NameFilter,
  seed: string,
  page = 1,
  excludedNames: Iterable<string> = [],
): Promise<NameBatch> {
  const excluded = new Set(Array.from(excludedNames, (name) => name.toLocaleLowerCase()));
  const availableFallbacks = fallbackNames(filter).filter(
    ({ name }) => !excluded.has(name.toLocaleLowerCase()),
  );
  const apiUrl = buildNameApiUrl(filter, seed, page);

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
    ).filter(({ name }) => !excluded.has(name.toLocaleLowerCase()));
    const apiNameSet = new Set(apiNames.map((name) => name.name.toLocaleLowerCase()));
    const fillNames = availableFallbacks.filter(
      (name) => !apiNameSet.has(name.name.toLocaleLowerCase()),
    );
    const names = [...apiNames, ...fillNames].slice(0, NAME_BATCH_SIZE);
    return {
      names,
      source: apiNames.length ? "randomuser" : "fallback",
      nextPage: page + 1,
      exhausted: names.length === 0,
    };
  } catch (error) {
    console.warn("Using the built-in name collection because the public API was unavailable.", error);
    const names = availableFallbacks.slice(0, NAME_BATCH_SIZE);
    return { names, source: "fallback", nextPage: page + 1, exhausted: names.length === 0 };
  }
}

export function buildNameApiUrl(filter: NameFilter, seed: string, page = 1): string {
  const query = new URLSearchParams({
    results: "500",
    inc: "name,gender,nat",
    noinfo: "",
    seed: seed.toLocaleLowerCase(),
    page: String(page),
    nat: ALLOWED_NAME_NATIONALITIES.join(","),
  });
  if (filter !== "all") query.set("gender", filter);
  return `https://randomuser.me/api/1.4/?${query.toString()}`;
}

export function isAllowedEnglishName(name: string): boolean {
  return ENGLISH_NAME_ALLOWLIST.has(name.toLocaleLowerCase());
}
