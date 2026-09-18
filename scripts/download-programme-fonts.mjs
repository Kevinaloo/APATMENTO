import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Refresh the self-hosted, SIL Open Font Licensed programme typefaces.
const families = [
  ['barlow-condensed', 'Barlow+Condensed:wght@600;700;800', 'barlowcondensed'],
  ['ibm-plex-sans', 'IBM+Plex+Sans:wght@400..700', 'ibmplexsans'],
  ['archivo', 'Archivo:wght@500..900', 'archivo'],
  ['bricolage-grotesque', 'Bricolage+Grotesque:opsz,wght@12..96,500..800', 'bricolagegrotesque'],
];
const destination = resolve('assets/fonts');
await mkdir(destination, { recursive: true });
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
let output = '/* Self-hosted typefaces. SIL Open Font License files in /assets/fonts/. */\n';
for (const [slug, query, directory] of families) {
  const css = await (await get('https://fonts.googleapis.com/css2?family=' + query + '&display=swap')).text();
  const blocks = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map(match => match[1]);
  if (!blocks.length) throw new Error('No Latin WOFF2 face found for ' + slug);
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const remote = block.match(/url\((https:[^)]+)\)/)?.[1];
    if (!remote) throw new Error('No font URL for ' + slug);
    const filename = slug + '-' + index + '.woff2';
    const bytes = new Uint8Array(await (await get(remote)).arrayBuffer());
    await writeFile(resolve(destination, filename), bytes);
    output += block.replace(remote, '/assets/fonts/' + filename) + '\n';
    console.log(filename, bytes.length + ' bytes');
  }
  const license = await (await get('https://raw.githubusercontent.com/google/fonts/main/ofl/' + directory + '/OFL.txt')).text();
  await writeFile(resolve(destination, slug + '-OFL.txt'), license);
}
await writeFile(resolve('programme-fonts.css'), output);
console.log('Wrote programme-fonts.css and font licenses.');
