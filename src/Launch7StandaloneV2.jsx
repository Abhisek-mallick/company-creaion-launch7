import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FolderKanban,
  Plus,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";

const WS = {
  brand: [
    "Brand & collateral",
    ["Brief", "Assets", "Review"],
    ["Positioning statement", "Target audience", "Launch message"],
  ],
  product: [
    "Product & technology",
    ["Scope", "Delivery", "Build", "Tests", "Release review"],
    ["MVP scope", "Delivery milestone", "Release owner"],
  ],
  apps: [
    "Apps & integrations",
    ["Inventory", "Mapping", "Testing", "Review"],
    ["Tool inventory", "Permission owner", "Test evidence"],
  ],
  legal: [
    "Legal & formation",
    ["Details", "Filing route", "Status & evidence", "Final review"],
    ["Entity type", "Filing route", "Filing reference"],
  ],
  finance: [
    "Finance & ownership",
    ["Budget", "Funding", "Ownership", "Review"],
    ["Budget amount", "Funding source", "Ownership percentage"],
  ],
  people: [
    "People & operations",
    ["Team & roles", "Onboarding", "Operations", "Review"],
    ["Role title", "Onboarding form", "Operating cadence"],
  ],
  partners: [
    "Partners & capital",
    ["Partners", "Commitments", "Review"],
    ["Partner name", "Commitment type", "Reference"],
  ],
  launch: [
    "Launch preparation",
    ["Schedule", "Checks", "Risks", "Final review"],
    ["Launch date", "Launch owner", "Recovery plan"],
  ],
};
const keys = Object.keys(WS);
const taskTitles = [
  "Define the decision",
  "Add evidence or reference",
  "Review and confirm",
  "Validate saved evidence",
  "Approve stage outcome",
];
const productTaskTitles = [
  "Define product vision",
  "Capture target user",
  "Prioritize MVP scope",
  "Write acceptance criteria",
  "Map the core user journey",
  "Confirm technical constraints",
  "Set delivery milestone",
  "Assign delivery owner",
  "Break work into milestones",
  "Prepare build environment",
  "Implement core workflow",
  "Configure product analytics",
  "Test critical paths",
  "Record defects and fixes",
  "Validate release readiness",
  "Approve release outcome",
];
const productChecklist = [
  "Decision recorded",
  "Reference or evidence attached",
  "Owner confirmed",
];
const productTasks = (existing = []) =>
  productTaskTitles.map((title, i) => ({
    ...(existing[i] || {}),
    id: existing[i]?.id || `product${i}`,
    title,
    checklist: existing[i]?.checklist || productChecklist,
    status: existing[i]?.status || "Not started",
    note: existing[i]?.note || "",
  }));
const makeTasks = () =>
  Object.fromEntries(
    keys.map((k) => [
      k,
      k === "product"
        ? productTasks()
        : taskTitles.map((title, i) => ({
            id: k + i,
            title,
            status: "Not started",
            note: "",
          })),
    ]),
  );
const initial = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("launch7-v2"));
    if (saved)
      return saved.map((v) => ({
        ...v,
        tasks: {
          ...v.tasks,
          product: productTasks(v.tasks.product || []),
        },
      }));
    return [
      {
        id: 1,
        name: "Northstar Analytics",
        summary: "A focused intelligence workspace for revenue teams.",
        founder: "Alex Morgan",
        status: "In progress",
        tasks: makeTasks(),
        approval: "Draft",
      },
    ];
  } catch {
    return [];
  }
};
const progress = (v) => {
  const a = Object.values(v.tasks).flat();
  return a.length
    ? Math.round((a.filter((x) => x.status === "Done").length / a.length) * 100)
    : 0;
};
const domainRequirement = {
  brand: ["file"],
  product: ["mvpScope", "deliveryMilestone"],
  finance: ["budgetAmount", "fundingSource", "ownershipPercent"],
  legal: ["entityType", "jurisdiction", "filingRoute"],
  people: ["roleTitle", "personName", "onboardingPlan"],
  apps: ["toolInventory", "permissionOwner", "testEvidence"],
  partners: ["partnerName", "commitmentType", "partnerReference"],
  launch: ["launchDate", "launchOwner", "recoveryPlan"],
};
const storedDomainData = (ventureId, key) => {
  const tabs = WS[key]?.[1] || [];
  return tabs.reduce((merged, _, index) => {
    try {
      const draft =
        JSON.parse(
          localStorage.getItem(`launch7-draft-${ventureId}-${key}-${index}`),
        ) || {};
      const stamps = merged.__fieldUpdated || {};
      const next = { ...merged, __fieldUpdated: { ...stamps } };
      Object.entries(draft).forEach(([field, value]) => {
        if (field === "__fieldUpdated") return;
        const stamp = draft.__fieldUpdated?.[field] || index;
        if (stamps[field] === undefined || stamp >= stamps[field]) {
          next[field] = value;
          next.__fieldUpdated[field] = stamp;
        }
      });
      return next;
    } catch {
      return merged;
    }
  }, {});
};
const snapshotRecord = (record) => {
  if (!record || typeof record !== "object") return {};
  const { history, ...snapshot } = record;
  return snapshot;
};
const flattenHistory = (history = []) =>
  history.flatMap((entry) => [
    ...(Array.isArray(entry?.history) ? flattenHistory(entry.history) : []),
    snapshotRecord(entry),
  ]);
const normalizeDecision = (record) => {
  if (!record || typeof record !== "object") return record;
  const history = flattenHistory(record.history || []).slice(-10);
  return {
    ...snapshotRecord(record),
    version: Math.max(Number(record.version) || 1, history.length + 1),
    history,
  };
};
const normalizeRecords = (records) => ({
  ...(records || {}),
  decisions: (records?.decisions || []).map(normalizeDecision),
});
const storedRecords = (ventureId) => {
  try {
    const records = normalizeRecords(
      JSON.parse(localStorage.getItem(`launch7-records-${ventureId}`)) || {}
    );
    return records;
  } catch {
    return {};
  }
};
const domainReady = (ventureId, key, tasks = []) => {
  return domainMissing(ventureId, key, tasks).length === 0;
};
const productTaskMissing = (task) => {
  const missing = [];
  if (!String(task.assigneeName || "").trim()) missing.push("owner");
  if (!String(task.evidenceReference || "").trim())
    missing.push("evidence reference");
  if (task.evidenceReview !== "Founder reviewed")
    missing.push("evidence review");
  if (
    !(task.checklist || productChecklist).every(
      (_, index) => task.checklistState?.[index],
    )
  )
    missing.push("checklist");
  return missing;
};
const taskReady = (venture, key, id, patch = {}) => {
  if (key !== "product")
    return domainReady(venture.id, key, venture.tasks[key]);
  const current = venture.tasks[key].find((task) => task.id === id) || {};
  return productTaskMissing({ ...current, ...patch }).length === 0;
};
const domainMissing = (ventureId, key, tasks = []) => {
  const data = storedDomainData(ventureId, key);
  if (key === "brand") {
    if (data.method === "manual")
      return data.file ? [] : ["local evidence file"];
    if (data.method === "person") {
      return data.assigneeName &&
        data.instructions &&
        data.deliverableFile &&
        data.founderReviewed
        ? []
        : ["assignee, brief, deliverable and founder review"];
    }
    return data.aiStatus && data.aiOutput ? [] : ["AI demo output"];
  }
  const missing = (domainRequirement[key] || []).filter(
    (field) => !String(data[field] || "").trim(),
  );
  if (key === "product" && tasks.length) {
    const incomplete = tasks.filter(
      (task) => productTaskMissing(task).length,
    ).length;
    if (incomplete) missing.push(`${incomplete} product task reviews`);
  }
  const records = storedRecords(ventureId);
  if (
    key === "launch" &&
    (records.dependencies || []).some(
      (item) =>
        !["resolved", "cleared", "complete", "completed", "unblocked"].includes(
          String(item.status || "")
            .trim()
            .toLowerCase(),
        ),
    )
  )
    missing.push("unresolved launch dependencies");
  if (
    key === "launch" &&
    (records.decisions || []).some(
      (item) =>
        String(item.outcome || item.status || "")
          .trim()
          .toLowerCase() !== "approved",
    )
  )
    missing.push("launch decision not approved");
  if (
    key === "people" &&
    (records.peopleEvidence || []).some(
      (item) =>
        !["accepted", "approved", "complete", "completed"].includes(
          String(item.status || "")
            .trim()
            .toLowerCase(),
        ),
    )
  )
    missing.push("people evidence not accepted");
  if (
    key === "finance" &&
    (records.ownershipDocuments || []).some(
      (item) =>
        !["accepted", "approved", "complete", "completed"].includes(
          String(item.status || "")
            .trim()
            .toLowerCase(),
        ),
    )
  )
    missing.push("ownership document not accepted");
  return missing;
};
const launchReady = (venture) =>
  keys.every(
    (key) =>
      venture.tasks[key].every((task) => task.status === "Done") &&
      domainReady(venture.id, key, venture.tasks[key]),
  );
export default function Launch7StandaloneV2() {
  const [rows, setRows] = useState(initial);
  const [selectedId, setSelectedId] = useState(
    () => localStorage.getItem("launch7-selected-venture") || "",
  );
  const selectedIndex = rows.findIndex((row) => String(row.id) === selectedId);
  const selected = selectedIndex >= 0 ? selectedIndex : 0;
  const setSelected = (index) => {
    const row = rows[index];
    if (row) {
      setSelectedId(String(row.id));
      localStorage.setItem("launch7-selected-venture", String(row.id));
    }
  };
  const [screen, setScreen] = useState(
    window.location.pathname.includes("onboarding")
      ? "onboarding"
      : "dashboard",
  );
  const [step, setStep] = useState("overview");
  const [notice, setNotice] = useState("");
  const v = rows[selected] || rows[0];
  const save = (next, msg = "Saved locally") => {
    setRows(next);
    localStorage.setItem("launch7-v2", JSON.stringify(next));
    setNotice(msg);
    setTimeout(() => setNotice(""), 1800);
  };
  const task = (key, id, patch) => {
    if (patch.status === "Done" && !taskReady(v, key, id, patch)) {
      setNotice(
        key === "product"
          ? "Complete this Product task's owner, checklist and evidence review first."
          : "Complete the required domain fields before checking this task.",
      );
      setTimeout(() => setNotice(""), 2200);
      return;
    }
    const next = rows.map((x, i) =>
      i === selected
        ? {
            ...x,
            tasks: {
              ...x.tasks,
              [key]: x.tasks[key].map((t) =>
                t.id === id
                  ? {
                      ...t,
                      ...patch,
                      ...(patch.evidenceReference !== undefined &&
                      patch.evidenceReference !== t.evidenceReference
                        ? { evidenceReview: "Missing" }
                        : {}),
                      ...(patch.assigneeName !== undefined
                        ? {
                            note: (() => {
                              try {
                                return JSON.stringify({
                                  ...JSON.parse(t.note || "{}"),
                                  assigneeName: patch.assigneeName,
                                });
                              } catch {
                                return JSON.stringify({
                                  assigneeName: patch.assigneeName,
                                });
                              }
                            })(),
                          }
                        : {}),
                    }
                  : t,
              ),
            },
          }
        : x,
    );
    localStorage.removeItem(`launch7-approval-${v.id}`);
    save(next);
  };
  const go = (s, st = "overview") => {
    setScreen(s);
    setStep(st);
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">7</div>
          <div>
            <b>
              Launch<span>7</span>
            </b>
            <small>Venture operating system</small>
          </div>
        </div>
        <div className="workspace-switch">
          <div className="workspace-dot">N</div>
          <div>
            <b>Northstar workspace</b>
            <small>Founder workspace</small>
          </div>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          <Nav
            active={screen === "dashboard"}
            text="Ventures"
            onClick={() => go("dashboard")}
          />
          <Nav
            active={screen === "setup"}
            text="Launch plan"
            onClick={() => go("setup")}
          />
          <Nav
            active={screen === "tasks"}
            text="Assigned tasks"
            onClick={() => go("tasks")}
          />
          <Nav
            active={screen === "onboarding"}
            text="Team onboarding"
            onClick={() => go("onboarding")}
          />
        </nav>
        <div className="sidebar-foot">
          <div className="secure">
            <ShieldCheck size={16} />
            <span>
              <b>Private workspace</b>
              <small>Local demo mode</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>›</span>
            <strong>{screen === "dashboard" ? "Ventures" : v?.name}</strong>
          </div>
          <div className="avatar">AM</div>
        </header>
        <main className="content">
          {screen === "dashboard" && (
            <Dashboard
              rows={rows}
              selected={selected}
              open={(i) => {
                setSelected(i);
                go("setup");
              }}
              newV={() => go("new")}
            />
          )}{" "}
          {screen === "new" && (
            <New
              onCancel={() => go("dashboard")}
              create={(d) => {
                const n = {
                  ...d,
                  id: Date.now(),
                  status: "Draft",
                  approval: "Draft",
                  tasks: makeTasks(),
                };
                save([n, ...rows], "Venture created");
                setSelectedId(String(n.id));
                localStorage.setItem("launch7-selected-venture", String(n.id));
                go("setup");
              }}
            />
          )}{" "}
          {screen === "setup" && (
            <Setup
              v={v}
              step={step}
              setStep={setStep}
              onTask={task}
              review={() => go("setup", "review")}
            />
          )}{" "}
          {screen === "tasks" && <Tasks v={v} onTask={task} />}{" "}
          {screen === "onboarding" && <Onboarding />}
        </main>
      </div>
      {notice && (
        <div className="toast">
          <Check size={15} />
          {notice}
        </div>
      )}
    </div>
  );
}
function Nav({ active, text, onClick }) {
  return (
    <button
      className={"nav-item " + (active ? "active" : "")}
      onClick={onClick}
    >
      <span>◆</span>
      {text}
    </button>
  );
}
function Dashboard({ rows, open, newV, selected }) {
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUILD WITH INTENT</p>
          <h1>Ventures</h1>
          <p className="muted">
            Turn an idea into a launch-ready company with one clear operating
            plan.
          </p>
        </div>
        <button className="primary" onClick={newV}>
          <Plus size={18} /> New venture
        </button>
      </div>
      <div className="metrics">
        {[
          ["Total ventures", rows.length],
          ["Active plans", rows.filter((x) => x.status !== "Launched").length],
          ["Launched", rows.filter((x) => x.status === "Launched").length],
          [
            "Average task completion",
            (rows.length
              ? Math.round(
                  rows.reduce((n, x) => n + progress(x), 0) / rows.length,
                )
              : 0) + "%",
          ],
          ["Launch ready", rows.filter((x) => launchReady(x)).length],
        ].map((x) => (
          <div className="metric" key={x[0]}>
            <div className="metric-icon">
              <Rocket size={17} />
            </div>
            <div>
              <span>{x[0]}</span>
              <strong>{x[1]}</strong>
              <small>Local workspace data</small>
            </div>
          </div>
        ))}
      </div>
      <div className="venture-grid">
        {rows.map((x, i) => (
          <article className="venture-card" key={x.id}>
            <div className="card-top">
              <div className="venture-symbol">{x.name[0]}</div>
              <span className="status in-progress">{x.status}</span>
            </div>
            <h3>{x.name}</h3>
            <p>{x.summary}</p>
            <div className="progress-row">
              <span>Readiness</span>
              <b>{launchReady(x) ? "Ready" : "Blocked"}</b>
            </div>
            <div className="progress">
              <i
                style={{
                  width:
                    (launchReady(x) ? 100 : Math.min(progress(x), 95)) + "%",
                }}
              />
            </div>
            <button className="card-action" onClick={() => open(i)}>
              Open launch plan <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
      {rows[selected] && <LaunchSnapshot venture={rows[selected]} />}
    </section>
  );
}
function LaunchSnapshot({ venture }) {
  const approval =
    localStorage.getItem(`launch7-approval-${venture.id}`) || "Draft";
  const records = storedRecords(venture.id);
  const blockers = [
    ...(records.dependencies || [])
      .filter(
        (item) =>
          ![
            "resolved",
            "cleared",
            "complete",
            "completed",
            "unblocked",
          ].includes(
            String(item.status || "")
              .trim()
              .toLowerCase(),
          ),
      )
      .map((item) => `Dependency: ${item.dependency}`),
    ...(records.decisions || [])
      .filter(
        (item) =>
          String(item.outcome || item.status || "")
            .trim()
            .toLowerCase() !== "approved",
      )
      .map((item) => `Decision: ${item.decision}`),
    ...(records.peopleEvidence || [])
      .filter(
        (item) =>
          !["accepted", "approved", "complete", "completed"].includes(
            String(item.status || "")
              .trim()
              .toLowerCase(),
          ),
      )
      .map((item) => `People evidence: ${item.evidence}`),
  ];
  keys.forEach((key) => {
    const missing = domainMissing(venture.id, key, venture.tasks[key]);
    const incompleteTasks = (venture.tasks[key] || []).filter(
      (task) => task.status !== "Done",
    ).length;
    if (incompleteTasks)
      blockers.push(`${WS[key][0]}: ${incompleteTasks} tasks incomplete`);
    missing.forEach((reason) => blockers.push(`${WS[key][0]}: ${reason}`));
  });
  return (
    <section className="launch-snapshot panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">CONSOLIDATED LAUNCH SNAPSHOT</p>
          <h2>Records, evidence and approval</h2>
          <p className="muted">
            Local demo summary for {venture.name}; no backend records are
            queried.
          </p>
        </div>
        <span className="chip">{approval}</span>
      </div>
      <div className="snapshot-grid">
        {keys.map((key) => {
          const items = venture.tasks[key] || [];
          const done = items.filter((item) => item.status === "Done").length;
          const evidenceKeys = items.flatMap((item) => {
            try {
              const parsed = JSON.parse(item.note || "{}");
              const hasData = Object.entries(parsed).some(
                ([field, value]) =>
                  field !== "__fieldUpdated" && String(value || "").trim(),
              );
              if (!hasData) return [];
              if (parsed.file)
                return [`file:${parsed.file}:${parsed.fileSize || ""}`];
              return [JSON.stringify(parsed)];
            } catch {
              return [];
            }
          });
          const evidence = new Set(evidenceKeys).size;
          return (
            <div className="snapshot-row" key={key}>
              <b>{WS[key][0]}</b>
              <span>
                {done}/{items.length} complete
              </span>
              <small>{evidence} evidence records</small>
            </div>
          );
        })}
      </div>
      <div className="snapshot-registers">
        <div>
          <small>REGISTERED RECORDS</small>
          <b>
            {(records.expenses || []).length +
              (records.ownershipDocuments || []).length +
              (records.roles || []).length +
              (records.peopleEvidence || []).length +
              (records.decisions || []).length +
              (records.dependencies || []).length}
          </b>
          <span>local domain records</span>
        </div>
        <div>
          <small>BLOCKERS</small>
          <b>{blockers.length}</b>
          <span>
            {blockers.length ? blockers.join(" · ") : "None recorded"}
          </span>
        </div>
      </div>
    </section>
  );
}
function New({ onCancel, create }) {
  const [d, setD] = useState({ name: "", summary: "", founder: "Alex Morgan" });
  return (
    <section className="narrow">
      <button className="back-link" onClick={onCancel}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="form-hero">
        <div className="icon-orb">
          <Rocket size={24} />
        </div>
        <p className="eyebrow">NEW VENTURE</p>
        <h1>Give your venture a starting point</h1>
      </div>
      <form
        className="panel form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          create(d);
        }}
      >
        <Field label="Venture name" req>
          <input
            required
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
          />
        </Field>
        <Field label="Founder / owner">
          <input
            value={d.founder}
            onChange={(e) => setD({ ...d, founder: e.target.value })}
          />
        </Field>
        <Field label="One-line summary" req>
          <textarea
            required
            value={d.summary}
            onChange={(e) => setD({ ...d, summary: e.target.value })}
          />
        </Field>
        <button className="primary">
          Create venture <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
function Field({ label, req, children }) {
  return (
    <label className="field">
      <span>
        {label}
        {req && <em> *</em>}
      </span>
      {children}
    </label>
  );
}
function Setup({ v, step, setStep, onTask, review }) {
  const keysWithReview = [...keys, "review"];
  return (
    <section>
      <div className="setup-heading">
        <div>
          <p className="eyebrow">LAUNCH PLAN · {v.status.toUpperCase()}</p>
          <h1>{v.name}</h1>
          <p className="muted">
            Complete each workstream, save evidence and submit the saved
            snapshot for approval.
          </p>
        </div>
        <button className="primary" onClick={review}>
          <Rocket size={16} /> Review launch
        </button>
      </div>
      <div className="setup-layout">
        <div className="stepper panel">
          <Step
            id="overview"
            label="Plan overview"
            active={step}
            setStep={setStep}
          />
          {keysWithReview.map((k, i) => (
            <Step
              key={k}
              id={k}
              label={k === "review" ? "Launch review" : WS[k][0]}
              number={i + 1}
              active={step}
              setStep={setStep}
              done={
                k !== "review" &&
                v.tasks[k].every((t) => t.status === "Done") &&
                domainReady(v.id, k, v.tasks[k])
              }
            />
          ))}
        </div>
        <div className="setup-main">
          {step === "overview" ? (
            <Overview setStep={setStep} />
          ) : step === "review" ? (
            <Review v={v} setStep={setStep} />
          ) : (
            <Wizard
              key={`${v.id}:${step}`}
              v={v}
              k={step}
              tasks={v.tasks[step]}
              onTask={onTask}
            />
          )}
        </div>
      </div>
    </section>
  );
}
function Step({ id, label, number, active, setStep, done }) {
  return (
    <button
      className={(active === id ? "current " : "") + (done ? "complete" : "")}
      onClick={() => setStep(id)}
    >
      <span className="step-num">
        {done ? <Check size={14} /> : number || "•"}
      </span>
      <span>{label}</span>
      {done && <small>Ready</small>}
    </button>
  );
}
function Overview({ setStep }) {
  return (
    <>
      <div className="hero-panel panel">
        <div>
          <span className="chip">LOCAL DEMO</span>
          <h2>Make the next right decision.</h2>
          <p>
            Eight workstreams with stage-specific forms, evidence and review
            gates.
          </p>
          <button className="primary" onClick={() => setStep("brand")}>
            Start plan <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="workstream-grid">
        {keys.map((k, i) => (
          <button
            className="workstream-card"
            key={k}
            onClick={() => setStep(k)}
          >
            <span className="ws-icon">{i + 1}</span>
            <span>
              <b>{WS[k][0]}</b>
              <small>{WS[k][1].join(" → ")}</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </>
  );
}
function Wizard({ v, k, tasks, onTask }) {
  const tabs = WS[k][1],
    fields = WS[k][2];
  const [tab, setTab] = useState(0);
  const draftKey = `launch7-draft-${v.id}-${k}-${tab}`;
  const readDraft = (key) => {
    try {
      return (
        JSON.parse(localStorage.getItem(key)) || {
          a: "",
          b: "",
          c: "",
          file: "",
        }
      );
    } catch {
      return { a: "", b: "", c: "", file: "" };
    }
  };
  const readStageDraft = (index) => {
    if (index !== tabs.length - 1)
      return readDraft(`launch7-draft-${v.id}-${k}-${index}`);
    const merged = {};
    const stamps = {};
    tabs.forEach((_, stageIndex) => {
      const draft = readDraft(`launch7-draft-${v.id}-${k}-${stageIndex}`);
      Object.entries(draft).forEach(([field, value]) => {
        if (field === "__fieldUpdated") return;
        const stamp = draft.__fieldUpdated?.[field] || stageIndex;
        if (stamps[field] === undefined || stamp >= stamps[field]) {
          merged[field] = value;
          stamps[field] = stamp;
        }
      });
    });
    return { ...merged, __fieldUpdated: stamps };
  };
  const [data, setData] = useState(() => {
    return readStageDraft(tab);
  });
  const [domainError, setDomainError] = useState("");
  useEffect(() => setData(readStageDraft(tab)), [draftKey]);
  const update = (key, val) => {
    const resetGenerated =
      k === "brand" && key === "aiBrief" ? { aiStatus: "", aiOutput: "" } : {};
    const next = {
      ...data,
      ...resetGenerated,
      [key]: val,
      __fieldUpdated: {
        ...(data.__fieldUpdated || {}),
        ...Object.fromEntries(
          Object.keys(resetGenerated).map((field) => [field, Date.now()]),
        ),
        [key]: Date.now(),
      },
    };
    setData(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    localStorage.removeItem(`launch7-approval-${v.id}`);
  };
  const updateMany = (patch) => {
    const nextPatch =
      k === "brand" && patch.deliverableFile
        ? { ...patch, founderReviewed: false }
        : patch;
    const next = {
      ...data,
      ...nextPatch,
      __fieldUpdated: {
        ...(data.__fieldUpdated || {}),
        ...Object.fromEntries(
          Object.keys(nextPatch).map((key) => [key, Date.now()]),
        ),
      },
    };
    setData(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    localStorage.removeItem(`launch7-approval-${v.id}`);
  };
  const save = () => {
    const required =
      k === "finance"
        ? [data.budgetAmount, data.fundingSource, data.ownershipPercent]
        : k === "legal"
          ? [data.entityType, data.jurisdiction, data.filingRoute]
          : k === "people"
            ? [data.roleTitle, data.personName, data.onboardingPlan]
            : k === "apps"
              ? [data.toolInventory, data.permissionOwner, data.testEvidence]
              : k === "partners"
                ? [data.partnerName, data.commitmentType, data.partnerReference]
                : k === "launch"
                  ? [data.launchDate, data.launchOwner, data.recoveryPlan]
                  : [];
    if (
      tab === tabs.length - 1 &&
      required.some((value) => !String(value || "").trim())
    ) {
      setDomainError(
        "Complete the required domain fields before saving this review.",
      );
      return;
    }
    if (tab === tabs.length - 1 && !domainReady(v.id, k, tasks)) {
      setDomainError(
        `Complete the required ${WS[k][0]} task evidence before saving this review.`,
      );
      return;
    }
    setDomainError("");
    const t = tasks[Math.min(tab, tasks.length - 1)];
    const note = JSON.stringify(data);
    if (tab === tabs.length - 1) {
      const stored = JSON.parse(localStorage.getItem("launch7-v2") || "[]");
      const source = stored.length ? stored : [v];
      const stageNotes = (row) =>
        row.tasks[k].map((task, index) => {
          const stageIndex = Math.min(index, tabs.length - 1);
          const draft =
            stageIndex === tabs.length - 1
              ? data
              : readDraft(`launch7-draft-${v.id}-${k}-${stageIndex}`);
          const noteData = { ...draft };
          if (task.assigneeName) noteData.assigneeName = task.assigneeName;
          else if (stageIndex === tabs.length - 1) delete noteData.assigneeName;
          if (task.dueDate) noteData.dueDate = task.dueDate;
          else if (stageIndex === tabs.length - 1) delete noteData.dueDate;
          return JSON.stringify(noteData);
        });
      const savedRows = source.map((row) =>
        row.id === v.id
          ? {
              ...row,
              tasks: {
                ...row.tasks,
                [k]: row.tasks[k].map((x, index) => ({
                  ...x,
                  status: "Done",
                  note: stageNotes(row)[index] || note,
                })),
              },
            }
          : row,
      );
      localStorage.setItem("launch7-v2", JSON.stringify(savedRows));
      localStorage.removeItem(`launch7-approval-${v.id}`);
      window.location.reload();
    } else onTask(k, t.id, { status: "In progress", note });
  };
  return (
    <div className="panel task-panel">
      <div className="task-heading">
        <div>
          <span className="chip soft">{WS[k][0].toUpperCase()}</span>
          <h2>{tabs[tab]}</h2>
          <p>{fields.join(" · ")}. Local demo state only.</p>
        </div>
      </div>
      <div className="wizard-tabs">
        {tabs.map((x, i) => (
          <button
            className={tab === i ? "active" : ""}
            key={x}
            onClick={() => setTab(i)}
          >
            <span>{i + 1}</span>
            {x}
          </button>
        ))}
      </div>
      <DomainControls
        k={k}
        ventureId={v.id}
        data={data}
        update={update}
        updateMany={updateMany}
      />
      {domainError && (
        <p className="field-error" role="alert">
          {domainError}
        </p>
      )}
      <div className="guided-form">
        <div className="two-col">
          <Field label={fields[0]}>
            <input
              value={data.a}
              onChange={(e) => update("a", e.target.value)}
            />
          </Field>
          <Field label={fields[1]}>
            <input
              value={data.b}
              onChange={(e) => update("b", e.target.value)}
            />
          </Field>
        </div>
        <Field label={fields[2]}>
          <textarea
            value={data.c}
            onChange={(e) => update("c", e.target.value)}
          />
        </Field>
        <label className="upload-row">
          <FileText size={16} />
          <span>
            <b>{data.file || "Attach evidence file"}</b>
            <small>
              {data.file
                ? `${data.fileType || "File"} · ${data.fileSize || 0} bytes · browser-local preview only`
                : "Filename and metadata only; nothing is uploaded."}
            </small>
          </span>
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                updateMany({
                  file: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  fileStored: false,
                });
            }}
          />
        </label>
        <div className="wizard-actions">
          <button
            className="secondary"
            disabled={!tab}
            onClick={() => setTab(tab - 1)}
          >
            Previous
          </button>
          <button
            className="primary"
            onClick={() => {
              save();
              if (tab < tabs.length - 1) setTab(tab + 1);
            }}
          >
            {tab === tabs.length - 1 ? "Save review" : "Save & continue"}{" "}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="task-list">
        {tasks.map((t) => (
          <div className="task-row" key={t.id}>
            <button
              className={
                "check-button " + (t.status === "Done" ? "checked" : "")
              }
              onClick={() =>
                onTask(k, t.id, {
                  status: t.status === "Done" ? "Not started" : "Done",
                })
              }
            >
              {t.status === "Done" && <Check size={14} />}
            </button>
            <div className="task-copy">
              <b>{t.title}</b>
              <small>{t.status}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function DomainControls({ k, ventureId, data, update, updateMany }) {
  if (
    ["finance", "legal", "people", "apps", "partners", "launch"].includes(k)
  ) {
    return (
      <OperationsControls
        k={k}
        ventureId={ventureId}
        data={data}
        update={update}
      />
    );
  }
  if (k !== "brand" && k !== "product") return null;
  const brand = k === "brand";
  const method = data.method || "ai";
  return (
    <section
      className="domain-controls"
      aria-label={`${WS[k][0]} demo actions`}
    >
      <div className="domain-controls-heading">
        <div>
          <span className="chip">FRONTEND DEMO</span>
          <h3>
            {brand
              ? "Choose how to create the brand work"
              : "Shape the product delivery work"}
          </h3>
          <p>
            AI generation, email assignment and storage are simulated locally
            until backend adapters are connected.
          </p>
        </div>
      </div>
      <div
        className="domain-methods"
        role="group"
        aria-label="Work completion method"
      >
        {[
          ["ai", "Draft with AI"],
          ["person", "Assign to a person"],
          ["manual", "Upload manually"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={method === id ? "selected" : ""}
            onClick={() => update("method", id)}
          >
            {label}
          </button>
        ))}
      </div>
      {method === "ai" && (
        <Field label={brand ? "Creative brief" : "Product brief"}>
          <textarea
            value={data.aiBrief || ""}
            onChange={(e) => update("aiBrief", e.target.value)}
            placeholder={
              brand
                ? "Describe the logo, tone, audience and brand feeling."
                : "Describe the MVP scope, users, constraints and release outcome."
            }
          />
          <button
            type="button"
            className="secondary"
            disabled={!data.aiBrief?.trim()}
            onClick={() =>
              updateMany({
                aiStatus: "Generated demo draft ready for review",
                aiOutput: `${brand ? "Brand kit" : "Product release plan"} draft prepared from the local brief.`,
              })
            }
          >
            Generate demo draft
          </button>
          {data.aiStatus && (
            <div className="evidence-preview">
              <Rocket size={17} />
              <span>
                <b>{data.aiStatus}</b>
                <small>{data.aiOutput}</small>
              </span>
            </div>
          )}
        </Field>
      )}
      {method === "person" && (
        <div className="two-col">
          <Field label="Assignee name">
            <input
              value={data.assigneeName || ""}
              onChange={(e) => update("assigneeName", e.target.value)}
              placeholder="Name"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={data.dueDate || ""}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </Field>
          <Field label="Assignment brief">
            <textarea
              value={data.instructions || ""}
              onChange={(e) => update("instructions", e.target.value)}
              placeholder="What should be delivered?"
            />
          </Field>
          {brand && (
            <>
              <label className="upload-row">
                <FileText size={16} />
                <span>
                  <b>{data.deliverableFile || "Attach deliverable"}</b>
                  <small>
                    {data.deliverableFile
                      ? "Browser-local demo file; no upload performed."
                      : "A local deliverable is required for founder review."}
                  </small>
                </span>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      updateMany({
                        deliverableFile: file.name,
                        deliverableType: file.type,
                        deliverableSize: file.size,
                      });
                  }}
                />
              </label>
              <label className="review-check">
                <input
                  type="checkbox"
                  checked={Boolean(data.founderReviewed)}
                  onChange={(e) => update("founderReviewed", e.target.checked)}
                />
                Founder reviewed this demo deliverable
              </label>
            </>
          )}
        </div>
      )}
      {brand ? (
        <div className="two-col">
          <Field label="Deliverable">
            <select
              value={data.deliverable || "Logo and brand assets"}
              onChange={(e) => update("deliverable", e.target.value)}
            >
              <option>Logo and brand assets</option>
              <option>Brand guide</option>
              <option>Launch collateral</option>
              <option>Social media assets</option>
            </select>
          </Field>
          <Field label="Preferred colors">
            <input
              value={data.colors || ""}
              onChange={(e) => update("colors", e.target.value)}
              placeholder="Teal, navy, or hex codes"
            />
          </Field>
        </div>
      ) : (
        <div className="two-col">
          <Field label="MVP scope">
            <input
              value={data.mvpScope || ""}
              onChange={(e) => update("mvpScope", e.target.value)}
              placeholder="What is in the first release?"
            />
          </Field>
          <Field label="Release owner">
            <input
              value={data.releaseOwner || ""}
              onChange={(e) => update("releaseOwner", e.target.value)}
              placeholder="Owner"
            />
          </Field>
          <Field label="Delivery milestone">
            <input
              value={data.deliveryMilestone || ""}
              onChange={(e) => update("deliveryMilestone", e.target.value)}
              placeholder="Target milestone"
            />
          </Field>
          <Field label="Test plan">
            <textarea
              value={data.testPlan || ""}
              onChange={(e) => update("testPlan", e.target.value)}
              placeholder="Acceptance checks for this stage"
            />
          </Field>
        </div>
      )}
      {method === "manual" && (
        <div className="evidence-preview">
          <FileText size={17} />
          <span>
            <b>{data.file || "No evidence selected"}</b>
            <small>Local filename preview only; no file is uploaded.</small>
          </span>
        </div>
      )}
    </section>
  );
}
function OperationsControls({ k, ventureId, data, update }) {
  const recordStorageKey = `launch7-records-${ventureId}`;
  const [records, setRecords] = useState(() => {
    try {
      const normalized = normalizeRecords(
        JSON.parse(localStorage.getItem(recordStorageKey)) || {},
      );
      try {
        localStorage.setItem(recordStorageKey, JSON.stringify(normalized));
      } catch {
        // Keep the readable normalized data in memory if migration cannot persist.
      }
      return normalized;
    } catch {
      return {};
    }
  });
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState({});
  const [recordError, setRecordError] = useState("");
  const saveRecords = (next) => {
    try {
      const normalized = normalizeRecords(next);
      localStorage.setItem(recordStorageKey, JSON.stringify(normalized));
      setRecords(normalized);
      localStorage.removeItem(`launch7-approval-${ventureId}`);
      localStorage.setItem(`launch7-approval-invalidated-${ventureId}`, "1");
      setRecordError("");
      return true;
    } catch {
      setRecordError(
        "This local demo could not save the record. Your previous saved data is unchanged; reduce the history or browser storage size and try again.",
      );
      return false;
    }
  };
  const setDraft = (type, field, value) =>
    setDrafts((current) => ({
      ...current,
      [type]: { ...(current[type] || {}), [field]: value },
    }));
  const saveRecord = (type, required) => {
    const draft = drafts[type] || {};
    if (required.some((field) => !String(draft[field] || "").trim())) return;
    const list = records[type] || [];
    const id = editing[type] || `${type}-${Date.now()}`;
    const previous = list.find((item) => item.id === id);
    const record = {
      ...draft,
      id,
      ...(type === "decisions"
        ? {
            version: (previous?.version || 0) + 1,
            history: [
              ...(previous?.history || []),
              previous
                ? {
                    ...snapshotRecord(previous),
                    archivedAt: new Date().toISOString(),
                  }
                : null,
            ]
              .filter(Boolean)
              .slice(-10),
            updatedAt: new Date().toISOString(),
          }
        : {}),
    };
    const next = {
      ...records,
      [type]: [...list.filter((item) => item.id !== id), record],
    };
    if (saveRecords(next)) {
      setDrafts((current) => ({ ...current, [type]: {} }));
      setEditing((current) => ({ ...current, [type]: "" }));
    }
  };
  const editRecord = (type, item) => {
    setDrafts((current) => ({ ...current, [type]: { ...item } }));
    setEditing((current) => ({ ...current, [type]: item.id }));
  };
  const removeRecord = (type, id) =>
    saveRecords({
      ...records,
      [type]: (records[type] || []).filter((item) => item.id !== id),
    });
  const recordInput = (type, field, placeholder, inputType = "text") => (
    <input
      type={inputType}
      placeholder={placeholder}
      value={drafts[type]?.[field] || ""}
      onChange={(e) => setDraft(type, field, e.target.value)}
    />
  );
  const recordSelect = (type, field, options) => (
    <select
      aria-label={`${type} ${field}`}
      value={drafts[type]?.[field] || options[0]}
      onChange={(e) => setDraft(type, field, e.target.value)}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
  const recordList = (type, fields) => (
    <>
      {recordError && <p className="error-note">{recordError}</p>}
      <div className="record-list">
        {(records[type] || []).map((item) => (
          <div className="record-row" key={item.id}>
          <span>
            <b>{item[fields[0]]}</b>
            <small>
              {fields
                .slice(1)
                .map((field) => item[field])
                .filter(Boolean)
                .join(" · ")}
            </small>
            {item.version && (
              <>
              <small>
                Version {item.version} · {item.history?.length || 0} prior
                snapshot(s)
              </small>
              {item.history?.length > 0 && (
                <details className="record-history">
                  <summary>View current / stale snapshots</summary>
                  <small>
                    Current: {item.scope || item.decision || "Updated decision"}
                  </small>
                  {item.history.map((snapshot, index) => (
                    <small key={`${item.id}-history-${index}`}>
                      Stale v{snapshot.version || index + 1}: {snapshot.scope || snapshot.decision || "Prior decision"}
                    </small>
                  ))}
                </details>
              )}
              </>
            )}
          </span>
          <button
            className="text-button"
            aria-label={`Edit ${type} ${item.id}`}
            onClick={() => editRecord(type, item)}
          >
            Edit
          </button>
          <button
            className="text-button danger"
            aria-label={`Remove ${type} ${item.id}`}
            onClick={() => removeRecord(type, item.id)}
          >
            Remove
          </button>
          </div>
        ))}
      </div>
    </>
  );
  const financeData =
    k === "finance" ? storedDomainData(ventureId, "finance") : data;
  const expenseTotal = (records.expenses || []).reduce(
    (total, item) =>
      total + (Number(String(item.amount || "").replace(/,/g, "")) || 0),
    0,
  );
  const expenseByStatus = (status) =>
    (records.expenses || [])
      .filter((item) => (item.status || "Planned") === status)
      .reduce(
        (total, item) =>
          total + (Number(String(item.amount || "").replace(/,/g, "")) || 0),
        0,
      );
  const plannedSpend = expenseByStatus("Planned");
  const committedSpend = expenseByStatus("Committed");
  const paidSpend = expenseByStatus("Paid");
  const monthlyRunRate = (records.expenses || []).reduce((total, item) => {
    const amount = Number(String(item.amount || "").replace(/,/g, "")) || 0;
    if (item.frequency === "Annual") return total + amount / 12;
    if (item.frequency === "Monthly") return total + amount;
    return total;
  }, 0);
  const budgetTotal =
    Number(String(financeData.budgetAmount || "").replace(/,/g, "")) || 0;
  const budgetRemaining = Math.max(budgetTotal - expenseTotal, 0);
  const runwayEstimate = monthlyRunRate
    ? `${(budgetTotal / monthlyRunRate).toFixed(1)} months`
    : "Add monthly/annual costs";
  const field = (label, key, placeholder, type = "text") => (
    <Field label={label}>
      <input
        type={type}
        value={data[key] || ""}
        onChange={(e) =>
          update(
            key,
            k === "finance" && key === "budgetAmount"
              ? e.target.value.replace(/,/g, "")
              : e.target.value,
          )
        }
        placeholder={placeholder}
      />
    </Field>
  );
  if (k === "finance") {
    return (
      <section className="domain-controls" aria-label="Finance demo actions">
        <span className="chip">FRONTEND DEMO</span>
        <h3>Finance budget, funding and ownership</h3>
        <p>
          Record planning assumptions locally. No money movement, cap-table sync
          or banking connection is performed.
        </p>
        <div className="record-metrics">
          <span>
            <small>Registered spend (one period)</small>
            <b>{expenseTotal.toLocaleString()}</b>
          </span>
          <span>
            <small>Budget after records</small>
            <b>{budgetRemaining.toLocaleString()}</b>
          </span>
          <span>
            <small>Runway estimate (months)</small>
            <b>{runwayEstimate}</b>
          </span>
          <span>
            <small>Planned / committed / paid (recorded)</small>
            <b>
              {plannedSpend.toLocaleString()} /{" "}
              {committedSpend.toLocaleString()} / {paidSpend.toLocaleString()}
            </b>
          </span>
        </div>
        <div className="two-col">
          {field("Budget amount", "budgetAmount", "e.g. 50000", "number")}
          {field(
            "Funding source",
            "fundingSource",
            "Bootstrapped, grant, investor",
          )}
          {field("Ownership percentage", "ownershipPercent", "e.g. 70%")}
          {field("Runway target", "runway", "Months of runway")}
        </div>
        <label className="field">
          <span>Funding notes</span>
          <textarea
            value={data.fundingNotes || ""}
            onChange={(e) => update("fundingNotes", e.target.value)}
            placeholder="Funding assumptions or evidence reference"
          />
        </label>
        <div className="record-section">
          <div className="record-heading">
            <div>
              <h4>Expense register</h4>
              <small>
                Local planning records; no payment or accounting sync.
              </small>
            </div>
          </div>
          <div className="record-form">
            {recordInput("expenses", "category", "Expense category")}
            {recordInput("expenses", "amount", "Amount")}
            {recordInput("expenses", "date", "Date", "date")}
            {recordSelect("expenses", "status", [
              "Planned",
              "Committed",
              "Paid",
            ])}
            {recordSelect("expenses", "frequency", [
              "One-time",
              "Monthly",
              "Annual",
            ])}
            {recordInput("expenses", "evidence", "Evidence reference")}
            {recordInput("expenses", "note", "Evidence or note")}
            <button
              className="secondary"
              onClick={() => saveRecord("expenses", ["category", "amount"])}
            >
              {editing.expenses ? "Update expense" : "Add expense"}
            </button>
          </div>
          {recordList("expenses", [
            "category",
            "amount",
            "status",
            "frequency",
            "date",
            "evidence",
          ])}
        </div>
        <div className="record-section">
          <div className="record-heading">
            <div>
              <h4>Ownership documents</h4>
              <small>
                Reference metadata only; files remain local to this demo.
              </small>
            </div>
          </div>
          <div className="record-form">
            {recordInput("ownershipDocuments", "name", "Document name")}
            {recordInput("ownershipDocuments", "type", "Document type")}
            {recordSelect("ownershipDocuments", "status", [
              "Pending review",
              "Accepted",
              "Rejected",
            ])}
            {recordInput("ownershipDocuments", "reference", "Reference")}
            <button
              className="secondary"
              onClick={() => saveRecord("ownershipDocuments", ["name", "type"])}
            >
              {editing.ownershipDocuments ? "Update document" : "Add document"}
            </button>
          </div>
          {recordList("ownershipDocuments", [
            "name",
            "type",
            "status",
            "reference",
          ])}
        </div>
      </section>
    );
  }
  if (k === "legal") {
    return (
      <section className="domain-controls" aria-label="Legal demo actions">
        <span className="chip">FRONTEND DEMO</span>
        <h3>Legal formation and filing evidence</h3>
        <p>
          Prepare a filing route and evidence checklist locally. This does not
          submit a government filing.
        </p>
        <div className="two-col">
          {field(
            "Entity type",
            "entityType",
            "LLC, corporation, sole proprietor",
          )}
          {field("Jurisdiction", "jurisdiction", "State or country")}
          {field(
            "Filing route",
            "filingRoute",
            "Online portal, attorney, registry",
          )}
          {field(
            "Filing reference",
            "filingReference",
            "Reference or receipt ID",
          )}
        </div>
        <label className="field">
          <span>Status and evidence</span>
          <textarea
            value={data.legalEvidence || ""}
            onChange={(e) => update("legalEvidence", e.target.value)}
            placeholder="Status, dates, document checklist and evidence notes"
          />
        </label>
      </section>
    );
  }
  if (k === "apps") {
    return (
      <section
        className="domain-controls"
        aria-label="Apps and integrations demo actions"
      >
        <span className="chip">FRONTEND DEMO</span>
        <h3>Apps, permissions and integration checks</h3>
        <p>
          Map the tools your venture uses. No provider connection or credential
          is made from this demo.
        </p>
        <div className="two-col">
          {field("Tool inventory", "toolInventory", "CRM, analytics, payments")}
          {field("Permission owner", "permissionOwner", "Name or role")}
          {field(
            "Integration method",
            "integrationMethod",
            "API, webhook, manual export",
          )}
          {field("Test date", "testDate", "Date", "date")}
        </div>
        <label className="field">
          <span>Test evidence</span>
          <textarea
            value={data.testEvidence || ""}
            onChange={(e) => update("testEvidence", e.target.value)}
            placeholder="Expected result, observed result and evidence reference"
          />
        </label>
      </section>
    );
  }
  if (k === "partners") {
    return (
      <section
        className="domain-controls"
        aria-label="Partners and capital demo actions"
      >
        <span className="chip">FRONTEND DEMO</span>
        <h3>Partners, commitments and capital references</h3>
        <p>
          Record relationship assumptions locally. This does not transfer funds
          or create legal ownership.
        </p>
        <div className="two-col">
          {field("Partner name", "partnerName", "Organization or person")}
          {field(
            "Commitment type",
            "commitmentType",
            "Investor, advisor, channel",
          )}
          {field("Commitment amount", "commitmentAmount", "Optional amount")}
          {field(
            "Partner reference",
            "partnerReference",
            "Agreement or meeting reference",
          )}
        </div>
        <label className="field">
          <span>Commitment notes</span>
          <textarea
            value={data.commitmentNotes || ""}
            onChange={(e) => update("commitmentNotes", e.target.value)}
            placeholder="What is promised, by whom and by when?"
          />
        </label>
      </section>
    );
  }
  if (k === "launch") {
    return (
      <section
        className="domain-controls"
        aria-label="Launch preparation demo actions"
      >
        <span className="chip">FRONTEND DEMO</span>
        <h3>Launch date, checks and recovery plan</h3>
        <p>
          Prepare a launch checklist locally. The final action records a demo
          approval state only.
        </p>
        <div className="two-col">
          {field("Launch date", "launchDate", "Date", "date")}
          {field("Launch owner", "launchOwner", "Name or role")}
          {field(
            "Go / no-go check",
            "goNoGoCheck",
            "What must be true before launch?",
          )}
          {field("Risk owner", "riskOwner", "Name or role")}
        </div>
        <label className="field">
          <span>Recovery plan</span>
          <textarea
            value={data.recoveryPlan || ""}
            onChange={(e) => update("recoveryPlan", e.target.value)}
            placeholder="Rollback, communication and support plan"
          />
        </label>
        <div className="record-section">
          <div className="record-heading">
            <div>
              <h4>Decision log</h4>
              <small>
                Capture launch-room decisions and approver context locally.
              </small>
            </div>
          </div>
          <div className="record-form">
            {recordInput("decisions", "decision", "Decision")}
            {recordInput("decisions", "owner", "Decision maker")}
            {recordInput("decisions", "scope", "Decision scope")}
            {recordInput("decisions", "evidence", "Evidence reference")}
            {recordSelect("decisions", "outcome", [
              "Pending review",
              "Approved",
              "No-go",
            ])}
            {recordInput("decisions", "date", "Date", "date")}
            <button
              className="secondary"
              onClick={() =>
                saveRecord("decisions", [
                  "decision",
                  "owner",
                  "scope",
                  "evidence",
                ])
              }
            >
              {editing.decisions ? "Update decision" : "Add decision"}
            </button>
          </div>
          {recordList("decisions", [
            "decision",
            "owner",
            "scope",
            "evidence",
            "outcome",
            "date",
          ])}
        </div>
        <div className="record-section">
          <div className="record-heading">
            <div>
              <h4>Dependencies and blockers</h4>
              <small>Track the checks that must clear before go-live.</small>
            </div>
          </div>
          <div className="record-form">
            {recordInput("dependencies", "dependency", "Dependency or blocker")}
            {recordInput("dependencies", "owner", "Owner")}
            {recordInput("dependencies", "dueDate", "Due date", "date")}
            {recordSelect("dependencies", "status", [
              "Open",
              "Blocked",
              "Resolved",
            ])}
            <button
              className="secondary"
              onClick={() =>
                saveRecord("dependencies", ["dependency", "owner"])
              }
            >
              {editing.dependencies ? "Update dependency" : "Add dependency"}
            </button>
          </div>
          {recordList("dependencies", [
            "dependency",
            "owner",
            "dueDate",
            "status",
          ])}
        </div>
      </section>
    );
  }
  return (
    <section className="domain-controls" aria-label="People demo actions">
      <span className="chip">FRONTEND DEMO</span>
      <h3>People roles, onboarding and operations</h3>
      <p>
        Capture an onboarding plan locally. Invitations and signatures still use
        the demo onboarding flow.
      </p>
      <div className="two-col">
        {field("Role title", "roleTitle", "e.g. Founding engineer")}
        {field("Person name", "personName", "Name")}
        {field("Start date", "startDate", "Date", "date")}
        {field("Manager / owner", "manager", "Name")}
      </div>
      <label className="field">
        <span>Onboarding plan</span>
        <textarea
          value={data.onboardingPlan || ""}
          onChange={(e) => update("onboardingPlan", e.target.value)}
          placeholder="Access, responsibilities, first-week checklist"
        />
      </label>
      <label className="field">
        <span>Operating cadence</span>
        <select
          value={data.cadence || "Weekly"}
          onChange={(e) => update("cadence", e.target.value)}
        >
          <option>Daily</option>
          <option>Weekly</option>
          <option>Biweekly</option>
          <option>Monthly</option>
        </select>
      </label>
      <div className="record-section">
        <div className="record-heading">
          <div>
            <h4>Role register</h4>
            <small>Track people decisions locally per venture.</small>
          </div>
        </div>
        <div className="record-form">
          {recordInput("roles", "role", "Role title")}
          {recordInput("roles", "person", "Person")}
          {recordInput("roles", "status", "Status")}
          {recordInput("roles", "owner", "Manager or owner")}
          <button
            className="secondary"
            onClick={() => saveRecord("roles", ["role", "person"])}
          >
            {editing.roles ? "Update role" : "Add role"}
          </button>
        </div>
        {recordList("roles", ["role", "person", "status", "owner"])}
      </div>
      <div className="record-section">
        <div className="record-heading">
          <div>
            <h4>Evidence review register</h4>
            <small>Record access, onboarding and approval references.</small>
          </div>
        </div>
        <div className="record-form">
          {recordInput("peopleEvidence", "person", "Person")}
          {recordInput("peopleEvidence", "evidence", "Evidence reference")}
          {recordInput("peopleEvidence", "reviewer", "Reviewer")}
          {recordSelect("peopleEvidence", "status", [
            "Pending review",
            "Accepted",
            "Rejected",
          ])}
          <button
            className="secondary"
            onClick={() => saveRecord("peopleEvidence", ["person", "evidence"])}
          >
            {editing.peopleEvidence ? "Update evidence" : "Add evidence"}
          </button>
        </div>
        {recordList("peopleEvidence", [
          "person",
          "evidence",
          "reviewer",
          "status",
        ])}
      </div>
    </section>
  );
}
function Review({ v, setStep }) {
  const approvalKey = `launch7-approval-${v.id}`;
  const invalidated =
    localStorage.getItem(`launch7-approval-invalidated-${v.id}`) === "1";
  const done = keys.every(
    (k) =>
      v.tasks[k].every((t) => t.status === "Done") &&
      domainReady(v.id, k, v.tasks[k]),
  );
  const [sent, setSent] = useState(
    done &&
      !invalidated &&
      (localStorage.getItem(approvalKey) === "Submitted" ||
        v.approval === "Submitted"),
  );
  useEffect(() => {
    if (!done || invalidated) setSent(false);
  }, [done, invalidated]);
  const submitted =
    sent && !invalidated && localStorage.getItem(approvalKey) === "Submitted";
  return (
    <div className="panel launch-review">
      <div className="review-icon">
        <Rocket size={26} />
      </div>
      <p className="eyebrow">FINAL REVIEW</p>
      <h2>
        {submitted
          ? "Submitted for approval"
          : done
            ? "Ready to submit for approval"
            : "Complete every workstream first"}
      </h2>
      <div className="review-checks">
        {keys.map((k) => (
          <button key={k} onClick={() => setStep(k)}>
            <span
              className={
                v.tasks[k].every((t) => t.status === "Done") &&
                domainReady(v.id, k, v.tasks[k])
                  ? "ready"
                  : ""
              }
            >
              {v.tasks[k].every((t) => t.status === "Done") &&
              domainReady(v.id, k, v.tasks[k]) ? (
                <Check size={14} />
              ) : (
                <span />
              )}
            </span>
            {WS[k][0]}
            <small>
              {v.tasks[k].every((t) => t.status === "Done") &&
              domainReady(v.id, k, v.tasks[k])
                ? "Ready"
                : domainMissing(v.id, k, v.tasks[k]).length
                  ? `Missing: ${domainMissing(v.id, k, v.tasks[k]).join(", ")}`
                  : "Needs work"}
            </small>
          </button>
        ))}
      </div>
      <div className="launch-callout">
        <ShieldCheck size={20} />
        <span>
          <b>Demo approval state</b>
          <small>Submitting records a local approval state only.</small>
        </span>
      </div>
      <button
        className="primary review-submit"
        disabled={!done || submitted}
        onClick={() => {
          localStorage.setItem(approvalKey, "Submitted");
          localStorage.removeItem(`launch7-approval-invalidated-${v.id}`);
          setSent(true);
        }}
      >
        {submitted ? "Awaiting approval" : "Submit for approval"}{" "}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
function Tasks({ v, onTask }) {
  const [expanded, setExpanded] = useState({});
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TASK BOARD</p>
          <h1>Assigned tasks</h1>
          <p className="muted">Progress and evidence for {v.name}.</p>
        </div>
      </div>
      <div className="panel task-board">
        {keys.flatMap((k) =>
          v.tasks[k].map((t) => (
            <div className="board-row" key={t.id}>
              <button
                className={
                  "check-button " + (t.status === "Done" ? "checked" : "")
                }
                onClick={() =>
                  onTask(k, t.id, {
                    status: t.status === "Done" ? "Not started" : "Done",
                  })
                }
              >
                {t.status === "Done" && <Check size={14} />}
              </button>
              <div>
                <b>{t.title}</b>
                <small>{WS[k][0]}</small>
                {k === "product" && (
                  <>
                    <div className="task-controls">
                      <input
                        aria-label={`${t.title} owner`}
                        placeholder="Task owner"
                        value={t.assigneeName || ""}
                        onChange={(e) =>
                          onTask(k, t.id, { assigneeName: e.target.value })
                        }
                      />
                      <select
                        aria-label={`${t.title} evidence review`}
                        value={t.evidenceReview || "Missing"}
                        onChange={(e) =>
                          onTask(k, t.id, { evidenceReview: e.target.value })
                        }
                      >
                        <option>Missing</option>
                        <option>Ready for review</option>
                        <option>Founder reviewed</option>
                      </select>
                      <input
                        aria-label={`${t.title} evidence reference`}
                        placeholder="Evidence reference"
                        value={t.evidenceReference || ""}
                        onChange={(e) =>
                          onTask(k, t.id, {
                            evidenceReference: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [t.id]: !current[t.id],
                        }))
                      }
                    >
                      {expanded[t.id] ? "Hide checklist" : "Show checklist"}
                    </button>
                    {expanded[t.id] && (
                      <div className="task-checklist">
                        {(t.checklist || productChecklist).map((item, i) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={Boolean(t.checklistState?.[i])}
                              onChange={(e) =>
                                onTask(k, t.id, {
                                  checklistState: {
                                    ...(t.checklistState || {}),
                                    [i]: e.target.checked,
                                  },
                                })
                              }
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {(() => {
                  try {
                    const meta = JSON.parse(t.note || "{}");
                    return (
                      <small>
                        {t.assigneeName || meta.assigneeName
                          ? `Assigned to ${t.assigneeName || meta.assigneeName}`
                          : meta.method === "ai" && meta.aiStatus
                            ? meta.aiStatus
                            : meta.file
                              ? `Evidence preview: ${meta.file}`
                              : "Unassigned · local demo"}
                      </small>
                    );
                  } catch {
                    return <small>Unassigned · local demo</small>;
                  }
                })()}
              </div>
              <span className="status-pill">{t.status}</span>
            </div>
          )),
        )}
      </div>
    </section>
  );
}
function Onboarding() {
  const token =
    new URLSearchParams(window.location.search).get("invitationToken") ||
    "preview";
  const hasInvitationToken = window.location.search.includes("invitationToken");
  const emailKey = `launch7-invite-email-${token}`;
  const [activeInvite, setActiveInvite] = useState(
    hasInvitationToken
      ? token
      : localStorage.getItem("launch7-active-invite-token") || token,
  );
  const nameKey = `launch7-signed-name-${activeInvite}`;
  const [email, setEmail] = useState(localStorage.getItem(emailKey) || "");
  const [name, setName] = useState(localStorage.getItem(nameKey) || "");
  const [signed, setSigned] = useState(Boolean(name));
  const [link, setLink] = useState(
    window.location.search.includes("invitationToken")
      ? "local invitation"
      : "",
  );
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <section className="narrow">
      <div className="form-hero">
        <div className="icon-orb">
          <Users size={24} />
        </div>
        <p className="eyebrow">TEAM ONBOARDING</p>
        <h1>
          {signed ? "Membership activated" : "Invite and onboard your team"}
        </h1>
        <p className="muted">
          Local invitation and signature preview; no email or identity check is
          performed.
        </p>
      </div>
      {signed ? (
        <div className="panel signed-card">
          <Check size={28} />
          <h2>Welcome to the team</h2>
          <p>Your signature is persisted locally for this invitation.</p>
          <button
            className="secondary"
            onClick={() => {
              setSigned(false);
              setEmail("");
              setName("");
              setLink("");
              setActiveInvite("preview");
            }}
          >
            Create another invitation
          </button>
        </div>
      ) : (
        <>
          <div className="panel form-panel">
            <h3>Create invitation</h3>
            <Field label="Teammate email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {email && !validEmail && (
              <small className="field-error">
                Enter a valid email address.
              </small>
            )}
            <button
              className="secondary"
              disabled={!validEmail}
              onClick={() => {
                const inviteToken = `local-${Date.now()}`;
                localStorage.setItem(
                  `launch7-invite-email-${inviteToken}`,
                  email,
                );
                localStorage.setItem(
                  "launch7-active-invite-token",
                  inviteToken,
                );
                setActiveInvite(inviteToken);
                setLink(
                  `${window.location.origin}/launch-7/onboarding?invitationToken=${inviteToken}`,
                );
              }}
            >
              Generate local invitation link
            </button>
            {link && (
              <div className="invite-link">
                <span>{link}</span>
                <button onClick={() => navigator.clipboard?.writeText(link)}>
                  Copy
                </button>
              </div>
            )}
          </div>
          <form
            className="panel form-panel"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem(nameKey, name);
              setSigned(true);
            }}
          >
            <h3>Recipient signature</h3>
            <Field label="Full name as signature" req>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <label className="consent">
              <input type="checkbox" required /> I reviewed my role and
              responsibilities.
            </label>
            <label className="consent">
              <input type="checkbox" required /> I consent to sign.
            </label>
            <button className="primary">
              Sign & activate membership <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
