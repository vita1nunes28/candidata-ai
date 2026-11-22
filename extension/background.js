// Candidata.ai — service worker. Faz as chamadas à plataforma (sem CORS) com o token da extensão.
const VERSION = chrome.runtime.getManifest().version;

async function cfg() {
  return chrome.storage.local.get(["token", "apiBase"]);
}

async function call(path, method = "GET", body) {
  const { token, apiBase } = await cfg();
  if (!token || !apiBase) throw new Error("Extensão não conectada. Abra a plataforma > Instalar extensão > Conectar minha conta.");
  const res = await fetch(apiBase + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "x-ext-version": VERSION },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) await chrome.storage.local.remove(["token"]);
  if (!res.ok) throw new Error(data.error || "Erro " + res.status);
  return data;
}

async function fileAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não consegui baixar o CV.");
  const buf = await res.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    try {
      if (msg.type === "api") return reply({ ok: true, data: await call(msg.path, msg.method, msg.body) });
      if (msg.type === "file") return reply({ ok: true, data: await fileAsBase64(msg.url) });
      if (msg.type === "status") {
        const c = await cfg();
        return reply({ ok: true, data: { connected: Boolean(c.token), apiBase: c.apiBase || null, version: VERSION } });
      }
      if (msg.type === "saveToken") {
        await chrome.storage.local.set({ token: msg.token, apiBase: msg.apiBase });
        return reply({ ok: true });
      }
      if (msg.type === "saveJobPlatforms") {
        await chrome.storage.local.set({ jobPlatforms: msg.platforms });
        return reply({ ok: true });
      }
      if (msg.type === "logout") {
        await chrome.storage.local.clear();
        return reply({ ok: true });
      }
      reply({ ok: false, error: "Mensagem desconhecida" });
    } catch (e) {
      reply({ ok: false, error: e.message });
    }
  })();
  return true; // resposta assíncrona
});
