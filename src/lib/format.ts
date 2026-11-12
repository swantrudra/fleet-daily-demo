/** Parses a user-typed number; returns null if empty/invalid. */
export function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Trims float noise: 6.199999 → 6.2 */
export function fmt(n: number, digits = 1): string {
  return Number(n.toFixed(digits)).toLocaleString("en-IN");
}
