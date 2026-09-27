import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FounderPackCard } from "@/components/FounderPackCard";

type Skill = "explain" | "founder" | "kinship";

export function AnalystStudio({ ca }: { ca: string }) {
  const [skill, setSkill] = useState<Skill>("founder");
  const [model, setModel] = useState("llama3.1:8b");
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState("");
  const [err, setErr] = useState("");
  const { data } = useQuery<{ ok: boolean; models: string[]; reason?: string }>({
    queryKey: ["/api/analyst/models"],
  });
  const models = data?.models?.length ? data.models : ["llama3.1:8b", "llama3.2:3b", "gemma2:9b"];

  useEffect(() => {
    if (!models.includes(model) && models.length) setModel(models[0]);
  }, [models.join(",")]);

  async function run() {
    if (skill === "kinship") return;
    setBusy(true);
    setErr("");
    setVerdict("");
    try {
      const res = await fetch(`/api/token/${ca}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, skill }),
      });
      const json = await res.json();
      if (!json.ok) setErr(json.reason || json.error || "Analyze failed");
      else setVerdict(json.verdict || "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Analyst</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
            <option value="founder">Skill: Founder pack</option>
            <option value="explain">Skill: Explain holders</option>
            <option value="kinship">Skill: Kinship (soon)</option>
          </select>
          <select className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>Model: {m}</option>
            ))}
          </select>
          <Button disabled={busy || skill === "kinship"} onClick={run}>{busy ? "Running…" : "Run"}</Button>
        </div>
        {skill === "founder" && <FounderPackCard ca={ca} />}
        {skill === "explain" && <p className="text-sm text-muted-foreground">Sends holder and authority signals to the selected local model.</p>}
        {skill === "kinship" && <p className="text-sm text-muted-foreground">Kinship is a later worker (wallet graph). Not enabled on free Helius.</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {verdict && <div className="text-sm whitespace-pre-wrap border rounded-md p-3">{verdict}</div>}
      </CardContent>
    </Card>
  );
}
