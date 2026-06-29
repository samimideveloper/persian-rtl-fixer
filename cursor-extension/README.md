# Persian RTL Fixer — Cursor Extension

VS Code extension for [Cursor](https://cursor.com) that patches the workbench to fix RTL text in the AI chat and Agent panels.

## Install

### From VSIX (recommended for teammates)

1. Download `persian-rtl-cursor-*.vsix` from [Releases](https://github.com/samimideveloper/persian-rtl-fixer/releases)
2. Cursor → `Cmd+Shift+P` → **Extensions: Install from VSIX...**
3. Select the VSIX file

### From source

```bash
cd cursor-extension
npx @vscode/vsce package --no-dependencies
cursor --install-extension ./persian-rtl-cursor-1.0.0.vsix
```

## Activate

1. `Cmd+Shift+P` → **Persian RTL: Enable**
2. Click **Reload** when prompted

On first launch, the extension offers to enable automatically if the patch is not applied.

## Commands

| Command | Description |
|---------|-------------|
| `Persian RTL: Enable` | Inject RTL fix into workbench |
| `Persian RTL: Disable` | Restore original workbench |
| `Persian RTL: Reinstall` | Re-apply after a Cursor update |

## After Cursor updates

Cursor updates replace `workbench.html`. Run **Persian RTL: Reinstall** after each update.

## Requirements

- Cursor (VS Code 1.80+ compatible)
- Write access to the Cursor application directory (standard install on macOS/Linux)

## How it works

The extension locates `workbench.html` in the Cursor app bundle, backs it up, and injects:

- `media/styles.css` — bidi rules for Cursor chat selectors (`.markdown-root`, `.anysphere-markdown-container-root`, etc.)
- `media/inject.js` — runtime DOM observer

This follows the same pattern used by community workbench customization tools.

## License

MIT
