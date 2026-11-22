// Candidata.ai — roda nas páginas. Preenche campos, destaca o que foi feito e mostra o painel.
// Regras fixas: nunca clica em enviar, nunca resolve captcha, nunca faz login.
(function () {
  if (window.__candidataLoaded) return;
  window.__candidataLoaded = true;
  const F = window.CandidataFields;
  const VERSION = chrome.runtime.getManifest().version;
  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(r || { ok: false, error: "Sem resposta da extensão" })));
  const isLinkedIn = /(^|\.)linkedin\.com$/.test(location.hostname);

  // ---------- 1. Sinal para a plataforma (detecção da instalação) e recebimento do token ----------
  chrome.storage.local.get(["apiBase"], ({ apiBase }) => {
    const onPlatform = apiBase ? location.origin === apiBase : /^\/(extensao|teste-formulario)/.test(location.pathname);
    if (onPlatform || /^\/(extensao|teste-formulario)/.test(location.pathname)) document.documentElement.dataset.candidataExt = VERSION;
  });
  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    if (e.data?.type === "CANDIDATA_TOKEN" && location.pathname.startsWith("/extensao/conectar")) {
      const r = await send({ type: "saveToken", token: e.data.token, apiBase: e.data.apiBase });
      if (r.ok) window.postMessage({ type: "CANDIDATA_TOKEN_OK" }, location.origin);
    }
    if (e.data?.type === "CANDIDATA_JOB_PLATFORMS") {
      await send({ type: "saveJobPlatforms", platforms: e.data.platforms ?? [] });
    }
  });

  // ---------- 2. Leitura da vaga ----------
  function jobText() {
    const sel = ['[data-automation-id="jobPostingDescription"]', "#content .job__description", "#content", ".section-wrapper.page-full-width", '[data-testid="text-section"]', "#job-description", "article", "main"];
    for (const s of sel) {
      const el = document.querySelector(s);
      if (el && el.innerText.trim().length > 200) return el.innerText.trim().slice(0, 7000);
    }
    return document.body.innerText.slice(0, 5000);
  }
  function jobTitle() {
    return (document.querySelector("h1")?.innerText || document.title).trim().slice(0, 200);
  }

  // ---------- 3. Descoberta de campos ----------
  function labelOf(el) {
    const parts = [];
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) parts.push(l.innerText);
    }
    const wrap = el.closest("label");
    if (wrap) parts.push(wrap.innerText);
    if (el.getAttribute("aria-label")) parts.push(el.getAttribute("aria-label"));
    const lb = el.getAttribute("aria-labelledby");
    if (lb) lb.split(" ").forEach((id) => { const n = document.getElementById(id); if (n) parts.push(n.innerText); });
    if (!parts.length && el.placeholder) parts.push(el.placeholder);
    if (!parts.length) {
      // contexto: texto do bloco pai mais próximo
      let p = el.parentElement;
      for (let i = 0; i < 4 && p && !parts.length; i++, p = p.parentElement) {
        const t = (p.innerText || "").trim();
        if (t && t.length < 300) parts.push(t);
      }
    }
    if (!parts.length) parts.push(el.name || el.id || "");
    return parts.join(" ").replace(/\s+/g, " ").replace(/\*/g, "").trim().slice(0, 300);
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return (r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none") || el.type === "file";
  }

  function collect() {
    const out = [];
    const seenRadio = new Set();
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.closest("#candidata-panel-host")) return;
      const type = (el.type || "").toLowerCase();
      if (["hidden", "submit", "button", "reset", "password", "image", "search"].includes(type)) return;
      if (el.disabled || el.readOnly || !visible(el)) return;
      if (/captcha/i.test(el.name + el.id + el.className)) return;
      if (type === "radio") {
        if (seenRadio.has(el.name)) return;
        seenRadio.add(el.name);
        const group = [...document.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)];
        const legend = el.closest("fieldset")?.querySelector("legend")?.innerText || labelOf(el.closest("fieldset") || el.parentElement?.parentElement || el);
        out.push({ el, kind: "radio", group, label: legend });
        return;
      }
      if (type === "checkbox") return; // checkboxes (termos, LGPD) ficam para a pessoa marcar
      const kind = type === "file" ? "file" : el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : "input";
      out.push({ el, kind, label: labelOf(el) });
    });
    return out;
  }

  // ---------- 4. Preenchimento compatível com React/Angular/Vue ----------
  function setNative(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function clickRadio(r) {
    r.click();
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }
  async function attachCv(el, cv) {
    const accept = (el.accept || "").toLowerCase();
    if (accept && !accept.includes("pdf") && !accept.includes(".doc") && !accept.includes("application") && !accept.includes("*")) return false;
    const r = await send({ type: "file", url: cv.url });
    if (!r.ok) return false;
    const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
    const file = new File([bytes], cv.name, { type: cv.mime });
    const dt = new DataTransfer();
    dt.items.add(file);
    el.files = dt.files;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return el.files.length > 0;
  }

  function mark(el, ok) {
    el.style.outline = ok ? "3px solid #1F7A55" : "3px dashed #B7791F";
    el.style.outlineOffset = "2px";
  }

  // ---------- 5. Fluxo principal ----------
  async function fill() {
    const me = await send({ type: "api", path: "/api/ext/me" });
    if (!me.ok) return panel({ error: me.error });
    const { fields, cv, charLimit, confirmed, latestVersion, quickAnswers } = me.data;
    if (!confirmed) return panel({ error: "Confirme seu perfil na plataforma antes de usar a extensão." });

    if (isLinkedIn) {
      return panel({ info: "No LinkedIn a extensão não preenche sozinha: os termos do site proíbem automação e sua conta poderia ser restringida. Copie as respostas abaixo.", quickAnswers, latestVersion, allowAsk: true });
    }

    const items = collect();
    const filled = [], pending = [], open = [];
    for (const it of items) {
      const key = it.kind === "file" ? "file" : F.classify(it.label, it.el);
      try {
        if (key === "file") {
          if (cv && /curr|cv|resume|anexo|arquivo|attach|upload/i.test(F.norm(it.label) + " " + (it.el.name || ""))) {
            if (await attachCv(it.el, cv)) { filled.push({ label: "Currículo", value: cv.name }); mark(it.el, true); continue; }
          }
          pending.push({ label: it.label || "Arquivo" }); mark(it.el, false); continue;
        }
        if (key === "open") { if (!it.el.value) open.push(it); continue; }
        const value = F.valueFor(key, fields);
        if (value == null || value === "") { if (!hasValue(it)) { pending.push({ label: it.label }); mark(it.el, false); } continue; }
        if (it.kind === "radio") {
          const opt = F.pickOption(it.group.map((r) => ({ el: r, text: labelOf(r) || r.value, value: r.value })), value);
          if (opt) { clickRadio(opt.el); filled.push({ label: it.label, value }); mark(opt.el.parentElement || opt.el, true); } else { pending.push({ label: it.label }); }
        } else if (it.kind === "select") {
          const opt = F.pickOption([...it.el.options], value);
          if (opt) { setNative(it.el, opt.value); filled.push({ label: it.label, value: opt.text }); mark(it.el, true); } else { pending.push({ label: it.label }); mark(it.el, false); }
        } else if (!it.el.value) {
          setNative(it.el, String(value).slice(0, it.el.maxLength > 0 ? it.el.maxLength : 5000));
          filled.push({ label: it.label, value }); mark(it.el, true);
        }
      } catch {
        pending.push({ label: it.label });
      }
    }

    let answers = [];
    if (open.length) {
      panel({ info: `Preenchi ${filled.length} campo(s). Gerando ${open.length} resposta(s) aberta(s)…`, filled, pending, latestVersion });
      const qs = open.slice(0, 15).map((it, i) => ({ id: String(i), question: it.label, maxChars: it.el.maxLength > 0 ? it.el.maxLength : charLimit }));
      const r = await send({ type: "api", path: "/api/ext/answer", method: "POST", body: { questions: qs, jobText: jobText() } });
      if (r.ok) {
        answers = r.data.answers.map((a) => ({ ...a, question: qs[Number(a.id)].question, el: open[Number(a.id)].el }));
        for (const a of answers) {
          if (a.answer) { setNative(a.el, a.answer); mark(a.el, true); } else { mark(a.el, false); }
        }
      } else {
        open.forEach((it) => { pending.push({ label: it.label }); mark(it.el, false); });
        return panel({ error: r.error, filled, pending, latestVersion });
      }
    }
    panel({ info: "Revise tudo e clique em enviar no próprio site quando estiver pronto.", filled, pending, answers, latestVersion, quickAnswers });
  }

  function hasValue(it) {
    if (it.kind === "radio") return it.group.some((r) => r.checked);
    return Boolean(it.el.value);
  }

  // ---------- 6. Painel lateral (Shadow DOM, não interfere no site) ----------
  function panel(state) {
    let host = document.getElementById("candidata-panel-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "candidata-panel-host";
      host.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;";
      document.documentElement.appendChild(host);
      host.attachShadow({ mode: "open" });
    }
    const root = host.shadowRoot;
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const update = state.latestVersion && state.latestVersion !== VERSION ? `<p class="warn">Nova versão da extensão disponível (${esc(state.latestVersion)}). Veja “Como atualizar” na plataforma.</p>` : "";
    root.innerHTML = `
      <style>
        :host{all:initial}
        .p{width:340px;max-height:85vh;overflow:auto;background:#fff;color:#1B2547;border:1px solid #D9DEEC;border-radius:14px;box-shadow:0 10px 30px rgba(17,22,42,.25);font:14px/1.45 system-ui,sans-serif;padding:14px}
        h2{font-size:16px;margin:0 0 8px} h3{font-size:13px;margin:12px 0 4px}
        .x{float:right;border:0;background:none;font-size:18px;cursor:pointer;color:#5B6585}
        .ok{color:#1F7A55}.warn{color:#8A5A10;background:#FBF0DA;padding:6px 8px;border-radius:8px}.err{color:#B3261E;background:#FBE3E1;padding:6px 8px;border-radius:8px}
        ul{padding-left:18px;margin:4px 0} li{margin:2px 0}
        textarea{width:100%;box-sizing:border-box;min-height:80px;border:1px solid #D9DEEC;border-radius:8px;padding:6px;font:inherit}
        button.b{background:#22305C;color:#fff;border:0;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer;margin:4px 4px 0 0}
        button.g{background:#fff;color:#22305C;border:1px solid #D9DEEC}
        .q{font-weight:700;margin-top:8px}
        .muted{color:#5B6585;font-size:12px}
      </style>
      <div class="p" role="dialog" aria-label="Candidata.ai">
        <button class="x" id="close" aria-label="Fechar">×</button>
        <h2>Candidata.ai</h2>
        ${update}
        ${state.error ? `<p class="err">${esc(state.error)}</p>` : ""}
        ${state.info ? `<p>${esc(state.info)}</p>` : ""}
        ${state.filled?.length ? `<h3 class="ok">Preenchidos (${state.filled.length})</h3><ul>${state.filled.map((f) => `<li>${esc(f.label.slice(0, 60))}</li>`).join("")}</ul>` : ""}
        ${state.pending?.length ? `<h3 style="color:#8A5A10">Para você conferir (${state.pending.length})</h3><ul>${state.pending.map((f) => `<li>${esc((f.label || "").slice(0, 60))}</li>`).join("")}</ul>` : ""}
        ${state.answers?.length ? `<h3>Respostas abertas</h3>${state.answers.map((a, i) => `<div class="q">${esc(a.question.slice(0, 120))}</div>${a.alert ? `<p class="warn">${esc(a.alert)}</p>` : ""}<textarea data-i="${i}">${esc(a.answer)}</textarea><button class="b g" data-copy="${i}">Copiar</button><button class="b g" data-apply="${i}">Aplicar no campo</button>`).join("")}` : ""}
        ${state.quickAnswers?.length ? `<h3>Respostas rápidas do perfil</h3>${state.quickAnswers.map((q, i) => `<div class="q">${esc(q.pergunta)}</div><div>${esc(q.resposta)} <button class="b g" data-qcopy="${i}">Copiar</button></div>`).join("")}` : ""}
        ${state.allowAsk ? `<h3>Gerar resposta para uma pergunta</h3><textarea id="ask" placeholder="Cole aqui a pergunta do formulário"></textarea><button class="b" id="askbtn">Gerar resposta</button><div id="askout"></div>` : ""}
        <h3>Depois de enviar</h3>
        <button class="b" id="applied">Marcar como candidatura enviada</button>
        <p class="muted">A extensão nunca clica em enviar. Quem envia é você.</p>
      </div>`;
    root.getElementById("close").onclick = () => host.remove();
    root.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => navigator.clipboard.writeText(root.querySelector(`textarea[data-i="${b.dataset.copy}"]`).value)));
    root.querySelectorAll("[data-apply]").forEach((b) => (b.onclick = () => { const a = state.answers[Number(b.dataset.apply)]; setNative(a.el, root.querySelector(`textarea[data-i="${b.dataset.apply}"]`).value); mark(a.el, true); }));
    root.querySelectorAll("[data-qcopy]").forEach((b) => (b.onclick = () => navigator.clipboard.writeText(state.quickAnswers[Number(b.dataset.qcopy)].resposta)));
    const askbtn = root.getElementById("askbtn");
    if (askbtn) askbtn.onclick = async () => {
      const q = root.getElementById("ask").value.trim();
      if (q.length < 3) return;
      askbtn.disabled = true;
      const r = await send({ type: "api", path: "/api/ext/answer", method: "POST", body: { questions: [{ id: "0", question: q }], jobText: isLinkedIn ? undefined : jobText() } });
      askbtn.disabled = false;
      const out = root.getElementById("askout");
      out.innerHTML = r.ok ? `<textarea>${esc(r.data.answers[0].answer)}</textarea>${r.data.answers[0].alert ? `<p class="warn">${esc(r.data.answers[0].alert)}</p>` : ""}` : `<p class="err">${esc(r.error)}</p>`;
    };
    root.getElementById("applied").onclick = async (e) => {
      const r = await send({ type: "api", path: "/api/ext/applied", method: "POST", body: { url: location.href, title: jobTitle(), description: isLinkedIn ? undefined : jobText().slice(0, 15000) } });
      e.target.textContent = r.ok ? "Registrado no histórico ✓" : "Erro: " + r.error;
    };
  }

  // ---------- 7. Busca em plataformas de vagas (LinkedIn, Gupy, Catho, InfoJobs, Vagas.com) ----------
  // A pessoa navega e pesquisa normalmente, logada no site dela. A extensão só lê o que já está
  // na tela (como a pessoa leria) e manda pro Candidata.ai para pontuar contra o perfil, se ela autorizar.
  const SEARCH_SITE = (() => {
    const h = location.hostname, p = location.pathname;
    if (/(^|\.)linkedin\.com$/.test(h) && p.startsWith("/jobs/search")) return "linkedin";
    if (/gupy\.io$/.test(h) && p.includes("job-search")) return "gupy";
    if (/(^|\.)catho\.com\.br$/.test(h) && p.startsWith("/vagas/")) return "catho";
    if (/(^|\.)infojobs\.com\.br$/.test(h) && /empregos\.aspx|vagas-de-emprego/.test(p)) return "infojobs";
    if (/(^|\.)vagas\.com\.br$/.test(h) && p.startsWith("/vagas-de-")) return "vagascom";
    return null;
  })();

  // Padrões "fortes": se baterem, é quase certeza que é link de vaga.
  const JOB_LINK_PATTERN = {
    linkedin: /\/jobs\/view\//,
    gupy: /gupy\.io\/(job|vaga)\//,
    catho: /catho\.com\.br\/vagas\/.+\d/,
    infojobs: /infojobs\.com\.br\/vaga-de-.+__\d+/,
    vagascom: /vagas\.com\.br\/vagas\/v\d+/,
  };
  // Padrão "fraco" (fallback): a estrutura real de cada site muda com frequência e não
  // temos como validar ao vivo contra as 5 plataformas, então se o padrão forte não achar
  // nada, caímos para uma checagem mais larga (segmento do path + exclui páginas óbvias
  // de navegação) em vez de simplesmente não mostrar nada pro candidato.
  const NOT_A_JOB = /login|entrar|cadastr|sign[_-]?up|sign[_-]?in|termos|privacidade|ajuda|suporte|sobre[_-]?nos|empresa\/|anuncie|planos|blog|carreira-sucesso|^\/$|whatsapp|facebook\.com|instagram\.com|linkedin\.com\/company/i;
  const JOB_PATH_HINT = {
    linkedin: /\/jobs\//,
    gupy: /\.gupy\.io\/(job|vaga)/,
    catho: /catho\.com\.br\/vagas?\//,
    infojobs: /infojobs\.com\.br\/vaga/,
    vagascom: /vagas\.com\.br\/vagas?\//,
  };

  function nearestCard(a) {
    let el = a, best = a.parentElement;
    for (let i = 0; i < 6 && el?.parentElement; i++) {
      el = el.parentElement;
      const t = (el.innerText || "").trim();
      if (t.length > 30 && t.length < 1500) { best = el; break; }
    }
    return best || a.parentElement || a;
  }

  function scrapeSearchResults(site) {
    const strong = JOB_LINK_PATTERN[site];
    const weak = JOB_PATH_HINT[site];
    const self = location.href.split("?")[0];

    function pass(matcher) {
      const out = [], seen = new Set();
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = (a.href || "").split("?")[0];
        if (!href || href === self || seen.has(href) || NOT_A_JOB.test(href) || !matcher.test(href)) return;
        const card = nearestCard(a);
        const heading = card.querySelector("h1,h2,h3,h4,strong") || a;
        const title = (heading.innerText || a.innerText || "").trim();
        if (!title || title.length < 3 || title.length > 300) return;
        seen.add(href);
        out.push({ title: title.slice(0, 300), company: null, location: null, url: href, description: (card.innerText || "").trim().slice(0, 2000) || null });
      });
      return out.slice(0, 40);
    }

    const strongHits = pass(strong);
    return strongHits.length ? strongHits : pass(weak);
  }

  function searchBanner(state) {
    let host = document.getElementById("candidata-search-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "candidata-search-host";
      host.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:2147483647;";
      document.documentElement.appendChild(host);
      host.attachShadow({ mode: "open" });
    }
    const root = host.shadowRoot;
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    root.innerHTML = `
      <style>
        :host{all:initial}
        .b{width:280px;background:#fff;color:#1B2547;border:1px solid #D9DEEC;border-radius:14px;box-shadow:0 10px 30px rgba(17,22,42,.25);font:14px/1.4 system-ui,sans-serif;padding:12px}
        button.p{background:#22305C;color:#fff;border:0;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer}
        .x{float:right;border:0;background:none;font-size:16px;cursor:pointer;color:#5B6585}
      </style>
      <div class="b" role="status">
        <button class="x" id="x" aria-label="Fechar">×</button>
        <div>${esc(state.text)}</div>
        ${state.showButton ? `<div style="margin-top:8px"><button class="p" id="go">Importar pro Candidata.ai</button></div>` : ""}
      </div>`;
    root.getElementById("x").onclick = () => host.remove();
    if (state.onGo) root.getElementById("go").onclick = state.onGo;
  }

  if (SEARCH_SITE) {
    chrome.storage.local.get(["jobPlatforms"], ({ jobPlatforms }) => {
      if (!jobPlatforms || !jobPlatforms.includes(SEARCH_SITE)) return; // opt-in por plataforma (Configurações, na plataforma)

      let lastCount = -1, tries = 0, settled = false;
      const maxTries = 10; // ~ 15s de tentativas — cobre SPA/lazy-load lenta e rolagem do usuário
      const timer = setInterval(() => {
        tries++;
        const jobs = scrapeSearchResults(SEARCH_SITE);
        const stable = jobs.length === lastCount;
        lastCount = jobs.length;
        // só mostra/atualiza quando o número parar de crescer por uma rodada, ou no fim das tentativas
        if (jobs.length && (stable || tries >= maxTries)) {
          settled = true;
          clearInterval(timer);
          searchBanner({
            text: `Encontrei ${jobs.length} vaga(s) nesta busca.`,
            showButton: true,
            onGo: async (e) => {
              e.target.textContent = "Importando…"; e.target.disabled = true;
              const r = await send({ type: "api", path: "/api/ext/jobs-found", method: "POST", body: { platform: SEARCH_SITE, jobs } });
              searchBanner({ text: r.ok ? `Importado(s) ${r.data.saved} vaga(s). Veja em Candidata.ai → Buscar vagas.` : `Erro: ${r.error}`, showButton: false });
            },
          });
        } else if (tries >= maxTries && !settled) {
          clearInterval(timer);
          // Feedback explícito em vez de falhar calado: ou não há vagas na tela, ou o site mudou
          // e nosso jeito de reconhecer vaga ficou desatualizado — o candidato sabe que pode
          // rolar a página e tentar nessa aba de novo, ou nos avisar.
          searchBanner({ text: "Não consegui reconhecer vagas nesta página. Role a tela até aparecerem os resultados, ou avise o suporte se continuar assim.", showButton: false });
        }
      }, 1500);
    });
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg.type === "fill") { fill(); reply({ ok: true }); }
    if (msg.type === "panel") {
      send({ type: "api", path: "/api/ext/me" }).then((me) => panel(me.ok ? { quickAnswers: me.data.quickAnswers, latestVersion: me.data.latestVersion, allowAsk: true, info: isLinkedIn ? "No LinkedIn a extensão só mostra respostas para copiar (regras do site)." : null } : { error: me.error }));
      reply({ ok: true });
    }
    return false;
  });
})();
