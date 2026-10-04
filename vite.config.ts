import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Schrijft `sw.js` met alle gebouwde bestanden, zodat de app na één bezoek offline werkt. */
function offlineServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved: (config) => void (outDir = config.build.outDir),
    writeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          if (statSync(path).isDirectory()) walk(path);
          else if (name !== 'sw.js') files.push(relative(outDir, path));
        }
      };
      walk(outDir);
      files.sort();
      const hash = createHash('sha1');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const template = readFileSync('src/sw.template.js', 'utf8');
      writeFileSync(
        join(outDir, 'sw.js'),
        template
          .replace('__VERSION__', hash.digest('hex').slice(0, 10))
          .replace('__FILES__', JSON.stringify(['./', ...files])),
      );
    },
  };
}

// Relatieve paden: werkt op GitHub Pages (/kidsplay/), lokaal en in Tauri.
export default defineConfig({ base: './', plugins: [offlineServiceWorker()] });
