import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync(process.execPath, ['scripts/preview-contribution-bot.mjs'], { stdio: 'pipe' });
const svg = readFileSync('dist/contribution-bot.svg', 'utf8');

// Characterization of the existing behavior: real-calendar geometry, count,
// continuous traversal and cell feedback must survive visual redesigns.
assert.match(svg, /2\.214/);
assert.equal((svg.match(/class="cell"/g) ?? []).length, 371);
assert.match(svg, /<animateMotion[^>]+repeatCount="indefinite"/);
assert.match(svg, /<animate attributeName="fill"/);
assert.match(svg, /<title id="title">Contribution Bot de LuisInacioDasilva<\/title>/);
assert.match(svg, /viewBox="0 0 980 270"/);
assert.match(svg, /calcMode="paced"/);
assert.equal((svg.match(/A 8 8 0 0 [01]/g) ?? []).length, 6);
assert.match(svg, /<rect x="-16" y="-13" width="32" height="26"/);

console.log('Contribution bot characterization passed.');

