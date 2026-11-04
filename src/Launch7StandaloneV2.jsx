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
const makeTasks = () =>
  Object.fromEntries(
    keys.map((k) => [
      k,
      taskTitles.map((title, i) => ({
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
          product: [
            ...(v.tasks.product || []),
            ...taskTitles
              .slice((v.tasks.product || []).length)
              .map((title, i) => ({
                id: `product${(v.tasks.product || []).length + i}`,
                title,
                status: "Not started",
                note: "",
              })),
          ],
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
      return {
        ...merged,
        ...(JSON.parse(
          localStorage.getItem(`launch7-draft-${ventureId}-${key}-${index}`),
        ) || {}),
      };
    } catch {
      return merged;
    }
  }, {});
};
const domainReady = (ventureId, key) =>
  (domainRequirement[key] || []).every((field) =>
    String(storedDomainData(ventureId, key)[field] || "").trim(),
  );
export default function Launch7StandaloneV2() {
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState(0);
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
    if (patch.status === "Done" && !domainReady(v.id, key)) {
      setNotice(
        "Complete the required domain fields before checking this task.",
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
                t.id === id ? { ...t, ...patch } : t,
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
                setSelected(0);
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
function Dashboard({ rows, open, newV }) {
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
            "Average readiness",
            (rows.length
              ? Math.round(
                  rows.reduce((n, x) => n + progress(x), 0) / rows.length,
                )
              : 0) + "%",
          ],
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
              <b>{progress(x)}%</b>
            </div>
            <div className="progress">
              <i style={{ width: progress(x) + "%" }} />
            </div>
            <button className="card-action" onClick={() => open(i)}>
              Open launch plan <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
      {rows[0] && <LaunchSnapshot venture={rows[0]} />}
    </section>
  );
}
function LaunchSnapshot({ venture }) {
  const approval =
    localStorage.getItem(`launch7-approval-${venture.id}`) || "Draft";
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
          const evidence = items.filter((item) => item.note).length;
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
                k !== "review" && v.tasks[k].every((t) => t.status === "Done")
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
    return tabs.reduce(
      (merged, _, stageIndex) => ({
        ...merged,
        ...readDraft(`launch7-draft-${v.id}-${k}-${stageIndex}`),
      }),
      {},
    );
  };
  const [data, setData] = useState(() => {
    return readStageDraft(tab);
  });
  const [domainError, setDomainError] = useState("");
  useEffect(() => setData(readStageDraft(tab)), [draftKey]);
  const update = (key, val) => {
    const next = { ...data, [key]: val };
    setData(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
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
    setDomainError("");
    const t = tasks[Math.min(tab, tasks.length - 1)];
    const note = JSON.stringify(data);
    if (tab === tabs.length - 1) {
      const stored = JSON.parse(localStorage.getItem("launch7-v2") || "[]");
      const source = stored.length ? stored : [v];
      const savedRows = source.map((row) =>
        row.id === v.id
          ? {
              ...row,
              tasks: {
                ...row.tasks,
                [k]: row.tasks[k].map((x) => ({
                  ...x,
                  status: "Done",
                  note: x.note || note,
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
      <DomainControls k={k} data={data} update={update} />
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
            <small>Filename and metadata only.</small>
          </span>
          <input
            type="file"
            onChange={(e) => update("file", e.target.files?.[0]?.name || "")}
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
function DomainControls({ k, data, update }) {
  if (
    ["finance", "legal", "people", "apps", "partners", "launch"].includes(k)
  ) {
    return <OperationsControls k={k} data={data} update={update} />;
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
              update("aiStatus", "Generated demo draft ready for review")
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
function OperationsControls({ k, data, update }) {
  const field = (label, key, placeholder, type = "text") => (
    <Field label={label}>
      <input
        type={type}
        value={data[key] || ""}
        onChange={(e) => update(key, e.target.value)}
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
    </section>
  );
}
function Review({ v, setStep }) {
  const approvalKey = `launch7-approval-${v.id}`;
  const done = keys.every((k) => v.tasks[k].every((t) => t.status === "Done"));
  const [sent, setSent] = useState(
    done &&
      (localStorage.getItem(approvalKey) === "Submitted" ||
        v.approval === "Submitted"),
  );
  return (
    <div className="panel launch-review">
      <div className="review-icon">
        <Rocket size={26} />
      </div>
      <p className="eyebrow">FINAL REVIEW</p>
      <h2>
        {sent
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
                v.tasks[k].every((t) => t.status === "Done") ? "ready" : ""
              }
            >
              {v.tasks[k].every((t) => t.status === "Done") ? (
                <Check size={14} />
              ) : (
                <span />
              )}
            </span>
            {WS[k][0]}
            <small>
              {v.tasks[k].every((t) => t.status === "Done")
                ? "Ready"
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
        disabled={!done || sent}
        onClick={() => {
          localStorage.setItem(approvalKey, "Submitted");
          setSent(true);
        }}
      >
        {sent ? "Awaiting approval" : "Submit for approval"}{" "}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
function Tasks({ v, onTask }) {
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
                {(() => {
                  try {
                    const meta = JSON.parse(t.note || "{}");
                    return (
                      <small>
                        {meta.assigneeName
                          ? `Assigned to ${meta.assigneeName}`
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
