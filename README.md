# Prep Studio — Ultimate Exam Practice

A private, offline-first exam-preparation suite built for IBPS PO preparation and flexible enough for any objective or descriptive examination. It combines a modern application workspace with a TCS-style exam window, detailed telemetry, deterministic offline coaching and optional AI assistance.

## Major capabilities

### Universal test engine

- Objective MCQ and descriptive writing questions
- Any subject, topic or section name
- Reasoning, Quantitative Aptitude, English, General Awareness and Descriptive starter content
- Custom tests that combine subjects and question types
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
- Deterministic offline coaching that works without an AI connection
- Genuine-attempt versus UI-test flagging
- Deletable history and complete backup/restore

### AI Studio

Supported connection modes:

- Google Gemini REST API
- OpenAI-compatible chat-completions endpoints
- Trusted local OpenAI-compatible endpoints without authentication

Configure the provider, HTTPS base URL, model name and authentication mode in AI Studio. API keys are held only in memory for the current browser tab and are never written to storage, backups or the repository.

AI Studio can:

- Test a model connection
- Convert PDF, image, text, Markdown or JSON papers into staged question JSON
- Generate original objective or descriptive practice questions
- Validate and review staged questions before importing them
- Analyse completed attempts and timing
- Grade descriptive responses against their rubrics and maximum marks
- Save AI feedback with an attempt

Browser security still applies. A custom endpoint must permit browser CORS. Gemini is the best built-in option for direct PDF/image conversion. OpenAI-compatible PDF upload formats are not standardized, so use text extraction or an image-capable endpoint when required.

## Fastest way to use it

1. Download `standalone.html` from this private repository.
2. Open it in a current version of Chrome, Edge or Firefox.
3. Use **Tests** for a ready-made mock or create your own.
4. Use **Question Bank** to add, edit, select, delete or import questions.
5. Use **AI Studio** only when you want paper conversion, generation or deeper analysis.
6. Export a full backup regularly.

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
- `src/ai.js` — Gemini and OpenAI-compatible adapters
- `src/storage.js` — offline persistence and backups
- `tests/` — automated regression tests
- `ci-workflow.example.yml` — optional private CI template; copy it to `.github/workflows/ci.yml` when workflow-write permission is available

## Disclaimer

This independent practice tool is not affiliated with or endorsed by IBPS, SBI, TCS or TCS iON. Exam-interface conventions are reproduced only to simulate navigation and time pressure.
