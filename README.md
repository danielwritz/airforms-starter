# Airforms Starter

`airforms-starter` is a minimal demo app that shows how to integrate:

- `@airforms/orchestrator` over HTTP (`POST /turn`)
- `@airforms/renderer-react` for rendering `ui_frame`
- `@airforms/ui-schema` for shared turn/message typing

It is both:

1. A runnable demo
2. A reference implementation document for developers

## Project Plan

This starter uses a single-page React chat UI.

Flow:

1. User sends text in the starter chat.
2. Starter posts that as `llm_result` to orchestrator (representing client-side LLM output handoff).
3. Orchestrator returns assistant messages and optional `ui_frame`.
4. App renders assistant messages in transcript and embeds `ui_frame` inline inside the assistant bubble.
5. Renderer submit triggers `ui_submit` turn back to orchestrator.
6. App updates transcript and repeats.

Conversation scope is one `conversationId` per browser session (stored in `sessionStorage`).

## Runtime Requirements

The orchestrator now calls OpenAI Responses API for dynamic turn generation.

Set this before starting `airforms-orchestrator`:

```bash
OPENAI_API_KEY=your_key_here
```

Optional model override:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

If `OPENAI_API_KEY` is missing, orchestrator requests return an error.

## Integration Model

Starter demonstrates a host-chat integration where the host can pass client-LLM output to the orchestrator (`llm_result`).

Supported turn message types now include:

- `user_text`
- `llm_result`
- `ui_submit`

## Progress Tracking

- [x] Plan finalized for starter architecture and flow
- [x] Starter package scaffolded (React + Vite + TypeScript)
- [x] Orchestrator API client implemented (`POST /turn`)
- [x] Minimal chat UI implemented
- [x] Renderer integration implemented (`ChatUIRenderer`)
- [x] Tests added (unit + integration)
- [ ] Optional live smoke test command wiring
- [ ] Remote publish mode docs (post-local demo)

## Local Setup

From each package folder:

1. Build schema package

```bash
cd ../airforms-ui-schema
npm install
npm run build
```

2. Build renderer package

```bash
cd ../airforms-renderer
npm install
npm run build
```

3. Start orchestrator

```bash
cd ../airforms-orchestrator
npm install
npm run dev
```

4. Run starter app

```bash
cd ../airforms-starter
npm install
npm run dev
```

Default orchestrator URL: `http://localhost:3000`

Override with env var:

```bash
VITE_ORCHESTRATOR_URL=http://localhost:3000
```

## Scripts

- `npm run dev` – run starter app
- `npm run build` – type-check + production build
- `npm run test` – run tests once
- `npm run test:watch` – watch mode tests

## Repository Initialization

Initialize this folder as its own git repository:

```bash
git init
git add .
git commit -m "Initialize airforms-starter demo"
```

Then add your remote and push:

```bash
git remote add origin <your-remote-url>
git branch -M main
git push -u origin main
```
