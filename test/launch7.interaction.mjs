import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { create, act } from 'react-test-renderer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';

const store = new Map();
global.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) };
global.window = { location: { pathname: '/', search: '' }, alert() {}, setTimeout };
const testBundle = join(process.cwd(), 'test', '.launch7-interaction-test.mjs');
await build({ entryPoints: ['src/Launch7StandaloneV2.jsx'], bundle: true, format: 'esm', platform: 'node', external: ['react', 'lucide-react'], outfile: testBundle, loader: { '.jsx': 'jsx' } });
const { default: App } = await import(pathToFileURL(testBundle).href);
const text = (node) => node?.children?.filter((child) => typeof child === 'string').join('') || '';
const button = (root, label) => root.root.findAll((node) => node.type === 'button' && text(node).includes(label))[0];

let renderer;
await act(async () => { renderer = create(React.createElement(App)); });
assert.ok(button(renderer, 'Open launch plan'), 'dashboard should expose launch plan navigation');
await act(async () => button(renderer, 'Open launch plan').props.onClick());
assert.ok(button(renderer, 'Review launch'), 'setup should expose final review navigation');
assert.ok(button(renderer, 'Team onboarding'), 'team onboarding should remain accessible from navigation');

await act(async () => button(renderer, 'Team onboarding').props.onClick());
assert.ok(button(renderer, 'Generate local invitation link'), 'onboarding should expose invitation generation');
const email = renderer.root.findAllByType('input').find((node) => node.props.type === 'email');
await act(async () => email.props.onChange({ target: { value: 'member@example.com' } }));
await act(async () => button(renderer, 'Generate local invitation link').props.onClick());
assert.ok([...store.entries()].some(([key, value]) => key.startsWith('launch7-invite-email-') && /member@example\.com/.test(value)));
assert.ok(renderer.root.findAll((node) => typeof node.children?.[0] === 'string' && node.children[0].includes('/launch-7/onboarding?invitationToken=')).length, 'generated links should route to onboarding');

global.window.location.pathname = '/launch-7/onboarding';
global.window.location.search = '?invitationToken=local-test';
store.set('launch7-signed-name-local-other', 'Different invitation member');
await act(async () => { renderer = create(React.createElement(App)); });
assert.ok(renderer.root.findAll((node) => node.type === 'h1' && text(node).includes('Invite and onboard')).length, 'invitation token should open onboarding flow');
console.log('Launch7 component interaction tests passed');
