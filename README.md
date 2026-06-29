# Persian RTL Fixer

Fix right-to-left (RTL) text rendering for Persian and Arabic in AI chat interfaces.

Most AI products default to LTR layout. Persian paragraphs, mixed Persian/English content, and lists often render in the wrong direction. This project provides two small tools that apply the Unicode bidirectional algorithm and set `dir` attributes where needed.

## Packages

| Package | Platform | Description |
|---------|----------|-------------|
| [`browser-extension`](./browser-extension) | Chrome, Firefox, Edge | Content script for web-based AI chat (ChatGPT, Claude, Gemini, etc.) |
| [`cursor-extension`](./cursor-extension) | Cursor IDE | Workbench patch for the built-in AI / Agent panel |

## Features

- Detects Persian and Arabic script automatically
- Handles mixed RTL + LTR text (e.g. Persian with inline English terms)
- Keeps code blocks LTR (`pre`, `code`)
- Watches the DOM for dynamically loaded chat messages
- Toggle on/off (browser extension popup)

## Quick start

### Browser extension

1. Clone this repository
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `browser-extension` folder

See [browser-extension/README.md](./browser-extension/README.md) for Firefox and supported sites.

### Cursor extension

1. Build or download the VSIX from [Releases](https://github.com/samimideveloper/persian-rtl-fixer/releases)
2. In Cursor: `Cmd+Shift+P` → **Extensions: Install from VSIX...**
3. Run **Persian RTL: Enable** from the command palette
4. Reload the window

See [cursor-extension/README.md](./cursor-extension/README.md) for details and post-update steps.

## How it works

Both packages share the same approach:

1. **Detection** — scan text for Arabic/Persian Unicode ranges
2. **Direction** — set `dir="rtl"` or `dir="auto"` based on character ratio
3. **Bidi** — apply `unicode-bidi: plaintext` so mixed scripts render correctly
4. **Observation** — `MutationObserver` handles streaming / incremental UI updates

The Cursor extension injects CSS and a script into the Electron workbench HTML (similar to community workbench customization extensions). Re-run **Enable** or **Reinstall** after Cursor updates.

## Development

```bash
# Package Cursor extension
cd cursor-extension
npx @vscode/vsce package --no-dependencies
```

## License

MIT — see [LICENSE](./LICENSE)

## Author

[Mehdi Samimi](https://github.com/samimideveloper)
