[![GitHub Release](https://img.shields.io/github/v/release/dmhendricks/disable-javascript?style=flat-square)](https://github.com/dmhendricks/disable-javascript/releases)
[![License](https://img.shields.io/github/license/dmhendricks/disable-javascript.svg?style=flat-square)](https://github.com/dmhendricks/disable-javascript/blob/main/LICENSE)

# Disable JavaScript

Toggle JavaScript on or off for the **current site** from the toolbar. The setting applies to that origin (scheme + host + port), not to every tab in the browser.

Clicking the toolbar icon always toggles JavaScript. Settings open from a keyboard shortcut, never from the icon.

## Installation

This extension is not on the Chrome Web Store yet. Load it unpacked:

1. Clone the repository and run `npm install && npm run build`.
2. Open `chrome://extensions` (Google Chrome) or `edge://extensions` (Microsoft Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the `dist/` directory.

## Usage

- Click the toolbar icon to disable or re-enable JavaScript for the site in the active tab. The tab reloads so the change actually takes effect.
- Blocked origins stay blocked until you toggle them again or re-enable them on the settings page.

#### Keyboard shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Open settings | `Alt+Shift+J` | `Option+Shift+J` |
| Toggle JavaScript | *(none by default — bind `_execute_action` if you want one)* | same |

Customize shortcuts at `chrome://extensions/shortcuts`. The toolbar icon never opens settings.

On `chrome://` pages, the Chrome Web Store, `file://` URLs, and similar restricted surfaces, the icon shows a short “not supported” popup instead of toggling.

## Development

Requires Node 20+.

```bash
npm install
npm run icons    # rasterize toolbar PNGs from public/images/*.svg
npm run dev      # Watches for changes, rebuilds the extension
npm run lint
npm run test
```

Then load unpacked from `dist/` as above.

## Permissions

- **contentSettings** — block or allow JavaScript for a site. Chrome’s install warning mentions cookies, camera, and other features; this extension only changes JavaScript.
- **tabs** — read the active tab’s URL so the icon can show the current site’s state when you switch tabs.
- **storage** — remember which origins this extension blocked, because Chrome cannot list content-setting rules.

No host permissions. No debugger. No analytics.

## License

[MIT](LICENSE)
