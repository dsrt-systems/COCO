import fs from 'node:fs';
import path from 'node:path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix unclosed quote before semicolon, e.g. from './enums; -> from './enums';
  content = content.replace(/from\s+(['"])(\.[^'"]+);/g, "from $1$2$1;");

  // Strip .js extension from relative imports: from './foo.js' -> from './foo'
  content = content.replace(/from\s+(['"])(\.[^'"]+)\.js\1/g, "from $1$2$1");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      fixFile(fullPath);
    }
  }
}

walkDir('packages');
walkDir('apps');
walkDir('services');
console.log('Import cleanup complete.');
