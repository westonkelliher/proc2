<proc2 — personal task/project workbook. Phone use = quick capture: write a
task down in seconds and trust it won't fall through the cracks. Desktop use =
the workbook stays open all day as the accompaniment to the day's work.>

# proc2
@description: personal task/project workbook — quick capture on phone, day workbook on desktop

## Layout
@module Workbook workbook.ts
@module Projects projects.ts
@persist Workbook data/workbook.json
@persist Projects data/projects.json

- single responsive page. Wide screens (>= 900px): :Workboard fills the main
  area on the left; a right sidebar stacks :QuickCapture, :RemindersBar,
  :ProjectsPanel. Narrow (phone) screens: one column — :QuickCapture pinned
  first, then :RemindersBar, then :Workboard, then :ProjectsPanel — with
  touch-friendly hit targets (44px+).
- :TaskDetail opens as an overlay/modal above everything when a task is opened
  and is the same on both sizes.
- all date math happens on the frontend: "today" / "yesterday" / "tomorrow"
  are local-date list names of the form YYYY-MM-DD (e.g. "2026-07-07");
  timestamps passed to the backend are local "YYYY-MM-DDTHH:MM" strings.
- after any mutation, every component whose data could have changed re-fetches
  from the backend (the backend is the sole source of truth; no client-side
  copies of task state beyond the current render).
- prefer communicating information via shapes and colors over text (e.g.
  priority is a colored dot, stage is a glyph, transient tasks render ghosted).
- ALL colors come from theme.ts, and theme.ts must use exactly this
  OKLAB-optimized palette (surfaces are lightness steps at constant hue/chroma;
  all accents share identical OKLCH lightness+chroma so they carry equal
  perceptual weight):
  bg #0b1015, surface #14191e, surface2 #1d2227, border #31363b,
  text #e3e8ee, textDim #9299a1, onAccent #0b121a,
  accent #6db0f4, ok #6fc082, warn #cda448, err #ed8c84, purple #bc97e8;
  priority ramp: p1 #6db0f4 (lo), p2 #cda448 (md), p3 #ed8c84 (hi).

## :QuickCapture
@protos Workbook{create_task}

- the fastest possible "write it down": a text input, a list picker, and a
  Create button on one compact card.
- the list picker is 4 one-tap chips: staging, today, tomorrow, someday
  (staging preselected) — no typing to pick one; plus a small "other…" option
  revealing a free text input for an arbitrary list name.
- a [transient] toggle chip (off by default): transient marks chores you won't
  care about when reviewing the week (e.g. "wash car").
- an optional reminder datetime input (default empty).
- Create is disabled while the text is empty; on create the input clears and
  keyboard focus returns to it, ready for the next thought.
- pressing Enter in the text input creates the task.

## :RemindersBar
@protos Workbook{due_reminders, set_reminder, set_stage}

- shows tasks whose reminder time has arrived (due_reminders with now = the
  current local minute), most overdue first; hidden entirely when none are due.
- each due task offers one-tap actions: defer 5m, defer 1h, defer to tomorrow
  9am (each computes the new time on the frontend and calls set_reminder), and
  done (set_stage "done").
- re-checks every 30 seconds and after every mutation anywhere in the app.
- visually loud (warn-colored border) — this is the thing that must not fall
  through the cracks.

## :Workboard
@protos Workbook{get_list, set_stage, list_names}

- three list columns, in this order: staging, yesterday, today. Each column is
  titled with its list name and renders its tasks in backend order.
- a fourth "browse" column slot: a dropdown of all list names (list_names)
  plus a date input lets any other list be viewed there; empty by default.
- the first task in today's column whose stage is "todo" or "in-progress" is
  visually highlighted (accent border) — it is what I should be working on now.
- each task row shows: a stage glyph (todo ○, in-progress ◐, done ●, cancelled
  ✕, tabled ◻ — colored from theme: done ok, cancelled err, tabled textDim,
  in-progress accent), the task text, a priority dot when priority > 0 (p1/p2/p3
  color), and a purple project tag chip when the task has a project.
- transient tasks render ghosted (dimmed).
- clicking the stage glyph cycles todo → in-progress → done → todo; clicking
  the task text opens :TaskDetail for it.
- done and cancelled tasks show struck-through text.
- desktop hotkeys (ignored while typing in an input): j/k move a selection
  highlight down/up through the visible tasks of all columns in order, d marks
  the selected task done (set_stage), enter opens :TaskDetail for it.

## :TaskDetail
@protos Workbook{read_task, set_text, set_stage, set_priority, set_transient, set_project, set_notes, set_reminder, move_task, delete_task} Projects{list_projects}

- modal editor for one task: editable text, stage picker (all five stages),
  priority picker (none/lo/md/hi shown as the priority colors), transient
  toggle, reminder datetime (clearable), notes textarea, and a project picker
  (dropdown of existing project names from list_projects, plus "none").
- move controls: send to staging / today / tomorrow / a typed list name
  (move_task to the end of the target list, index 9999).
- delete button (with an "are you sure" step) and a close button; esc closes.
- every edit control saves immediately on change (no separate save button).

## :ProjectsPanel
@protos Projects{create_project, read_project, list_projects, set_description, set_notes, delete_project} Workbook{project_tasks}

- lists all project names; an inline input + button creates a new project
  (button disabled while empty; duplicate names are prevented by disabling the
  button when the typed name already exists).
- clicking a project expands it in place: its description and notes as
  immediately-saving text fields, the tasks labeled with it (project_tasks,
  read-only rows with stage glyph + text), and a delete button (with an
  "are you sure" step; tasks keep their label).
