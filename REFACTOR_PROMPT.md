# Bookmark Refactor Prompt

How to use:

1. Open the **Bookmark Organizer** extension and click **Export Bookmark Bar** to download `bookmarks-bar-YYYY-MM-DD.html`.
2. Open an agent chat (Claude, etc.), **drop in that HTML file**, and paste the prompt below.
3. Save the agent's returned HTML, then click **Import Bookmark Bar** to load it back.

---

## Prompt (copy everything below)

You are reorganizing my Chrome bookmarks. I've attached a bookmarks export in **Netscape Bookmark format** (the standard `<!DOCTYPE NETSCAPE-Bookmark-file-1>` HTML that Chrome, Firefox, and Safari produce).

**Your task:** sort every bookmark into the fixed top-level taxonomy below and return a single, valid Netscape HTML file I can import back into Chrome.

### Top-level taxonomy (use these exact folder names, in this order)

| Folder | What belongs here |
|---|---|
| `00 System` | Personal OS / ops: Jira, Notion, workspaces, vaults, agents, automations, routines, memory, dashboards for running my life/work. |
| `01 Inbox` | Anything you genuinely can't classify. Use sparingly — try the other categories first. |
| `10 Projects` | Specific projects, clients, companies, startups, and their related links. |
| `20 Tools` | Tools, apps, extensions, CLIs, APIs, SDKs, libraries, frameworks, UI kits, and dev platforms (GitHub, npm, Vercel, Supabase, Firebase, Cloudflare, Figma, Linear, Postman, OpenAI, Claude, etc.). |
| `30 Knowledge` | Learning & reference: AI/ML/LLM, research, reading, blogs, courses, docs, news, security/hacking, articles to learn from. |
| `40 Content` | Content creation & social: writing, LinkedIn, YouTube, reels, video, creators, copywriting, branding, marketing, SEO, newsletters, threads. |
| `50 Media` | Visual/design assets & inspiration: design references, moodboards, fonts, icons, templates, palettes, Dribbble, Behance, Pinterest, Are.na, Unsplash. |
| `60 Lab` | Experiments, prototypes, ideas, sandboxes, demos, proofs of concept. |
| `70 External` | External references & resources: vendor docs, example repos, open-source samples, third-party resources I refer to but don't own. |
| `80 Personal` | Life: travel, shopping, finance, trading, watching, movies, music, health, sports, games. |
| `90 Archive` | Old, deprecated, done, paused, "maybe later" — things I want to keep but not see. |

### Rules

1. **Lose nothing.** Every bookmark in the input must appear in the output exactly once. Preserve each URL **byte-for-byte** — do not edit, normalize, or shorten links.
2. **Dedupe** only exact-duplicate URLs (keep the one with the better title).
3. **Keep useful sub-structure.** Within a top-level folder you may keep or create one level of subfolders (e.g. `20 Tools/AI`, `30 Knowledge/Courses`) when it adds clarity. Don't over-nest.
4. **Clean folder names** to readable Title Case (e.g. `ui_kit` → `UI Kits`, `whats news` → `News`, `arena` → `Are.na`). Don't rename bookmark titles unless one is empty — then use its domain.
5. **Sort** each folder: subfolders first (alphabetical), then bookmarks (alphabetical). Keep the 11 top-level folders in the numeric order above.
6. **Always create all 11 top-level folders**, even if some end up empty.
7. When a bookmark could fit two categories, prefer the more specific one (a specific project link → `10 Projects` over `20 Tools`).

### Output format

Return **only** a complete Netscape bookmark file inside one fenced ```html code block — no commentary before or after. It must start exactly with:

```
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
```

…with each top-level taxonomy folder as a `<DT><H3>…</H3>` followed by its own `<DL><p>…</DL><p>`, each bookmark as `<DT><A HREF="…">Title</A>`, and the file closed with `</DL><p>`. This is the exact structure Chrome imports, so keep the nesting well-formed.

After the code block is fine to add a short summary: how many bookmarks went into each top-level folder.
