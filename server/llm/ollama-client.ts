// Ollama LLM provider — Phase G
// Talks to a local or LAN Ollama instance via its HTTP API.
// Docs: https://github.com/ollama/ollama/blob/main/docs/api.md

import type { LlmProvider, LlmRequest, LlmResponse } from "./provider";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

interface OllamaTag {
  name: string;
  size?: number;
  modified_at?: string;
}

interface OllamaChatResponse {
  message?: { role: string; content: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
  error?: string;
}

async function safeFetch(path: string, init?: RequestInit) {
  const url = `${OLLAMA_HOST}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${txt || res.statusText}`);
  }
  return res;
}

export const ollamaProvider: LlmProvider = {
  name: "ollama",

  async health() {
    try {
      const res = await safeFetch("/api/tags");
      const json = (await res.json()) as { models?: OllamaTag[] };
      return {
        ok: true,
        models: (json.models ?? []).map((m) => m.name),
      };
    } catch (e) {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "unreachable",
      };
    }
  },

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const started = Date.now();
    const body: any = {
      model: req.model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.2,
        num_predict: req.maxTokens,
      },
    };
    if (req.json) body.format = "json";

    const res = await safeFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as OllamaChatResponse;
    if (json.error) throw new Error(`Ollama: ${json.error}`);

    return {
      provider: "ollama",
      model: req.model,
      content: json.message?.content ?? "",
      latencyMs: Date.now() - started,
      promptTokens: json.prompt_eval_count,
      completionTokens: json.eval_count,
    };
  },
};
