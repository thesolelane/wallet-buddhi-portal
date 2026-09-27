const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");

export async function listOllamaModels(): Promise<{ ok: boolean; host: string; models: string[]; reason?: string }> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, host: OLLAMA_HOST, models: [], reason: `Ollama ${res.status} ${txt}`.trim() };
    }
    const json = (await res.json()) as { models?: { name?: string; model?: string }[] };
    const models = [...new Set((json.models || []).map((m) => m.name || m.model).filter(Boolean))] as string[];
    models.sort();
    return { ok: true, host: OLLAMA_HOST, models };
  } catch (error) {
    return {
      ok: false,
      host: OLLAMA_HOST,
      models: [],
      reason: error instanceof Error ? error.message : "unreachable",
    };
  }
}
