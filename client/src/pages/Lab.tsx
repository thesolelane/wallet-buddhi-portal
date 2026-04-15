import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Send } from "lucide-react";

interface HealthResp {
  ok: boolean;
  reason?: string;
  models?: string[];
}

interface CompleteResp {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export default function Lab() {
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [model, setModel] = useState("llama3.1:8b");
  const [prompt, setPrompt] = useState(
    "You are a Solana on-chain analyst. In 3 bullet points, explain what makes a wallet look like a sniper.",
  );
  const [response, setResponse] = useState<CompleteResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/llm/ollama/health")
      .then((r) => r.json())
      .then((h) => !cancelled && setHealth(h))
      .catch((e) => !cancelled && setHealth({ ok: false, reason: String(e) }));
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    setBusy(true);
    setErr(null);
    setResponse(null);
    try {
      const res = await fetch("/api/llm/ollama/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setResponse(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">LLM Lab</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test local Ollama models against portal-relevant prompts. No cloud calls, no cost.
          </p>
        </div>

        {/* Health */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Ollama Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!health && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </div>
            )}
            {health && health.ok && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </div>
                {health.models && health.models.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {health.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => setModel(m)}
                        className={`font-mono text-xs px-2 py-1 rounded-md border ${
                          model === m ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {(!health.models || health.models.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    No models pulled yet. On the Ollama host run: <code>ollama pull llama3.1:8b</code>
                  </p>
                )}
              </div>
            )}
            {health && !health.ok && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" /> Unreachable
                </div>
                <p className="text-xs text-muted-foreground">{health.reason}</p>
                <p className="text-xs text-muted-foreground">
                  Set <code>OLLAMA_HOST</code> in <code>.env</code> (default{" "}
                  <code>http://localhost:11434</code>).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="model name (e.g. llama3.1:8b)"
                className="font-mono text-sm"
              />
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button onClick={run} disabled={busy || !health?.ok}>
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </Button>
              {err && <span className="text-xs text-destructive">{err}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Response */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Response
                <div className="ml-auto flex gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono">
                    {response.model}
                  </Badge>
                  <Badge variant="secondary">{response.latencyMs} ms</Badge>
                  {response.completionTokens !== undefined && (
                    <Badge variant="secondary">{response.completionTokens} tok</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm font-sans">{response.content}</pre>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
