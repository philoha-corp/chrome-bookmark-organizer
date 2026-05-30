// Prompt methods for the "Refactor with an agent" action.
// Each method defines a taxonomy; buildPrompt() wraps it with shared rules
// and the Netscape-HTML output contract. Single source of truth for popup.js.

const PROMPT_INTRO =
  "You are reorganizing my Chrome bookmarks. I've attached a bookmarks export in " +
  "**Netscape Bookmark format** (the standard `<!DOCTYPE NETSCAPE-Bookmark-file-1>` HTML " +
  "that Chrome, Firefox, and Safari produce).\n\n" +
  "**Your task:** sort every bookmark into the taxonomy below and return a single, valid " +
  "Netscape HTML file I can import back into Chrome.";

const PROMPT_OUTPUT = [
  "### Output format",
  "",
  "Return **only** a complete Netscape bookmark file inside one fenced ```html code block — no commentary before or after. It must start exactly with:",
  "",
  "```",
  "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  "<TITLE>Bookmarks</TITLE>",
  "<H1>Bookmarks</H1>",
  "<DL><p>",
  "```",
  "",
  "…with each top-level folder as a `<DT><H3>…</H3>` followed by its own `<DL><p>…</DL><p>`, " +
    "each bookmark as `<DT><A HREF=\"…\">Title</A>`, and the file closed with `</DL><p>`. " +
    "This is the exact structure Chrome imports, so keep the nesting well-formed.",
  "",
  "After the code block, add a short summary: how many bookmarks went into each top-level folder.",
].join("\n");

const METHODS = [
  {
    id: "johnny-decimal",
    label: "Johnny.Decimal",
    blurb: "Numbered areas 00–90 that sort in a fixed order.",
    intro:
      "Use these **exact** folder names — including the number prefix — as the top-level folders. " +
      "The numbers keep them in a fixed order (a Johnny.Decimal-style scheme), so do not drop or change the prefixes.",
    ordering: "Keep the top-level folders in the exact numeric order listed above.",
    folders: [
      ["00 System", "Personal OS / ops: Jira, Notion, workspaces, vaults, agents, automations, routines, memory, dashboards for running my life/work."],
      ["01 Inbox", "Anything you genuinely can't classify. Use sparingly — try the other categories first."],
      ["10 Projects", "Specific projects, clients, companies, startups, and their related links."],
      ["20 Tools", "Tools, apps, extensions, CLIs, APIs, SDKs, libraries, frameworks, UI kits, and dev platforms (GitHub, npm, Vercel, Supabase, Firebase, Cloudflare, Figma, Linear, Postman, OpenAI, Claude, etc.)."],
      ["30 Knowledge", "Learning & reference: AI/ML/LLM, research, reading, blogs, courses, docs, news, security/hacking, articles to learn from."],
      ["40 Content", "Content creation & social: writing, LinkedIn, YouTube, reels, video, creators, copywriting, branding, marketing, SEO, newsletters, threads."],
      ["50 Media", "Visual/design assets & inspiration: design references, moodboards, fonts, icons, templates, palettes, Dribbble, Behance, Pinterest, Are.na, Unsplash."],
      ["60 Lab", "Experiments, prototypes, ideas, sandboxes, demos, proofs of concept."],
      ["70 External", "External references & resources: vendor docs, example repos, open-source samples, third-party resources I refer to but don't own."],
      ["80 Personal", "Life: travel, shopping, finance, trading, watching, movies, music, health, sports, games."],
      ["90 Archive", "Old, deprecated, done, paused, \"maybe later\" — things I want to keep but not see."],
    ],
  },
  {
    id: "para",
    label: "PARA (Projects · Areas · Resources · Archive)",
    blurb: "Tiago Forte's method — by actionability, not topic.",
    intro:
      "Use these four top-level folders (the PARA method by Tiago Forte). Sort by how actionable each " +
      "bookmark is, not by topic. Inside **Resources** you may add topic subfolders.",
    ordering: "Order the top-level folders: Projects, Areas, Resources, Archive.",
    folders: [
      ["Projects", "Short-term efforts with a clear goal and an end, that I'm actively working on right now."],
      ["Areas", "Ongoing responsibilities to maintain over time with no end date (health, finances, a product, a team, home)."],
      ["Resources", "Topics or interests I keep for reference but aren't tied to a current project (add topic subfolders here)."],
      ["Archive", "Inactive items from the other three — finished projects, dormant areas, resources I no longer use."],
    ],
  },
  {
    id: "topic",
    label: "Topic-based (simple)",
    blurb: "Plain, everyday folders. Good for a quick clean-up.",
    intro:
      "Use these plain, human-friendly top-level folders. Inside each you may add one level of subfolders when it adds clarity.",
    ordering: "Order the top-level folders alphabetically, but keep Read Later and Archive last.",
    folders: [
      ["Work", "Job, clients, projects, company tools, work dashboards."],
      ["Dev & Tools", "Code, GitHub, docs, APIs, SaaS tools, extensions, dev utilities."],
      ["Learning", "Courses, tutorials, articles, research, things to study."],
      ["Media & Design", "Design inspiration, fonts, icons, templates, image/asset galleries."],
      ["Entertainment", "YouTube, streaming, music, games, things to watch."],
      ["Shopping & Finance", "Stores, products, banking, trading, crypto, invoices."],
      ["Social", "LinkedIn, X, Instagram, Reddit, forums, communities."],
      ["Personal", "Travel, health, home, hobbies, personal accounts."],
      ["Read Later", "Articles and pages saved to read when there's time."],
      ["Archive", "Old, done, or 'maybe later' bookmarks I want to keep but not see."],
    ],
  },
  {
    id: "type",
    label: "By type / domain",
    blurb: "Grouped by the kind of website each link is.",
    intro:
      "Group bookmarks by the *kind* of site each one is, using these top-level folders. When a link could fit " +
      "two, choose by its primary purpose.",
    ordering: "Keep the top-level folders in the order listed above.",
    folders: [
      ["Development", "GitHub, package registries, framework/API docs, developer tools and platforms."],
      ["AI & Apps", "AI products, SaaS apps, web tools, browser extensions, dashboards."],
      ["Reading & News", "Articles, blogs, newsletters, news sites, long-form to read."],
      ["Video & Media", "YouTube, streaming, podcasts, design galleries, image/asset sites."],
      ["Social & Community", "LinkedIn, X, Instagram, Reddit, forums, Discord/Slack, communities."],
      ["Shopping", "Online stores, marketplaces, product pages, deals."],
      ["Finance", "Banking, trading, crypto, accounting, invoices."],
      ["Reference", "Docs and pages I look things up in (manuals, wikis, cheat sheets)."],
      ["Inbox", "Anything that doesn't clearly fit a category above."],
      ["Archive", "Old, dead, or no-longer-relevant links to keep out of sight."],
    ],
  },
];

function buildPrompt(method) {
  const table = method.folders
    .map(([name, desc]) => `| \`${name}\` | ${desc} |`)
    .join("\n");

  const rules = [
    "### Rules",
    "",
    "1. **Lose nothing.** Every bookmark in the input must appear in the output exactly once. Preserve each URL **byte-for-byte** — do not edit, normalize, or shorten links.",
    "2. **Dedupe** only exact-duplicate URLs (keep the one with the better title).",
    "3. **Keep useful sub-structure.** Within a top-level folder you may keep or create one level of subfolders when it adds clarity. Don't over-nest.",
    "4. **Clean folder names** to readable Title Case. Don't rename bookmark titles unless one is empty — then use its domain.",
    `5. **Sort** each folder: subfolders first (alphabetical), then bookmarks (alphabetical). ${method.ordering}`,
    "6. **Always create every top-level folder listed above**, even if some end up empty.",
    "7. When a bookmark could fit two categories, prefer the more specific one.",
  ].join("\n");

  return [
    PROMPT_INTRO,
    "",
    `### Top-level taxonomy — ${method.label}`,
    "",
    method.intro,
    "",
    "| Folder | What belongs here |",
    "|---|---|",
    table,
    "",
    rules,
    "",
    PROMPT_OUTPUT,
  ].join("\n");
}
