// src/background/background.ts
import { ALARM_NAME, STORAGE_KEY, type Msg, type SessionState } from "../shared";

/**
 * NEW: keys used for the website <-> extension flow
 * - app_origin: where to redirect user back to (/report)
 * - latest_report: the report the website will request
 */
const APP_ORIGIN_KEY = "app_origin";
const LATEST_REPORT_KEY = "latest_report";

async function setState(state: SessionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function getState(): Promise<SessionState> {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return (res[STORAGE_KEY] as SessionState) ?? { status: "idle" };
}

/**
 * Inject content script if needed (so overlays work without refresh)
 */
async function sendOrInject(tabId: number, msg: any) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
    return;
  } catch {
    // Most common when content script isn't injected yet:
    // "Could not establish connection. Receiving end does not exist."
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"], // must exist in dist/
    });
    await chrome.tabs.sendMessage(tabId, msg);
  }
}

/**
 * Find active tab and show overlay.
 * If we can't message/inject (restricted pages), fallback to notification.
 */
async function notifyActiveTab(msg: any, fallbackTitle: string, fallbackBody: string) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png"),
      title: fallbackTitle,
      message: fallbackBody,
    });
    return;
  }

  const url = tab.url ?? "";
  const isRestricted =
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("https://chrome.google.com/webstore");

  if (isRestricted) {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png"),
      title: fallbackTitle,
      message: fallbackBody,
    });
    return;
  }

  try {
    await sendOrInject(tab.id, msg);
  } catch {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png"),
      title: fallbackTitle,
      message: fallbackBody,
    });
  }
}

/**
 * NEW: open your WEBSITE report page, not the extension runner UI.
 * - If a report tab is already open, focus & update it.
 */
async function openWebReportPage(runId: string) {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  const base = (origin as string) || "http://localhost:5173";
  const url = `${base}/report?runId=${encodeURIComponent(runId)}`;

  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => (t.url ?? "").startsWith(`${base}/report`));

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { url, active: true });
    return;
  }

  await chrome.tabs.create({ url });
}

/**
 * Keep your existing openRunnerTab if you still want extension UI as fallback.
 */
async function openRunnerTab() {
  const url = chrome.runtime.getURL("src/runner/index.html"); // matches your build output dist/src/runner/index.html
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => t.url === url);
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    return;
  }
  await chrome.tabs.create({ url });
}

chrome.runtime.onInstalled.addListener(async () => {
  await setState({ status: "idle" });
});

/**
 * NEW: accept messages from your WEBSITE (http://localhost:5173)
 * This is where the website Start button will talk to the extension.
 *
 * Requires manifest.json:
 * "externally_connectable": { "matches": ["http://localhost:5173/*"] }
 */
chrome.runtime.onMessageExternal.addListener((msg: any, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "START_SESSION") {
      const origin = msg?.payload?.origin as string | undefined;
      if (origin) {
        await chrome.storage.local.set({ [APP_ORIGIN_KEY]: origin });
      }

      const runId = crypto.randomUUID();
      const startedAt = Date.now();
      const endsAt = startedAt + 10_000; // ✅ 1 minute

      await setState({ status: "running", startedAt, endsAt, runId } as any);

      chrome.alarms.create(ALARM_NAME, { when: endsAt });

      await notifyActiveTab(
        { type: "SHOW_RUNNING_OVERLAY", payload: { endsAt } },
        "Session started",
        "Block 1 running…"
      );

      sendResponse({ ok: true, runId });
      return;
    }

    if (msg?.type === "GET_REPORT") {
      const { [LATEST_REPORT_KEY]: report } = await chrome.storage.local.get(LATEST_REPORT_KEY);
      sendResponse({ ok: true, report: report ?? null });
      return;
    }

    sendResponse({ ok: false, error: "Unknown external message" });
  })();

  return true;
});

/**
 * Internal messages (content script + extension UI)
 */
chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "START_SESSION") {
      // Extension-internal start (if you still use your runner UI)
      const runId = crypto.randomUUID();
      const startedAt = Date.now();
      const endsAt = startedAt + 10_000;

      await setState({ status: "running", startedAt, endsAt, runId } as any);
      chrome.alarms.create(ALARM_NAME, { when: endsAt });

      await notifyActiveTab(
        { type: "SHOW_RUNNING_OVERLAY", payload: { endsAt } },
        "Session started",
        "Block 1 running…"
      );

      sendResponse({ ok: true, runId });
      return;
    }

    if (msg.type === "GET_STATE") {
      sendResponse({ ok: true, state: await getState() });
      return;
    }

    if (msg.type === "SUBMIT_REFLECTION") {
      const state = await getState();
      if (state.status !== "awaiting_reflection") {
        sendResponse({ ok: false, error: "Not awaiting reflection" });
        return;
      }

      const reflection = msg.payload.reflection.trim();

      // Save completed state
      const completed: any = {
        status: "completed",
        startedAt: (state as any).startedAt,
        endsAt: (state as any).endsAt,
        reflection,
        runId: (state as any).runId,
      };
      await setState(completed);

      // NEW: save report for website to fetch
      const report = {
        runId: (state as any).runId,
        block: "Block 1",
        startedAt: (state as any).startedAt,
        endedAt: (state as any).endsAt,
        reflection,
      };
      await chrome.storage.local.set({ [LATEST_REPORT_KEY]: report });

      // NEW: redirect user back to WEBSITE /report
      if ((state as any).runId) {
        await openWebReportPage((state as any).runId);
      } else {
        // fallback
        await openRunnerTab();
      }

      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })();

  return true; // async
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== ALARM_NAME) return;

  const state = await getState();
  if (state.status !== "running") return;

  // Move into reflection-required state
  await setState({
    status: "awaiting_reflection",
    startedAt: (state as any).startedAt,
    endsAt: (state as any).endsAt,
    runId: (state as any).runId,
  } as any);

  await notifyActiveTab(
    { type: "SHOW_DONE_OVERLAY" },
    "Block 1 is done",
    "Open a normal tab to reflect."
  );
});
