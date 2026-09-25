# Dashboard Metrics

Source: workbook tab "Dashboard". Required Home Dashboard metrics,
definitions, formulas, filters, date ranges, display types, source
records. **This is the single shared Home Dashboard — do not build a
separate "My Work" dashboard.** All employees see this dashboard;
sensitive financial detail may be limited by role per
`10-system-architecture-m365.md`.

Each metric: **Metric ID | Widget Name | Definition | Data Source | Default
Date Range | Filters | Display Type | Notes**

- **MET-001 New Opportunities** — Count of opportunities created during
  the selected period. Source: Opportunities (created date, status).
  Default range: current month. Filters: owner, lead source, opportunity
  type. Display: number card + trend. Note: use opportunity **creation**
  date, not estimate date.

- **MET-002 Open Pipeline Value** — Sum of the current estimate total for
  all opportunities that are still open (exclude Won, Lost, Cancelled,
  Archived). Source: Opportunities status + Estimates current-revision
  total. Default range: all active. Filters: owner, stage, lead source.
  Display: summary number + stage breakdown. Note: only use the **latest
  active estimate revision** per opportunity.

- **MET-003 Estimates Sent This Month** — Count and total dollar value of
  estimates with a sent date in the current calendar month. Source:
  Estimates (sent date, status, total). Default range: current month.
  Filters: estimator, estimate type. Display: number card + dollar total.
  Note: use sent estimates only, including later revisions if separately
  sent.

- **MET-004 Estimates Sent Last 30 Days** — Count/total for estimates sent
  from today minus 29 days through today. Rolling 30-day window (not
  calendar month).

- **MET-005 Estimates Sent Last 90 Days** — Same pattern, rolling 90-day
  window (not calendar quarter).

- **MET-006 Estimates Sent This Calendar Year** — Sent date from Jan 1
  through Dec 31 of the selected/current year. Shows the full selected
  year even after it ends.

- **MET-007 Estimates Sent Year to Date** — Sent date from Jan 1 through
  today of the current year. Different from full calendar-year reporting
  once prior years are selected.

- **MET-008 Estimates Awaiting Approval to Send** — Count of estimates in
  an internal-review pending-approval status that have not been marked
  sent. Source: Estimates (status, approval status, sent date). Default:
  all active. Filters: estimator, approver, estimate type. Display: number
  card + detail list. Requires clear statuses (Draft, Ready for Review,
  Approved to Send, Sent).

- **MET-009 Win Rate** — Number of opportunities marked Won ÷ (Won + Lost),
  using close date within the selected period. Default: year to date.
  Filters: estimator, owner, estimate type. Display: percentage card +
  trend. Exclude open opportunities and any record without a final
  outcome.

- **MET-010 Win/Loss Reasons** — Count and dollar value of Won and Lost
  opportunities grouped by recorded close reason. Source: Opportunities
  (outcome status, close reason, close date, estimate total). Default:
  year to date. Display: bar chart + detail list. Use a required
  controlled list of reasons with optional notes.

- **MET-011 Revenue Year to Date** — Sum of customer payments received
  with payment date from Jan 1 through today. Source: Customer Payments
  (amount, payment date, status, project). Filters: project, customer,
  project type. Display: number card + monthly trend. Use payments
  **actually received**, not total estimates sent or invoice amounts.

- **MET-012 Profit Year to Date** — Sum of project revenue received YTD
  minus approved/paid actual project expenses YTD. Show both dollars and
  percentage. Source: Customer Payments (amount, payment date) + Expenses
  (amount, approval/payment status, expense date). Filters: project,
  category, project type. **Define whether profit uses approved expenses
  or paid expenses; do not call this the same measure as estimate margin
  or "actual profit."**

- **MET-013 Average Material Sale Value (Last 12 Months)** — Sum of
  accepted material-only sale totals ÷ number of accepted material-only
  sales closed in the last 12 months. Source: Estimates/Projects (type,
  accepted total, won/close date). Filters: estimator, customer type.
  Requires a defined material-only-sale type field.

- **MET-014 Average Project Value (Last 12 Months)** — Sum of accepted
  installation/project contract values ÷ number of accepted projects
  closed or won in the last 12 months. Exclude material-only sales;
  include approved change orders if part of project contract value.
  Source: Projects/accepted estimates (type, contract value, won date).
  Filters: estimator, project type.

## Implementation Notes

- Home Dashboard is the **first and only** shared dashboard for v1 — do
  not build a separate personal/"My Work" view.
- Every metric must clearly label its date range in the UI (rolling vs.
  calendar) since several metrics look similar but use different windows
  (MET-004/005 rolling vs. MET-003/006 calendar vs. MET-007 YTD).
- MET-012's ambiguity (approved vs. paid expenses) should be treated as an
  Open Decision if not resolved before implementation — do not silently
  pick one definition without flagging it.
