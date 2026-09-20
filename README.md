[![GitHub Release](https://img.shields.io/github/v/release/dmhendricks/disable-javascript?style=flat-square)](https://github.com/dmhendricks/disable-javascript/releases)
[![License](https://img.shields.io/github/license/dmhendricks/disable-javascript.svg?style=flat-square)](https://github.com/dmhendricks/disable-javascript/blob/main/LICENSE)

# Disable JavaScript

![Screenshot](store/disable-javascript-1400x560.jpg)

Toggle JavaScript (enable/disable) for the **current site** from the toolbar. The setting applies to that origin (scheme + host + port), not to every tab in the browser.

## Installation

This extension is not on the Chrome Web Store yet. Load it unpacked:

1. Clone the repository and run `npm install && npm run build`.
2. Open `chrome://extensions` (Google Chrome) or `edge://extensions` (Microsoft Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the `dist/` directory.

## Usage

- Click the toolbar icon to disable or re-enable JavaScript for the site in the active tab. The tab reloads so the change actually takes effect.
- Press `Alt+Shift+J` (`Option+Shift+J` on macOS) to do the same thing from the keyboard. Rebind it at `chrome://extensions/shortcuts`.
- Right-click the toolbar icon and choose **Options** to open the options page.
- Blocked sites stay blocked until you toggle them again or re-enable them on the options page.

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
