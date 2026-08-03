const fs = require('fs');
const path = require('path');
function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'studio') continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}
const allFiles = walk(process.cwd());
let fixed = 0;
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.match(/logger\.(info|error|warn|debug|workflow|ai)\b/)) {
    if (!content.match(/import\s+\{\s*logger\s*\}/)) {
      console.log('Fixing ' + file);
      content = 'import { logger } from \"@/lib/logger\";\n' + content;
      fs.writeFileSync(file, content, 'utf8');
      fixed++;
    }
  }
}
console.log('Fixed ' + fixed + ' files.');
