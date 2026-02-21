/**
 * Custom structural linter for follow-the-money-in conventions.
 *
 * Checks that agents/contributors don't violate project-wide rules that ESLint
 * cannot easily express. Exits non-zero if any error-level violations are found.
 *
 * Checks:
 *  1. No require() calls in scripts/  (ES module violation)
 *  2. No native float arithmetic on financial variables (use Decimal.js)
 *  3. No utils file over 300 lines    (keep agent-navigable)
 *
 * Usage: node scripts/lint/check-conventions.js
 */

import { readFile, readdir } from 'fs/promises';
import path from 'path';

const SCRIPTS_DIR = 'scripts';
const UTILS_DIR = path.join(SCRIPTS_DIR, 'utils');
const MAX_UTILS_LINES = 300;

let errors = 0;
let warnings = 0;

function error(file, line, msg, fix) {
  errors++;
  const loc = line ? `${file}:${line}` : file;
  console.error(`[ERROR] ${loc} — ${msg}`);
  if (fix) console.error(`        Fix: ${fix}`);
}

function warn(file, line, msg) {
  warnings++;
  const loc = line ? `${file}:${line}` : file;
  console.log(`[WARN]  ${loc} — ${msg}`);
}

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

async function checkRequireCalls(files) {
  for (const file of files) {
    // Skip the linter itself (meta-exception)
    if (file.replace(/\\/g, '/').includes('scripts/lint/')) continue;
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // Skip commented-out lines and lines where require appears inside a string/regex literal
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
      if (/['"`/].*require/.test(line)) return; // inside string/regex — skip
      if (/\brequire\s*\(/.test(line)) {
        error(
          file,
          i + 1,
          'require() call found — this project uses ES modules',
          'Replace with: import X from "module"  (docs/design-docs/data-pipeline.md)'
        );
      }
    });
  }
}

// Finance variable patterns: identifiers that suggest monetary values.
// We flag += / -= / * / / operations on these without Decimal wrapping.
const FINANCE_VAR_PATTERN = /\b(amount|total|sum|raised|contribution|price|balance)\b/i;
const FLOAT_OP_PATTERN = /(\+=|-=|\*=|\/=|\+|-|\*|\/)(?!\s*new\s+Decimal)/;

async function checkFloatArithmetic(files) {
  for (const file of files) {
    // Only check processing/aggregation scripts, not fetch scripts, tests, or lint infrastructure
    if (file.includes('fetch') || file.startsWith('tests')) continue;
    if (file.replace(/\\/g, '/').includes('scripts/lint/')) continue;
    if (file.replace(/\\/g, '/').includes('scripts/validate-output')) continue;

    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
      // Look for lines that both reference a finance variable and use bare arithmetic
      if (FINANCE_VAR_PATTERN.test(line) && FLOAT_OP_PATTERN.test(line)) {
        // Allow lines that already use Decimal
        if (/Decimal/.test(line) || /\.plus\(|\.minus\(|\.times\(|\.div\(/.test(line)) return;
        // Allow string concatenation context (${ ... })
        if (/`[^`]*\$\{/.test(line)) return;
        warn(
          file,
          i + 1,
          'Possible native float arithmetic on financial variable — consider Decimal.js',
          // not an error since false-positive rate is high; agent should review manually
        );
      }
    });
  }
}

async function checkUtilsFileLength() {
  let utilsFiles;
  try {
    utilsFiles = await readdir(UTILS_DIR);
  } catch {
    return; // utils dir may not exist in all envs
  }

  for (const name of utilsFiles) {
    if (!name.endsWith('.js')) continue;
    const fp = path.join(UTILS_DIR, name);
    const content = await readFile(fp, 'utf-8');
    const lineCount = content.split('\n').length;
    if (lineCount > MAX_UTILS_LINES) {
      warn(
        fp,
        null,
        `${lineCount} lines exceeds ${MAX_UTILS_LINES}-line limit for utils. ` +
        'Consider splitting — agent-navigable utilities should be ≤300 lines.'
      );
    }
  }
}

async function main() {
  console.log('Running convention checks...\n');

  const files = await collectJsFiles(SCRIPTS_DIR);

  await checkRequireCalls(files);
  await checkFloatArithmetic(files);
  await checkUtilsFileLength();

  console.log(`\nConvention check complete — ${errors} error(s), ${warnings} warning(s)`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Convention check failed unexpectedly:', err.message);
  process.exit(1);
});
