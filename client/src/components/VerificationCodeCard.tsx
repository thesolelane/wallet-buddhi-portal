import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Copy, Check, RefreshCw } from "lucide-react";
import { useWallet } from "@/lib/wallet-context-new";

function formatCountdown(secs: number): string {
  if (secs <= 0) return "expired";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VerificationCodeCard() {
  const { address } = useWallet();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secsLeft, setSecsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    const update = () => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecsLeft(left);
      if (left <= 0 && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    update();
    tickRef.current = setInterval(update, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [expiresAt]);

  async function generate() {
    if (!address) {
      setErr("Connect your wallet first");
      return;
    }
    setBusy(true);
    setErr(null);
    setCopied(false);
    try {
      const r = await fetch("/api/verification/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Failed to generate code");
      } else {
        setCode(j.code);
        setExpiresAt(new Date(j.expiresAt));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Could not copy to clipboard");
    }
  }

  const expired = code !== null && secsLeft <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Mobile App Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate a one-time code to link this wallet to the Wallet Buddhi mobile app.
          Codes expire after 10 minutes and can only be used once.
        </p>

        {code && !expired && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
            <div className="text-center font-mono text-4xl font-bold tracking-widest text-primary">
              {code}
            </div>
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Expires in {formatCountdown(secsLeft)}
            </div>
          </div>
        )}

        {code && expired && (
          <div className="rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-warning-foreground">
            Code expired. Generate a new one below.
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={generate}
            disabled={busy || !address}
            className="hover-elevate active-elevate-2"
            data-testid="button-generate-verification-code"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} />
            {code ? "Generate new code" : "Generate code"}
          </Button>
          {code && !expired && (
            <Button
              variant="outline"
              onClick={copyCode}
              data-testid="button-copy-verification-code"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </>
              )}
            </Button>
          )}
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}
      </CardContent>
    </Card>
  );
}
