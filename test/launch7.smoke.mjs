import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { allWorkstreamsComplete, computeReadiness, nextAction, WORKSTREAM_KEYS } from '../src/lib/launch7Model.js';

const tasks = Object.fromEntries(WORKSTREAM_KEYS.map((key) => [key, [
  { status: 'Done' },
  { status: key === 'finance' ? 'In progress' : 'Not started' },
]]));

assert.equal(WORKSTREAM_KEYS.length, 8, 'Launch7 must keep eight workstreams');
assert.equal(computeReadiness(tasks), 50, 'readiness should be based on saved task state');
assert.equal(nextAction(tasks), 'brand', 'next action should be the first incomplete workstream');
assert.equal(allWorkstreamsComplete(tasks), false);
const complete = Object.fromEntries(WORKSTREAM_KEYS.map((key) => [key, [{ status: 'Done' }]]));
assert.equal(computeReadiness(complete), 100);
assert.equal(nextAction(complete), 'launch-review');
assert.equal(allWorkstreamsComplete(complete), true);
console.log('Launch7 model smoke tests passed');
const ui = await readFile(new URL('../src/Launch7StandaloneV2.jsx', import.meta.url), 'utf8');
for (const label of ['Budget', 'Funding', 'Ownership', 'Team & roles', 'Onboarding', 'Scope', 'Delivery', 'Filing route', 'Status & evidence', 'Partners', 'Commitments', 'Generate local invitation link', 'Submit for approval']) {
  assert.match(ui, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `standalone UI should include ${label}`);
}
console.log('Launch7 guided-flow coverage passed');
assert.match(ui, /window\.location\.search\.includes\("invitationToken"\)/, 'invitation URLs should open onboarding mode');
assert.match(ui, /launch7-invite-email-\$\{inviteToken\}/, 'invite email should persist locally');
assert.match(ui, /localStorage\.setItem\(nameKey, name\)/, 'signature should persist locally');
assert.match(ui, /localStorage\.setItem\(approvalKey, "Submitted"\)/, 'approval should persist as explicit local state');
assert.match(ui, /const tabs = WS\[k\]\[1\]/, 'wizard should use per-workstream stages');
for (const title of ['Define the decision', 'Add evidence or reference', 'Review and confirm', 'Validate saved evidence', 'Approve stage outcome']) {
  assert.match(ui, new RegExp(`"${title}"`), `Product should persist ${title}`);
}
assert.match(ui, /const draftKey = `launch7-draft-\$\{v\.id\}-\$\{k\}-\$\{tab\}`/, 'wizard should restore saved stage fields');
assert.match(ui, /JSON\.stringify\(\{\s*a: data\.a,\s*b: data\.b,\s*c: data\.c,\s*file: data\.file,\s*\}\)/, 'wizard should preserve arbitrary draft text without delimiter truncation');
assert.match(ui, /const validEmail =/, 'invites should validate email format locally');
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(css, /\.app-shell \.sidebar\{position:relative/, 'mobile app shell should keep navigation in the document flow');
assert.match(ui, /done &&\s*\(\s*localStorage\.getItem\(approvalKey\) === "Submitted"/, 'approval should only remain submitted while all workstreams are complete');
console.log('Launch7 persistence and navigation coverage passed');
