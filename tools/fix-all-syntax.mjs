import fs from 'node:fs';
import path from 'node:path';

function repairContent(content) {
  let lines = content.split('\n');
  let modified = false;

  const repairedLines = lines.map((line) => {
    let l = line;

    // 1. Fix malformed 'from ...' imports (missing quote, trailing .js, etc.)
    // Matches: from './foo; or from './foo.js; or from './foo' or from './foo.js'
    if (/\bfrom\s+['"]?(\.[^'"\s;]+|\@[^'"\s;]+|node:[^'"\s;]+)(?:\.js)?['"]?\s*;?\s*$/.test(l)) {
      l = l.replace(/\bfrom\s+['"]?(\.[^'"\s;]+|\@[^'"\s;]+|node:[^'"\s;]+)(?:\.js)?['"]?\s*;?\s*$/, "from '$1';");
      if (l !== line) modified = true;
    }

    // 2. Remove stray single quotes at the end of code statements
    // e.g., return this'; -> return this;
    // e.g., event.timestamp'; -> event.timestamp;
    if (/;\s*'\s*$/.test(l)) {
      l = l.replace(/;\s*'\s*$/, ';');
      modified = true;
    } else if (/'\s*;\s*$/.test(l) && !/['"][^'"]*['"]\s*;\s*$/.test(l)) {
      l = l.replace(/'\s*;\s*$/, ';');
      modified = true;
    } else if (/[a-zA-Z0-9_\)]+'\s*$/.test(l) && !/['"][^'"]*['"]\s*$/.test(l)) {
      l = l.replace(/'\s*$/, '');
      modified = true;
    }

    return l;
  });

  return { content: repairedLines.join('\n'), modified };
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist') {
        processDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { content, modified } = repairContent(raw);
      if (modified || content !== raw) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Repaired: ${fullPath}`);
      }
    }
  }
}

console.log('Repairing syntax across all workspace packages...');
processDir('packages');
processDir('apps');
processDir('services');
console.log('Syntax repair complete.');
