const $ = (id) => document.getElementById(id);
const bg = (msg) => new Promise((r) => chrome.runtime.sendMessage(msg, r));

async function toTab(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) { $("state").textContent = "Abra a página do formulário da vaga e tente de novo."; return; }
  chrome.tabs.sendMessage(tab.id, { type }, () => {
    if (chrome.runtime.lastError) $("state").textContent = "Recarregue a página da vaga (F5) e tente de novo.";
    else window.close();
  });
}

(async () => {
  const s = await bg({ type: "status" });
  const st = s?.data;
  if (st?.connected) {
    $("state").innerHTML = `Conectada a <a href="${st.apiBase}" target="_blank">${new URL(st.apiBase).host}</a> · v${st.version}`;
    $("actions").hidden = false;
    $("logout").hidden = false;
  } else {
    $("state").textContent = `Não conectada · v${st?.version ?? "?"}`;
    $("connect").hidden = false;
  }
  $("fill").onclick = () => toTab("fill");
  $("panel").onclick = () => toTab("panel");
  $("logout").onclick = async () => { await bg({ type: "logout" }); location.reload(); };
})();
