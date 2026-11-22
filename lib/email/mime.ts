import type { OutgoingEmail } from "./types";

const b64 = (s: string | Buffer) => (typeof s === "string" ? Buffer.from(s, "utf8") : s).toString("base64");
/** Cabeçalho com acento (RFC 2047). */
const encWord = (s: string) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n").trimEnd();

/** Monta a mensagem MIME (UTF-8, anexo opcional) exigida pela Gmail API. */
export function buildMime(m: OutgoingEmail): string {
  const boundary = "cand_" + Math.random().toString(36).slice(2);
  const head = [
    `From: ${m.from}`,
    `To: ${m.to}`,
    `Subject: ${encWord(m.subject)}`,
    "MIME-Version: 1.0",
  ];
  const textPart = ["Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(m.body))];
  if (!m.attachment) return [...head, ...textPart].join("\r\n");
  return [
    ...head,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    ...textPart,
    `--${boundary}`,
    `Content-Type: ${m.attachment.mime}; name="${encWord(m.attachment.filename)}"`,
    `Content-Disposition: attachment; filename="${encWord(m.attachment.filename)}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(m.attachment.data.toString("base64")),
    `--${boundary}--`,
  ].join("\r\n");
}

export const base64url = (s: string) => Buffer.from(s).toString("base64url");
