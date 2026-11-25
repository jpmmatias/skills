#!/usr/bin/env node
// Runs the lesson check (skills/learn/starter/tools/check.mjs) on every course under examples/.
// Exit 1 if any example fails; exit 0 with a message when there are no examples yet.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'examples');
const courses = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'assets', 'course.js'))).map((d) => d.name) : [];
if (!courses.length) { console.log('No example courses under examples/ (nothing to check).'); process.exit(0); }
let failed = 0;
for (const c of courses) {
  console.log(`\n=== examples/${c}`);
  const r = spawnSync(process.execPath, [join(root, 'skills/learn/starter/tools/check.mjs'), join(dir, c), ...process.argv.slice(2)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\n${courses.length - failed}/${courses.length} example course(s) passed the check.`);
process.exit(failed ? 1 : 0);
