![Slate banner](./resources/banner.svg)

**Slate** is a per-block hybrid markdown editor. The active block renders as a raw textarea; all other blocks render as sanitized GFM HTML. Typora/Obsidian-style live preview, scoped to block granularity.

Built with Electron, Vite, and React.

---

![Features](./resources/header-features.svg)

- **Per-block editing** — click any block to edit it as raw markdown; all others render as formatted HTML
- **Multi-tab editing** — open multiple files simultaneously; each tab maintains independent undo history and dirty state
- **Sidebar file explorer** — auto-roots to the active file's directory; recursive expand/collapse with lazy loading; drag-resizable
- **GFM support** — tables, task lists (`- [ ]`), strikethrough, fenced code blocks, linkify
- **Font selector** — switch between Literary (Lora), Classic (Georgia), Sans, and Mono presets
- **Auto-save** — saves to disk 1 second after the last keystroke when a file is open
- **Unsaved-changes guard** — prompts on close if any tab has unsaved changes; per-tab close prompt when closing dirty tabs
- **Custom dialogs** — all confirmations use in-app styled modals, no OS native dialogs
- **Custom title bar** — frameless window with minimize / maximize / close controls
- **Dark theme** — single dark palette, no light mode

![Running the app](./resources/header-running.svg)

```bash
npm run dev          # start Electron + Vite dev server (HMR enabled)
npm run typecheck    # type-check both main and renderer processes
npx vitest run       # run parser unit tests (21 tests)
```

> **Requires Node >= 21.7** — Vite 7 uses `crypto.hash` which was added in Node 21.7.  
> The project pins `"vite": "^7.0.0"`.

![Project structure](./resources/header-structure.svg)

```
src/
  main/index.ts           — Electron main process (IPC, menu, close-guard)
  preload/index.ts        — contextBridge (the only bridge to the renderer)
  renderer/src/
    types/index.ts        — Block, TabState, EditorState, EditorAction, ElectronAPI
    core/
      parser.ts           — block splitter
      parser.test.ts      — 21 unit tests
      renderer.ts         — markdown-it + DOMPurify
      serializer.ts       — blocks[] → raw markdown string
    context/
      EditorContext.tsx   — useReducer state + dispatch; exposes activeTab
      DialogContext.tsx   — Promise-based custom modal system
    hooks/
      useFileOps.ts       — new/open/save/reload; operates on the active tab
      useSidebarResize.ts — pointer-drag resize; persists width to localStorage
    components/
      Editor.tsx          — root: auto-save, keyboard save, IPC menu wiring
      TabBar.tsx          — tab strip with dirty indicator and close-tab dialog
      Sidebar.tsx         — recursive file tree, lazy-loaded, click-to-open
      BlockList.tsx       — maps blocks → EditableBlock or RenderedBlock
      EditableBlock.tsx   — <textarea>, auto-resize, keyboard navigation
      RenderedBlock.tsx   — dangerouslySetInnerHTML, click-to-activate
      Toolbar.tsx         — title bar, window controls, file actions, font selector
      FontSelector.tsx    — font preset switcher (persisted to localStorage)
      Dialog.tsx          — in-app modal rendered from DialogContext
    styles/
      fonts.css           — @font-face (JetBrains Mono, Lora, Inter)
      tokens.css          — CSS variables (colors, fonts, layout)
      typography.css      — rendered markdown type scale
      editor.css          — flex-row layout: sidebar + content area
      blocks.css          — .block, .block--active, GFM table/task styles
      toolbar.css         — title bar, action bar, window buttons
      sidebar.css         — file tree, drag handle
      tabs.css            — tab bar, active/dirty states
      dialog.css          — modal overlay and button variants
resources/
  icon.png               — 512px app icon
  icon.ico               — Windows taskbar icon
```

![Tech stack](./resources/header-tech.svg)

| Package                  | Version     | Role                 |
| ------------------------ | ----------- | -------------------- |
| `electron`               | `^39`       | Desktop shell        |
| `vite` / `electron-vite` | `^7` / `^5` | Build + HMR          |
| `react`                  | `^19`       | UI                   |
| `markdown-it`            | `^14`       | Markdown parser      |
| `markdown-it-task-lists` | —           | GFM task list syntax |
| `DOMPurify`              | —           | XSS sanitisation     |

![Design tokens](./resources/header-tokens.svg)

All colours and layout variables are defined in `src/renderer/src/styles/tokens.css`.

| Token                 | Value     | Role                                    |
| --------------------- | --------- | --------------------------------------- |
| `--color-bg`          | `#1a2333` | App background, sidebar background     |
| `--color-surface`     | `#212d3e` | Active block, active tab, editor pane   |
| `--color-border`      | `#2d3f57` | Borders, rendered line fill             |
| `--color-text`        | `#e2e8f2` | Primary text, headings                  |
| `--color-secondary`   | `#8898aa` | Rendered body text, sidebar files       |
| `--color-muted`       | `#4a6175` | Hints, UI chrome, sidebar dirs          |
| `--color-accent`      | `#5b9cf6` | Cursor, active tab underline, links     |
| `--color-accent-deep` | `#2a5f9e` | Active block background stripe          |
| `--sidebar-width`     | `220px`   | Sidebar width (overridden by drag/localStorage) |
