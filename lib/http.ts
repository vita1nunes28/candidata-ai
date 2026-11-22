import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/supabase/server";

/** Envolve uma rota: erros viram JSON com mensagem clara; logs sem dados pessoais. */
export function route<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Dados inválidos.", details: e.issues.map((i) => i.path.join(".")) }, { status: 400 });
      console.error("[erro]", e instanceof Error ? e.name + ": " + e.message.slice(0, 200) : "desconhecido");
      return NextResponse.json({ error: "Algo deu errado no servidor. Tente de novo em instantes." }, { status: 500 });
    }
  };
}
