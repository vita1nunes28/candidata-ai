import { env } from "@/lib/env";
import { base64url, buildMime } from "./mime";
import { EmailProvider, TemporaryEmailError, TokenRevokedError } from "./types";

const COMPOSE = "https://www.googleapis.com/auth/gmail.compose";
const SEND = "https://www.googleapis.com/auth/gmail.send";
const redirect = () => `${env.appUrl()}/api/oauth/gmail/callback`;

async function gfetch(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new TokenRevokedError();
  if (res.status === 429 || res.status >= 500) throw new TemporaryEmailError(`Gmail ${res.status}`);
  if (!res.ok) throw new Error(`Gmail recusou a mensagem (${res.status}).`);
  return res.json();
}

export const gmail: EmailProvider = {
  id: "gmail",
  authUrl(state, { wantSend, loginHint }) {
    const p = new URLSearchParams({
      client_id: env.googleId(),
      redirect_uri: redirect(),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: ["openid", "email", COMPOSE, ...(wantSend ? [SEND] : [])].join(" "),
      state,
    });
    if (loginHint) p.set("login_hint", loginHint);
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  },
  async exchangeCode(code) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.googleId(), client_secret: env.googleSecret(), redirect_uri: redirect(), grant_type: "authorization_code" }),
    });
    const t = await res.json();
    if (!res.ok || !t.refresh_token) throw new Error("O Google não devolveu acesso permanente. Tente conectar de novo.");
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
    return { refreshToken: t.refresh_token, email: info.email, scopes: String(t.scope).split(" ") };
  },
  async accessToken(refreshToken) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: env.googleId(), client_secret: env.googleSecret(), grant_type: "refresh_token" }),
    });
    const t = await res.json();
    if (t.error === "invalid_grant") throw new TokenRevokedError();
    if (!res.ok) throw new TemporaryEmailError("Falha ao renovar acesso do Gmail");
    return { accessToken: t.access_token };
  },
  async createDraft(token, msg) {
    const r = await gfetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", token, { message: { raw: base64url(buildMime(msg)) } });
    return r.id;
  },
  async send(token, msg) {
    const r = await gfetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", token, { raw: base64url(buildMime(msg)) });
    return r.id;
  },
  async revoke(refreshToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" }).catch(() => {});
  },
};
