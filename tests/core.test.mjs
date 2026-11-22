import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { buildMime } from "../lib/email/mime.ts";
import { windowToUTC, todayIn } from "../lib/schedule.ts";
import { dedupKey, findPublicEmail, guessMode, htmlToText, matchesKeywords } from "../lib/jobs/text.ts";
import { splitContact, profileForLLM } from "../lib/privacy.ts";
import { profileAnswers } from "../lib/kit.ts";

const require = createRequire(import.meta.url);
const F = require("../extension/fields.js");

test("janela de envio respeita o fuso de São Paulo (UTC-3)", () => {
  assert.equal(windowToUTC("2026-11-23", 9, "America/Sao_Paulo").toISOString(), "2026-11-23T12:00:00.000Z");
  assert.equal(windowToUTC("2026-11-23", 14, "America/Sao_Paulo").toISOString(), "2026-11-23T17:00:00.000Z");
  assert.equal(windowToUTC("2026-07-01", 9, "Europe/Lisbon").toISOString(), "2026-07-01T08:00:00.000Z");
  assert.match(todayIn("America/Sao_Paulo"), /^\d{4}-\d{2}-\d{2}$/);
});

test("MIME com acento no assunto e anexo", () => {
  const raw = buildMime({ from: "a@x.com", to: "rh@y.com", subject: "Candidatura: Analista de Dados — São Paulo", body: "Olá, ação!", attachment: { filename: "cv.pdf", mime: "application/pdf", data: Buffer.from("%PDF-1.4") } });
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
  assert.match(raw, /multipart\/mixed/);
  assert.match(raw, /filename="cv.pdf"/);
  const bodyB64 = raw.split("Content-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--")[0].replace(/\r\n/g, "");
  assert.equal(Buffer.from(bodyB64, "base64").toString(), "Olá, ação!");
});

test("e-mail de RH: só o publicado, ignora no-reply e prefere RH", () => {
  assert.equal(findPublicEmail("Envie para noreply@empresa.com ou vagas@empresa.com.br"), "vagas@empresa.com.br");
  assert.equal(findPublicEmail("Sem contato aqui."), null);
  assert.equal(findPublicEmail("Dúvidas: privacidade@x.com"), null);
});

test("deduplicação ignora acentos, caixa e pontuação", () => {
  assert.equal(dedupKey("Ação S.A.", "Analista de Dados", "Rio de Janeiro"), dedupKey("acao sa", "ANALISTA DE DADOS", "rio de janeiro"));
  assert.notEqual(dedupKey("A", "Analista", "RJ"), dedupKey("A", "Analista", "SP"));
});

test("texto de vaga em HTML vira texto limpo", () => {
  assert.equal(htmlToText("&lt;p&gt;Olá&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;/ul&gt;"), "Olá\n• SQL");
  assert.equal(guessMode("Trabalho 100% remoto"), "remoto");
  assert.ok(matchesKeywords("Analista de Dados Sênior", ["analista de dados"]));
  assert.ok(!matchesKeywords("Designer", ["analista de dados"]));
});

test("contato sai do texto antes de ir para a IA", () => {
  const r = splitContact("Maria Silva\nmaria@gmail.com | (21) 99876-5432\nlinkedin.com/in/maria\nExperiência...");
  assert.equal(r.email, "maria@gmail.com");
  assert.ok(r.phone.includes("99876"));
  assert.equal(r.links.linkedin, "linkedin.com/in/maria");
  assert.ok(!r.redacted.includes("maria@gmail.com"));
  assert.ok(!r.redacted.includes("99876"));
});

test("perfil enviado à IA não tem salário, contato nem diversidade", () => {
  const p = profileForLLM({ full_name: "Maria", email: "m@x.com", salary_clt: 9000, diversity: { race: "Parda" }, skills: ["SQL"] });
  const s = JSON.stringify(p);
  for (const bad of ["9000", "m@x.com", "Parda", "Maria"]) assert.ok(!s.includes(bad), bad);
  assert.deepEqual(p.habilidades, ["SQL"]);
});

test("respostas objetivas vêm do perfil", () => {
  const k = profileAnswers({ salary_clt: 9000, availability: "Imediata", work_modes: ["remoto", "hibrido"], accepts_relocation: false });
  assert.ok(k.find((x) => x.pergunta === "Pretensão salarial").resposta.includes("9.000"));
  assert.equal(k.find((x) => x.pergunta.startsWith("Aceita")).resposta, "Não");
});

test("extensão: classificação de campos", () => {
  const c = (l, el) => F.classify(l, el);
  assert.equal(c("Nome"), "first_name");
  assert.equal(c("Sobrenome"), "last_name");
  assert.equal(c("Nome completo"), "full_name");
  assert.equal(c("E-mail"), "email");
  assert.equal(c("Celular"), "phone");
  assert.equal(c("Perfil do LinkedIn"), "linkedin");
  assert.equal(c("Pretensão salarial (CLT)"), "salary_clt");
  assert.equal(c("Cidade onde mora"), "city");
  assert.equal(c("Aceita mudança de cidade?"), "relocation");
  assert.equal(c("Gênero"), "gender");
  assert.equal(c("Por que você quer trabalhar na Empresa Fictícia?", { tagName: "TEXTAREA" }), "open");
  assert.equal(c("Nome da empresa"), null);
});

test("extensão: escolha de opção em select/radio", () => {
  const opts = [{ text: "Selecione" }, { text: "Mulher" }, { text: "Prefiro não informar" }];
  assert.equal(F.pickOption(opts, "Mulher").text, "Mulher");
  assert.equal(F.pickOption(opts, "Prefiro não informar").text, "Prefiro não informar");
  assert.equal(F.pickOption([{ text: "Sim, aceito" }, { text: "Não" }], "Sim").text, "Sim, aceito");
  assert.equal(F.valueFor("gender", { gender: null }), "Prefiro não informar");
});
