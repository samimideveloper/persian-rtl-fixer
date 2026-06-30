# Persian RTL Fixer — Browser Extension

WebExtension (Manifest V3) that fixes RTL rendering on popular AI chat websites.

## Supported sites

- ChatGPT (`chatgpt.com`, `chat.openai.com`)
- Claude (`claude.ai`)
- Google Gemini
- Microsoft Copilot
- Perplexity, Poe, DeepSeek, Grok
- Hugging Face Chat, You.com
- **Cursor Cloud** (`cursor.com/agents`) — web and PWA

## Install

### Chrome / Edge

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder

### Firefox

1. Open `about:debugging` → **This Firefox**
2. **Load Temporary Add-on** → select `manifest.json`

> Temporary add-ons are removed when Firefox restarts. For persistence, use Firefox Developer Edition or sign the extension.

## Usage

Click the toolbar icon to open the popup and toggle the extension on or off.

## Development

Files:

- `content/detector.js` — script detection and text analysis
- `content/content.js` — DOM observer and `dir` attribute application
- `content/styles.css` — bidi and alignment rules

No build step required.

## License

MIT
