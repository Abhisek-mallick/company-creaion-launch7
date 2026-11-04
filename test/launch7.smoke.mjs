import assert from 'node:assert/strict';
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
