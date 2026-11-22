import { z } from "zod";

const str = z.string().trim().max(2000);
const optStr = str.nullable().optional();

export const experienceSchema = z.object({
  company: str,
  role: str,
  start: optStr,
  end: optStr,
  achievements: z.array(str).max(15).default([]),
});

/** O que a IA devolve ao ler o CV (sem contato: contato é extraído localmente). */
export const cvExtractionSchema = z.object({
  full_name: optStr,
  city: optStr,
  summary: optStr,
  experiences: z.array(experienceSchema).max(20).default([]),
  education: z.array(z.object({ institution: str, course: str, start: optStr, end: optStr })).max(10).default([]),
  skills: z.array(str).max(60).default([]),
  tools: z.array(str).max(60).default([]),
  languages: z.array(z.object({ language: str, level: optStr })).max(10).default([]),
  certifications: z.array(str).max(30).default([]),
});
export type CvExtraction = z.infer<typeof cvExtractionSchema>;

export const profileSchema = cvExtractionSchema.extend({
  email: z.string().email().nullable().optional(),
  phone: optStr,
  links: z.object({ linkedin: optStr, portfolio: optStr, github: optStr }).partial().default({}),
  salary_clt: z.number().nonnegative().nullable().optional(),
  salary_pj: z.number().nonnegative().nullable().optional(),
  availability: optStr,
  work_modes: z.array(z.enum(["presencial", "hibrido", "remoto"])).default([]),
  accepts_relocation: z.boolean().nullable().optional(),
  work_authorization: optStr,
  diversity: z
    .object({ gender: optStr, race: optStr, pcd: optStr })
    .partial()
    .default({}),
});
export type Profile = z.infer<typeof profileSchema>;

/** Saída da geração por vaga (validada antes de salvar). */
export const generationSchema = z.object({
  assunto: z.string().min(5).max(160),
  corpo: z.string().min(80).max(2500),
  pontos_de_aderencia: z.array(z.string().max(300)).min(1).max(3),
  kit_respostas: z
    .array(z.object({ pergunta: z.string().max(400), resposta: z.string().max(3000) }))
    .max(20),
  alertas: z.array(z.string().max(300)).max(10).default([]),
});
export type Generation = z.infer<typeof generationSchema>;

export const fitBatchSchema = z.object({
  notas: z.array(z.object({ id: z.string(), nota: z.number().min(0).max(100), justificativa: z.string().max(240) })),
});

export const searchSchema = z.object({
  keywords: z.array(z.string().trim().min(2).max(80)).min(1).max(5),
  location: z.string().trim().max(80).optional(),
  mode: z.enum(["presencial", "hibrido", "remoto"]).optional(),
  seniority: z.enum(["estagio", "junior", "pleno", "senior", "lideranca"]).optional(),
  language: z.enum(["pt", "en", "es"]).optional(),
  maxAgeDays: z.number().int().min(1).max(60).optional(),
});
export type SearchInput = z.infer<typeof searchSchema>;
