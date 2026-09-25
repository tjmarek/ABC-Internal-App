# Austin Block Company — Internal Operations App

## What This Is

A single, connected internal web app for Austin Block Company (Central Texas
limestone retaining-wall contractor). Covers: opportunity → estimate →
takeoff → material/labor calculations → customer proposal → internal
approval → sent estimate → won project → project financials → closeout →
historical reporting.

**Full requirements live in `docs/`.** This file is intentionally short.
Read the relevant doc(s) before building the matching feature — do not
guess at business rules, formulas, statuses, or financial definitions.

## Non-Negotiable Tech Constraints

- Plain HTML, CSS, and vanilla JavaScript only.
- No React, Next.js, TypeScript, build tools, bundlers, or package managers.
- Browser `localStorage` is the v1 data layer (must run by opening
  `index.html` directly, and deploy to Netlify with no build command).
- No paid APIs. No frameworks. No external UI libraries.
- File structure (only add files if truly necessary):
  `index.html`, `styles.css`, `app.js`, `data.js`, `calculations.js`,
  `storage.js`, `ui.js`, `README.md`.

## Golden Rule: Flag, Don't Guess

If a business rule, formula, status, approval, permission, or integration
detail is missing, unclear, or conflicting in `docs/`, do **not** invent
it. Add it to the in-app **Open Decisions** register (see
`docs/12-open-decisions.md` for the starting list and required fields) and
make the affected feature behave safely while unresolved (e.g., require
manual entry with a reason instead of auto-calculating).

## Precedence Order When Docs Conflict

1. `docs/01-readme-and-business-rules.md`
2. `docs/10-system-architecture-m365.md`
3. `docs/11-profit-goals.md` and `docs/09-expense-payment-tracking.md` (financial rules)
4. `docs/04-material-calculation-rules.md` and `docs/05-labor-calculation-rules.md`
5. `docs/03-takeoff-inputs.md`, `docs/06-price-catalog.md`, `docs/07-estimate-cost-categories.md`
6. `docs/02-estimator-workflow.md` (sequence and status transitions)
7. `docs/08-dashboard-metrics.md` (reporting/display)

## Core Connected Workflow (must never be broken apart into disconnected tools)

Opportunity → Estimate (with revisions/snapshots) → Takeoff Segments →
Material/Labor Calculations → Internal Cost Rows (linked to a proposal
line item AND a cost category) → Proposal Preview (no internal costs
exposed) → Internal Review/Approval → Sent + Follow-Up (10-day/28-day) →
Won → Project (Original Project Budget locked, immutable) → Expenses /
Subcontractor Costs / ABC Labor / Change Orders / Invoices / Payments →
Budget-vs-Actual → Closeout → Historical Search.

## Critical Rules to Never Violate

- Catalog price changes never retroactively alter a saved/sent/approved/
  accepted estimate.
- Original Project Budget is set once at Won and is never editable again.
- Invoices are not payments. Only Approved costs count toward Actual
  Project Cost. Paid status is tracked separately from approval status.
- Use only the controlled status lists in
  `docs/01-readme-and-business-rules.md` — never free-text statuses.
- Customer-facing proposal previews must never show internal costs, cost
  categories, reserves, markup, margins, or internal notes.
- Markup and margin are distinct and must be labeled separately.

## Working Process for This Build

1. Read `docs/01-readme-and-business-rules.md` fully before writing code.
2. Use Plan Mode for anything touching more than ~3 files.
3. Build and verify one module at a time (see the 30-module list in
   `docs/01-readme-and-business-rules.md` §"App Modules"). Confirm each
   module runs with no console errors before moving to the next.
4. Never paste a full multi-hundred-line file through chat as the only
   copy — write directly to disk, since this is a coding agent with file
   access, not a chat transcript.
5. When a docs/ file informs a decision, note which file/section you used
   in your commit message or response so requirements stay traceable.
