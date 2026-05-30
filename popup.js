const els = {
  exportButton: document.getElementById("exportButton"),
  copyExportButton: document.getElementById("copyExportButton"),
  importButton: document.getElementById("importButton"),
  importFile: document.getElementById("importFile"),
  importMode: document.getElementById("importMode"),
  resetConfirm: document.getElementById("resetConfirm"),
  resetConfirmCheck: document.getElementById("resetConfirmCheck"),
  importPasteToggle: document.getElementById("importPasteToggle"),
  methodSelect: document.getElementById("methodSelect"),
  methodBlurb: document.getElementById("methodBlurb"),
  copyPromptButton: document.getElementById("copyPromptButton"),
  pasteArea: document.getElementById("pasteArea"),
  pasteInput: document.getElementById("pasteInput"),
  importPasteButton: document.getElementById("importPasteButton"),
  statusPill: document.getElementById("statusPill"),
  summary: document.getElementById("summary"),
};

els.exportButton.addEventListener("click", () => exportBookmarks());
els.copyExportButton.addEventListener("click", () => copyExport());
els.importButton.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) importBookmarks(file);
  event.target.value = "";
});
els.importPasteToggle.addEventListener("click", () => togglePasteArea());
els.importPasteButton.addEventListener("click", () => importPasted());
els.importMode.addEventListener("change", () => updateImportMode());
els.copyPromptButton.addEventListener("click", () => copyRefactorPrompt());
els.methodSelect.addEventListener("change", () => updateMethodBlurb());

initMethods();

function initMethods() {
  for (const method of METHODS) {
    const option = document.createElement("option");
    option.value = method.id;
    option.textContent = method.label;
    els.methodSelect.appendChild(option);
  }
  updateMethodBlurb();
}

function currentMethod() {
  return METHODS.find((method) => method.id === els.methodSelect.value) || METHODS[0];
}

function updateMethodBlurb() {
  els.methodBlurb.textContent = currentMethod().blurb;
}

function chromeCall(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve(result);
      }
    });
  });
}

const getTree = () => chromeCall(chrome.bookmarks.getTree.bind(chrome.bookmarks));
const createBookmark = (payload) => chromeCall(chrome.bookmarks.create.bind(chrome.bookmarks), payload);
const removeBookmark = (id) => chromeCall(chrome.bookmarks.remove.bind(chrome.bookmarks), id);
const removeTree = (id) => chromeCall(chrome.bookmarks.removeTree.bind(chrome.bookmarks), id);

function getNode(id) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getSubTree(id, (nodes) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(nodes[0]);
    });
  });
}

async function getBookmarksBar() {
  const tree = await getTree();
  const children = tree[0].children || [];
  const bar = children.find((node) => node.title === "Bookmarks Bar") || children[0];
  if (!bar) throw new Error("Cannot find Bookmarks Bar.");
  return bar;
}

async function buildBarHtml() {
  const bar = await getNode((await getBookmarksBar()).id);
  return { bar, html: buildNetscapeHtml(bar.children || []) };
}

async function exportBookmarks() {
  try {
    setStatus("Exporting", "warn");
    els.exportButton.disabled = true;
    const { bar, html } = await buildBarHtml();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`bookmarks-bar-${stamp}.html`, html, "text/html");
    renderMessage(
      `<div><strong>Exported.</strong></div>` +
        `<div>${countBookmarks(bar)} bookmarks saved to bookmarks-bar-${stamp}.html.</div>` +
        `<div>Standard Netscape format — re-importable here or into any browser.</div>`
    );
    setStatus("Exported", "ok");
  } catch (error) {
    renderError(error);
    setStatus("Error", "error");
  } finally {
    els.exportButton.disabled = false;
  }
}

async function copyExport() {
  try {
    setStatus("Copying", "warn");
    els.copyExportButton.disabled = true;
    const { bar, html } = await buildBarHtml();
    await navigator.clipboard.writeText(html);
    flash(els.copyExportButton, "Copied ✓");
    renderMessage(
      `<div><strong>Copied to clipboard.</strong></div>` +
        `<div>${countBookmarks(bar)} bookmarks as Netscape HTML — paste it into an agent chat.</div>`
    );
    setStatus("Copied", "ok");
  } catch (error) {
    renderError(error);
    setStatus("Error", "error");
  } finally {
    els.copyExportButton.disabled = false;
  }
}

function togglePasteArea() {
  if (els.pasteArea.hasAttribute("hidden")) {
    els.pasteArea.removeAttribute("hidden");
    els.pasteInput.focus();
  } else {
    els.pasteArea.setAttribute("hidden", "");
  }
}

function updateImportMode() {
  const replace = els.importMode.value === "replace";
  els.resetConfirm.hidden = !replace;
  if (!replace) els.resetConfirmCheck.checked = false;
}

async function clearBar(barId) {
  const node = await getNode(barId);
  for (const child of node.children || []) {
    if (child.url) await removeBookmark(child.id);
    else await removeTree(child.id);
  }
}

async function importBookmarks(file) {
  const text = await file.text();
  await importFromText(text, "the selected file");
}

function importPasted() {
  const text = els.pasteInput.value.trim();
  if (!text) {
    setStatus("Empty", "warn");
    renderMessage(`<div>Paste exported bookmark HTML or JSON into the box first.</div>`);
    return;
  }
  importFromText(text, "the pasted content").then((count) => {
    if (count != null) els.pasteInput.value = "";
  });
}

async function importFromText(text, sourceLabel) {
  const replace = els.importMode.value === "replace";
  if (replace && !els.resetConfirmCheck.checked) {
    setStatus("Confirm", "warn");
    renderMessage(
      `<div><strong>Replace mode is on.</strong></div>` +
        `<div>Tick "Erase all current bookmarks" to confirm, or switch back to Add.</div>`
    );
    return null;
  }

  setStatus("Importing", "warn");
  els.importButton.disabled = true;
  els.importPasteButton.disabled = true;
  try {
    const nodes = parseBookmarksFile(text);
    if (!nodes.length) throw new Error(`No bookmarks found in ${sourceLabel}.`);

    const bar = await getBookmarksBar();
    let count;

    if (replace) {
      await clearBar(bar.id);
      count = await createTree(nodes, bar.id);
      els.resetConfirmCheck.checked = false;
      renderMessage(
        `<div><strong>Replaced.</strong></div>` +
          `<div>Bar reset — ${count} bookmarks imported to the Bookmarks Bar root.</div>`
      );
    } else {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const folder = await createBookmark({ parentId: bar.id, title: `Imported ${stamp}` });
      count = await createTree(nodes, folder.id);
      renderMessage(
        `<div><strong>Imported.</strong></div>` +
          `<div>${count} bookmarks added under "Imported ${stamp}" in the Bookmarks Bar.</div>`
      );
    }

    setStatus(replace ? "Replaced" : "Imported", "ok");
    return count;
  } catch (error) {
    renderError(error);
    setStatus("Error", "error");
    return null;
  } finally {
    els.importButton.disabled = false;
    els.importPasteButton.disabled = false;
  }
}

async function copyRefactorPrompt() {
  try {
    const method = currentMethod();
    await navigator.clipboard.writeText(buildPrompt(method));
    flash(els.copyPromptButton, "Copied ✓");
    renderMessage(
      `<div><strong>Refactor prompt copied — ${escapeHtml(method.label)}.</strong></div>` +
        `<div>Paste it into an agent chat together with your exported HTML.</div>`
    );
    setStatus("Copied", "ok");
  } catch (error) {
    renderError(error);
    setStatus("Error", "error");
  }
}

function flash(button, text) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = button.dataset.label;
  }, 1500);
}

async function createTree(nodes, parentId) {
  let count = 0;
  for (const node of nodes) {
    if (node.url) {
      await createBookmark({ parentId, title: node.title || node.url, url: node.url });
      count += 1;
    } else {
      const created = await createBookmark({ parentId, title: node.title || "Folder" });
      count += await createTree(node.children || [], created.id);
    }
  }
  return count;
}

function buildNetscapeHtml(nodes) {
  const lines = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];
  for (const node of nodes) appendNetscapeNode(node, lines, 1);
  lines.push("</DL><p>");
  return lines.join("\n");
}

function appendNetscapeNode(node, lines, depth) {
  const indent = "    ".repeat(depth);
  if (node.url) {
    lines.push(`${indent}<DT><A HREF="${escapeAttr(node.url)}">${escapeHtml(node.title || "")}</A>`);
    return;
  }
  lines.push(`${indent}<DT><H3>${escapeHtml(node.title || "")}</H3>`);
  lines.push(`${indent}<DL><p>`);
  for (const child of node.children || []) appendNetscapeNode(child, lines, depth + 1);
  lines.push(`${indent}</DL><p>`);
}

function parseBookmarksFile(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) return data;
    return data.tree || data.children || [];
  }
  return parseNetscape(text);
}

function parseNetscape(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rootList = doc.querySelector("dl");
  return rootList ? parseNetscapeList(rootList) : [];
}

function parseNetscapeList(dl) {
  const items = [];
  for (const dt of dl.children) {
    if (dt.tagName !== "DT") continue;
    const heading = [...dt.children].find((child) => child.tagName === "H3");
    const anchor = [...dt.children].find((child) => child.tagName === "A");
    if (heading) {
      let childList = [...dt.children].find((child) => child.tagName === "DL");
      if (!childList && dt.nextElementSibling && dt.nextElementSibling.tagName === "DL") {
        childList = dt.nextElementSibling;
      }
      items.push({
        title: heading.textContent,
        children: childList ? parseNetscapeList(childList) : [],
      });
    } else if (anchor) {
      const url = anchor.getAttribute("href");
      if (url) items.push({ title: anchor.textContent, url });
    }
  }
  return items;
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function countBookmarks(node) {
  if (!node) return 0;
  if (node.url) return 1;
  return (node.children || []).reduce((sum, child) => sum + countBookmarks(child), 0);
}

function setStatus(text, type = "") {
  els.statusPill.textContent = text;
  els.statusPill.className = `pill ${type}`.trim();
}

function renderMessage(html) {
  els.summary.innerHTML = html;
}

function renderError(error) {
  els.summary.innerHTML = `<div><strong>Error:</strong> ${escapeHtml(error.message || String(error))}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
