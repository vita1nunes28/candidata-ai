import type { SearchInput } from "@/lib/schemas";

export interface RawJob {
  source: string;
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  work_mode: string | null;
  posted_at: string | null;
  url: string;
  description: string | null;
}

/** Cada fonte de vagas implementa esta interface. Para adicionar uma fonte, crie um arquivo e registre em index.ts. */
export interface JobSource {
  id: string;
  search(input: SearchInput, ctx: { boards: Board[] }): Promise<RawJob[]>;
}

export type Board = { ats: "greenhouse" | "lever"; slug: string };
