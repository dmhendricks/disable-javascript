import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = resolve(ROOT, 'public/images');
const SIZES = [16, 32, 48, 128];

function render(svgPath, size, outPath) {
    const svg = readFileSync(svgPath);
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: size },
        background: 'rgba(0,0,0,0)',
    });
    writeFileSync(outPath, resvg.render().asPng());
}

mkdirSync(IMAGES, { recursive: true });

for (const size of SIZES) {
    render(resolve(IMAGES, 'logo.svg'), size, resolve(IMAGES, `${size}.png`));
    render(resolve(IMAGES, 'logo-blocked.svg'), size, resolve(IMAGES, `${size}-blocked.png`));
}

console.log(`Wrote PNG icons: ${SIZES.join(', ')}`);
