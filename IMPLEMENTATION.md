# Inline Markdown Editor — Architecture & Implementation Plan

---

## ⚠️ NOTES FOR IMPLEMENTATION DIRECTOR

### Decisions (Resolved)

All five open questions from v1.0 have been answered by the client:

1. **Platform**: Electron desktop app. Use `electron-vite` as the build scaffolding — it wraps Vite with Electron-aware config out of the box and is the current community standard. Do NOT use `create-react-app` or plain Vite; use `electron-vite`.
2. **Framework**: React + TypeScript throughout. No vanilla JS.
3. **Markdown flavor**: GitHub Flavored Markdown (GFM). Use `markdown-it` with `markdown-it-gfm` plugins (tables, task lists, strikethrough, autolink). Alternatively, consider `marked` with GFM mode enabled — either is acceptable, but be consistent.
4. **Persistence**: Native file system via Electron's `fs` module (Node.js). v1 supports open-file and new-file only. A file explorer sidebar is explicitly deferred to a later version.
5. **Mobile**: Out of scope. Desktop-only. No touch event handling required.

### Implementation Notes (Carry-Over + New)

- The hardest part of this editor is **cursor/line tracking** — not the markdown rendering. Allocate extra time here.
- Do NOT use `contenteditable` on the rendered blocks. The edit/render split must be enforced at the data layer.
- Use `markdown-it` with GFM plugins. Do not write a custom parser.
- The `textarea` for the active block must maintain **exact character offsets** when switching in/out of edit mode — test this exhaustively with multi-byte characters and emoji.
- Recommend building a small test harness of tricky edge cases before wiring up the full UI.
- **Electron IPC is required for file I/O** — file reads/writes must go through `ipcMain`/`ipcRenderer` via a preload script. The renderer process (React) must NEVER call `fs` directly. This is a security requirement enforced by Electron's context isolation model.
- **Fonts must be bundled locally** — do not load from Google Fonts CDN in an Electron app. Download and embed the font files in `/assets/fonts/`. CDN calls from Electron add latency and may fail in offline environments.
- **DOMPurify is still required** even in Electron. The renderer is a Chromium webview and `dangerouslySetInnerHTML` is still an XSS vector if the markdown contains injected HTML.
- **Auto-save on every edit** is the right UX for a desktop app. Do not rely on Cmd/Ctrl+S as the only save path — implement both: debounced auto-save (~1s) AND explicit save shortcut.
- **Title bar**: Electron's default title bar is fine for v1. Show the current filename in the window title. Mark unsaved state with a `•` prefix (e.g., `• myfile.md — MarkEdit`).

### Electron Process Boundary — Critical

```
Main Process (Node.js)        |  Renderer Process (Chromium / React)
------------------------------|---------------------------------------
fs.readFile / fs.writeFile    |  UI, editor state, markdown rendering
dialog.showOpenDialog         |  Sends IPC messages to main
dialog.showSaveDialog         |  Receives file content via ipcRenderer
ipcMain.handle(...)           |  contextBridge exposes safe API only
window title management       |
```

The preload script is the ONLY bridge. Never set `nodeIntegration: true`.

---

## 1. Overview

A lightweight Electron desktop application for editing markdown files with **per-block hybrid rendering**: the block the cursor currently occupies renders as editable plain text; all other blocks render as formatted GitHub Flavored Markdown. The app opens and saves `.md` files directly on the local file system.

This mirrors the UX of Typora and Obsidian's live preview mode, scoped to block-level granularity for simplicity and reliability.

**Design philosophy**: Utilitarian and distraction-free. The editor IS the content. No toolbars, no sidebars — just text that becomes what it means.

---

## 2. Core Interaction Model

```
User types → all content parsed into block objects
                      ↓
           Active block index tracked via cursor position
                      ↓
     Active block → raw <textarea> (plain text, editable)
     All other blocks → rendered HTML (via GFM parser)
                      ↓
           Click on rendered block → make it active
           (swap rendered HTML out, swap textarea in, set cursor)
                      ↓
           Content change → debounced auto-save via IPC → fs.writeFile
```

### Block Definition

A "block" is defined by **paragraph-level chunks**, not `\n` characters. This is critical:

- A heading, a paragraph, a code block, a list, a table — each is one block.
- Within a code block, pressing Enter does NOT create a new block.
- Empty lines between blocks are preserved as separators but not rendered as interactable blocks.

> **Implementation note**: Line-by-line splitting on `\n` is simpler but produces jarring behavior inside code blocks, blockquotes, and lists. Block-level splitting on `\n\n` with fenced code block protection is required.

---

## 3. Data Model

```typescript
type BlockType =
  | "paragraph"
  | "heading"
  | "code"
  | "list"
  | "blockquote"
  | "table" // GFM addition
  | "task-list" // GFM addition
  | "hr"
  | "blank";

interface Block {
  id: string; // stable UUID — used as React key, must not change on re-parse
  raw: string; // raw markdown source for this block
  type: BlockType;
}

interface EditorState {
  blocks: Block[];
  activeBlockId: string | null;
  cursorOffset: number; // character offset within active block's textarea
  filePath: string | null; // absolute path to the open file; null = unsaved new file
  isDirty: boolean; // true if unsaved changes exist
}
```

### Source of Truth

The raw markdown string is canonical. Blocks are derived by splitting on `\n\n` with special handling:

- Fenced code blocks (` ```...``` `) are never split — the parser must detect opening and closing fences before splitting.
- GFM tables are never split across blocks (a table is a single block with internal `\n`).
- Block IDs must be **stable across re-parses** where content hasn't changed. Implement as a content-hash keyed map so IDs survive re-parses and React doesn't remount unchanged blocks.

---

## 4. Component Architecture

```
<App>
  ├── <TitleBar />              — filename + dirty indicator (• prefix)
  ├── <Editor>
  │     └── <BlockList>
  │           ├── <Block id="a1" active={false} /> → <RenderedBlock>
  │           ├── <Block id="a2" active={true}  /> → <EditableBlock>
  │           └── <Block id="a3" active={false} /> → <RenderedBlock>
  └── (no toolbar in v1)

<EditableBlock>
  └── <textarea> — auto-resizing, monospace, no border/background

<RenderedBlock>
  └── <div dangerouslySetInnerHTML={sanitized} />
```

### State Management

Use React's built-in `useReducer` + `useContext` for editor state. This is sufficient for v1 — do not add Redux or Zustand prematurely. The state shape is simple and unidirectional.

```typescript
// EditorContext provides:
// state: EditorState
// dispatch: Dispatch<EditorAction>

type EditorAction =
  | { type: "SET_ACTIVE_BLOCK"; id: string }
  | { type: "UPDATE_BLOCK"; id: string; raw: string }
  | { type: "SPLIT_BLOCK"; id: string; offset: number }
  | { type: "MERGE_BLOCK_WITH_PREV"; id: string }
  | { type: "LOAD_FILE"; content: string; filePath: string }
  | { type: "NEW_FILE" }
  | { type: "MARK_SAVED" };
```

---

## 5. Electron Setup

### Scaffolding

```bash
npm create @quick-start/electron markdown-editor -- --template react-ts
# or
npx electron-vite create markdown-editor --template react-ts
```

### Process Structure

```
/electron
  main.ts         — BrowserWindow setup, ipcMain handlers, menu
  preload.ts      — contextBridge API exposure
/src
  ...             — React app (renderer process)
```

### Preload API (contextBridge)

```typescript
// preload.ts — exposes ONLY these methods to the renderer
contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:open-file"),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("fs:save-file", filePath, content),
  saveFileAs: (content: string) =>
    ipcRenderer.invoke("dialog:save-file-as", content),
  onMenuNewFile: (cb: () => void) => ipcRenderer.on("menu:new-file", cb),
  onMenuOpenFile: (cb: () => void) => ipcRenderer.on("menu:open-file", cb),
  onMenuSaveFile: (cb: () => void) => ipcRenderer.on("menu:save-file", cb),
});
```

### Main Process IPC Handlers

```typescript
// main.ts
ipcMain.handle("dialog:open-file", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    properties: ["openFile"],
  });
  if (!filePaths[0]) return null;
  const content = await fs.promises.readFile(filePaths[0], "utf-8");
  return { filePath: filePaths[0], content };
});

ipcMain.handle(
  "fs:save-file",
  async (_event, filePath: string, content: string) => {
    await fs.promises.writeFile(filePath, content, "utf-8");
    return true;
  },
);

ipcMain.handle("dialog:save-file-as", async (_event, content: string) => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: "Markdown", extensions: ["md"] }],
    defaultPath: "untitled.md",
  });
  if (!filePath) return null;
  await fs.promises.writeFile(filePath, content, "utf-8");
  return filePath;
});
```

### Native Application Menu

Define a native menu in `main.ts` with at minimum:

- **File** → New File (`CmdOrCtrl+N`), Open File (`CmdOrCtrl+O`), Save (`CmdOrCtrl+S`), Save As (`CmdOrCtrl+Shift+S`)
- **Edit** → standard Undo/Redo/Cut/Copy/Paste (Electron provides these for free via `role`)
- **View** → Toggle Dev Tools (development only)

---

## 6. File I/O & Auto-Save

### Auto-Save Strategy

```typescript
// In Editor component
const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();

function handleBlockChange(id: string, raw: string) {
  dispatch({ type: "UPDATE_BLOCK", id, raw });
  clearTimeout(autoSaveRef.current);
  autoSaveRef.current = setTimeout(() => {
    if (state.filePath) {
      window.electronAPI.saveFile(
        state.filePath,
        serializeBlocks(state.blocks),
      );
    }
  }, 1000); // 1 second debounce
}
```

### Unsaved State

- `isDirty: true` → show `•` in window title via `ipcRenderer.send('set-title', '• filename.md')`.
- On New File / Open File when dirty → show native confirm dialog via `dialog.showMessageBox` in main process before discarding.
- On window close when dirty → intercept `close` event in main, show confirm dialog, allow or prevent close.

### New File Flow

1. User triggers File → New (menu or `CmdOrCtrl+N`).
2. If `isDirty`, prompt to save.
3. Dispatch `NEW_FILE` — clears blocks, sets `filePath: null`, `isDirty: false`.
4. First save of a new file triggers Save As dialog.

---

## 7. Markdown Parsing (GFM)

**Recommended library**: `markdown-it` with GFM plugins.

```typescript
import MarkdownIt from "markdown-it";
import markdownItGfm from "markdown-it-gfm"; // tables, task lists, strikethrough

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(markdownItGfm);
```

> **Alternative**: `marked` with `gfm: true` is simpler to configure for pure GFM but has a less flexible plugin system. Either is acceptable — pick one and commit.

**GFM features to verify are working**:

- [ ] Tables (`| col | col |`)
- [ ] Task lists (`- [ ] item`, `- [x] item`)
- [ ] Strikethrough (`~~text~~`)
- [ ] Autolinked URLs
- [ ] Fenced code blocks with language hints (` ```typescript `)

**Sanitization**: Pass all rendered HTML through `DOMPurify` before setting `dangerouslySetInnerHTML`. Required even in Electron.

```typescript
import DOMPurify from "dompurify";

export function renderBlock(raw: string): string {
  return DOMPurify.sanitize(md.render(raw));
}
```

---

## 8. Critical Behaviours & Edge Cases

### 8.1 Switching Active Block

**Click on a rendered block:**

1. Record click target block ID.
2. Commit current `EditableBlock` value back to state (flush textarea value to block raw).
3. Re-parse blocks if content changed.
4. Set new `activeBlockId`.
5. Focus the new `<textarea>`, set cursor via `caretPositionFromPoint` (best-effort).

**Arrow key past block boundary:**

1. Detect cursor at first line of textarea + ↑ key (or last line + ↓ key).
2. Move `activeBlockId` to previous/next block.
3. Focus new textarea, set cursor to end (↑) or start (↓).

### 8.2 Block Splitting & Merging

- **Enter on empty line** → split block at that position into two blocks.
- **Backspace at column 0 of block start** → merge with previous block; cursor at join point.
- **Paste** → may introduce multiple `\n\n` separators; re-parse full content after `paste` event.

### 8.3 Code Blocks & Tables (GFM)

- Fenced code blocks are never split — parser detects ` ``` ` fences and treats them atomically.
- GFM tables contain internal `\n` characters and must also be treated as a single block.
- When rendered, apply syntax highlighting via `highlight.js` (add as a plugin to `markdown-it`).

### 8.4 Textarea Auto-Resize

```typescript
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
// Call on input AND on mount
```

### 8.5 Rendered Block Height Matching

To prevent layout shift on mode switch:

- Store `offsetHeight` of rendered block before switching to edit mode.
- Initialize textarea height to that stored value; let `autoResize` correct it immediately after.

---

## 9. Styling

Lightweight, typographic, no-chrome. The editor should feel like a high-quality text document.

**Font loading**: Fonts MUST be bundled locally in `/src/assets/fonts/`. Do not load from Google Fonts — CDN calls are unreliable in Electron and add startup latency. Download:

- `JetBrains Mono` (edit mode, monospace)
- `Lora` (render mode, serif)

Define `@font-face` in `src/styles/fonts.css`.

### CSS Variables (Design Tokens)

```css
:root {
  --font-edit: "JetBrains Mono", "Fira Code", monospace;
  --font-render: "Lora", "Georgia", serif;
  --font-size-base: 16px;
  --line-height: 1.75;

  --color-bg: #fafaf8;
  --color-text: #1a1a18;
  --color-muted: #888;
  --color-active-bg: #f0ede6;
  --color-active-border: #c8b97a;
  --color-code-bg: #f4f1ea;
  --color-link: #2e6da4;

  --max-width: 680px;
  --block-gap: 0.25rem;
}
```

### Active Block

```css
.block--active {
  background: var(--color-active-bg);
  border-left: 3px solid var(--color-active-border);
  padding-left: 0.75rem;
  transition: background 80ms ease;
}
```

### Textarea Reset

```css
.block__textarea {
  width: 100%;
  font-family: var(--font-edit);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  color: var(--color-text);
  caret-color: var(--color-active-border);
}
```

### GFM-Specific Rendered Styles

```css
/* Tables */
.block__render table {
  border-collapse: collapse;
  width: 100%;
}
.block__render th,
.block__render td {
  border: 1px solid #d0cdc6;
  padding: 0.4rem 0.75rem;
  text-align: left;
}
.block__render th {
  background: var(--color-code-bg);
  font-weight: 600;
}

/* Task lists */
.block__render input[type="checkbox"] {
  margin-right: 0.4rem;
  accent-color: var(--color-active-border);
}

/* Strikethrough */
.block__render del {
  color: var(--color-muted);
}
```

---

## 10. Technology Stack

| Concern             | Choice                                         | Notes                                                    |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Desktop shell       | Electron                                       | Latest stable                                            |
| Build tool          | electron-vite                                  | Wraps Vite with Electron config; use `react-ts` template |
| UI framework        | React 18 + TypeScript                          | Strict mode enabled                                      |
| Markdown parser     | `markdown-it` + GFM plugins                    | `markdown-it-gfm` or equivalent                          |
| Sanitizer           | `DOMPurify`                                    | Required; do not skip                                    |
| Syntax highlighting | `highlight.js` (via `markdown-it-highlightjs`) | Optional in v1, include in v2                            |
| State management    | `useReducer` + `useContext`                    | No external state library in v1                          |
| Fonts               | Bundled locally in `/src/assets/fonts/`        | JetBrains Mono + Lora                                    |
| Styling             | CSS Modules or plain CSS with variables        | No CSS-in-JS                                             |
| Testing             | Vitest + React Testing Library                 | Unit test the block splitter first                       |

---

## 11. File Structure

```
/
├── electron/
│   ├── main.ts            — BrowserWindow, ipcMain handlers, app menu
│   └── preload.ts         — contextBridge API (the ONLY bridge to renderer)
├── src/
│   ├── assets/
│   │   └── fonts/         — JetBrains Mono + Lora font files (.woff2)
│   ├── core/
│   │   ├── parser.ts      — block splitter (top priority, unit test first)
│   │   ├── renderer.ts    — markdown-it + DOMPurify wrapper
│   │   └── serializer.ts  — blocks[] → raw markdown string
│   ├── context/
│   │   └── EditorContext.tsx  — useReducer state + dispatch
│   ├── components/
│   │   ├── Editor.tsx         — root editor, keyboard routing
│   │   ├── BlockList.tsx
│   │   ├── EditableBlock.tsx  — textarea + auto-resize
│   │   └── RenderedBlock.tsx  — dangerouslySetInnerHTML
│   ├── styles/
│   │   ├── fonts.css
│   │   ├── tokens.css
│   │   ├── editor.css
│   │   ├── blocks.css
│   │   └── typography.css
│   ├── types/
│   │   └── index.ts           — Block, EditorState, EditorAction types
│   ├── App.tsx
│   └── main.tsx
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 12. Implementation Phases

### Phase 1 — Scaffold + Core Editor (MVP)

- [ ] Set up `electron-vite` with `react-ts` template
- [ ] Configure `contextBridge` preload; verify IPC round-trip
- [ ] Implement `parser.ts` — block splitter with code fence + table protection
- [ ] Unit test parser with: headings, paragraphs, code fences, tables, task lists, empty lines
- [ ] Implement `renderer.ts` — `markdown-it` GFM + DOMPurify
- [ ] Implement `serializer.ts` — blocks → raw string (inverse of parser)
- [ ] `EditorContext` with `useReducer`
- [ ] Render all blocks as markdown (read-only first)
- [ ] Click block → switch to textarea (`SET_ACTIVE_BLOCK`)
- [ ] Type in textarea → `UPDATE_BLOCK`, other blocks re-render
- [ ] Auto-resize textarea
- [ ] Open File via IPC dialog → `LOAD_FILE`
- [ ] New File → `NEW_FILE`

### Phase 2 — File I/O + Save

- [ ] Save File via IPC (`CmdOrCtrl+S`) — Save As if no `filePath`
- [ ] Debounced auto-save (1s) when `filePath` exists
- [ ] Window title management — filename + `•` dirty indicator
- [ ] Dirty-state guard on New/Open/Close

### Phase 3 — Smooth Interaction

- [ ] Arrow key navigation across block boundaries
- [ ] Block split on double-Enter (empty line)
- [ ] Block merge on Backspace-at-start
- [ ] Cursor position preservation on block switch
- [ ] Paste re-parse

### Phase 4 — Polish

- [ ] Syntax highlighting in rendered code blocks (`highlight.js`)
- [ ] Height pre-sizing to prevent layout shift on mode switch
- [ ] GFM task list checkboxes clickable in rendered mode
- [ ] Native app menu (File / Edit / View)
- [ ] Dark mode (second CSS variable set, toggled via OS preference `prefers-color-scheme`)

### Phase 5 — Stretch / Future

- [ ] File explorer sidebar (explicitly deferred per client)
- [ ] Export to HTML
- [ ] Word count / reading time in status bar
- [ ] Spell check (Electron's built-in `webContents.session` provides this)

---

## 13. Known Risks

| Risk                                   | Severity | Mitigation                                                                  |
| -------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Cursor position lost on block switch   | High     | `caretPositionFromPoint` on click; store `selectionStart` on blur           |
| Layout shift on edit/render toggle     | Medium   | Pre-size textarea to rendered block `offsetHeight`                          |
| Code blocks / tables split incorrectly | High     | Comprehensive unit tests on `parser.ts` before any UI work                  |
| XSS via rendered markdown              | High     | DOMPurify + `html: false` in markdown-it                                    |
| Unsaved data loss on window close      | High     | Intercept `close` event in main process; confirm dialog if `isDirty`        |
| IPC misuse (`nodeIntegration: true`)   | High     | Enforce `contextIsolation: true`, `nodeIntegration: false` in BrowserWindow |
| IME composition (CJK input)            | Medium   | Use `compositionend` not `input` for re-parse trigger                       |
| Emoji / multi-byte cursor offsets      | Medium   | Test with emoji; use `Intl.Segmenter` for cursor position math              |
| Font FOUT on app launch                | Low      | Bundle fonts locally; they load synchronously from disk                     |

---

_Plan authored by: Senior Technical Architect_
_Intended recipient: Claude Code / Implementation Director_
_Version: 2.0 — Updated with client decisions (Electron, React/TS, GFM, local FS, no mobile)_
