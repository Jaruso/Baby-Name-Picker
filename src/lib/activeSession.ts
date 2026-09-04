export interface ActiveSession {
  code: string;
  nickname: string;
}

const ACTIVE_SESSION_KEY = "baby-name-picker-active-room";

export function parseActiveSession(value: unknown): ActiveSession | null {
  if (!value || typeof value !== "object") return null;
  const { code, nickname } = value as Record<string, unknown>;
  if (
    typeof code !== "string"
    || !/^[A-HJ-NP-Z2-9]{6}$/.test(code)
    || typeof nickname !== "string"
    || !nickname.trim()
    || nickname.length > 28
  ) return null;
  return { code, nickname: nickname.trim() };
}

export function readActiveSession(): ActiveSession | null {
  try {
    return parseActiveSession(JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function clearActiveSession(): void {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}
