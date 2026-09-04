export type NameFilter = "all" | "female" | "male";
export type Choice = "like" | "pass";

export interface NameOption {
  id: string;
  name: string;
  gender: "female" | "male";
  origin: string;
}

export interface Member {
  name: string;
  joinedAt: number;
}

export interface Room {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  filter: NameFilter;
  source: "randomuser" | "fallback";
  names: Record<string, NameOption>;
  order: string[];
  nextPage?: number;
  exhausted?: boolean;
  members: Record<string, Member>;
  presence?: Record<string, boolean>;
  decisions?: Record<string, Record<string, Choice>>;
}
