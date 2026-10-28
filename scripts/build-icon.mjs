import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDirectory, '..');
const source = path.join(workspace, 'assets', 'app-icon.png');
const destination = path.join(workspace, 'assets', 'app-icon.ico');
const icon = await pngToIco(source, { interpolation: 'bicubicInterpolation' });
await fs.writeFile(destination, icon);

const stats = await fs.stat(destination);
if (stats.size < 10_000) throw new Error(`Generated ICO is unexpectedly small: ${stats.size} bytes`);
console.log(`Generated ${destination} (${stats.size} bytes)`);
