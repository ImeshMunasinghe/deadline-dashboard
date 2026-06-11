import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  // Colors (Purple -> Navy Blue)
  { regex: /violet-900/g, replace: 'blue-900' },
  { regex: /violet-800/g, replace: 'blue-800' },
  { regex: /violet-700/g, replace: 'blue-700' },
  { regex: /violet-600/g, replace: 'blue-600' },
  { regex: /violet-500/g, replace: 'blue-600' }, // Navy blue preference
  { regex: /violet-400/g, replace: 'blue-500' },
  { regex: /violet-300/g, replace: 'blue-400' },
  { regex: /#8b5cf6/g, replace: '#2563eb' }, // violet-500 hex -> blue-600 hex
  { regex: /#a78bfa/g, replace: '#60a5fa' }, // violet-400 hex -> blue-400 hex
  
  // Light Mode mapping (adding dark: prefixes and replacing base classes)
  // Backgrounds
  { regex: /\bbg-neutral-950\b/g, replace: 'bg-gray-50 dark:bg-neutral-950' },
  { regex: /\bbg-neutral-900\b/g, replace: 'bg-white dark:bg-neutral-900' },
  { regex: /\bbg-neutral-800\b/g, replace: 'bg-gray-100 dark:bg-neutral-800' },
  { regex: /\bbg-neutral-700\b/g, replace: 'bg-gray-200 dark:bg-neutral-700' },
  // Borders
  { regex: /\bborder-neutral-800\b/g, replace: 'border-gray-200 dark:border-neutral-800' },
  { regex: /\bborder-neutral-700\b/g, replace: 'border-gray-300 dark:border-neutral-700' },
  { regex: /\bborder-neutral-600\b/g, replace: 'border-gray-400 dark:border-neutral-600' },
  // Text
  { regex: /\btext-neutral-100\b/g, replace: 'text-gray-900 dark:text-neutral-100' },
  { regex: /\btext-neutral-200\b/g, replace: 'text-gray-800 dark:text-neutral-200' },
  { regex: /\btext-neutral-300\b/g, replace: 'text-gray-700 dark:text-neutral-300' },
  { regex: /\btext-neutral-400\b/g, replace: 'text-gray-500 dark:text-neutral-400' },
  { regex: /\btext-neutral-500\b/g, replace: 'text-gray-400 dark:text-neutral-500' },
  { regex: /\btext-neutral-600\b/g, replace: 'text-gray-400 dark:text-neutral-600' },
  { regex: /\btext-neutral-700\b/g, replace: 'text-gray-300 dark:text-neutral-700' },
  // Placeholders
  { regex: /\bplaceholder-neutral-500\b/g, replace: 'placeholder-gray-400 dark:placeholder-neutral-500' },
  { regex: /\bplaceholder-neutral-600\b/g, replace: 'placeholder-gray-400 dark:placeholder-neutral-600' },
];

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(r => {
      content = content.replace(r.regex, r.replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
