// Gera public/candidata-extensao.zip a partir da pasta extension/ (rode: npm run zip:extension)
import JSZip from "jszip";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const zip = new JSZip();
const folder = zip.folder("candidata-extensao");
for (const f of readdirSync("extension")) folder.file(f, readFileSync(join("extension", f)));
writeFileSync("public/candidata-extensao.zip", await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("public/candidata-extensao.zip gerado");
