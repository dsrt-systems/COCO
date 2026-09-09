import fs from 'node:fs';
import path from 'node:path';

function repairContent(content) {
  let lines = content.split('\n');
  let modified = false;

  const repairedLines = lines.map((line) => {
    let l = line;

    // Fix 1: Fix broken import statements missing closing quote before semicolon or newline
    // e.g., import ... from './index; -> import ... from './index';
    if (/from\s+['"][^'"]+$/.test(l) && !/['"]\s*;?$/.test(l)) {
      l = l + "'";
      modified = true;
    }
    l = l.replace(/from\s+(['"])([^'"]+)\.js\1?;?/g, "from '$2';");
    l = l.replace(/from\s+(['"])([^'";]+);$/g, (match, q, p) => {
      if (!p.endsWith("'") && !p.endsWith('"')) {
        modified = true;
        return `from '${p}';`;
      }
      return match;
    });

    // Fix 2: Remove stray trailing quotes at end of code statements
    // e.g., return this'; -> return this;
    // e.g., event.timestamp'; -> event.timestamp;
    // e.g., input.costUsd / quantity : 0'; -> input.costUsd / quantity : 0;
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

console.log('Repairing syntax across workspace...');
processDir('packages');
processDir('apps');
processDir('services');
console.log('Syntax repair complete.');
