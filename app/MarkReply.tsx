"use client";
import { api } from "@/components/ui";

export function MarkReply({ id }: { id: string }) {
  return (
    <button className="text-sm underline" onClick={async () => { await api(`/api/jobs/${id}`, { method: "PATCH", json: { status: "resposta" } }); location.reload(); }}>
      Marcar resposta recebida
    </button>
  );
}
