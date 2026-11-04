import assert from "node:assert/strict";
import { build } from "esbuild";
import { create, act } from "react-test-renderer";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";

const store = new Map();
global.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
global.window = {
  location: { pathname: "/", search: "", reload() {} },
  alert() {},
  reload() {},
  setTimeout,
};
const testBundle = join(process.cwd(), "test", ".launch7-interaction-test.mjs");
await build({
  entryPoints: ["src/Launch7StandaloneV2.jsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["react", "lucide-react"],
  outfile: testBundle,
  loader: { ".jsx": "jsx" },
});
const { default: App } = await import(pathToFileURL(testBundle).href);
const text = (node) =>
  node?.children
    ?.map((child) => (typeof child === "string" ? child : text(child)))
    .join("") || "";
const button = (root, label) =>
  root.root.findAll(
    (node) => node.type === "button" && text(node).includes(label),
  )[0];

let renderer;
await act(async () => {
  renderer = create(React.createElement(App));
});
assert.ok(
  button(renderer, "Open launch plan"),
  "dashboard should expose launch plan navigation",
);
await act(async () => button(renderer, "Open launch plan").props.onClick());
assert.ok(
  button(renderer, "Review launch"),
  "setup should expose final review navigation",
);
assert.ok(
  button(renderer, "Team onboarding"),
  "team onboarding should remain accessible from navigation",
);

await act(async () => button(renderer, "Product & technology").props.onClick());
assert.ok(
  button(renderer, "Draft with AI"),
  "Product should expose a local AI draft action",
);
assert.ok(
  button(renderer, "Assign to a person"),
  "Product should expose person assignment",
);
await act(async () => button(renderer, "Assign to a person").props.onClick());
const assignee = renderer.root.findAllByType("input")[0];
await act(async () =>
  assignee.props.onChange({ target: { value: "Product owner" } }),
);
assert.equal(
  JSON.parse(store.get("launch7-draft-1-product-0")).assigneeName,
  "Product owner",
  "Product assignment should persist in the venture stage draft",
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Brand & collateral").props.onClick());
assert.ok(
  button(renderer, "Upload manually"),
  "Brand should expose manual evidence action",
);
await act(async () => button(renderer, "Upload manually").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "span" && text(node).includes("No evidence selected"),
  ).length,
  "Brand manual mode should show local evidence preview",
);
await act(async () => button(renderer, "Product & technology").props.onClick());
await act(async () => button(renderer, "Draft with AI").props.onClick());
const firstProductInput = renderer.root.findAllByType("input")[0];
await act(async () =>
  firstProductInput.props.onChange({
    target: { value: "Validated MVP scope" },
  }),
);
await act(async () => button(renderer, "Save & continue").props.onClick());
const deliveryInput = renderer.root.findAllByType("input")[0];
await act(async () =>
  deliveryInput.props.onChange({ target: { value: "Delivery milestone B" } }),
);
await act(async () => button(renderer, "Scope").props.onClick());
assert.equal(
  renderer.root.findAllByType("input")[0].props.value,
  "Validated MVP scope",
  "returning to Scope should restore its own draft",
);
await act(async () => button(renderer, "Delivery").props.onClick());
assert.equal(
  renderer.root.findAllByType("input")[0].props.value,
  "Delivery milestone B",
  "returning to Delivery should restore its own draft",
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Product & technology").props.onClick());
assert.equal(
  renderer.root.findAllByType("input")[0].props.value,
  "Validated MVP scope",
  "product drafts should restore after navigation",
);
for (let i = 0; i < 5; i += 1)
  await act(async () =>
    button(
      renderer,
      i === 4 ? "Save review" : "Save & continue",
    ).props.onClick(),
  );
const savedVenture = JSON.parse(store.get("launch7-v2"))[0];
assert.equal(
  savedVenture.tasks.product.length,
  5,
  "Product should have five completion records",
);
assert.ok(
  savedVenture.tasks.product.every((item) => item.status === "Done"),
  "all Product stages should persist as done",
);
assert.equal(
  Math.round(
    (savedVenture.tasks.product.filter((item) => item.status === "Done")
      .length /
      savedVenture.tasks.product.length) *
      100,
  ),
  100,
  "Product progress should be 100% after all stages",
);
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Product & technology").props.onClick());
assert.equal(
  renderer.root.findAllByType("input")[0].props.value,
  "Validated MVP scope",
  "Scope draft should survive reload",
);
await act(async () => button(renderer, "Delivery").props.onClick());
assert.equal(
  renderer.root.findAllByType("input")[0].props.value,
  "Delivery milestone B",
  "Delivery draft should survive reload",
);
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "b" && text(node).includes("100%"),
  ).length === 1 ||
    savedVenture.tasks.product.every((item) => item.status === "Done"),
  "saved completion should remain visible after reload",
);

const fullyDone = JSON.parse(store.get("launch7-v2")).map((venture) => ({
  ...venture,
  tasks: Object.fromEntries(
    Object.entries(venture.tasks).map(([key, items]) => [
      key,
      items.map((item) => ({ ...item, status: "Done" })),
    ]),
  ),
}));
store.set("launch7-v2", JSON.stringify(fullyDone));
store.set("launch7-approval-1", "Submitted");
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h2" && text(node).includes("Submitted for approval"),
  ).length,
  "approved venture should show submitted state",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
const brandCheck = renderer.root.findAll(
  (node) =>
    node.type === "button" && node.props.className?.includes("check-button"),
)[0];
await act(async () => brandCheck.props.onClick());
await act(async () => button(renderer, "Launch review").props.onClick());
assert.equal(
  button(renderer, "Submit for approval").props.disabled,
  true,
  "incomplete workstreams must block approval",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
const repairedBrandCheck = renderer.root.findAll(
  (node) =>
    node.type === "button" && node.props.className?.includes("check-button"),
)[0];
await act(async () => repairedBrandCheck.props.onClick());
await act(async () => button(renderer, "Launch review").props.onClick());
assert.equal(
  button(renderer, "Submit for approval").props.disabled,
  false,
  "recompletion should still require a fresh approval submission",
);

await act(async () => button(renderer, "Team onboarding").props.onClick());
assert.ok(
  button(renderer, "Generate local invitation link"),
  "onboarding should expose invitation generation",
);
const email = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "email");
await act(async () =>
  email.props.onChange({ target: { value: "not-an-email" } }),
);
assert.equal(
  button(renderer, "Generate local invitation link").props.disabled,
  true,
  "invalid emails must not generate invitations",
);
await act(async () =>
  email.props.onChange({ target: { value: "member@example.com" } }),
);
assert.equal(
  button(renderer, "Generate local invitation link").props.disabled,
  false,
  "valid emails should enable local invitation generation",
);
await act(async () =>
  button(renderer, "Generate local invitation link").props.onClick(),
);
const generatedInviteToken = [...store.keys()]
  .find((key) => key.startsWith("launch7-invite-email-local-"))
  ?.replace("launch7-invite-email-", "");
assert.ok(
  generatedInviteToken,
  "generated invitation should have a concrete local token",
);
assert.ok(
  renderer.root.findAll(
    (node) =>
      typeof node.children?.[0] === "string" &&
      node.children[0].includes("/launch-7/onboarding?invitationToken="),
  ).length,
  "generated links should route to onboarding",
);
const signature = renderer.root
  .findAllByType("input")
  .find(
    (node) =>
      node.props.type !== "email" &&
      node.props.type !== "checkbox" &&
      node.props.type !== "file",
  );
await act(async () =>
  signature.props.onChange({ target: { value: "First Invitation Member" } }),
);
const signatureForm = renderer.root.findAllByType("form")[0];
await act(async () => signatureForm.props.onSubmit({ preventDefault() {} }));
assert.equal(
  store.get(`launch7-signed-name-${generatedInviteToken}`),
  "First Invitation Member",
  "signature should be stored against the generated invitation",
);
assert.notEqual(
  store.get("launch7-signed-name-preview"),
  "First Invitation Member",
  "signature must not fall back to preview token",
);

global.window.location.pathname = "/launch-7/onboarding";
global.window.location.search = "?invitationToken=local-test";
store.set("launch7-signed-name-local-other", "Different invitation member");
await act(async () => {
  renderer = create(React.createElement(App));
});
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "h1" && text(node).includes("Invite and onboard"),
  ).length,
  "invitation token should open onboarding flow",
);
console.log("Launch7 component interaction tests passed");
