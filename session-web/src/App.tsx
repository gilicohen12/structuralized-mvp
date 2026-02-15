import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";

const EXTENSION_ID = "npcalcjeddkbmpoghdcnibajlkcbnmnh";

function Home() {
  const [err, setErr] = useState<string | null>(null);

  function canTalkToExtension(): boolean {
    return typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage;
  }

  const start = async () => {
    setErr(null);

    if (!canTalkToExtension()) {
      setErr(
        "Chrome extension messaging is not available. Open this site in Chrome and install/load the extension.",
      );
      return;
    }

    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "START_SESSION", payload: { origin: window.location.origin } },
      (res) => {
        if (chrome.runtime.lastError) {
          setErr(chrome.runtime.lastError.message ?? "Unknown extension error");
          return;
        }
        console.log("START_SESSION response", res);
      },
    );
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h2>Session Web</h2>
      <button onClick={start}>Start</button>
      <div style={{ marginTop: 12 }}>
        <Link to="/report">Go to report</Link>
      </div>
      {err && <pre style={{ marginTop: 12, color: "crimson" }}>{err}</pre>}
    </div>
  );
}

function Report() {
  const [report, setReport] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "GET_REPORT" }, (res) => {
      if (chrome.runtime.lastError) {
        setErr(chrome.runtime.lastError.message ?? "Unknown extension error");
        return;
      }
      setReport(res?.report ?? null);
    });
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h2>Report</h2>
      {err && <pre style={{ color: "crimson" }}>{err}</pre>}
      {!err && !report && <div>No report yet.</div>}
      {report && (
        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
        >
          <div>
            <b>{report.block}</b>
          </div>
          <div style={{ marginTop: 8 }}>
            <b>Reflection:</b>
          </div>
          <div style={{ whiteSpace: "pre-wrap" }}>{report.reflection}</div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Link to="/">Back</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<Report />} />
    </Routes>
  );
}
