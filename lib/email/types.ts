export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  body: string; // texto simples
  attachment?: { filename: string; mime: string; data: Buffer };
}

/** Interface única de envio. Hoje: Gmail e Outlook direto. Futuro: Nylas/Unipile. */
export interface EmailProvider {
  id: "gmail" | "outlook";
  authUrl(state: string, opts: { wantSend: boolean; loginHint?: string }): string;
  exchangeCode(code: string): Promise<{ refreshToken: string; email: string; scopes: string[] }>;
  accessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }>;
  createDraft(accessToken: string, msg: OutgoingEmail): Promise<string>;
  send(accessToken: string, msg: OutgoingEmail): Promise<string>;
  revoke(refreshToken: string): Promise<void>;
}

/** Token revogado ou expirado: pedir reconexão ao usuário. */
export class TokenRevokedError extends Error {
  constructor() {
    super("O acesso ao seu e-mail foi revogado ou expirou. Conecte a conta de novo em Configurações.");
  }
}
/** Erro temporário (rede, 5xx, limite): vale tentar de novo. */
export class TemporaryEmailError extends Error {}
