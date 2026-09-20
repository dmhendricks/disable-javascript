import { copyFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };

const ROOT = import.meta.dirname;
const MANIFEST_PATH = resolve(ROOT, 'src/manifest.json');

function manifestVersion(): string {
    return (JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as { version: string }).version;
}

const copyLicense: Plugin = {
    name: 'copy-license',
    apply: 'build',
    closeBundle() {
        copyFileSync(resolve(ROOT, 'LICENSE'), resolve(ROOT, 'dist/LICENSE'));
    },
};

// Stamp the options page with the extension version from manifest.json so the
// badge stays in sync without a runtime script (MV3 pages block inline JS).
// Read the file on each transform — Vite caches this config, so a one-time
// import would keep stamping the old version after a bump.
const injectManifestVersion: Plugin = {
    name: 'inject-manifest-version',
    enforce: 'post',
    transformIndexHtml(html) {
        return html.replaceAll('%MANIFEST_VERSION%', manifestVersion());
    },
};

export default defineConfig({
    plugins: [
        crx({ manifest: manifest as unknown as ManifestV3Export }),
        injectManifestVersion,
        copyLicense,
    ],
    css: {
        preprocessorOptions: {
            scss: { quietDeps: true },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
