import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, ExternalLink } from "lucide-react";

interface ProtectedToken {
  ca: string;
  name: string;
  symbol: string;
  twitterHandle: string | null;
  websiteDomain: string | null;
  addedAt: number;
  note?: string;
}

function shorten(addr: string, head = 6, tail = 4) {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

async function apiList(): Promise<ProtectedToken[]> {
  const r = await fetch("/api/protected-tokens");
  const j = await r.json();
  return j.tokens ?? [];
}

async function apiAdd(ca: string, note?: string): Promise<ProtectedToken | null> {
  const r = await fetch("/api/protected-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ca, note }),
  });
  if (!r.ok) return null;
  return await r.json();
}

async function apiRemove(ca: string): Promise<boolean> {
  const r = await fetch(`/api/protected-tokens/${ca}`, { method: "DELETE" });
  if (!r.ok) return false;
  const j = await r.json();
  return !!j.removed;
}

export function ProtectedTokens() {
  const [, navigate] = useLocation();
  const [list, setList] = useState<ProtectedToken[]>([]);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setList(await apiList());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    const ca = input.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) {
      setErr("Enter a valid Solana token address");
      return;
    }
    setBusy(true);
    setErr(null);
    const result = await apiAdd(ca);
    setBusy(false);
    if (!result) {
      setErr("Failed to add — check the server logs");
      return;
    }
    setInput("");
    await refresh();
  }

  async function handleRemove(ca: string) {
    await apiRemove(ca);
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Protected Tokens
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {list.length} registered · server-side
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Mark your canonical tokens here (e.g. real $CATH). Every token inspected in the portal is
          checked against this list — look-alikes using homoglyphs, punctuation, or cloned socials get
          flagged on their page.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Paste canonical token CA"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (err) setErr(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="font-mono text-sm"
          />
          <Button onClick={handleAdd} disabled={busy || !input.trim()}>
            <Plus className="w-4 h-4" /> Protect
          </Button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}

        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No protected tokens yet.</p>
        ) : (
          <div className="space-y-1.5">
            {list.map((t) => (
              <div
                key={t.ca}
                className="flex items-center gap-2 p-2 rounded-md border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {t.name || shorten(t.ca)}
                    </span>
                    {t.symbol && (
                      <span className="text-xs font-mono text-muted-foreground">${t.symbol}</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {shorten(t.ca, 8, 6)}
                    {t.twitterHandle && (
                      <span className="ml-2 text-muted-foreground">· @{t.twitterHandle}</span>
                    )}
                    {t.websiteDomain && (
                      <span className="ml-2 text-muted-foreground">· {t.websiteDomain}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/token/${t.ca}`)}
                  className="p-1 hover:text-foreground text-muted-foreground"
                  title="Open token page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(t.ca)}
                  className="p-1 hover:text-destructive text-muted-foreground"
                  title="Remove from protected list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
