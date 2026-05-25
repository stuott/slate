# MarkEdit — Developer Reference

Per-block hybrid markdown editor. The active block renders as a raw `<textarea>`; all other blocks render as sanitized GFM HTML. Typora/Obsidian-style live preview scoped to block granularity.

## Running the app

```
npm run dev      # start Electron + Vite dev server (HMR enabled)
npm run typecheck  # check both main + renderer
npx vitest run   # run parser unit tests
```

Requires **Node >= 20** (Vite 7 uses `crypto.hash`, added in Node 21.7). The project `package.json` pins `"vite": "^7.0.0"`.

## Directory structure

This uses the electron-vite scaffold layout — not a flat `src/`:

```
src/
  main/index.ts          — Electron main process (IPC handlers, menu, close-guard)
  preload/index.ts       — contextBridge (the ONLY bridge to the renderer)
  preload/index.d.ts     — ambient Window type declaration
  renderer/
    index.html
    src/
      types/index.ts     — Block, EditorState, EditorAction, ElectronAPI
      core/
        parser.ts        — block splitter (most critical file)
        parser.test.ts   — 21 unit tests; run before touching the parser
        renderer.ts      — markdown-it + DOMPurify
        serializer.ts    — blocks[] → raw markdown string
      context/
        EditorContext.tsx — useReducer state + dispatch + serializeContent
      components/
        Editor.tsx        — root: auto-save, keyboard save, IPC menu wiring
        BlockList.tsx     — maps blocks → EditableBlock or RenderedBlock
        EditableBlock.tsx — <textarea>, auto-resize, keyboard navigation
        RenderedBlock.tsx — dangerouslySetInnerHTML, click-to-activate
      styles/
        fonts.css         — @font-face declarations
        tokens.css        — CSS variables (colors, fonts, max-width)
        editor.css        — layout, scroll container
        blocks.css        — .block, .block--active, .block__textarea, GFM table/task styles
        typography.css    — rendered markdown type scale
      assets/fonts/
        JetBrainsMono-Regular.woff2
        Lora-Regular.woff2
      App.tsx             — EditorProvider wrapper + title sync
      main.tsx            — CSS import order, React root mount
```

CSS import order in `main.tsx` is load-order dependent: `fonts → tokens → typography → editor → blocks`.

## IPC boundary

```
Main process                      Renderer (React)
────────────────────────────────────────────────────
dialog:open-file                  window.electronAPI.openFile()
fs:save-file                      window.electronAPI.saveFile()
dialog:save-file-as               window.electronAPI.saveFileAs()
set-title                         window.electronAPI.setTitle()
show-confirm                      window.electronAPI.showConfirm()
set-dirty                         window.electronAPI.setDirty()
menu:new-file  (send)  ←───────── onMenuNewFile(cb) → cleanup fn
menu:open-file (send)  ←───────── onMenuOpenFile(cb) → cleanup fn
menu:save-file (send)  ←───────── onMenuSaveFile(cb) → cleanup fn
menu:save-as   (send)  ←───────── onMenuSaveAs(cb) → cleanup fn
```

`nodeIntegration` is `false`, `contextIsolation` is `true`. Never call `fs` from the renderer.

## Known quirks

### IPC menu listener cleanup is required
`onMenu*` methods in the preload return a `() => void` cleanup that calls `ipcRenderer.removeListener`. The `useEffect` in `Editor.tsx` must call these cleanups on unmount. Without this, React StrictMode's double-mount registers two listeners and every menu action fires twice (e.g. two open-file dialogs).

### `markdown-it-gfm` does not exist on npm
GFM support comes from:
- `markdown-it` built-in: tables, strikethrough (`~~text~~`), linkify, fenced code blocks
- `markdown-it-task-lists` plugin: `- [ ] item` / `- [x] item` syntax

### Parser `idCache` is a module-level singleton
`parser.ts` holds a `Map<contentHash, UUID>` at module scope. After any bulk replace (LOAD_FILE, NEW_FILE), call `rebuildIdCache(blocks)` to reset it. Without this the map grows unboundedly across file loads and old hashes stick around.

### `EditableBlock` uses `defaultValue`, not `value`
The textarea is **uncontrolled**. It initialises from `block.raw` via `defaultValue` and then reads `e.target.value` on change. Making it controlled (i.e. `value={block.raw}`) causes the cursor to jump to the end on every keystroke because React re-renders reset the selection.

### `onChange` not `onInput` for the textarea
React 19 tightened the type for `onInput` to `InputEventHandler` (different from `ChangeEvent`). React's `onChange` on a textarea fires on every keystroke (not on blur like the DOM `change` event), so it's a direct substitute for `oninput`.

### Block split trigger
`EditableBlock` only dispatches `SPLIT_BLOCK` when the character *before* the cursor is already `\n` — meaning the user pressed Enter on an already-blank line. A single Enter inside a paragraph just inserts a newline inside the same block. This is intentional: block-level granularity, not line-level.

### Auto-save stale closure workaround
`handleBlockChange` in `Editor.tsx` cannot use `serializeContent()` (which closes over `state.blocks`) because the state update from `dispatch` hasn't flushed yet when the 1s timer fires. Instead it builds the content inline: `state.blocks.map(b => b.id === id ? {...b, raw} : b)`, substituting the latest raw value manually.

### `set-dirty` IPC flow
The renderer sends `set-dirty` to main on every `state.isDirty` change. The main process keeps a local `isDirty` flag and uses it in the `close` event handler to decide whether to show the discard-changes dialog. This avoids a round-trip IPC invoke during the synchronous `close` event.

### DOMPurify is required even in Electron
The renderer is a Chromium webview. `dangerouslySetInnerHTML` is still an XSS vector if markdown contains injected HTML. `markdown-it` is configured with `html: false` *and* output is passed through `DOMPurify.sanitize()`.

## Dependency versions that matter

| Package | Pinned to | Why |
|---|---|---|
| `vite` | `^7.0.0` | Requires Node >= 20; do not downgrade to v6 |
| `markdown-it` | `^14` | v14 API; plugin interface changed from v13 |
| `electron` | `^39` | Bundled Node version affects native module compat |

## Adding features — things to know first

- **New IPC channel**: add handler in `src/main/index.ts` → add method to `electronAPI` object in `src/preload/index.ts` → add signature to `ElectronAPI` interface in `src/renderer/src/types/index.ts`.
- **New block type**: add to `BlockType` union in `types/index.ts`, add detection regex in `detectType()` in `parser.ts`, add a test in `parser.test.ts`, add CSS in `blocks.css`/`typography.css`.
- **Changing the parser**: run `npx vitest run` first to get a green baseline. The 21 tests cover all edge cases (fenced code with internal blank lines, GFM tables, multi-byte/emoji). Do not change splitting logic without updating tests.
