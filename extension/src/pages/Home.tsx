const EXTENSION_ID = "npcalcjeddkbmpoghdcnibajlkcbnmnh";

export default function Home() {
  const start = async () => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        type: "START_SESSION",
        payload: { origin: window.location.origin },
      },
      (res) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return;
        }
        console.log("started", res);
      },
    );
  };

  return (
    <div>
      <h1>Session App</h1>
      <button onClick={start}>Start</button>
    </div>
  );
}
