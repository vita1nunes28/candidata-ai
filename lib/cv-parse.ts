/** Extrai texto de PDF ou DOCX (sem serviços pagos). */
export async function extractText(buf: ArrayBuffer, mime: string, name: string): Promise<string> {
  const lower = name.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText: pdf, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdf(doc, { mergePages: true });
    return clean(Array.isArray(text) ? text.join("\n") : text);
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return clean(value);
  }
  throw new Error("Formato não suportado. Envie PDF ou DOCX.");
}

function clean(t: string) {
  return t.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
