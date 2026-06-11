import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIR = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(DIR);

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace text-gray-*, bg-gray-*, border-gray-*, placeholder-gray-* with slate equivalents.
  newContent = newContent.replace(/\b(text|bg|border|placeholder|from|to|ring)-gray-/g, '$1-slate-');

  if (file.endsWith('index.css')) {
    newContent = newContent.replace('background-color: #f9fafb; /* gray-50 */', 'background-color: #f8fafc; /* slate-50 */');
    newContent = newContent.replace('color: #111827; /* gray-900 */', 'color: #0f172a; /* slate-900 */');
    newContent = newContent.replace('background: #d1d5db;', 'background: #cbd5e1;'); // slate-300
    newContent = newContent.replace('background: #9ca3af;', 'background: #94a3b8;'); // slate-400
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${path.relative(__dirname, file)}`);
  }
});
