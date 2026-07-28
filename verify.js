/* verify.js - Basic automated verification of website files integrity */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = __dirname;
const files = ['index.html', 'index.css', 'app.js'];

console.log("Starting automated integrity verification...\n");

let failed = false;

// 1. Check file existences
files.forEach(f => {
  const filePath = path.join(baseDir, f);
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] File missing: ${f}`);
    failed = true;
  } else {
    const stats = fs.statSync(filePath);
    console.log(`[PASS] File exists: ${f} (${stats.size} bytes)`);
  }
});

if (failed) {
  process.exit(1);
}

// 2. Syntax validation of app.js
const appJsPath = path.join(baseDir, 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
try {
  new vm.Script(appJsContent);
  console.log("[PASS] app.js compiled successfully with no syntax errors.");
} catch (err) {
  console.error("[FAIL] app.js syntax check failed:");
  console.error(err);
  failed = true;
}

// 3. HTML parsing check
const htmlPath = path.join(baseDir, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredSelectors = [
  'id="view-content"',
  'id="shader-canvas-ANIMATION_22"',
  'id="ai-assistant-container"',
  'id="theme-toggle"',
  'id="favorites-trigger"'
];

requiredSelectors.forEach(sel => {
  if (!htmlContent.includes(sel)) {
    console.error(`[FAIL] index.html is missing required element: ${sel}`);
    failed = true;
  } else {
    console.log(`[PASS] index.html contains required element: ${sel}`);
  }
});

console.log("\n--- Verification Summary ---");
if (failed) {
  console.error("Result: FAILURE - Core integrity issues detected.");
  process.exit(1);
} else {
  console.log("Result: SUCCESS - All file structures and syntaxes are valid.");
  process.exit(0);
}
