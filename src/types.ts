export type NameFilter = "all" | "female" | "male";
export type Choice = "like" | "pass";

export interface NameOption {
  id: string;
  name: string;
  gender: "female" | "male" | "custom";
  origin: string;
}

export interface CustomSuggestion extends NameOption {
  gender: "custom";
  origin: "CUSTOM";
  submittedBy: string;
  createdAt: number;
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
  suggestions?: Record<string, CustomSuggestion>;
  order: string[];
  nextPage?: number;
  exhausted?: boolean;
  members: Record<string, Member>;
  presence?: Record<string, boolean>;
  decisions?: Record<string, Record<string, Choice>>;
}
