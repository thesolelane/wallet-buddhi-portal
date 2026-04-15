// LLM provider interface — Phase G
// Abstracts over Ollama (local) and cloud providers (Anthropic, etc.)
// Single contract so callers don't care which model answered.

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  // Request JSON-shaped output (provider-specific implementation)
  json?: boolean;
}

export interface LlmResponse {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  // Optional token counts when the provider reports them
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmProvider {
  name: string;
  health(): Promise<{ ok: boolean; reason?: string; models?: string[] }>;
  complete(req: LlmRequest): Promise<LlmResponse>;
}
