# Prep Studio — Ultimate Exam Practice

A private, offline-first exam-preparation suite built for IBPS PO preparation and flexible enough for any objective or descriptive examination. It combines a modern application workspace with a TCS-style exam window, detailed telemetry, deterministic offline coaching and optional AI assistance.

## Major capabilities

### Universal test engine

- Objective MCQ and descriptive writing questions
- User-created subject compartments and chapters/topics
- Any subject, topic or section name, including JSON-imported subjects and chapters
- Reasoning, Quantitative Aptitude, English, General Awareness and Descriptive starter content
- Subject-first Practice library with separate Reasoning, Quant, English, General Awareness and custom subject workspaces
- All, Prelims, Mains and Practice filters with completed/untouched test status and latest results
- Simple custom mock builder with chapter-based random selection or exact manual question selection
- User-controlled test name, question count, duration and question shuffling
- Shared DI, puzzle and passage sets that stay together when question order is shuffled
- AI Tutor mock creation from the local catalog when explicitly requested
- Question-specific marks and negative marks
- Configurable duration and question count
- Auto-submit, resumable unfinished tests and standard question-palette states
- Save & Next, Mark for Review & Next, Clear Response and section navigation

### Performance system

- Active time for every question, accumulated across revisits
- Visits, answer changes, skipped items and marked-for-review status
- Objective scoring using each question's marks and negative marks
- Descriptive responses held as Pending Review until manually or AI graded
- Subject and topic breakdowns
- Selectable subject trend charts for marks, correct, wrong, skipped and accuracy, plus an all-graphs view and separate timing averages
- Automatic mistake notebook with mastery notes and targeted retry tests
- Read-only exam-style answer review with submitted answers, correct keys, explanations and per-question time
- Persistent per-mock AI coaching inside review: the full attempt is sent once, later questions use compact saved context, and all analyses remain in one Tutor-history conversation
- Color-coded review palette for correct, incorrect, skipped and pending questions
- Deterministic offline coaching that works without an AI connection
- Genuine-attempt versus UI-test flagging
- Deletable history and complete backup/restore

### AI Tutor and Import & AI

Connect any AI platform that exposes one of these browser-accessible API formats:

- Chat Completions compatible
- Messages compatible
- Generate Content compatible
- Trusted local endpoints without authentication

No provider or model catalog is hard-coded. Enter the platform's endpoint and exact model ID, then choose bearer-token, custom-header or no authentication. An optional model-list endpoint can discover models when the platform exposes one.

Save multiple connection profiles at the same time. Each profile can hold multiple discovered or manually entered model IDs. Keys can remain session-only or, when the user opts in, be remembered in this app's origin-local browser storage. Remembered keys are never included in app backups. The configured platform must permit browser CORS.

The dedicated **AI Tutor** is an exam-only teacher chat. It stores multiple named conversations locally, includes a focused fullscreen mode, renders Markdown tables and can use an attached question or completed attempt to explain concepts, teach faster methods, identify traps, improve question selection, review writing and prescribe measurable practice. Connection and model selectors inside the chat let you switch among every configured model without leaving the conversation.

**Import & AI** can:

- Test a model connection
- Convert PDF, image, text, Markdown or JSON papers, import the questions and automatically create a runnable test
- Generate original objective or descriptive practice questions
- Validate and review staged questions before importing them
- Analyse completed attempts and timing
- Grade descriptive responses against their rubrics and maximum marks
- Save AI feedback with an attempt

Browser security still applies. The configured endpoint must permit browser CORS. Direct PDF and image support varies by API format and platform; use text extraction or an image-capable endpoint when the selected platform does not accept that file type.

## Fastest way to use it

1. Download `standalone.html` from this private repository.
2. Open it in a current version of Chrome, Edge or Firefox.
3. Use **Practice** for a ready-made mock or create your own.
4. Use **Questions** to add, edit, select, delete or import questions.
5. Use **AI Tutor** for explanations, faster techniques, time strategy and personalised guidance.
6. Use **Import & AI** to convert a paper directly into a runnable test or generate new practice.
7. Open **Guide** for in-app instructions, templates, import steps and AI connection help.
8. Export a full backup regularly; backups include AI Tutor chat history but never API keys.

The standalone file contains the full interface, starter bank and application logic. No installation, server or AI subscription is required for offline practice.

## Source version and PWA

Run the source version through a local web server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. After its first successful load, the service worker caches the app for offline use. Browsers that support installation can install it as a desktop-style PWA.

For a Windows-like experience today:

- open the hosted/local source version in Edge or Chrome and choose **Install this site as an app**, or
- download and open `standalone.html` directly.

A future signed `.exe` can wrap the same source with Tauri. The current architecture deliberately keeps that packaging step separate from the exam and data logic.

## Verify and rebuild

Requires Node.js 20 or newer:

```bash
npm run verify
```

This validates JavaScript syntax, runs scoring/import/storage/AI-adapter tests and rebuilds `standalone.html`.

## Question-bank schema

See `question-bank-template.json`. Key rules:

- `type`: `mcq` or `descriptive`
- `answer`: zero-based option index for MCQs; `null` for descriptive items
- `marks` and `negativeMarks`: numeric values per question
- `section`: controls the tab shown in exam mode
- descriptive questions may include `modelAnswer`, `wordLimit` and `rubric`
- `table` (optional): unsolved question data rendered as an HTML table — `{ "role": "prompt", "caption": "...", "headers": ["col1", "col2"], "rows": [["a", "b"]] }`. Never place final arrangements, decoded tables or other solution material in question media.
- `image` (optional): diagram or chart rendered in the exam — `{ "src": "https://… or data:image/…", "alt": "description", "caption": "optional" }`

## Mock-test import (no AI needed)

Upload a JSON file with a `title` and `questions` array to create a runnable test instantly. The questions are merged into your bank and a test card appears on the Practice page.

```json
{
  "test": {
    "title": "Quant DI Mock 1",
    "description": "Data interpretation practice",
    "durationMinutes": 20,
    "shuffle": true,
    "questions": [ { "id": "Q1", "type": "mcq", ... } ]
  }
}
```

A minimal format without the `test` wrapper also works — just include `title` and `questions` at the top level. Download the template from the Practice page for a complete example.

Imported questions merge by ID; an existing ID is replaced. Always verify AI-generated or extracted answer keys before serious practice.

## Data, privacy and security

- Bank, tests, unfinished tests, history, grades and AI notes are stored in browser local storage.
- The latest 75 attempts are retained.
- A backup includes app data but never an API key.
- An AI request sends only the selected paper or attempt to the configured endpoint.
- Do not commit API keys or paste them into source files.
- Keep the repository and backups private if they contain licensed or subscription-derived questions.
- Clearing browser data can erase local history; export backups regularly.

## Repository layout

- `standalone.html` — single-file finished application
- `index.html` / `styles.css` — source application shell and modern UI
- `src/app.js` — navigation, editors, exam mode, history and AI Studio
- `src/questions.js` — starter bank and universal import validation
- `src/analytics.js` — objective/descriptive scoring and coaching packets
- `src/ai.js` — configurable Chat Completions, Messages and Generate Content adapters
- `src/markdown.js` — safe rich-text and table rendering for AI Tutor
- `src/review.js` — completed-attempt answer states and timing display helpers
- `src/review-ai.js` — question-focused AI coaching prompts and chat identity
- `src/mock-builder.js` — simple chapter-based and manual mock creation validation
- `src/progress.js` — subject trends and mistake-notebook calculations
- `src/practice-library.js` — subject grouping, level filters and completion status
- `src/storage.js` — offline persistence and backups
- `tests/` — automated regression tests
- `ci-workflow.example.yml` — optional private CI template; copy it to `.github/workflows/ci.yml` when workflow-write permission is available

## Disclaimer

This independent practice tool is not affiliated with or endorsed by IBPS, SBI, TCS or TCS iON. Exam-interface conventions are reproduced only to simulate navigation and time pressure.
