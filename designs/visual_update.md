# Slate — Visual Identity Specification

> Hand this file to Claude Code alongside the architecture plan.
> It defines every visual decision needed to style the application.

---

## Brand summary

**Name**: Slate  
**Tagline**: "A clean surface for clear thinking."  
**Personality**: Dark, developer-adjacent, focused. Sits in the same space as VS Code and Obsidian — a serious tool that gets out of the way.

---

## App icon

The icon is a miniature abstraction of the editor itself: a dark pane containing a white heading bar, a blue active-edit line with a left-side cursor nub, and grey rendered lines below. Rendered at four sizes — 512, 128, 32, and 16px — with the same geometry scaled accordingly.

### Icon geometry (512px master, scale proportionally for other sizes)

```
Container:  352 × 352px, rx=72 (Apple-style squircle proportions)
Fill:       #1a2333

Document pane:  248 × 244px, rx=8, fill #212d3e, stroke #2d3f57 0.5px
  Inset from icon edge: 52px left/right, 48px top

Content rows (x=20 from pane left edge, widths as % of pane width):
  Heading bar:    h=10, rx=3, fill #e2e8f2,  w=60%
  — gap —
  Cursor nub:     w=4, h=15, rx=2, fill #5b9cf6  (4px left of active line)
  Active line:    h=9,  rx=3, fill #2a5f9e,  w=73%
  — gap —
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=65%
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=79%
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=52%
  — blank —
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=71%
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=57%
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=78%
  Rendered line:  h=6,  rx=2, fill #2d3f57,  w=44%

Status bar strip: 1px separator + two small pills at bottom of pane
```

### Icon sizes and corner radii

| Size      | Corner radius (rx) | Use                      |
| --------- | ------------------ | ------------------------ |
| 512 × 512 | 72                 | App store / About screen |
| 128 × 128 | 18                 | Dock (macOS)             |
| 32 × 32   | 8                  | Taskbar / window chrome  |
| 16 × 16   | 4                  | Favicon / tab            |

Save as: `resources/icon.png` (512), `resources/icon.icns` (macOS bundle), `resources/icon.ico` (Windows).  
electron-vite picks these up automatically if placed in `resources/`.

---

## Colour palette

All colours are hardcoded (dark-first; no light mode in v1).

```css
/* ── Slate design tokens ─────────────────────────── */

/* Backgrounds */
--color-bg: #1a2333; /* app background, window chrome */
--color-surface: #212d3e; /* editor pane, active block bg  */
--color-border: #2d3f57; /* all borders, rendered line fill */

/* Text */
--color-text: #e2e8f2; /* primary text (headings, active) */
--color-secondary: #8898aa; /* rendered body text              */
--color-muted: #4a6175; /* hints, metadata, captions       */

/* Accent — active line / cursor / signal */
--color-accent: #5b9cf6; /* cursor nub, active border, links */
--color-accent-deep: #2a5f9e; /* active line background           */

/* Typography */
--font-edit: 'JetBrains Mono', 'Fira Code', monospace;
--font-render: 'Lora', Georgia, serif;
--font-ui: 'Inter', system-ui, sans-serif;
--font-size-base: 16px;
--line-height: 1.75;

/* Layout */
--editor-max-width: 700px;
--block-gap: 0.25rem;
--radius-sm: 4px;
--radius-md: 8px;
```

Place this block in `src/styles/tokens.css` and import it at the top of `src/styles/editor.css`.

---

## Typography

### Edit mode (active block textarea)

- Font: `var(--font-edit)` — JetBrains Mono
- Size: 16px
- Colour: `var(--color-text)` — #e2e8f2
- Caret colour: `var(--color-accent)` — #5b9cf6
- Background: transparent (parent block provides #212d3e)

### Render mode (inactive blocks)

- Font: `var(--font-render)` — Lora
- Size: 16px, line-height 1.75
- Colour: `var(--color-secondary)` — #8898aa for body, `var(--color-text)` for headings

### UI chrome (title bar, status bar, file name)

- Font: `var(--font-ui)` — Inter
- Size: 13px
- Colour: `var(--color-muted)` — #4a6175

### GFM rendered element sizes

```css
.block__render h1 {
  font-size: 2em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
.block__render h2 {
  font-size: 1.5em;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
.block__render h3 {
  font-size: 1.25em;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
.block__render p {
  margin: 0;
  color: var(--color-secondary);
}
.block__render a {
  color: var(--color-accent);
  text-decoration-thickness: 1px;
}

.block__render code {
  font-family: var(--font-edit);
  font-size: 0.875em;
  background: var(--color-border);
  color: var(--color-accent);
  padding: 0.1em 0.35em;
  border-radius: var(--radius-sm);
}

.block__render pre {
  background: var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  overflow-x: auto;
}

.block__render pre code {
  background: none;
  padding: 0;
  color: var(--color-text);
}

.block__render blockquote {
  border-left: 3px solid var(--color-accent-deep);
  padding-left: 1rem;
  color: var(--color-muted);
  margin: 0;
}

/* GFM tables */
.block__render table {
  border-collapse: collapse;
  width: 100%;
}
.block__render th,
.block__render td {
  border: 0.5px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  color: var(--color-secondary);
}
.block__render th {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
}

/* GFM task lists */
.block__render input[type='checkbox'] {
  accent-color: var(--color-accent);
  margin-right: 0.4rem;
}

/* GFM strikethrough */
.block__render del {
  color: var(--color-muted);
}
```

---

## Active block pattern

This is the most important UI detail — the visual distinction between the block being edited and all others.

```css
/* All blocks share this base */
.block {
  padding: 4px 0 4px 16px;
  border-left: 3px solid transparent;
  border-radius: 0;
  transition:
    background 80ms ease,
    border-color 80ms ease;
  margin-bottom: var(--block-gap);
}

/* Active (edit) block */
.block--active {
  background: var(--color-surface); /* #212d3e */
  border-left-color: var(--color-accent); /* #5b9cf6 */
  padding-left: 12px;
}

/* Textarea inside active block */
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
  caret-color: var(--color-accent);
}
```

---

## Window chrome

### Title bar

- Background: `#141c28` (4px darker than `--color-bg`)
- Text: filename only, `var(--font-ui)`, 13px, `var(--color-muted)`
- Dirty state: prefix filename with `•` (e.g. `• notes.md`)
- macOS: use default traffic light buttons (`titleBarStyle: 'default'` in BrowserWindow)

### Window dimensions (BrowserWindow defaults)

```typescript
width: 900,
height: 700,
minWidth: 520,
minHeight: 400,
backgroundColor: '#1a2333',
```

---

## Font files to bundle

Download as `.woff2` and place in `src/assets/fonts/`:

| Font           | Weight(s)  | Filename                      |
| -------------- | ---------- | ----------------------------- |
| JetBrains Mono | 400        | `JetBrainsMono-Regular.woff2` |
| JetBrains Mono | 500        | `JetBrainsMono-Medium.woff2`  |
| Lora           | 400        | `Lora-Regular.woff2`          |
| Lora           | 700        | `Lora-Bold.woff2`             |
| Lora           | 400 italic | `Lora-Italic.woff2`           |
| Inter          | 400        | `Inter-Regular.woff2`         |
| Inter          | 500        | `Inter-Medium.woff2`          |

Sources:

- JetBrains Mono: https://github.com/JetBrains/JetBrainsMono/releases
- Lora: https://fonts.google.com/specimen/Lora (download family)
- Inter: https://github.com/rsms/inter/releases

Define all `@font-face` blocks in `src/styles/fonts.css`.

---

## Global app shell styles

```css
/* src/styles/editor.css */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.editor-title-bar {
  height: 38px;
  background: #141c28;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-muted);
  -webkit-app-region: drag; /* allows window dragging */
  user-select: none;
  flex-shrink: 0;
}

.editor-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 3rem 0;
  /* custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.editor-scroll::-webkit-scrollbar {
  width: 6px;
}
.editor-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.editor-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.editor-content {
  max-width: var(--editor-max-width);
  margin: 0 auto;
  padding: 0 2.5rem;
}
```

---

_Visual identity version: 1.0_  
_Intended recipient: Claude Code / Implementation Director_  
_Companion document: markdown-editor-plan.md (v2.0)_
