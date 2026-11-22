import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { LLMClient, LLMQuotaError } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function stripFences(t: string) {
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Erros transitorios do lado do Google (sobrecarga/instabilidade): vale tentar de novo com backoff.
const TRANSIENT_STATUS = new Set([500, 502, 503, 504]);

export const gemini: LLMClient = {
  async completeJSON<T>({ system, prompt, schema, temperature = 0.4 }: { system: string; prompt: string; schema: ZodType<T>; temperature?: number }): Promise<T> {
    let lastErr = "";
    // ate 2 tentativas: se o JSON vier invalido, pedimos de novo dizendo o erro
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response | undefined;
      // ate 3 tentativas extras so para erros transitorios (503/500/502/504), com backoff
      for (let transientAttempt = 0; transientAttempt < 3; transientAttempt++) {
        res = await fetch(`${BASE}/${env.geminiModel()}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey() },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              {
                role: "user",
                parts: [{ text: attempt === 0 ? prompt : `${prompt}\n\nSua resposta anterior era invalida (${lastErr}). Devolva somente o JSON correto.` }],
              },
            ],
            generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 4096 },
          }),
        });
        if (res.status === 429) throw new LLMQuotaError();
        if (TRANSIENT_STATUS.has(res.status) && transientAttempt < 2) {
          await sleep(500 * Math.pow(2, transientAttempt));
          continue;
        }
        break;
      }
      if (!res) throw new Error("Gemini nao respondeu.");
      if (!res.ok) throw new Error(`Gemini respondeu ${res.status}`);
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      try {
        const parsed = schema.safeParse(JSON.parse(stripFences(text)));
        if (parsed.success) return parsed.data;
        lastErr = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      } catch {
        lastErr = "nao era JSON";
      }
    }
    throw new Error("A IA nao devolveu um resultado valido.");
  },
};

export const llm: LLMClient = gemini;
