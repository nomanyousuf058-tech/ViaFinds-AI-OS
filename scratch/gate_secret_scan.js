// Secret scan over git-tracked files only (never prints values)
const { execSync } = require('child_process');
const fs = require('fs');

const files = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 })
  .split('\n')
  .filter(Boolean);

const patterns = [
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS secret', re: /aws_secret_access_key\s*=\s*['"][^'"]{8,}/i },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: 'Generic secret assign', re: /(secret|passphrase|api[_-]?key|password)\s*[:=]\s*['"][A-Za-z0-9_\/\+\-=!@#$%^&*]{12,}['"]/i },
  { name: 'Bearer literal', re: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/ },
  { name: 'JWT literal', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Postgres URL creds', re: /postgres(ql)?:\/\/[^/\s:"']+:[^@\s"']+@/i },
  { name: 'Digistore key literal', re: /digistore.*(key|token|secret).{0,20}['"][A-Za-z0-9]{16,}['"]/i },
];

const findings = [];
for (const f of files) {
  let content;
  try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const p of patterns) {
      const m = line.match(p.re);
      if (m) {
        findings.push({ file: f, line: i + 1, type: p.name, snippet: m[0].slice(0, 40) + '...[REDACTED]' });
      }
    }
  });
}

console.log('Scanned ' + files.length + ' tracked files.');
if (findings.length === 0) {
  console.log('SECRET SCAN: CLEAN — no secret-like literals in tracked files.');
} else {
  console.log('SECRET SCAN: ' + findings.length + ' FINDING(S):');
  findings.forEach(x => console.log(`  ${x.type} at ${x.file}:${x.line} -> ${x.snippet}`));
  process.exit(2);
}
