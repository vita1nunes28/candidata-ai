import { adzuna } from "./adzuna";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import type { JobSource } from "./types";

/** Fontes ativas. Para adicionar outra, implemente JobSource e coloque aqui. */
export const SOURCES: JobSource[] = [adzuna, greenhouse, lever];
