import { env } from "@/lib/env";
import { EmailProvider, OutgoingEmail, TemporaryEmailError, TokenRevokedError } from "./types";

const AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0";
const redirect = () => `${env.appUrl()}/api/oauth/outlook/callback`;
const BASE_SCOPES = ["openid", "email", "offline_access", "User.Read", "Mail.ReadWrite"];

function graphMessage(m: OutgoingEmail) {
  return {
    subject: m.subject,
    body: { contentType: "Text", content: m.body },
    toRecipients: [{ emailAddress: { address: m.to } }],
    attachments: m.attachment
      ? [{ "@odata.type": "#microsoft.graph.fileAttachment", name: m.attachment.filename, contentType: m.attachment.mime, contentBytes: m.attachment.data.toString("base64") }]
      : [],
  };
}

async function graph(path: string, token: string, body?: unknown) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new TokenRevokedError();
  if (res.status === 429 || res.status >= 500) throw new TemporaryEmailError(`Graph ${res.status}`);
  if (!res.ok) throw new Error(`Outlook recusou a mensagem (${res.status}).`);
  return res.status === 202 ? {} : res.json();
}

async function tokenCall(params: Record<string, string>) {
  const res = await fetch(`${AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.msId(), client_secret: env.msSecret(), ...params }),
  });
  return { res, t: await res.json() };
}

export const outlook: EmailProvider = {
  id: "outlook",
  authUrl(state, { wantSend, loginHint }) {
    const p = new URLSearchParams({
      client_id: env.msId(),
      redirect_uri: redirect(),
      response_type: "code",
      response_mode: "query",
      scope: [...BASE_SCOPES, ...(wantSend ? ["Mail.Send"] : [])].join(" "),
      state,
      prompt: "select_account",
    });
    if (loginHint) p.set("login_hint", loginHint);
    return `${AUTH}/authorize?${p}`;
  },
  async exchangeCode(code) {
    const { res, t } = await tokenCall({ code, redirect_uri: redirect(), grant_type: "authorization_code" });
    if (!res.ok || !t.refresh_token) throw new Error("A Microsoft não devolveu acesso permanente. Tente conectar de novo.");
    const me = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
    return { refreshToken: t.refresh_token, email: me.mail || me.userPrincipalName, scopes: String(t.scope).split(" ") };
  },
  async accessToken(refreshToken) {
    const { res, t } = await tokenCall({ refresh_token: refreshToken, grant_type: "refresh_token" });
    if (t.error === "invalid_grant") throw new TokenRevokedError();
    if (!res.ok) throw new TemporaryEmailError("Falha ao renovar acesso do Outlook");
    // a Microsoft gira o refresh token: devolvemos o novo para salvar
    return { accessToken: t.access_token, refreshToken: t.refresh_token };
  },
  async createDraft(token, msg) {
    const r = await graph("/me/messages", token, graphMessage(msg));
    return r.id;
  },
  async send(token, msg) {
    await graph("/me/sendMail", token, { message: graphMessage(msg), saveToSentItems: true });
    return `graph-${Date.now()}`;
  },
  async revoke() {
    /* A Microsoft não tem revogação por token; o usuário remove em account.microsoft.com > Privacidade > Apps. Apagamos o token do banco. */
  },
};
