import type { Msg } from "../shared";

function ensureRoot() {
  const id = "session-ext-overlay-root";
  let root = document.getElementById(id) as HTMLDivElement | null;
  if (root) return root;

  root = document.createElement("div");
  root.id = id;
  root.style.position = "fixed";
  root.style.zIndex = "2147483647";
  root.style.top = "16px";
  root.style.right = "16px";
  root.style.width = "360px";
  root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  document.documentElement.appendChild(root);
  return root;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderRunning(endsAt: number) {
  const root = ensureRoot();
  root.innerHTML = "";

  const card = document.createElement("div");
  card.style.cssText =
    "background:white;border:1px solid rgba(0,0,0,0.15);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.2);padding:12px;";

  card.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">Block 1 in session</div>
    <div style="font-size:14px;opacity:0.85;margin-bottom:10px;">
      Ends at <b>${formatTime(endsAt)}</b>
    </div>
  `;

  const btn = document.createElement("button");
  btn.textContent = "Dismiss";
  btn.style.cssText = "padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,0.2);background:white;";
  btn.onclick = () => (root.innerHTML = "");

  card.appendChild(btn);
  root.appendChild(card);
}

chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg.type === "SHOW_RUNNING_OVERLAY") renderRunning(msg.payload.endsAt);
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== "SHOW_DONE_OVERLAY") return;

  const reflection = prompt("Block 1 is done. Reflect:");
  if (!reflection) return;

  chrome.runtime.sendMessage({
    type: "SUBMIT_REFLECTION",
    payload: { reflection }
  });
});
