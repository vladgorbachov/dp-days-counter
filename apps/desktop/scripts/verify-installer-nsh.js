/**
 * Fail the build if installer.nsh reintroduces Explorer kill or icon-cache hacks.
 * Prevents shipping the 1.0.4 / early-2.0.0 NSIS regression.
 */
const fs = require('fs');
const path = require('path');

const nshPath = path.join(__dirname, '..', 'installer.nsh');
const content = fs.readFileSync(nshPath, 'utf8');

/** NSIS lines that are comments or macro headers — not executable script. */
const executableLines = content
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith(';') && !line.startsWith('!'));

const executable = executableLines.join('\n');

const forbidden = [
  { pattern: /taskkill/i, label: 'taskkill' },
  { pattern: /explorer\.exe/i, label: 'explorer.exe' },
  { pattern: /ie4uinit/i, label: 'ie4uinit' }
];

const hits = forbidden.filter(({ pattern }) => pattern.test(executable));
if (hits.length > 0) {
  console.error('[verify-installer-nsh] installer.nsh contains forbidden commands:');
  for (const { label } of hits) {
    console.error(`  - ${label}`);
  }
  process.exit(1);
}

console.log('[verify-installer-nsh] OK — no Explorer-kill hooks in installer.nsh');
