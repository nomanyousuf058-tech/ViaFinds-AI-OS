import * as fs from 'fs';

let c = fs.readFileSync('lib/brain/strategyEvolution.ts', 'utf8');

// Remove duplicate return statements after the first one
const firstReturn = c.indexOf('return Array.from(new Set(triggers))');
if (firstReturn > -1) {
  // Find the closing brace of detectTriggers method
  const afterFirstReturn = c.indexOf('\n  }', firstReturn);
  if (afterFirstReturn > -1) {
    // Remove everything between the first return's closing brace and the next method
    const nextMethod = c.indexOf('private buildNoChange', afterFirstReturn);
    if (nextMethod > -1) {
      c = c.slice(0, afterFirstReturn + 4) + '\n\n  ' + c.slice(nextMethod);
    }
  }
}

// Fix indentation of businessUnavailable line
c = c.replace(
  'const businessUnavailable = sensors.traffic',
  '    const businessUnavailable = sensors.traffic'
);

fs.writeFileSync('lib/brain/strategyEvolution.ts', c);
console.log('Fixed strategyEvolution.ts');