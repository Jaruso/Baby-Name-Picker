import type { Room } from "../types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode(random = Math.random): string {
  return Array.from({ length: 6 }, () =>
    CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)],
  ).join("");
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function matchIds(room: Room): string[] {
  const memberIds = Object.keys(room.members ?? {});
  if (memberIds.length < 2) return [];

  return room.order.filter((nameId) =>
    memberIds.every((memberId) => room.decisions?.[memberId]?.[nameId] === "like"),
  );
}

export function originLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function inviteUrl(code: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", code);
  return url.toString();
}
