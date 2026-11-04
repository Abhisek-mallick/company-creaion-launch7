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
assert.match(ui, /window\.location\.search\.includes\('invitationToken'\)/, 'invitation URLs should open onboarding mode');
assert.match(ui, /localStorage\.setItem\('launch7-invite-email'/, 'invite email should persist locally');
assert.match(ui, /localStorage\.setItem\('launch7-signed-name'/, 'signature should persist locally');
assert.match(ui, /localStorage\.setItem\(approvalKey,'Submitted'\)/, 'approval should persist as explicit local state');
assert.match(ui, /const tabs=WS\[k\]\[1\]/, 'wizard should use per-workstream stages');
console.log('Launch7 persistence and navigation coverage passed');
