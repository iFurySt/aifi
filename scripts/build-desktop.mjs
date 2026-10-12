import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  entryPoints: {
    main: resolve(root, 'apps/desktop/src/main.ts'),
    preload: resolve(root, 'apps/desktop/src/preload.ts'),
  },
  outdir: resolve(root, 'apps/desktop/dist'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  outExtension: { '.js': '.cjs' },
});
