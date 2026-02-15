import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Msg, SessionState, STORAGE_KEY } from "../shared";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function App() {
  const [state, setState] = useState<SessionState>({ status: "idle" });

  // Load from storage on open + whenever storage changes
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then((res) => {
      setState((res[STORAGE_KEY] as SessionState) ?? { status: "idle" });
    });

    const onChanged: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        setState(
          (changes[STORAGE_KEY].newValue as SessionState) ?? { status: "idle" },
        );
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const report = useMemo(() => {
    if (state.status !== "completed") return null;
    return {
      blockName: "Block 1",
      endsAt: state.endsAt,
      reflection: state.reflection,
    };
  }, [state]);

  const start = async () => {
    chrome.runtime.sendMessage(
      {
        type: "START_SESSION",
        payload: { origin: window.location.origin },
      } satisfies Msg,
      (res) => {
        if (chrome.runtime.lastError) {
          console.error("Extension error:", chrome.runtime.lastError.message);
          return;
        }
        console.log("Session started:", res);
      },
    );
  };
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Session Runner</h2>

      {state.status === "idle" && (
        <button
          onClick={start}
          style={{ padding: "10px 14px", borderRadius: 10 }}
        >
          Start
        </button>
      )}

      {state.status === "running" && (
        <div>
          <div style={{ fontWeight: 700 }}>Running…</div>
          <div style={{ opacity: 0.85 }}>
            Block 1 ends at <b>{formatTime(state.endsAt)}</b>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
            You can switch tabs — the end dialog will still appear.
          </div>
        </div>
      )}

      {state.status === "awaiting_reflection" && (
        <div>
          <div style={{ fontWeight: 700 }}>Waiting for reflection…</div>
          <div style={{ opacity: 0.85 }}>
            If you don’t see the dialog, click into any normal webpage tab.
          </div>
        </div>
      )}

      {report && (
        <div style={{ marginTop: 16 }}>
          <h3>Report</h3>
          <div
            style={{
              padding: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
            }}
          >
            <div>
              <b>{report.blockName}</b>
            </div>
            <div style={{ opacity: 0.85 }}>
              Ended at {formatTime(report.endsAt)}
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600 }}>Reflection</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{report.reflection}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
