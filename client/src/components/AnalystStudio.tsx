import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FounderPackCard } from "@/components/FounderPackCard";

type Skill = "explain" | "founder" | "kinship";

export function AnalystStudio({ ca, onAnalyze }: { ca: string; onAnalyze?: (model: string, skill: Skill) => void }) {
  const [skill, setSkill] = useState<Skill>("founder");
  const [model, setModel] = useState("llama3.1:8b");
  const { data } = useQuery<{ ok: boolean; models: string[]; reason?: string }>({
    queryKey: ["/api/analyst/models"],
  });
  const models = data?.models?.length ? data.models : ["llama3.1:8b", "llama3.2:3b", "gemma2:9b"];

  useEffect(() => {
    if (models.includes(model)) return;
    if (models.length) setModel(models[0]);
  }, [models.join(",")]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Analyst</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            value={skill}
            onChange={(e) => setSkill(e.target.value as Skill)}
          >
            <option value="founder">Skill: Founder pack</option>
            <option value="explain">Skill: Explain holders</option>
            <option value="kinship">Skill: Kinship (soon)</option>
          </select>
          <select
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                Model: {m}
              </option>
            ))}
          </select>
          <Button
            disabled={skill === "kinship"}
            onClick={() => onAnalyze?.(model, skill)}
          >
            Run
          </Button>
        </div>
        {skill === "founder" && <FounderPackCard ca={ca} />}
        {skill === "explain" && (
          <p className="text-sm text-muted-foreground">
            Uses holders and authorities. Click Run to send that JSON to the selected local model.
          </p>
        )}
        {skill === "kinship" && (
          <p className="text-sm text-muted-foreground">
            Kinship maps wallets that funded or co-bought this mint. Worker is not on free Helius yet.
          </p>
        )}
        {data?.ok === false && (
          <p className="text-xs text-muted-foreground">Model list: {data.reason || "Ollama unreachable"}</p>
        )}
      </CardContent>
    </Card>
  );
}
