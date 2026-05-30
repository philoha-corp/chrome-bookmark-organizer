# Bookmark Organizer

A Chrome extension to **export, import, and AI-refactor** your Bookmarks Bar — using Chrome's own `chrome.bookmarks` API. Back up your bookmarks to a standard file or clipboard, have an AI agent reorganize them into a clean taxonomy, then import the result back.

## Install

1. Open Chrome with the profile you want to use.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select this extension's folder (the one containing `manifest.json`).

## Use

The popup is grouped into **Export**, **Import**, and **Refactor** sections.

**Export**
- **Copy to Clipboard** copies the whole Bookmarks Bar as Netscape HTML, ready to paste into an agent chat.
- **Download File** saves it as `bookmarks-bar-YYYY-MM-DD.html` — the same format Chrome, Firefox, Safari, and Edge use, so it re-imports anywhere.

**Import** (both add contents under a new `Imported <timestamp>` folder — never overwriting existing bookmarks)
- **Paste HTML** opens a box; paste the HTML the agent gives you (use its copy button) and click **Import Pasted Bookmarks**.
- **Choose File…** reads a `.html` (Netscape) or `.json` file.

## Refactor with an agent

The extension only moves bytes in and out — the *sorting* is done by an AI agent:

1. **Copy to Clipboard** (or **Download File**) to get your bookmarks.
2. Pick an **Organizing method**, then **Copy Refactor Prompt** and paste the prompt + your bookmarks into an agent chat. The agent reorganizes everything into the chosen taxonomy and returns new Netscape HTML.
3. **Paste HTML** → **Import Pasted Bookmarks** to load the result back in.

Available methods (defined in [`prompts.js`](prompts.js)):

- **Johnny.Decimal** — numbered areas `00 System … 90 Archive` that sort in a fixed order (see [`REFACTOR_PROMPT.md`](REFACTOR_PROMPT.md) for the full reference).
- **PARA** — Projects · Areas · Resources · Archive, sorted by actionability.
- **Topic-based (simple)** — plain everyday folders for a quick clean-up.
- **By type / domain** — grouped by the kind of website each link is.

## Privacy

This extension runs entirely on your machine. It uses only two permissions:

- `bookmarks` — to read, export, and create your bookmarks.
- `clipboardWrite` — to copy the export / refactor prompt to your clipboard.

It requests no host or page access, makes no network requests, and sends your data nowhere. The AI refactoring happens in whatever agent chat **you** paste into — the extension just prepares the prompt and reads back the result.
