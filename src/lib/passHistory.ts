export const PASS_HISTORY_LIMIT = 3;

export function rememberPass(history: string[], nameId: string): string[] {
  return [...history.filter((id) => id !== nameId), nameId].slice(-PASS_HISTORY_LIMIT);
}

export function forgetPass(history: string[], nameId: string): string[] {
  return history.filter((id) => id !== nameId);
}

export function latestAvailablePass(
  history: string[],
  isAvailable: (nameId: string) => boolean,
): string | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (isAvailable(history[index])) return history[index];
  }
  return undefined;
}
