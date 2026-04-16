import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Trash2, ExternalLink } from "lucide-react";
import { getWatchlist, removeFromWatchlist, type WatchEntry } from "@/lib/watchlist";

function shorten(addr: string, head = 6, tail = 4) {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function WatchedTokens() {
  const [, navigate] = useLocation();
  const [list, setList] = useState<WatchEntry[]>(getWatchlist());

  useEffect(() => {
    const refresh = () => setList(getWatchlist());
    window.addEventListener("wbuddhi:watchlist-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("wbuddhi:watchlist-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Watched Tokens
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {list.length} saved · stored locally
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No watched tokens yet. Open any token page and click "Watch" to save it here.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((w) => (
              <div
                key={w.ca}
                className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50"
              >
                <button
                  onClick={() => navigate(`/token/${w.ca}`)}
                  className="flex-1 text-left font-mono text-sm hover:text-primary"
                  title={w.ca}
                >
                  {shorten(w.ca, 8, 6)}
                </button>
                <span className="text-xs text-muted-foreground">added {timeAgo(w.addedAt)}</span>
                <button
                  onClick={() => navigate(`/token/${w.ca}`)}
                  className="p-1 hover:text-foreground text-muted-foreground"
                  title="Open token page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeFromWatchlist(w.ca)}
                  className="p-1 hover:text-destructive text-muted-foreground"
                  title="Remove from watchlist"
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
