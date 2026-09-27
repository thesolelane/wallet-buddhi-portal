export function isBaitName(name?: string | null, symbol?: string | null): boolean {
  const text = `${name || ""} ${symbol || ""}`.toLowerCase();
  if (!text.trim()) return false;
  return (
    text.includes("http") ||
    text.includes("www.") ||
    text.includes(".io") ||
    text.includes("buy and sell") ||
    text.includes("airdrop") ||
    text.includes("claim") ||
    text.includes("|") ||
    text.length > 48
  );
}

export function shortTokenLabel(name?: string | null, symbol?: string | null, mint?: string) {
  const symbolText = (symbol || "").trim();
  if (symbolText && symbolText.length <= 16 && !isBaitName(null, symbolText)) return symbolText;
  const nameText = (name || "").trim();
  if (nameText && nameText.length <= 24 && !isBaitName(nameText, null)) return nameText;
  if (mint && mint.length > 8) return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  return nameText.slice(0, 24) || "token";
}

export function splitHoldings<T extends { amount: number; name?: string | null; symbol?: string | null }>(
  rows: T[],
) {
  const notable: T[] = [];
  const dust: T[] = [];
  const largest = Math.max(0, ...rows.map((r) => Number(r.amount) || 0));
  const floor = largest > 0 ? Math.max(25, largest * 0.002) : 25;
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const bait = isBaitName(row.name, row.symbol);
    if (bait || amount <= floor) dust.push(row);
    else notable.push(row);
  }
  if (notable.length === 0 && rows.length) {
    return { notable: rows.slice(0, 6), dust: rows.slice(6), baitCount: rows.filter((r) => isBaitName(r.name, r.symbol)).length };
  }
  return {
    notable,
    dust,
    baitCount: dust.filter((r) => isBaitName(r.name, r.symbol)).length,
  };
}
