import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { guestHeaders } from "@/lib/guest-id";
import { Eye, EyeOff } from "lucide-react";

type Slot = { mint: string; symbol?: string | null; name?: string | null };

export function WatchTokenButton({
  mint,
  symbol,
  name,
}: {
  mint: string;
  symbol?: string | null;
  name?: string | null;
}) {
  const { toast } = useToast();
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState(2);
  const [count, setCount] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picking, setPicking] = useState(false);

  function labelOf(t: Slot) {
    return t.symbol || t.name || `${t.mint.slice(0, 4)}…`;
  }

  async function refresh() {
    try {
      const res = await apiRequest("GET", "/api/tokens/watched-guest");
      const data = await res.json();
      const list = (data.tokens || []) as Slot[];
      setSlots(list);
      setCap(data.cap ?? 2);
      setCount(data.count ?? list.length);
      setWatched(list.some((t) => t.mint === mint));
    } catch {
      /* stay */
    }
  }

  useEffect(() => {
    void refresh();
  }, [mint]);

  async function save(replaceMint?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/tokens/watched-guest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...guestHeaders() },
        body: JSON.stringify({
          mint,
          symbol: symbol || undefined,
          name: name || undefined,
          replaceMint,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setSlots(body.tokens || slots);
        setPicking(true);
        setCount(cap);
        return;
      }
      if (!res.ok) throw new Error(body.error || "Could not watch token");
      setWatched(true);
      setPicking(false);
      await refresh();
    } catch (error) {
      toast({
        title: "Watch token",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    if (watched) {
      setBusy(true);
      try {
        await apiRequest("DELETE", `/api/tokens/watched-guest/${mint}`);
        setWatched(false);
        setPicking(false);
        await refresh();
      } catch (error) {
        toast({
          title: "Watch token",
          description: error instanceof Error ? error.message : "Failed",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
      return;
    }
    if (count >= cap) {
      setPicking(true);
      return;
    }
    await save();
  }

  return (
    <div className="space-y-2">
      <Button variant={watched ? "secondary" : "default"} size="sm" onClick={() => void toggle()} disabled={busy}>
        {watched ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
        {watched ? "Watching" : "Watch token"}
        <span className="ml-2 text-xs opacity-80">
          {count}/{cap}
        </span>
      </Button>
      {picking && !watched && (
        <div className="text-xs space-y-1">
          <p className="text-muted-foreground">Free plan is full. Replace one:</p>
          {slots.map((t) => (
            <Button
              key={t.mint}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void save(t.mint)}
            >
              Replace {labelOf(t)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
