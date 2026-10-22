import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : /\.tsx?$/.test(name) ? [name] : [];
  });
}

let imports = 0;
for (const file of files('src')) {
  const normalized = file.replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    imports++;
    const target = path.resolve(path.dirname(file), spec).replaceAll('\\', '/');
    const forbidden = normalized.startsWith('src/engine/') ? /\/src\/(app|features|worlds|content|pages)\//
      : normalized.startsWith('src/content/') ? /\/src\/(app|features|worlds|pages)\//
      : normalized.startsWith('src/features/') ? /\/src\/worlds\//
      : normalized.startsWith('src/worlds/') ? /\/src\/(app|features|pages)\// : null;
    assert.ok(!forbidden?.test(target), `${normalized} imports a forbidden layer: ${spec}`);
    const world = normalized.match(/^src\/worlds\/([^/]+)\//)?.[1];
    const targetWorld = target.match(/\/src\/worlds\/([^/]+)\//)?.[1];
    if (world && targetWorld) assert.equal(targetWorld, world, `${normalized} imports another theme: ${spec}`);
  }
}
console.log(`Dependency boundaries passed (${imports} local imports).`);
