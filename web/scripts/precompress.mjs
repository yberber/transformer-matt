// Writes a brotli (.br) and a gzip (.gz) copy next to every text file in the static
// build, for Caddy to serve precompressed. Run with `npm run precompress` after
// `npm run build`. The committed Example files already have their .br, which is kept.
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const TEXT_FILES = /\.(html|js|mjs|css|json|svg|txt|xml|webmanifest|map)$/;

async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

for (const entry of await readdir(DIST, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !TEXT_FILES.test(entry.name)) continue;
  const path = join(entry.parentPath, entry.name);
  const content = await readFile(path);
  if (!(await exists(`${path}.br`))) {
    const brotli = brotliCompressSync(content, {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: content.length,
      },
    });
    await writeFile(`${path}.br`, brotli);
  }
  await writeFile(`${path}.gz`, gzipSync(content, { level: 9 }));
}
