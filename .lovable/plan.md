# Advent One Integration Plan (Precision Console frontend ↔ FastAPI backend)

## Goal

Wire the existing polished "Precision Console" mockup to the Advent One FastAPI backend in the uploaded zip while preserving the mock-only demo path. The frontend supports `mock | live | auto` data sources and must never fabricate business facts, line items, missing-documentation conclusions, or workflow judgments inside adapters.

Product name in all user-facing UI is **Advent One**. Replace any remaining "RollupOS" copy. "Precision Console" stays as the interface/design concept label only.

## Backend (runs separately, not bundled)

```
uv run uvicorn src.advent_one.main:app --port 8000
```

The frontend talks to it over HTTP. Endpoints used:

- `GET /health`, `GET /state`, `GET /facts`, `GET /graph`
- `POST /trigger`, `POST /extract` (multipart file + `?schema=`), `POST /synthesize`

## 1. Config + data-source switch

- Env vars
  - `VITE_ADVENT_ONE_URL` — default `http://localhost:8000`
  - `VITE_DATA_SOURCE` — `mock | live | auto`, default `auto`
- Behavior
  - `mock`: always use fixtures in `src/mocks/*`. No network calls.
  - `live`: backend only. On any failure, render an inline error with a one-click **"Switch to mock demo"** action.
  - `auto`: probe `/health` once on app load; use live if reachable, otherwise mock.
- Visible runtime badge in the header (replaces the static "Local only / AMD Ryzen AI PC" pills) with one of:
  - `Mock demo`
  - `Live backend`
  - `Auto: live`
  - `Auto: mock fallback`
- The badge is also a control: clicking it opens a small popover with a manual **"Switch to mock demo"** / **"Try live again"** toggle. The UI must never be stranded on a broken backend during the demo, even in forced `live` mode.

## 2. API client + TanStack Query wiring

- New `src/lib/advent-one/client.ts` — thin `fetch` wrappers for every endpoint above. Uses `VITE_ADVENT_ONE_URL`. No auth.
- New `src/lib/advent-one/types.ts` — TS mirrors of `ExtractedFact`, `WorkflowGraph`, `IngestionState`, `TriggerEvent` from `src/advent_one/schemas.py`.
- TanStack Query keys: `['health']`, `['state']`, `['facts']`, `['graph']`, `['fact', id]`.
- Mutations
  - `POST /extract` success → optional optimistic insert into `['facts']`, then invalidate `['facts']` and `['state']`.
  - `POST /synthesize` success → invalidate `['graph']`.
  - `POST /trigger` success → invalidate `['state']`.
- Query hooks (`useEvidenceList`, `useEvidenceById`, `useWorkflow`, `useIngestionState`, `useHealth`) return the same shapes whether source is `mock` or `live`, so existing components don't change.

## 3. State mapping (no lying about PROCESSING)

Backend `IngestionState.status`: `SLEEP | AWAKE | PROCESSING | READY`.

Mapping:

| Backend | UI |
|---|---|
| `SLEEP` | `SLEEP` |
| `AWAKE` | `AWAKE` |
| `PROCESSING` | dedicated `PROCESSING` / `EXTRACTING` state with spinner overlay — **never** mapped to `CAPTURE_READY` |
| `READY` | `CAPTURE_READY` |

The existing 3-cell pill row on `/capture` is extended to 4 cells (or the active cell shows an animated spinner when status is `PROCESSING`). The transition demo button only walks through real backend-emitted states when live; in mock mode it keeps the existing scripted cycle.

## 4. Adapter rules (literal, grounded, no fabrication)

Adapters reshape backend data only. They MUST NOT invent:

- `line_items`, `unreadable_text`, `missing_documentation_signals`
- recommendations, bottlenecks, founder dependency, ROI, 90-day roadmap, acquisition risk

Missing backend fields stay empty/optional/hidden — they don't get derived.

### 4a. Fact adapter — `adaptFactToEvidence(fact, imageBlobUrl)`

Backend `ExtractedFact { document_type, actors, actions, date, amount, counterparties, summary_jp, id, captured_at }` → existing `EvidenceRecord`.

`extraction.fields` (rendered as label/value rows — join lists, don't stuff arrays into string slots):

| Field key | Source | Rendering |
|---|---|---|
| `document_type` | `fact.document_type` | string |
| `date` | `fact.date` | string, hidden if null |
| `amount` | `fact.amount` | string, hidden if null |
| `actors` | `fact.actors.join("、")` | joined string; or render as a multi-value row of chips |
| `counterparties` | `fact.counterparties.join("、")` | joined string; or multi-value row |
| `business_action` | `fact.actions` | string |
| `summary_jp` | `fact.summary_jp` | string |

- `extraction.line_items = []` — always, unless the backend later returns itemized data. Do not split `actions`.
- `extraction.unreadable_text = []` — always, unless the backend later returns regions.
- `image` — `URL.createObjectURL(uploadedFile)` kept in a session-scoped `Map<factId, string>` so the evidence detail page can render the captured image (backend does not serve it back).
- `telemetry.latency_sec` — `latency_ms` from the `/extract` response, displayed as `"backend-reported"`.

### 4b. Workflow adapter — `adaptGraphToWorkflow(graph)`

Backend `WorkflowGraph` → existing `WorkflowMock`.

| UI field | Source |
|---|---|
| `workflow_nodes[].label` | `label_en || label_jp` |
| `workflow_nodes[].sub` | `label_jp` |
| `workflow_nodes[].evidenceIds` | `source_fact_ids` |
| `workflow_nodes[].manualPaperSignals` | `observed_signals` |
| `repeated_manual_paper_signals` | counted from `observed_manual_or_paper_signals` |
| `workflow_observations_jp/en` | passed through verbatim into the side panel |

- `missing_documentation_signals` — **not** derived from `requires_human_review`. If the backend doesn't emit them explicitly, the section is hidden. Nodes where `requires_human_review === true` get a neutral **"Requires human review"** badge instead.

## 5. Workflow page behavior (manual synthesis only)

No automatic `POST /synthesize` on `/workflow` mount.

On mount:
1. `GET /facts`
2. `GET /graph`

Then:
- If `graph` is null and `facts.length >= 3` → show a **"Generate workflow"** primary button.
- If `graph` is null and `facts.length < 3` → show an empty state: "Capture at least 3 evidence records to aggregate."
- `POST /synthesize` runs only when the user clicks **"Generate workflow"**, or explicitly promotes the selected evidence set to Stage 2.
- Add a **"Re-synthesize"** secondary button once a graph exists.

This avoids hanging on slow/unavailable JP model calls during the demo.

## 6. Capture flow (real upload path)

On the existing **Run extraction** action in `/capture`:

1. `POST /trigger` (state goes `AWAKE`).
2. Open file picker or webcam capture (manual upload is the always-available primary path; trigger is the optional sensor layer per spec).
3. `POST /extract` with the image bytes and the currently-selected schema (`?schema=`). State transitions to `PROCESSING` with spinner.
4. On success: store the image's object URL in the session map, invalidate `['facts']` and `['state']`, navigate to `/evidence/$id` using the returned `fact.id`.

Schema picker on the capture screen:

- Default `sakura_logistics`
- Secondary `government_letter`

Error handling (via `StageBoundaryBanner`):

- `400` — show backend `detail` verbatim.
- `503` — "Backend / model server unavailable. Mock demo still available." plus the mock-switch button.
- Network failure: in `auto` switch silently to mock fallback (and update the badge); in forced `live` keep the error and offer the manual mock switch.

## 7. Telemetry strip

- Live mode: show `latency_ms` from the most recent `/extract` or `/synthesize` response, labelled **"backend-reported latency"**.
- Mock mode: keep existing `"sample"` labels — do not display fake benchmark-like numbers as if real.
- Show **"Weave trace"** / **"measured via W&B Weave"** only when the backend response actually includes a trace URL or explicit Weave metadata. Otherwise omit.

## 8. Runtime details drawer

- Mock mode: unchanged static paths.
- Live mode: append a live `/health` panel showing `vl_server`, `jp_server`, `ingestion_status`, `captured_count`, refreshed every 5s via TanStack Query `refetchInterval`.
- Drawer caption switches between **"Mock — static paths"** and **"Live — connected to {VITE_ADVENT_ONE_URL}"**.

## 9. Branding sweep

- Replace `RollupOS` with `Advent One` in `app-shell.tsx` header, `__root.tsx` meta titles, route-level `head()` titles, and any docstrings/copy. "Precision Console" stays as the optional sub-label of the interface concept.

## 10. What we are NOT doing

- No backend code changes (the zip's Python stays as-is).
- No ESP32 firmware work.
- No new business inference, ROI/risk/roadmap UI, or acquisition-risk language.
- No fabricated `line_items`, `unreadable_text`, or `missing_documentation_signals`.
- Not bundling the Python backend into the TanStack project. The Cloudflare Worker runtime cannot shell out to `llama-mtmd-cli` / `llama-server`; the backend stays as a separately-launched local service.
- Not deleting any existing mock fixtures or polished mock routes. The mock-only demo must keep working with zero backend setup.

## Files to add / touch

New:
- `src/lib/advent-one/client.ts` — fetch wrappers
- `src/lib/advent-one/types.ts` — backend TS types
- `src/lib/advent-one/adapters.ts` — `adaptFactToEvidence`, `adaptGraphToWorkflow`, `adaptIngestionState`
- `src/lib/advent-one/source.tsx` — data-source context + `useDataSource()` + badge popover
- `src/lib/advent-one/queries.ts` — query options + mutation hooks
- `src/components/data-source-badge.tsx` — header badge/control
- `src/lib/advent-one/image-store.ts` — session `Map<factId, blobUrl>`

Touched:
- `src/components/app-shell.tsx` — branding to Advent One, badge in header
- `src/components/runtime-details-drawer.tsx` — live `/health` panel
- `src/components/telemetry-strip.tsx` — latency from backend response when live
- `src/components/stage-banner.tsx` — error + mock-switch action
- `src/routes/__root.tsx` — meta title to Advent One
- `src/routes/index.tsx`, `src/routes/capture.tsx`, `src/routes/evidence.tsx`, `src/routes/evidence.$id.tsx`, `src/routes/workflow.tsx` — swap direct mock imports for the query hooks; capture flow uses real upload + extract; workflow uses manual "Generate workflow" button

Untouched:
- All `src/mocks/*` fixtures
- The Precision Console visual design tokens in `src/styles.css`

## Dev runbook (to put in README after build)

1. Mock demo (zero setup): `bun dev`. Source badge shows **Auto: mock fallback**.
2. Live mode: start the Python backend with `FRONTEND_ORIGIN=http://localhost:5173 uv run uvicorn src.advent_one.main:app --port 8000`, then `bun dev`. Badge flips to **Auto: live**.
3. Force one or the other: `VITE_DATA_SOURCE=mock bun dev` or `VITE_DATA_SOURCE=live bun dev`.