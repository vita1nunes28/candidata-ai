import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { LLMClient, LLMQuotaError } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function stripFences(t: string) {
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export const gemini: LLMClient = {
  async completeJSON<T>({ system, prompt, schema, temperature = 0.4 }: { system: string; prompt: string; schema: ZodType<T>; temperature?: number }): Promise<T> {
    let lastErr = "";
    // até 2 tentativas: se o JSON vier inválido, pedimos de novo dizendo o erro
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${BASE}/${env.geminiModel()}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: "user",
              parts: [{ text: attempt === 0 ? prompt : `${prompt}\n\nSua resposta anterior era inválida (${lastErr}). Devolva somente o JSON correto.` }],
            },
          ],
          generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 4096 },
        }),
      });
      if (res.status === 429) throw new LLMQuotaError();
      if (!res.ok) throw new Error(`Gemini respondeu ${res.status}`);
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      try {
        const parsed = schema.safeParse(JSON.parse(stripFences(text)));
        if (parsed.success) return parsed.data;
        lastErr = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      } catch {
        lastErr = "não era JSON";
      }
    }
    throw new Error("A IA não devolveu um resultado válido.");
  },
};

export const llm: LLMClient = gemini;
