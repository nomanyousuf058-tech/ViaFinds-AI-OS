const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('page.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('app/dashboard');
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/import\s+DashboardLayout\s+from\s+['"]@\/app\/dashboard\/layout['"];?\r?\n?/g, '');
  content = content.replace(/<DashboardLayout>\r?\n?/g, '');
  content = content.replace(/<\/DashboardLayout>\r?\n?/g, '');
  
  // also fix indentation a bit if it was nested
  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
  }
});

console.log(`Cleaned ${count} files`);
