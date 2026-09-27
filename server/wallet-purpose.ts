export type WalletPurpose = "mine" | "research";

const MINE = "[mine]";
const RESEARCH = "[research]";

export function parsePurpose(label?: string | null): WalletPurpose {
  const value = (label || "").trim().toLowerCase();
  if (value.startsWith(MINE)) return "mine";
  return "research";
}

export function parseDisplayLabel(label?: string | null): string {
  return (label || "")
    .replace(/^\[mine\]\s*/i, "")
    .replace(/^\[research\]\s*/i, "")
    .trim();
}

export function formatWatchLabel(purpose: WalletPurpose, label?: string | null): string {
  const name = parseDisplayLabel(label);
  const tag = purpose === "mine" ? MINE : RESEARCH;
  return name ? `${tag} ${name}` : tag;
}
