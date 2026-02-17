import { useEffect, useState } from "react";

import { EXTENSION_ID } from "../shared";

export default function Report() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "GET_REPORT" }, (res) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      setReport(res.report);
    });
  }, []);

  if (!report) return <div>Loading...</div>;

  return (
    <div>
      <h1>Report</h1>
      <p>Block: {report.block}</p>
      <p>Reflection: {report.reflection}</p>
    </div>
  );
}
