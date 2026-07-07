//// frontend ////
// proc2 — personal task/project workbook.
import React from "react";
import { createRoot } from "react-dom/client";
import { Workbook } from "./iface/_workbook.js";
import { Projects } from "./iface/_projects.js";
import type { YieldResult } from "./iface/_util.js";
import { theme } from "./theme.js";

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------------------------------------------------------------- datashapes
type TaskStage = "todo" | "in-progress" | "done" | "cancelled" | "tabled";

type Task = {
    id: number;
    text: string;
    list: string;
    stage: TaskStage;
    priority: number;
    transient: boolean;
    project: string;
    notes: string;
    remind_at: string;
};

type Project = {
    name: string;
    description: string;
    notes: string;
};

// ---------------------------------------------------------------- date utils
const pad2 = (n: number): string => String(n).padStart(2, "0");
const dateStr = (d: Date): string =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const minuteStr = (d: Date): string =>
    `${dateStr(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const addDays = (d: Date, n: number): Date => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};
const parseDay = (s: string): Date => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const isDayStr = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

// ---------------------------------------------------------------- glyphs
const STAGES: TaskStage[] = ["todo", "in-progress", "done", "cancelled", "tabled"];
const STAGE_GLYPH: Record<TaskStage, string> = {
    "todo": "○",
    "in-progress": "◐",
    "done": "●",
    "cancelled": "✕",
    "tabled": "◻",
};
const stageColor = (s: TaskStage): string =>
    s === "done" ? theme.ok
    : s === "cancelled" ? theme.err
    : s === "tabled" ? theme.textDim
    : s === "in-progress" ? theme.accent
    : theme.text;
const nextStage = (s: TaskStage): TaskStage =>
    s === "todo" ? "in-progress" : s === "in-progress" ? "done" : "todo";
const prColor = (p: number): string =>
    p === 1 ? theme.p1 : p === 2 ? theme.p2 : theme.p3;
const isStruck = (s: TaskStage): boolean => s === "done" || s === "cancelled";

// ---------------------------------------------------------------- error toast
let notifyErr: (msg: string) => void = () => {};

/** Unwrap a YieldResult; report failures to the toast instead of throwing. */
async function run<T>(p: Promise<YieldResult<T>>): Promise<T | undefined> {
    try {
        const r = await p;
        if ("ok" in r) return r.ok;
        notifyErr(r.err);
    } catch (e) {
        notifyErr(String(e));
    }
    return undefined;
}

// ---------------------------------------------------------------- hooks
/** Returns a scheduler that debounces the last passed action (immediate-save fields). */
function useDebouncedAction(delay = 450): (f: () => void) => void {
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    return useCallback((f: () => void) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(f, delay);
    }, [delay]);
}

// ---------------------------------------------------------------- stylesheet
const css = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: ${theme.bg}; color: ${theme.text};
  font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
button { font: inherit; color: inherit; cursor: pointer; }
input, select, textarea { font: inherit; }
:focus-visible { outline: 2px solid ${theme.accent}; outline-offset: 1px; }

.app { display: grid; gap: 12px; padding: 12px; max-width: 1500px; margin: 0 auto;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "capture" "reminders" "board" "projects"; }
@media (min-width: 900px) {
  .app { grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-rows: auto auto 1fr;
    grid-template-areas: "board capture" "board reminders" "board projects";
    align-items: start; gap: 14px; padding: 16px; }
}
.area-board { grid-area: board; min-width: 0; }
.area-capture { grid-area: capture; }
.area-reminders { grid-area: reminders; }
.area-projects { grid-area: projects; }
@media (max-width: 899px) {
  .area-capture { position: sticky; top: 0; z-index: 20; box-shadow: 0 6px 18px ${theme.bg}; }
}

.card { background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 12px; }
.cardtitle { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: ${theme.textDim}; margin: 0 0 10px; }
.dim { color: ${theme.textDim}; font-size: 12px; }
.row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.txt { background: ${theme.surface2}; border: 1px solid ${theme.border}; color: ${theme.text};
  border-radius: 8px; padding: 7px 10px; min-height: 36px; width: 100%; }
.txt:focus { outline: none; border-color: ${theme.accent}; }
.txt::placeholder { color: ${theme.textDim}; }
textarea.txt { resize: vertical; }
.txt.slim { min-height: 32px; padding: 4px 8px; width: auto; flex: 1; min-width: 0; }

.chip { background: ${theme.surface2}; border: 1px solid ${theme.border}; color: ${theme.textDim};
  border-radius: 999px; padding: 5px 12px; min-height: 32px; display: inline-flex; align-items: center; }
.chip:hover { border-color: ${theme.textDim}; }
.chip.on { background: ${theme.accent}; border-color: ${theme.accent}; color: ${theme.onAccent}; font-weight: 600; }
.chiprow { display: flex; flex-wrap: wrap; gap: 6px; }

.btn { background: ${theme.surface2}; border: 1px solid ${theme.border}; color: ${theme.text};
  border-radius: 8px; padding: 6px 12px; min-height: 32px;
  display: inline-flex; align-items: center; justify-content: center; }
.btn:hover { border-color: ${theme.textDim}; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.primary { background: ${theme.accent}; border-color: ${theme.accent}; color: ${theme.onAccent}; font-weight: 700; }
.btn.slim { padding: 4px 9px; min-height: 28px; }
.btn.okbtn { color: ${theme.ok}; border-color: ${theme.ok}; }
.btn.danger { color: ${theme.err}; border-color: ${theme.err}; }
.btn.danger.armed { background: ${theme.err}; color: ${theme.onAccent}; font-weight: 700; }

.reminders { border: 2px solid ${theme.warn}; }
.remrow { display: flex; align-items: center; gap: 8px; padding: 5px 0; flex-wrap: wrap; }
.rembell { color: ${theme.warn}; flex: none; }
.remtime { color: ${theme.warn}; font-size: 12px; font-variant-numeric: tabular-nums; flex: none; }
.remtext { flex: 1; min-width: 140px; }

.board { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 620px) { .board { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1250px) { .board { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.col { background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 10px; min-height: 110px; }
.colhead { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.coltitle { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: ${theme.text}; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.colrole { font-size: 11px; color: ${theme.textDim}; text-transform: uppercase; letter-spacing: .08em; flex: none; }

.tasklist { display: flex; flex-direction: column; gap: 6px; }
.taskrow { display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  background: ${theme.surface2}; border: 1px solid ${theme.surface2}; border-radius: 8px; min-height: 40px; }
.taskrow.now { border-color: ${theme.accent}; box-shadow: 0 0 0 1px ${theme.accent}; }
.taskrow.sel { border-color: ${theme.textDim}; background: ${theme.border}; }
.taskrow.ghost { opacity: .45; }
.glyph { background: none; border: none; padding: 0; font-size: 16px; line-height: 1;
  min-width: 28px; min-height: 28px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center; flex: none; }
button.glyph:hover { background: ${theme.border}; }
.ttext { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.taskrow .ttext { cursor: pointer; }
.taskrow.ro .ttext { cursor: default; }
.ttext.strike { text-decoration: line-through; color: ${theme.textDim}; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; display: inline-block; }
.projchip { border: 1px solid ${theme.purple}; color: ${theme.purple}; border-radius: 999px;
  padding: 1px 8px; font-size: 11px; flex: none; max-width: 110px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.modal-wrap { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 14px; }
.backdrop { position: absolute; inset: 0; background: ${theme.bg}; opacity: .78; }
.modal { position: relative; z-index: 1; background: ${theme.surface}; border: 1px solid ${theme.border};
  border-radius: 14px; padding: 14px; width: min(600px, 100%); max-height: calc(100vh - 28px);
  overflow: auto; box-shadow: 0 24px 60px ${theme.bg}; }
.field { margin-bottom: 12px; }
.flabel { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .12em;
  color: ${theme.textDim}; margin-bottom: 5px; }
.pbtn { width: 36px; height: 36px; border-radius: 50%; background: ${theme.surface2};
  border: 1px solid ${theme.border}; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.pbtn:hover { border-color: ${theme.textDim}; }
.pbtn.on { border-color: ${theme.text}; box-shadow: 0 0 0 1px ${theme.text}; }
.pbtn .dot { width: 12px; height: 12px; }
.pnone { color: ${theme.textDim}; font-size: 14px; line-height: 1; }

.projlist { display: flex; flex-direction: column; gap: 6px; }
.projname { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  background: ${theme.surface2}; border: 1px solid ${theme.border}; color: ${theme.text};
  border-radius: 8px; padding: 8px 10px; min-height: 40px; }
.projname:hover { border-color: ${theme.purple}; }
.projname.open { border-color: ${theme.purple}; border-radius: 8px 8px 0 0; }
.projdot { width: 8px; height: 8px; border-radius: 50%; background: ${theme.purple}; flex: none; }
.projexp { border: 1px solid ${theme.purple}; border-top: none; border-radius: 0 0 8px 8px;
  padding: 10px; background: ${theme.surface2}; }
.projexp .txt { background: ${theme.surface}; }
.projexp .taskrow { background: ${theme.surface}; border-color: ${theme.surface}; }

.toast { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
  background: ${theme.surface2}; border: 1px solid ${theme.err}; color: ${theme.err};
  border-radius: 10px; padding: 10px 14px; z-index: 100;
  max-width: min(560px, calc(100vw - 24px)); box-shadow: 0 10px 30px ${theme.bg}; }

@media (max-width: 899px) {
  .btn, .chip { min-height: 44px; }
  .btn.slim { min-height: 44px; }
  .txt, .txt.slim { min-height: 44px; }
  .glyph { min-width: 44px; min-height: 44px; font-size: 20px; }
  .pbtn { width: 44px; height: 44px; }
  .taskrow { min-height: 48px; }
  .projname { min-height: 48px; }
}
`;

// ---------------------------------------------------------------- QuickCapture
// @protos Workbook{create_task}
function QuickCapture({ bump }: { bump: () => void }) {
    const [text, setText] = useState("");
    const [pick, setPick] = useState<"staging" | "today" | "tomorrow" | "someday" | "other">("staging");
    const [otherName, setOtherName] = useState("");
    const [transient, setTransient] = useState(false);
    const [remind, setRemind] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const resolveList = (): string => {
        if (pick === "other") return otherName.trim();
        if (pick === "today") return dateStr(new Date());
        if (pick === "tomorrow") return dateStr(addDays(new Date(), 1));
        return pick;
    };
    const canCreate = text.trim() !== "" && resolveList() !== "";

    const create = async () => {
        if (!canCreate) return;
        await run(Workbook.create_task({
            text: text.trim(),
            list: resolveList(),
            transient,
            remind_at: remind,
        }));
        setText("");
        setRemind("");
        setTransient(false);
        bump();
        inputRef.current?.focus();
    };

    return (
        <section className="card area-capture">
            <h2 className="cardtitle">quick capture</h2>
            <div className="row">
                <input
                    ref={inputRef}
                    className="txt"
                    style={{ flex: 1, width: "auto" }}
                    placeholder="write it down…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void create(); }}
                />
                <button className="btn primary" disabled={!canCreate} onClick={() => void create()}>
                    create
                </button>
            </div>
            <div className="chiprow" style={{ marginTop: 8 }}>
                {(["staging", "today", "tomorrow", "someday"] as const).map(p => (
                    <button key={p} className={"chip" + (pick === p ? " on" : "")} onClick={() => setPick(p)}>
                        {p}
                    </button>
                ))}
                <button className={"chip" + (pick === "other" ? " on" : "")} onClick={() => setPick("other")}>
                    other…
                </button>
            </div>
            {pick === "other" && (
                <input
                    className="txt"
                    style={{ marginTop: 8 }}
                    placeholder="list name…"
                    value={otherName}
                    onChange={e => setOtherName(e.target.value)}
                />
            )}
            <div className="row" style={{ marginTop: 8 }}>
                <button
                    className={"chip" + (transient ? " on" : "")}
                    title="transient: a chore you won't care about at weekly review"
                    onClick={() => setTransient(v => !v)}
                >
                    ~ transient
                </button>
                <input
                    type="datetime-local"
                    className="txt"
                    style={{ flex: 1, width: "auto", minWidth: 0 }}
                    title="optional reminder"
                    aria-label="reminder"
                    value={remind}
                    onChange={e => setRemind(e.target.value)}
                />
            </div>
        </section>
    );
}

// ---------------------------------------------------------------- RemindersBar
// @protos Workbook{due_reminders, set_reminder, set_stage}
function RemindersBar({ version, bump }: { version: number; bump: () => void }) {
    const [due, setDue] = useState<Task[]>([]);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const t = window.setInterval(() => setTick(x => x + 1), 30000);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        let alive = true;
        void (async () => {
            const r = await run(Workbook.due_reminders({ now: minuteStr(new Date()) }));
            if (alive && r) {
                setDue([...r].sort((a, b) => a.remind_at.localeCompare(b.remind_at)));
            }
        })();
        return () => { alive = false; };
    }, [version, tick]);

    if (due.length === 0) return null;

    const defer = async (id: number, at: string) => {
        await run(Workbook.set_reminder({ id, remind_at: at }));
        bump();
    };
    const markDone = async (id: number) => {
        await run(Workbook.set_stage({ id, stage: "done" }));
        bump();
    };
    const fmt = (at: string): string => {
        const today = dateStr(new Date());
        return at.startsWith(today + "T") ? at.slice(11) : at.replace("T", " ");
    };

    return (
        <section className="card reminders area-reminders">
            <h2 className="cardtitle" style={{ color: theme.warn }}>◉ reminders due</h2>
            {due.map(t => (
                <div key={t.id} className="remrow">
                    <span className="rembell" aria-hidden="true">◉</span>
                    <span className="remtime">{fmt(t.remind_at)}</span>
                    <span className="remtext">{t.text}</span>
                    <span className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
                        <button className="btn slim" title="defer 5 minutes"
                            onClick={() => void defer(t.id, minuteStr(new Date(Date.now() + 5 * 60000)))}>
                            +5m
                        </button>
                        <button className="btn slim" title="defer 1 hour"
                            onClick={() => void defer(t.id, minuteStr(new Date(Date.now() + 60 * 60000)))}>
                            +1h
                        </button>
                        <button className="btn slim" title="defer to tomorrow 9:00"
                            onClick={() => void defer(t.id, dateStr(addDays(new Date(), 1)) + "T09:00")}>
                            9am
                        </button>
                        <button className="btn slim okbtn" title="mark done"
                            onClick={() => void markDone(t.id)}>
                            ✓
                        </button>
                    </span>
                </div>
            ))}
        </section>
    );
}

// ---------------------------------------------------------------- Workboard
// @protos Workbook{get_list, set_stage, list_names}
type BoardCol = { role: string; name: string; tasks: Task[] };

function Workboard({ version, dayKey, bump, openTask, hotkeys }: {
    version: number;
    dayKey: string;
    bump: () => void;
    openTask: (id: number) => void;
    hotkeys: boolean;
}) {
    const [mainCols, setMainCols] = useState<BoardCol[]>(() => [
        { role: "staging", name: "staging", tasks: [] },
        { role: "yesterday", name: dateStr(addDays(new Date(), -1)), tasks: [] },
        { role: "today", name: dateStr(new Date()), tasks: [] },
    ]);
    const [browse, setBrowse] = useState("");
    const [browseTasks, setBrowseTasks] = useState<Task[]>([]);
    const [names, setNames] = useState<string[]>([]);
    const [sel, setSel] = useState(-1);

    useEffect(() => {
        let alive = true;
        const today = dayKey;
        const yest = dateStr(addDays(parseDay(dayKey), -1));
        void (async () => {
            const [s, y, t, b, ns] = await Promise.all([
                run(Workbook.get_list({ name: "staging" })),
                run(Workbook.get_list({ name: yest })),
                run(Workbook.get_list({ name: today })),
                browse !== ""
                    ? run(Workbook.get_list({ name: browse }))
                    : Promise.resolve<Task[] | undefined>([]),
                run(Workbook.list_names(null)),
            ]);
            if (!alive) return;
            setMainCols([
                { role: "staging", name: "staging", tasks: s ?? [] },
                { role: "yesterday", name: yest, tasks: y ?? [] },
                { role: "today", name: today, tasks: t ?? [] },
            ]);
            setBrowseTasks(b ?? []);
            if (ns) setNames(ns);
        })();
        return () => { alive = false; };
    }, [version, dayKey, browse]);

    // the task I should be working on now: first todo/in-progress in today
    const todayCol = mainCols.find(c => c.role === "today");
    const nowId = todayCol?.tasks.find(t => t.stage === "todo" || t.stage === "in-progress")?.id;

    const flat = useMemo(
        () => [...mainCols.flatMap(c => c.tasks), ...browseTasks],
        [mainCols, browseTasks],
    );

    const cycle = async (t: Task) => {
        await run(Workbook.set_stage({ id: t.id, stage: nextStage(t.stage) }));
        bump();
    };

    // desktop hotkeys: j/k select, d done, enter open
    useEffect(() => {
        if (!hotkeys) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const el = e.target as HTMLElement | null;
            const tag = el?.tagName ?? "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
            if (e.key === "j") {
                e.preventDefault();
                setSel(s => Math.min(s + 1, flat.length - 1));
            } else if (e.key === "k") {
                e.preventDefault();
                setSel(s => Math.max(s - 1, 0));
            } else if (e.key === "d") {
                const t = flat[sel];
                if (t) {
                    e.preventDefault();
                    void run(Workbook.set_stage({ id: t.id, stage: "done" })).then(() => bump());
                }
            } else if (e.key === "Enter") {
                if (tag === "BUTTON") return;
                const t = flat[sel];
                if (t) {
                    e.preventDefault();
                    openTask(t.id);
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hotkeys, flat, sel, bump, openTask]);

    useEffect(() => {
        if (sel >= 0) {
            document.getElementById(`wbrow-${sel}`)?.scrollIntoView({ block: "nearest" });
        }
    }, [sel]);

    const renderRow = (t: Task, flatIndex: number, colKey: string) => (
        <div
            key={`${colKey}-${t.id}`}
            id={`wbrow-${flatIndex}`}
            className={
                "taskrow"
                + (t.transient ? " ghost" : "")
                + (t.id === nowId ? " now" : "")
                + (flatIndex === sel ? " sel" : "")
            }
        >
            <button
                className="glyph"
                title={`${t.stage} — click to cycle`}
                style={{ color: stageColor(t.stage) }}
                onClick={() => void cycle(t)}
            >
                {STAGE_GLYPH[t.stage]}
            </button>
            <span
                className={"ttext" + (isStruck(t.stage) ? " strike" : "")}
                title="open task"
                onClick={() => openTask(t.id)}
            >
                {t.text}
            </span>
            {t.priority > 0 && (
                <span
                    className="dot"
                    title={`priority ${t.priority}`}
                    style={{ background: prColor(t.priority) }}
                />
            )}
            {t.project !== "" && (
                <span className="projchip" title={`project: ${t.project}`}>{t.project}</span>
            )}
        </div>
    );

    // flat-index offsets per column, in column order
    let off = 0;
    const offsets = [...mainCols, { role: "browse", name: browse, tasks: browseTasks }].map(c => {
        const o = off;
        off += c.tasks.length;
        return o;
    });

    return (
        <div className="area-board">
            <div className="board">
                {mainCols.map((c, i) => (
                    <div key={c.role} className="col">
                        <div className="colhead">
                            <span className="coltitle">{c.name}</span>
                            {c.role !== c.name && <span className="colrole">{c.role}</span>}
                        </div>
                        {c.tasks.length === 0
                            ? <div className="dim">empty</div>
                            : <div className="tasklist">
                                {c.tasks.map((t, j) => renderRow(t, (offsets[i] ?? 0) + j, c.role))}
                              </div>}
                    </div>
                ))}
                <div className="col">
                    <div className="colhead">
                        <span className="coltitle">{browse !== "" ? browse : "browse"}</span>
                        <span className="colrole">browse</span>
                    </div>
                    <div className="row" style={{ marginBottom: 8 }}>
                        <select
                            className="txt slim"
                            aria-label="browse a list"
                            value={names.includes(browse) ? browse : ""}
                            onChange={e => setBrowse(e.target.value)}
                        >
                            <option value="">list…</option>
                            {names.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input
                            type="date"
                            className="txt slim"
                            aria-label="browse a date"
                            value={isDayStr(browse) ? browse : ""}
                            onChange={e => setBrowse(e.target.value)}
                        />
                    </div>
                    {browse === ""
                        ? <div className="dim">pick a list or date to view it here</div>
                        : browseTasks.length === 0
                            ? <div className="dim">empty</div>
                            : <div className="tasklist">
                                {browseTasks.map((t, j) => renderRow(t, (offsets[3] ?? 0) + j, "browse"))}
                              </div>}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- TaskDetail
// @protos Workbook{read_task, set_text, set_stage, set_priority, set_transient,
//   set_project, set_notes, set_reminder, move_task, delete_task} Projects{list_projects}
function TaskDetail({ id, version, bump, onClose }: {
    id: number;
    version: number;
    bump: () => void;
    onClose: () => void;
}) {
    const [task, setTask] = useState<Task | null>(null);
    const [textDraft, setTextDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");
    const [remind, setRemind] = useState("");
    const [projects, setProjects] = useState<string[]>([]);
    const [moveName, setMoveName] = useState("");
    const [confirmDel, setConfirmDel] = useState(false);
    const loadedFor = useRef<number | null>(null);
    const saveText = useDebouncedAction();
    const saveNotes = useDebouncedAction();
    const saveRemind = useDebouncedAction();

    useEffect(() => {
        let alive = true;
        void (async () => {
            const t = await run(Workbook.read_task({ id }));
            if (!alive || !t) return;
            setTask(t);
            setRemind(t.remind_at);
            if (loadedFor.current !== id) {
                // initialize typing drafts once per task; refetches must not clobber typing
                loadedFor.current = id;
                setTextDraft(t.text);
                setNotesDraft(t.notes);
            }
        })();
        return () => { alive = false; };
    }, [id, version]);

    useEffect(() => {
        let alive = true;
        void (async () => {
            const r = await run(Projects.list_projects(null));
            if (alive && r) setProjects(r);
        })();
        return () => { alive = false; };
    }, [version]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const eff = async (p: Promise<YieldResult<true>>) => {
        await run(p);
        bump();
    };
    const move = (list: string) => {
        if (list !== "") void eff(Workbook.move_task({ id, list, index: 9999 }));
    };

    return (
        <div className="modal-wrap">
            <div className="backdrop" onClick={onClose} />
            <div className="modal" role="dialog" aria-modal="true">
                <div className="row" style={{ marginBottom: 10 }}>
                    <span className="dim" style={{ flex: 1 }}>
                        task #{id}{task ? ` · in ${task.list}` : ""}
                    </span>
                    <button className="btn slim" title="close (esc)" onClick={onClose}>✕</button>
                </div>
                {task === null ? (
                    <div className="dim">loading…</div>
                ) : (
                    <>
                        <div className="field">
                            <label className="flabel">text</label>
                            <input
                                className="txt"
                                value={textDraft}
                                onChange={e => {
                                    const v = e.target.value;
                                    setTextDraft(v);
                                    saveText(() => void eff(Workbook.set_text({ id, text: v })));
                                }}
                            />
                        </div>
                        <div className="field">
                            <label className="flabel">stage</label>
                            <div className="row">
                                {STAGES.map(s => (
                                    <button
                                        key={s}
                                        className={"chip" + (task.stage === s ? " on" : "")}
                                        onClick={() => void eff(Workbook.set_stage({ id, stage: s }))}
                                    >
                                        <span style={{ color: task.stage === s ? theme.onAccent : stageColor(s) }}>
                                            {STAGE_GLYPH[s]}
                                        </span>
                                        <span style={{ marginLeft: 6 }}>{s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <label className="flabel">priority · transient</label>
                            <div className="row">
                                {[0, 1, 2, 3].map(p => (
                                    <button
                                        key={p}
                                        className={"pbtn" + (task.priority === p ? " on" : "")}
                                        title={["no priority", "low", "medium", "high"][p]}
                                        onClick={() => void eff(Workbook.set_priority({ id, priority: p }))}
                                    >
                                        {p === 0
                                            ? <span className="pnone">–</span>
                                            : <span className="dot" style={{ background: prColor(p) }} />}
                                    </button>
                                ))}
                                <button
                                    className={"chip" + (task.transient ? " on" : "")}
                                    style={{ marginLeft: "auto" }}
                                    onClick={() => void eff(Workbook.set_transient({ id, transient: !task.transient }))}
                                >
                                    ~ transient
                                </button>
                            </div>
                        </div>
                        <div className="field">
                            <label className="flabel">reminder</label>
                            <div className="row">
                                <input
                                    type="datetime-local"
                                    className="txt"
                                    style={{ flex: 1, width: "auto", minWidth: 0 }}
                                    value={remind}
                                    onChange={e => {
                                        const v = e.target.value;
                                        setRemind(v);
                                        saveRemind(() => void eff(Workbook.set_reminder({ id, remind_at: v })));
                                    }}
                                />
                                <button
                                    className="btn"
                                    disabled={remind === ""}
                                    onClick={() => {
                                        setRemind("");
                                        void eff(Workbook.set_reminder({ id, remind_at: "" }));
                                    }}
                                >
                                    clear
                                </button>
                            </div>
                        </div>
                        <div className="field">
                            <label className="flabel">notes</label>
                            <textarea
                                className="txt"
                                rows={3}
                                value={notesDraft}
                                onChange={e => {
                                    const v = e.target.value;
                                    setNotesDraft(v);
                                    saveNotes(() => void eff(Workbook.set_notes({ id, notes: v })));
                                }}
                            />
                        </div>
                        <div className="field">
                            <label className="flabel">project</label>
                            <select
                                className="txt"
                                value={task.project}
                                onChange={e => void eff(Workbook.set_project({ id, project: e.target.value }))}
                            >
                                <option value="">none</option>
                                {task.project !== "" && !projects.includes(task.project) && (
                                    <option value={task.project}>{task.project}</option>
                                )}
                                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label className="flabel">move to</label>
                            <div className="row">
                                <button className="btn" onClick={() => move("staging")}>staging</button>
                                <button className="btn" onClick={() => move(dateStr(new Date()))}>today</button>
                                <button className="btn" onClick={() => move(dateStr(addDays(new Date(), 1)))}>tomorrow</button>
                            </div>
                            <div className="row" style={{ marginTop: 6 }}>
                                <input
                                    className="txt"
                                    style={{ flex: 1, width: "auto" }}
                                    placeholder="other list…"
                                    value={moveName}
                                    onChange={e => setMoveName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && moveName.trim() !== "") {
                                            move(moveName.trim());
                                            setMoveName("");
                                        }
                                    }}
                                />
                                <button
                                    className="btn"
                                    disabled={moveName.trim() === ""}
                                    onClick={() => { move(moveName.trim()); setMoveName(""); }}
                                >
                                    move
                                </button>
                            </div>
                        </div>
                        <div className="row" style={{ marginTop: 14 }}>
                            <button
                                className={"btn danger" + (confirmDel ? " armed" : "")}
                                onClick={() => {
                                    if (confirmDel) {
                                        void run(Workbook.delete_task({ id })).then(() => {
                                            bump();
                                            onClose();
                                        });
                                    } else {
                                        setConfirmDel(true);
                                    }
                                }}
                            >
                                {confirmDel ? "really delete?" : "delete"}
                            </button>
                            {confirmDel && (
                                <button className="btn" onClick={() => setConfirmDel(false)}>keep</button>
                            )}
                            <span style={{ flex: 1 }} />
                            <button className="btn" onClick={onClose}>close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- ProjectsPanel
// @protos Projects{create_project, read_project, list_projects, set_description,
//   set_notes, delete_project} Workbook{project_tasks}
function ProjectsPanel({ version, bump }: { version: number; bump: () => void }) {
    const [names, setNames] = useState<string[]>([]);
    const [newName, setNewName] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const [proj, setProj] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [descDraft, setDescDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");
    const [confirmDel, setConfirmDel] = useState(false);
    const loadedFor = useRef<string | null>(null);
    const saveDesc = useDebouncedAction();
    const saveNotes = useDebouncedAction();

    useEffect(() => {
        let alive = true;
        void (async () => {
            const r = await run(Projects.list_projects(null));
            if (alive && r) setNames(r);
        })();
        return () => { alive = false; };
    }, [version]);

    useEffect(() => {
        if (open === null) {
            setProj(null);
            setTasks([]);
            loadedFor.current = null;
            return;
        }
        let alive = true;
        void (async () => {
            const [p, t] = await Promise.all([
                run(Projects.read_project({ name: open })),
                run(Workbook.project_tasks({ project: open })),
            ]);
            if (!alive) return;
            if (p) {
                setProj(p);
                if (loadedFor.current !== open) {
                    loadedFor.current = open;
                    setDescDraft(p.description);
                    setNotesDraft(p.notes);
                }
            }
            if (t) setTasks(t);
        })();
        return () => { alive = false; };
    }, [open, version]);

    const trimmed = newName.trim();
    const canCreate = trimmed !== "" && !names.includes(trimmed);

    const create = async () => {
        if (!canCreate) return;
        await run(Projects.create_project({ name: trimmed }));
        setNewName("");
        bump();
    };

    const del = async (name: string) => {
        await run(Projects.delete_project({ name }));
        setOpen(null);
        setConfirmDel(false);
        bump();
    };

    return (
        <section className="card area-projects">
            <h2 className="cardtitle">projects</h2>
            <div className="row" style={{ marginBottom: 10 }}>
                <input
                    className="txt"
                    style={{ flex: 1, width: "auto" }}
                    placeholder="new project…"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void create(); }}
                />
                <button className="btn primary" disabled={!canCreate} onClick={() => void create()}>
                    add
                </button>
            </div>
            {names.length === 0 && <div className="dim">no projects yet</div>}
            <div className="projlist">
                {names.map(n => (
                    <div key={n}>
                        <button
                            className={"projname" + (open === n ? " open" : "")}
                            onClick={() => { setOpen(open === n ? null : n); setConfirmDel(false); }}
                        >
                            <span className="projdot" aria-hidden="true" />
                            <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{n}</span>
                            <span className="dim">{open === n ? "▾" : "▸"}</span>
                        </button>
                        {open === n && (
                            <div className="projexp">
                                {proj === null ? (
                                    <div className="dim">loading…</div>
                                ) : (
                                    <>
                                        <div className="field">
                                            <label className="flabel">description</label>
                                            <input
                                                className="txt"
                                                value={descDraft}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    setDescDraft(v);
                                                    saveDesc(() => void run(
                                                        Projects.set_description({ name: n, description: v }),
                                                    ).then(() => bump()));
                                                }}
                                            />
                                        </div>
                                        <div className="field">
                                            <label className="flabel">notes</label>
                                            <textarea
                                                className="txt"
                                                rows={3}
                                                value={notesDraft}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    setNotesDraft(v);
                                                    saveNotes(() => void run(
                                                        Projects.set_notes({ name: n, notes: v }),
                                                    ).then(() => bump()));
                                                }}
                                            />
                                        </div>
                                        <div className="field">
                                            <label className="flabel">tasks</label>
                                            {tasks.length === 0
                                                ? <div className="dim">no tasks labeled {n}</div>
                                                : <div className="tasklist">
                                                    {tasks.map(t => (
                                                        <div
                                                            key={t.id}
                                                            className={"taskrow ro" + (t.transient ? " ghost" : "")}
                                                        >
                                                            <span
                                                                className="glyph"
                                                                title={t.stage}
                                                                style={{ color: stageColor(t.stage) }}
                                                            >
                                                                {STAGE_GLYPH[t.stage]}
                                                            </span>
                                                            <span className={"ttext" + (isStruck(t.stage) ? " strike" : "")}>
                                                                {t.text}
                                                            </span>
                                                        </div>
                                                    ))}
                                                  </div>}
                                        </div>
                                        <div className="row">
                                            <button
                                                className={"btn danger" + (confirmDel ? " armed" : "")}
                                                onClick={() => {
                                                    if (confirmDel) void del(n);
                                                    else setConfirmDel(true);
                                                }}
                                            >
                                                {confirmDel ? "really delete?" : "delete project"}
                                            </button>
                                            {confirmDel && (
                                                <button className="btn" onClick={() => setConfirmDel(false)}>keep</button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------- App
function App() {
    const [version, setVersion] = useState(0);
    const bump = useCallback(() => setVersion(v => v + 1), []);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [dayKey, setDayKey] = useState(() => dateStr(new Date()));
    const [toast, setToast] = useState("");

    useEffect(() => {
        notifyErr = m => setToast(m);
        return () => { notifyErr = () => {}; };
    }, []);

    useEffect(() => {
        if (toast === "") return;
        const t = window.setTimeout(() => setToast(""), 4000);
        return () => window.clearTimeout(t);
    }, [toast]);

    // keep "today"/"yesterday"/"tomorrow" fresh across midnight
    useEffect(() => {
        const t = window.setInterval(() => setDayKey(dateStr(new Date())), 30000);
        return () => window.clearInterval(t);
    }, []);

    const openTask = useCallback((id: number) => setDetailId(id), []);

    return (
        <>
            <style>{css}</style>
            <div className="app">
                <QuickCapture bump={bump} />
                <RemindersBar version={version} bump={bump} />
                <Workboard
                    version={version}
                    dayKey={dayKey}
                    bump={bump}
                    openTask={openTask}
                    hotkeys={detailId === null}
                />
                <ProjectsPanel version={version} bump={bump} />
            </div>
            {detailId !== null && (
                <TaskDetail
                    id={detailId}
                    version={version}
                    bump={bump}
                    onClose={() => setDetailId(null)}
                />
            )}
            {toast !== "" && <div className="toast" role="alert">{toast}</div>}
        </>
    );
}

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
