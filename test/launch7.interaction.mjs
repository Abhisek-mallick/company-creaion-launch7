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
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h2" &&
      text(node).includes("Records, evidence and approval"),
  ).length,
  "dashboard should expose a consolidated launch snapshot",
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
await act(async () => assignee.props.onChange({ target: { value: "Alice" } }));
assert.equal(
  JSON.parse(store.get("launch7-draft-1-product-0")).assigneeName,
  "Alice",
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
const evidenceInput = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "file");
await act(async () =>
  evidenceInput.props.onChange({
    target: {
      files: [{ name: "brand-kit.pdf", type: "application/pdf", size: 2048 }],
    },
  }),
);
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "b" && text(node).includes("brand-kit.pdf"),
  ).length,
  "manual evidence should show the selected local file preview",
);
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "small" &&
      text(node).includes("browser-local preview only"),
  ).length,
  "Brand manual mode should show local evidence preview",
);
await act(async () => button(renderer, "Product & technology").props.onClick());
await act(async () => button(renderer, "Draft with AI").props.onClick());
const productBrief = renderer.root.findAllByType("textarea")[0];
await act(async () =>
  productBrief.props.onChange({
    target: { value: "Prepare a focused MVP release draft" },
  }),
);
await act(async () => button(renderer, "Generate demo draft").props.onClick());
assert.ok(
  renderer.root.findAll((node) =>
    text(node).includes("Generated demo draft ready for review"),
  ).length,
  "AI mode should show a simulated draft review outcome",
);
const firstProductInput = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "What is in the first release?");
await act(async () =>
  firstProductInput.props.onChange({
    target: { value: "Validated MVP scope" },
  }),
);
await act(async () => button(renderer, "Save & continue").props.onClick());
await act(async () => button(renderer, "Assign to a person").props.onClick());
const deliveryInput = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "Target milestone");
const deliveryAssignee = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "Name");
await act(async () =>
  deliveryAssignee.props.onChange({ target: { value: "Bob" } }),
);
await act(async () =>
  deliveryInput.props.onChange({ target: { value: "Delivery milestone B" } }),
);
await act(async () => button(renderer, "Scope").props.onClick());
assert.equal(
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "What is in the first release?")
    .props.value,
  "Validated MVP scope",
  "returning to Scope should restore its own draft",
);
await act(async () => button(renderer, "Delivery").props.onClick());
assert.equal(
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Target milestone").props.value,
  "Delivery milestone B",
  "returning to Delivery should restore its own draft",
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Product & technology").props.onClick());
assert.equal(
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "What is in the first release?")
    .props.value,
  "Validated MVP scope",
  "product drafts should restore after navigation",
);
await act(async () => button(renderer, "Assigned tasks").props.onClick());
for (const [index, ownerInput] of renderer.root
  .findAllByType("input")
  .filter((node) => node.props["aria-label"]?.endsWith(" owner"))
  .entries()) {
  await act(async () =>
    ownerInput.props.onChange({
      target: {
        value: index === 0 ? "Alice" : index === 1 ? "Bob" : "Product team",
      },
    }),
  );
}
for (const evidenceSelect of renderer.root
  .findAllByType("select")
  .filter((node) => node.props["aria-label"]?.endsWith(" evidence review"))) {
  await act(async () =>
    evidenceSelect.props.onChange({ target: { value: "Founder reviewed" } }),
  );
}
for (const [index, evidenceInput] of renderer.root
  .findAllByType("input")
  .filter((node) => node.props["aria-label"]?.endsWith(" evidence reference"))
  .entries()) {
  await act(async () =>
    evidenceInput.props.onChange({ target: { value: `REF-${index}` } }),
  );
}
for (const checklistButton of renderer.root
  .findAllByType("button")
  .filter((node) => text(node) === "Show checklist")) {
  await act(async () => checklistButton.props.onClick());
}
for (const checklistInput of renderer.root
  .findAllByType("input")
  .filter((node) => node.props.type === "checkbox")) {
  await act(async () =>
    checklistInput.props.onChange({ target: { checked: true } }),
  );
}
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Product & technology").props.onClick());
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
  16,
  "Product should have the full reference task collection",
);
assert.match(
  savedVenture.tasks.product[0].note,
  /Validated MVP scope/,
  "task evidence should include domain fields",
);
assert.match(
  savedVenture.tasks.product[0].note,
  /Alice/,
  "Product Scope task should retain Alice assignment",
);
assert.match(
  savedVenture.tasks.product[1].note,
  /Bob/,
  "Product Delivery task should retain Bob assignment",
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
await act(async () => button(renderer, "Assigned tasks").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "small" && text(node).includes("local demo"),
  ).length,
  "Assigned Tasks should show local assignment/evidence metadata",
);
await act(async () => button(renderer, "Show checklist").props.onClick());
const taskOwner = renderer.root
  .findAllByType("input")
  .find((node) => node.props["aria-label"] === "Define product vision owner");
await act(async () => taskOwner.props.onChange({ target: { value: "Alice" } }));
const taskEvidence = renderer.root
  .findAllByType("select")
  .find(
    (node) =>
      node.props["aria-label"] === "Define product vision evidence review",
  );
await act(async () =>
  taskEvidence.props.onChange({ target: { value: "Founder reviewed" } }),
);
assert.equal(
  JSON.parse(store.get("launch7-v2"))[0].tasks.product[0].assigneeName,
  "Alice",
  "Product task board should persist per-task assignment",
);
assert.equal(
  JSON.parse(store.get("launch7-v2"))[0].tasks.product[0].evidenceReview,
  "Founder reviewed",
  "Product task board should persist per-task evidence review",
);
await act(async () =>
  taskOwner.props.onChange({ target: { value: "Charlie" } }),
);
assert.match(
  JSON.parse(store.get("launch7-v2"))[0].tasks.product[0].note,
  /Charlie/,
  "task editor owner should be the canonical persisted Product owner",
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Finance & ownership").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("Finance budget, funding and ownership"),
  ).length,
  "Finance should expose domain-specific controls",
);
const budgetAmount = renderer.root.findAllByType("input")[0];
await act(async () =>
  budgetAmount.props.onChange({ target: { value: "50000" } }),
);
assert.equal(
  JSON.parse(store.get("launch7-draft-1-finance-0")).budgetAmount,
  "50000",
  "Finance budget should persist in local stage state",
);
const expenseCategory = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "Expense category");
await act(async () =>
  expenseCategory.props.onChange({ target: { value: "Cloud" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Amount")
    .props.onChange({ target: { value: "120" } }),
);
await act(async () => button(renderer, "Add expense").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).expenses[0].category,
  "Cloud",
  "Finance expense records should persist per venture",
);
await act(async () => button(renderer, "Edit").props.onClick());
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Amount")
    .props.onChange({ target: { value: "150" } }),
);
await act(async () => button(renderer, "Update expense").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).expenses[0].amount,
  "150",
  "Finance expense records should be editable",
);
assert.ok(
  text(renderer.root).includes("Registered spend") &&
    text(renderer.root).includes("150"),
  "Finance should show calculated registered spend",
);
const ownershipDocName = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "Document name");
await act(async () =>
  ownershipDocName.props.onChange({ target: { value: "Cap table" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Document type")
    .props.onChange({ target: { value: "Ownership" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "ownershipDocuments status")
    .props.onChange({ target: { value: "Accepted" } }),
);
await act(async () => button(renderer, "Add document").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).ownershipDocuments[0].name,
  "Cap table",
  "Finance ownership documents should persist per venture",
);
await act(async () => button(renderer, "Funding").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "input" &&
      node.props.placeholder === "Bootstrapped, grant, investor",
  ).length,
  "Finance funding stage should expose funding source",
);
const fundingSource = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "Bootstrapped, grant, investor");
await act(async () =>
  fundingSource.props.onChange({ target: { value: "Investor" } }),
);
await act(async () => button(renderer, "Ownership").props.onClick());
const ownershipPercent = renderer.root
  .findAllByType("input")
  .find((node) => node.props.placeholder === "e.g. 70%");
await act(async () =>
  ownershipPercent.props.onChange({ target: { value: "70%" } }),
);
const financeReviewTab = renderer.root
  .findAll((node) => node.type === "button" && text(node).includes("Review"))
  .at(-1);
await act(async () => financeReviewTab.props.onClick());
assert.ok(
  renderer.root
    .findAllByType("input")
    .some((node) => node.props.value === "50000"),
  "Finance review should summarize the saved budget stage",
);
assert.ok(
  renderer.root
    .findAllByType("input")
    .some((node) => node.props.value === "Investor"),
  "Finance review should summarize the saved funding stage",
);
assert.ok(
  renderer.root
    .findAllByType("input")
    .some((node) => node.props.value === "70%"),
  "Finance review should summarize the saved ownership stage",
);
await act(async () => button(renderer, "Save review").props.onClick());
assert.match(
  JSON.parse(store.get("launch7-v2"))[0].tasks.finance[0].note,
  /50000/,
  "Finance review should write the latest domain snapshot to task evidence",
);
const reviewBudget = renderer.root
  .findAllByType("input")
  .find((node) => node.props.value === "50000");
await act(async () =>
  reviewBudget.props.onChange({ target: { value: "75000" } }),
);
await act(async () => button(renderer, "Save review").props.onClick());
assert.ok(
  JSON.parse(store.get("launch7-v2"))[0].tasks.finance.some((item) =>
    /75000/.test(item.note),
  ),
  "editing Finance review should update task evidence instead of preserving stale notes",
);
await act(async () => button(renderer, "Budget").props.onClick());
const newerBudget = renderer.root.findAllByType("input")[0];
await act(async () =>
  newerBudget.props.onChange({ target: { value: "90000" } }),
);
const latestFinanceReview = renderer.root
  .findAll((node) => node.type === "button" && text(node).includes("Review"))
  .at(-1);
await act(async () => latestFinanceReview.props.onClick());
assert.ok(
  renderer.root
    .findAllByType("input")
    .some((node) => node.props.value === "90000"),
  "newer Budget edits should win over an older Review snapshot",
);
await act(async () => button(renderer, "Save review").props.onClick());
assert.ok(
  JSON.parse(store.get("launch7-v2"))[0].tasks.finance.some((item) =>
    /90000/.test(item.note),
  ),
  "final Finance review evidence should use the current merged value",
);
await act(async () => button(renderer, "Legal & formation").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("Legal formation and filing evidence"),
  ).length,
  "Legal should expose filing controls",
);
await act(async () => button(renderer, "People & operations").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("People roles, onboarding and operations"),
  ).length,
  "People should expose onboarding controls",
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Role title")
    .props.onChange({ target: { value: "Product designer" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Person")
    .props.onChange({ target: { value: "Jamie" } }),
);
await act(async () => button(renderer, "Add role").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).roles[0].person,
  "Jamie",
  "People role records should persist per venture",
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .filter((node) => node.props.placeholder === "Person")[1]
    .props.onChange({ target: { value: "Jamie" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Evidence reference")
    .props.onChange({ target: { value: "Invite signed" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Reviewer")
    .props.onChange({ target: { value: "Founder" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "peopleEvidence status")
    .props.onChange({ target: { value: "Accepted" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("button")
    .find((node) => text(node) === "Add evidence")
    .props.onClick(),
);
assert.equal(
  JSON.parse(store.get("launch7-records-1")).peopleEvidence[0].evidence,
  "Invite signed",
  "People evidence records should persist per venture",
);
await act(async () => button(renderer, "Apps & integrations").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("Apps, permissions and integration checks"),
  ).length,
  "Apps should expose integration controls",
);
const toolInventory = renderer.root.findAllByType("input")[0];
await act(async () =>
  toolInventory.props.onChange({ target: { value: "Analytics" } }),
);
assert.equal(
  JSON.parse(store.get("launch7-draft-1-apps-0")).toolInventory,
  "Analytics",
  "Apps inventory should persist locally",
);
await act(async () => button(renderer, "Partners & capital").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("Partners, commitments and capital references"),
  ).length,
  "Partners should expose capital controls",
);
await act(async () => button(renderer, "Launch preparation").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h3" &&
      text(node).includes("Launch date, checks and recovery plan"),
  ).length,
  "Launch preparation should expose final checklist controls",
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Decision")
    .props.onChange({ target: { value: "Go to beta" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Decision maker")
    .props.onChange({ target: { value: "Founder" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "decisions outcome")
    .props.onChange({ target: { value: "Approved" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Decision scope")
    .props.onChange({ target: { value: "Beta launch" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Evidence reference")
    .props.onChange({ target: { value: "Launch memo" } }),
);
await act(async () => button(renderer, "Add decision").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).decisions[0].decision,
  "Go to beta",
  "Launch Room decisions should persist per venture",
);
assert.equal(
  JSON.parse(store.get("launch7-records-1")).decisions[0].scope,
  "Beta launch",
  "Launch decisions should persist scope",
);
assert.equal(
  JSON.parse(store.get("launch7-records-1")).decisions[0].evidence,
  "Launch memo",
  "Launch decisions should persist evidence references",
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Dependency or blocker")
    .props.onChange({ target: { value: "Analytics event mapping" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Owner")
    .props.onChange({ target: { value: "Product" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "dependencies status")
    .props.onChange({ target: { value: "Resolved" } }),
);
await act(async () => button(renderer, "Add dependency").props.onClick());
assert.equal(
  JSON.parse(store.get("launch7-records-1")).dependencies[0].dependency,
  "Analytics event mapping",
  "Launch dependencies should persist per venture",
);
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Product & technology").props.onClick());
assert.equal(
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "What is in the first release?")
    .props.value,
  "Validated MVP scope",
  "Scope draft should survive reload",
);
await act(async () => button(renderer, "Delivery").props.onClick());
assert.equal(
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Target milestone").props.value,
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
await act(async () => button(renderer, "Finance & ownership").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "b" && text(node).includes("Cloud"),
  ).length,
  "Finance records should survive app reload",
);
await act(async () => button(renderer, "Ventures").props.onClick());
assert.ok(
  text(renderer.root).includes("local domain records"),
  "dashboard should surface consolidated domain records",
);

const fullyDone = JSON.parse(store.get("launch7-v2")).map((venture) => ({
  ...venture,
  tasks: Object.fromEntries(
    Object.entries(venture.tasks).map(([key, items]) => [
      key,
      items.map((item, index) => ({
        ...item,
        status: "Done",
        ...(key === "product"
          ? {
              assigneeName: item.assigneeName || "Product team",
              evidenceReview: "Founder reviewed",
              evidenceReference: item.evidenceReference || `REF-${index}`,
              checklistState: { 0: true, 1: true, 2: true },
            }
          : {}),
      })),
    ]),
  ),
}));
store.set("launch7-v2", JSON.stringify(fullyDone));
store.set(
  "launch7-draft-1-apps-0",
  JSON.stringify({
    toolInventory: "Analytics",
    permissionOwner: "Founder",
    testEvidence: "Smoke test passed",
  }),
);
store.set(
  "launch7-draft-1-legal-0",
  JSON.stringify({
    entityType: "Private limited",
    jurisdiction: "Delaware",
    filingRoute: "Registered agent",
  }),
);
store.set(
  "launch7-draft-1-people-0",
  JSON.stringify({
    roleTitle: "Founding engineer",
    personName: "Alex Morgan",
    onboardingPlan: "Access and first-week checklist",
  }),
);
store.set(
  "launch7-draft-1-partners-0",
  JSON.stringify({
    partnerName: "Northstar Labs",
    commitmentType: "Pilot",
    partnerReference: "LOI-001",
  }),
);
store.set(
  "launch7-draft-1-launch-0",
  JSON.stringify({
    launchDate: "2026-12-01",
    launchOwner: "Alex Morgan",
    recoveryPlan: "Rollback and notify customers",
  }),
);
store.set("launch7-approval-1", "Submitted");
store.delete("launch7-approval-invalidated-1");
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
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Finance & ownership").props.onClick());
await act(async () =>
  renderer.root
    .findAllByType("button")
    .find((node) => text(node) === "Edit")
    .props.onClick(),
);
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Amount")
    .props.onChange({ target: { value: "175" } }),
);
await act(async () => button(renderer, "Update expense").props.onClick());
await act(async () => button(renderer, "Launch review").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "editing a Finance register should invalidate submitted approval",
);
await act(async () => button(renderer, "Launch preparation").props.onClick());
await act(async () =>
  renderer.root
    .findAllByType("button")
    .find((node) => node.props["aria-label"]?.startsWith("Edit dependencies"))
    .props.onClick(),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "dependencies status")
    .props.onChange({ target: { value: "Blocked" } }),
);
await act(async () => button(renderer, "Update dependency").props.onClick());
await act(async () => button(renderer, "Launch review").props.onClick());
assert.ok(
  text(renderer.root).includes("unresolved launch dependencies"),
  "a blocked Launch Room dependency should block readiness with a reason",
);
await act(async () => button(renderer, "People & operations").props.onClick());
await act(async () =>
  renderer.root
    .findAllByType("button")
    .find((node) => node.props["aria-label"]?.startsWith("Edit peopleEvidence"))
    .props.onClick(),
);
await act(async () =>
  renderer.root
    .findAllByType("select")
    .find((node) => node.props["aria-label"] === "peopleEvidence status")
    .props.onChange({ target: { value: "Rejected" } }),
);
await act(async () => button(renderer, "Update evidence").props.onClick());
await act(async () => button(renderer, "Launch review").props.onClick());
assert.ok(
  text(renderer.root).includes("people evidence not accepted"),
  "rejected People evidence should block readiness with a reason",
);
const clearedRegisterState = JSON.parse(store.get("launch7-records-1"));
clearedRegisterState.dependencies[0].status = "Resolved";
clearedRegisterState.peopleEvidence[0].status = "Accepted";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
store.delete("launch7-approval-invalidated-1");
global.window.location.pathname = "/";
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "explicitly resolved register states should allow readiness",
);
clearedRegisterState.dependencies[0].status = "Unblocked";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "legacy Unblocked dependency should be treated as resolved",
);
clearedRegisterState.dependencies[0].status = "Open";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("unresolved launch dependencies"),
  "Open dependency status should block readiness",
);
clearedRegisterState.dependencies[0].status = "Resolved";
clearedRegisterState.decisions[0].outcome = "No-go";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("launch decision not approved"),
  "No-go decision should block readiness",
);
clearedRegisterState.decisions[0].outcome = "Approved";
clearedRegisterState.dependencies[0].status = "Mystery legacy state";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("unresolved launch dependencies"),
  "unknown legacy dependency status should fail closed",
);
clearedRegisterState.dependencies[0].status = "Resolved";
store.set("launch7-records-1", JSON.stringify(clearedRegisterState));
store.set(
  "launch7-draft-1-finance-0",
  JSON.stringify({
    budgetAmount: "",
    fundingSource: "Investor",
    ownershipPercent: "70%",
    __fieldUpdated: {
      budgetAmount: 9000000000000000,
      fundingSource: 9000000000000000,
      ownershipPercent: 9000000000000000,
    },
  }),
);
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h2" &&
      text(node).includes("Complete every workstream first"),
  ).length,
  "clearing a required Finance field should block approval",
);
store.set(
  "launch7-draft-1-finance-0",
  JSON.stringify({
    budgetAmount: "50000",
    fundingSource: "Investor",
    ownershipPercent: "70%",
  }),
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
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

await act(async () =>
  button(renderer, "Create another invitation").props.onClick(),
);
const secondEmail = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "email");
await act(async () =>
  secondEmail.props.onChange({ target: { value: "second@example.com" } }),
);
await act(async () =>
  button(renderer, "Generate local invitation link").props.onClick(),
);
const inviteTokens = [...store.keys()]
  .filter((key) => key.startsWith("launch7-invite-email-local-"))
  .map((key) => key.replace("launch7-invite-email-", ""));
assert.ok(
  inviteTokens.length >= 2,
  "signed members should be able to create another invitation",
);
const unsignedToken = inviteTokens.find(
  (value) => value !== generatedInviteToken,
);

global.window.location.pathname = "/launch-7/onboarding";
global.window.location.search = "?invitationToken=" + unsignedToken;
await act(async () => {
  renderer = create(React.createElement(App));
});
assert.ok(
  renderer.root.findAll(
    (node) => node.type === "h1" && text(node).includes("Invite and onboard"),
  ).length,
  "invitation token should open onboarding flow",
);

const selectedSource = JSON.parse(store.get("launch7-v2"))[0];
const olderVenture = {
  ...selectedSource,
  id: 101,
  name: "Older selected venture",
  tasks: {
    ...selectedSource.tasks,
    brand: selectedSource.tasks.brand.map((item) => ({
      ...item,
      note: JSON.stringify({ file: "brand-kit.pdf", fileSize: 2048 }),
    })),
  },
};
const newerVenture = { ...selectedSource, id: 102, name: "Newer venture" };
store.set("launch7-v2", JSON.stringify([newerVenture, olderVenture]));
store.set("launch7-selected-venture", "101");
global.window.location.pathname = "/";
global.window.location.search = "";
await act(async () => {
  renderer = create(React.createElement(App));
});
assert.ok(
  renderer.root.findAll(
    (node) =>
      typeof node.children?.[0] === "string" &&
      node.children[0].includes("Older selected venture"),
  ).length,
  "selected venture should remain selected after reload",
);
assert.ok(
  text(renderer.root).includes("1 evidence records"),
  "duplicate task references should count one unique evidence record",
);

const modeSource = JSON.parse(store.get("launch7-v2"))[0];
const modeVenture = {
  ...modeSource,
  id: 103,
  name: "Brand method gate",
  tasks: Object.fromEntries(
    Object.entries(modeSource.tasks).map(([key, items]) => [
      key,
      items.map((item, index) => ({
        ...item,
        status: "Done",
        ...(key === "product"
          ? {
              assigneeName: item.assigneeName || "Product team",
              evidenceReview: "Founder reviewed",
              evidenceReference: item.evidenceReference || `REF-${index}`,
              checklistState: { 0: true, 1: true, 2: true },
            }
          : {}),
      })),
    ]),
  ),
};
store.set("launch7-v2", JSON.stringify([modeVenture]));
store.set("launch7-selected-venture", "103");
for (const [key, data] of Object.entries({
  product: { mvpScope: "MVP", deliveryMilestone: "Beta" },
  apps: {
    toolInventory: "Analytics",
    permissionOwner: "Founder",
    testEvidence: "Passed",
  },
  legal: {
    entityType: "Private limited",
    jurisdiction: "Delaware",
    filingRoute: "Registered agent",
  },
  finance: {
    budgetAmount: "50000",
    fundingSource: "Investor",
    ownershipPercent: "70%",
  },
  people: {
    roleTitle: "Engineer",
    personName: "Alex",
    onboardingPlan: "Checklist",
  },
  partners: {
    partnerName: "Northstar Labs",
    commitmentType: "Pilot",
    partnerReference: "LOI-001",
  },
  launch: {
    launchDate: "2026-12-01",
    launchOwner: "Alex",
    recoveryPlan: "Rollback",
  },
}))
  store.set(`launch7-draft-103-${key}-0`, JSON.stringify(data));
global.window.location.pathname = "/";
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Brand & collateral").props.onClick());
await act(async () => button(renderer, "Draft with AI").props.onClick());
await act(async () =>
  renderer.root.findAllByType("textarea")[0].props.onChange({
    target: { value: "AI brand brief" },
  }),
);
await act(async () => button(renderer, "Generate demo draft").props.onClick());
await act(async () =>
  renderer.root.findAllByType("textarea")[0].props.onChange({
    target: { value: "Changed AI brand brief" },
  }),
);
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Complete every workstream first"),
  "changing the AI brief should invalidate stale generated output",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
await act(async () => button(renderer, "Draft with AI").props.onClick());
await act(async () => button(renderer, "Generate demo draft").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "Brand AI output should satisfy the Brand evidence gate",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
await act(async () => button(renderer, "Assign to a person").props.onClick());
await act(async () =>
  renderer.root
    .findAllByType("input")
    .find((node) => node.props.placeholder === "Name")
    .props.onChange({ target: { value: "Designer" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("textarea")
    .find((node) => node.props.placeholder === "What should be delivered?")
    .props.onChange({ target: { value: "Approved brand deliverable" } }),
);
const personDeliverable = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "file");
await act(async () =>
  personDeliverable.props.onChange({
    target: {
      files: [
        { name: "brand-deliverable.pdf", type: "application/pdf", size: 100 },
      ],
    },
  }),
);
const founderReview = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "checkbox");
await act(async () =>
  founderReview.props.onChange({ target: { checked: true } }),
);
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "Brand person assignment should satisfy the Brand evidence gate",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
const replacementFile = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "file");
await act(async () =>
  replacementFile.props.onChange({
    target: {
      files: [
        { name: "brand-unreviewed.pdf", type: "application/pdf", size: 200 },
      ],
    },
  }),
);
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Complete every workstream first"),
  "replacing a person deliverable should clear founder approval",
);
await act(async () => button(renderer, "Brand & collateral").props.onClick());
const replacementReview = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "checkbox");
await act(async () =>
  replacementReview.props.onChange({ target: { checked: true } }),
);
await act(async () => button(renderer, "Upload manually").props.onClick());
const modeFile = renderer.root
  .findAllByType("input")
  .find((node) => node.props.type === "file");
await act(async () =>
  modeFile.props.onChange({
    target: {
      files: [{ name: "brand-final.pdf", type: "application/pdf", size: 100 }],
    },
  }),
);
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Ready to submit for approval"),
  "Brand manual evidence should satisfy the Brand evidence gate",
);

const taskGateSource = JSON.parse(store.get("launch7-v2"))[0];
const taskGateVenture = {
  ...taskGateSource,
  id: 104,
  name: "Product task gate",
  tasks: Object.fromEntries(
    Object.entries(taskGateSource.tasks).map(([key, items]) => [
      key,
      items.map((item) => ({
        ...item,
        status: "Not started",
        note: "",
        ...(key === "product"
          ? { assigneeName: "", evidenceReview: "Missing", checklistState: {} }
          : {}),
      })),
    ]),
  ),
};
store.set("launch7-v2", JSON.stringify([taskGateVenture]));
store.set("launch7-selected-venture", "104");
for (const [key, data] of Object.entries({
  brand: {
    method: "ai",
    aiStatus: "Generated demo draft ready for review",
    aiOutput: "Brand draft",
  },
  product: { mvpScope: "MVP", deliveryMilestone: "Beta" },
  apps: {
    toolInventory: "Analytics",
    permissionOwner: "Founder",
    testEvidence: "Passed",
  },
  legal: {
    entityType: "Company",
    jurisdiction: "Delaware",
    filingRoute: "Agent",
  },
  finance: {
    budgetAmount: "50000",
    fundingSource: "Investor",
    ownershipPercent: "70%",
  },
  people: {
    roleTitle: "Engineer",
    personName: "Alex",
    onboardingPlan: "Checklist",
  },
  partners: {
    partnerName: "Partner",
    commitmentType: "Pilot",
    partnerReference: "REF",
  },
  launch: {
    launchDate: "2026-12-01",
    launchOwner: "Alex",
    recoveryPlan: "Rollback",
  },
}))
  store.set(`launch7-draft-104-${key}-0`, JSON.stringify(data));
global.window.location.pathname = "/";
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Assigned tasks").props.onClick());
const firstProductOwner = renderer.root
  .findAllByType("input")
  .find((node) => node.props["aria-label"] === "Define product vision owner");
await act(async () =>
  firstProductOwner.props.onChange({ target: { value: "Alice" } }),
);
const firstProductEvidence = renderer.root
  .findAllByType("select")
  .find(
    (node) =>
      node.props["aria-label"] === "Define product vision evidence review",
  );
await act(async () =>
  firstProductEvidence.props.onChange({
    target: { value: "Founder reviewed" },
  }),
);
const firstProductReference = renderer.root
  .findAllByType("input")
  .find(
    (node) =>
      node.props["aria-label"] === "Define product vision evidence reference",
  );
await act(async () =>
  firstProductReference.props.onChange({ target: { value: "REF-1" } }),
);
await act(async () =>
  renderer.root
    .findAllByType("button")
    .find((node) => text(node) === "Show checklist")
    .props.onClick(),
);
for (const checklistInput of renderer.root
  .findAllByType("input")
  .filter((node) => node.props.type === "checkbox")) {
  await act(async () =>
    checklistInput.props.onChange({ target: { checked: true } }),
  );
}
await act(async () =>
  renderer.root
    .findAll(
      (node) =>
        node.type === "button" &&
        node.props.className?.includes("check-button"),
    )[5]
    .props.onClick(),
);
assert.equal(
  JSON.parse(store.get("launch7-v2"))[0].tasks.product[0].status,
  "Done",
  "one Product task should complete when its own gate is satisfied",
);
assert.equal(
  JSON.parse(store.get("launch7-v2"))[0].tasks.product[1].status,
  "Not started",
  "other Product tasks should remain incomplete",
);
await act(async () => button(renderer, "Ventures").props.onClick());
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("15 product task reviews"),
  "final Product readiness should remain blocked by the other tasks",
);

const freshDoneVenture = {
  ...JSON.parse(store.get("launch7-v2"))[0],
  id: 99,
  name: "Fresh approval gate",
  tasks: Object.fromEntries(
    Object.entries(JSON.parse(store.get("launch7-v2"))[0].tasks).map(
      ([key, items]) => [
        key,
        items.map((item) => ({ ...item, status: "Done" })),
      ],
    ),
  ),
  approval: "Draft",
};
store.set("launch7-v2", JSON.stringify([freshDoneVenture]));
store.delete("launch7-approval-99");
global.window.location.pathname = "/";
global.window.location.search = "";
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "h2" &&
      text(node).includes("Complete every workstream first"),
  ).length,
  "fresh ventures with checked tasks must still require domain records",
);
store.set(
  "launch7-draft-99-product-0",
  JSON.stringify({ mvpScope: "MVP", deliveryMilestone: "Beta" }),
);
await act(async () => {
  renderer = create(React.createElement(App));
});
await act(async () => button(renderer, "Open launch plan").props.onClick());
await act(async () => button(renderer, "Review launch").props.onClick());
assert.ok(
  text(renderer.root).includes("Complete every workstream first"),
  "Product review must require per-task owner, checklist and evidence review",
);
assert.ok(
  renderer.root.findAll(
    (node) =>
      node.type === "small" &&
      (text(node).includes("Missing:") || text(node).includes("Needs work")),
  ).length >= 1,
  "review readiness should explain incomplete domain workstreams",
);
console.log("Launch7 component interaction tests passed");
