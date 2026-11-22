// Candidata.ai — mapeamento de campos (puro, sem efeitos; testável).
(function (root) {
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

  // ordem importa: o primeiro que casar vence
  const RULES = [
    ["email", /\b(e-?mail|email address|correo)\b/],
    ["linkedin", /linkedin/],
    ["github", /github/],
    ["portfolio", /(portfolio|portifolio|site pessoal|website|personal site|behance)/],
    ["first_name", /(^|\b)(primeiro nome|first name|given name|nome\b(?! completo)(?!.*sobrenome)(?! da empresa)(?! social))/],
    ["last_name", /(sobrenome|last name|surname|family name|apellido)/],
    ["full_name", /(nome completo|full name|your name|seu nome|^name$|^nome$)/],
    ["phone", /(telefone|celular|phone|mobile|whatsapp|telefono)/],
    ["relocation", /(mudanca|relocat|relocate|mudar de cidade)/],
    ["city", /(cidade|city|localizacao|location|onde (voce )?mora|municipio)/],
    ["salary_clt", /(pretensao|salari|salary|remuneracao|compensation|expectativa)/],
    ["availability", /(disponibilidade|disponivel para inicio|start date|notice period|quando (pode|poderia) comecar|aviso previo)/],
    ["work_authorization", /(autorizacao de trabalho|work authori|visa|sponsorship|permissao para trabalhar)/],
    ["gender", /(genero|gender|sexo)/],
    ["race", /(raca|cor\b|etnia|race|ethnicity)/],
    ["pcd", /(pcd|deficiencia|disability)/],
    ["current_company", /(empresa atual|current company|current employer|ultima empresa)/],
    ["current_role", /(cargo atual|current (job )?title|current role|cargo)/],
  ];

  function classify(label, el) {
    const t = norm(label);
    if (el && el.type === "email") return "email";
    if (el && el.type === "tel") return "phone";
    for (const [k, re] of RULES) if (re.test(t)) return k;
    const isLongText = el && (el.tagName === "TEXTAREA" || (el.maxLength > 150));
    if (isLongText && t.length > 8) return "open";
    if (/\?$/.test(label || "") && t.length > 15) return "open";
    return null;
  }

  function pickOption(options, value) {
    const v = norm(String(value));
    if (!v) return null;
    const yes = /^(sim|yes|true)$/.test(v), no = /^(nao|no|false)$/.test(v);
    let best = null;
    for (const o of options) {
      const t = norm(o.text || o.label || o.value);
      if (!t) continue;
      if (t === v) return o;
      if (yes && /^(sim|yes)\b/.test(t)) return o;
      if (no && /^(nao|no)\b/.test(t)) return o;
      if (!best && (t.includes(v) || v.includes(t)) && t.length > 1) best = o;
    }
    return best;
  }

  function valueFor(key, f) {
    if (!f) return null;
    const brl = (n) => (n ? String(n) : null);
    const map = {
      email: f.email, linkedin: f.linkedin, github: f.github, portfolio: f.portfolio,
      first_name: f.first_name, last_name: f.last_name, full_name: f.full_name, phone: f.phone, city: f.city,
      salary_clt: brl(f.salary_clt || f.salary_pj), availability: f.availability,
      relocation: f.relocation == null ? null : f.relocation ? "Sim" : "Não",
      work_authorization: f.work_authorization,
      gender: f.gender || "Prefiro não informar", race: f.race || "Prefiro não informar", pcd: f.pcd || "Prefiro não informar",
      current_company: f.current_company, current_role: f.current_role,
    };
    return map[key] ?? null;
  }

  root.CandidataFields = { norm, classify, pickOption, valueFor };
  if (typeof module !== "undefined") module.exports = root.CandidataFields;
})(typeof window !== "undefined" ? window : globalThis);
