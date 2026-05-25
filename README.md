<div style="background:#1a2333; border-radius:12px; padding:2rem 2.5rem; display:flex; align-items:center; justify-content:space-between;gap:1.5rem;">
    <div style="display:flex; align-items:center; gap:1rem;">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="8" fill="#212d3e"/>
            <rect x="8" y="10" width="42" height="6" rx="3" fill="#e2e8f2"/>
            <rect x="18" y="20" width="40" height="6" rx="3" fill="#2a5f9e"/>
            <rect x="8" y="20" width="6" height="6" rx="3" fill="#5b9cf6"/>
            <rect x="8" y="30" width="32" height="6" rx="3" fill="#2d3f57"/>
            <rect x="8" y="40" width="48" height="6" rx="3" fill="#2d3f57"/>
            <rect x="8" y="50" width="36" height="6" rx="3" fill="#2d3f57"/>
        </svg>
        <div style="font-family:'JetBrains Mono', 'Fira Code', monospace;color:#e2e8f2; font-size:42px;line-height:1;">
            slate<span style="color:#5b9cf6;">.</span>
        </div>
    </div>
    <div>
        <div style="font-family:system-ui; color:#4a6175; font-size:12px; letter-spacing:0.18em; margin-top:6px;">
            MARKDOWN EDITOR
        </div>
        <div style="font-family:system-ui; color:#4a6175; font-size:12px; letter-spacing:0.18em;">
            A clean surface for clear thinking.
        </div>
    </div>
</div>

---

**Slate** is a per-block hybrid markdown editor. The active block renders as a raw textarea; all other blocks render as sanitized GFM HTML. Typora/Obsidian-style live preview, scoped to block granularity.

Built with Electron, Vite, and React.

---

## Features

- **Per-block editing** — click any block to edit it as raw markdown; all others render as formatted HTML
- **GFM support** — tables, task lists (`- [ ]`), strikethrough, fenced code blocks, linkify
- **Font selector** — switch between Literary (Lora), Classic (Georgia), Sans, and Mono presets
- **Auto-save** — saves to disk 1 second after the last keystroke when a file is open
- **Unsaved-changes guard** — prompts to save, discard, or cancel on close
- **Custom title bar** — frameless window with minimize / maximize / close controls
- **Dark theme** — single dark palette, no light mode

---

## Running the app

```bash
npm run dev          # start Electron + Vite dev server (HMR enabled)
npm run typecheck    # type-check both main and renderer processes
npx vitest run       # run parser unit tests (21 tests)
```

> **Requires Node >= 21.7** — Vite 7 uses `crypto.hash` which was added in Node 21.7.  
> The project pins `"vite": "^7.0.0"`.

---

## Project structure

```
src/
  main/index.ts           — Electron main process (IPC, menu, close-guard)
  preload/index.ts        — contextBridge (the only bridge to the renderer)
  renderer/src/
    types/index.ts        — Block, EditorState, EditorAction, ElectronAPI
    core/
      parser.ts           — block splitter
      parser.test.ts      — 21 unit tests
      renderer.ts         — markdown-it + DOMPurify
      serializer.ts       — blocks[] → raw markdown string
    context/
      EditorContext.tsx   — useReducer state + dispatch
    components/
      Editor.tsx          — root: auto-save, keyboard save, IPC menu wiring
      BlockList.tsx       — maps blocks → EditableBlock or RenderedBlock
      EditableBlock.tsx   — <textarea>, auto-resize, keyboard navigation
      RenderedBlock.tsx   — dangerouslySetInnerHTML, click-to-activate
      Toolbar.tsx         — title bar, window controls, file actions, font selector
      FontSelector.tsx    — font preset switcher (persisted to localStorage)
    styles/
      fonts.css           — @font-face (JetBrains Mono, Lora, Inter)
      tokens.css          — CSS variables (colors, fonts, layout)
      typography.css      — rendered markdown type scale
      editor.css          — layout, scroll container
      blocks.css          — .block, .block--active, GFM table/task styles
      toolbar.css         — title bar, action bar, window buttons
resources/
  icon.png               — 512px app icon
  icon.ico               — Windows taskbar icon
```

---

## Tech stack

| Package | Version | Role |
|---|---|---|
| `electron` | `^39` | Desktop shell |
| `vite` / `electron-vite` | `^7` / `^5` | Build + HMR |
| `react` | `^19` | UI |
| `markdown-it` | `^14` | Markdown parser |
| `markdown-it-task-lists` | — | GFM task list syntax |
| `DOMPurify` | — | XSS sanitisation |

---

## Design tokens

All colours are defined in `src/renderer/src/styles/tokens.css`.

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#1a2333` | App background |
| `--color-surface` | `#212d3e` | Active block, editor pane |
| `--color-border` | `#2d3f57` | Borders, rendered line fill |
| `--color-text` | `#e2e8f2` | Primary text, headings |
| `--color-secondary` | `#8898aa` | Rendered body text |
| `--color-muted` | `#4a6175` | Hints, UI chrome |
| `--color-accent` | `#5b9cf6` | Cursor, active border, links |
| `--color-accent-deep` | `#2a5f9e` | Active block background stripe |
