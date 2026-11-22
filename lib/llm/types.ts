import type { ZodType } from "zod";

/** Interface única de IA: hoje Gemini, amanhã qualquer outro (Claude, etc.). */
export interface LLMClient {
  completeJSON<T>(opts: { system: string; prompt: string; schema: ZodType<T>; temperature?: number }): Promise<T>;
}

export class LLMQuotaError extends Error {
  constructor() {
    super("Limite gratuito da IA atingido por agora. Tente de novo mais tarde ou amanhã.");
  }
}
