# Local Setup

This project has two parts:

- `session-web/` → React website
- `extension/` → Chrome extension

Both must be running.

---

## 1) Start the Website

cd session-web

npm install

npm run dev

open -> http://localhost:5173

## 2) Build the Extension

cd extension

npm install

npm run build

## 3) Load extension into Chrome

Open:
chrome://extensions

Turn on Developer Mode.

Click Load unpacked and select:

extension/dist
