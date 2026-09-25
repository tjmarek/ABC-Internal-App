# README & Business Rules (Governing Document — Read First)

Source: workbook tab "README". This is the top-precedence document.

## 1. Purpose

Austin Block Company is a Central Texas specialty limestone retaining-wall
contractor and material supplier. The app must improve the company's
ability to create, price, approve, send, find, update, and report on
opportunities, takeoffs, estimates, projects, expenses, payments, labor,
profitability, and historical performance.

Goal: one complete, connected internal web app, one go-live. Reduce
duplicate entry, preserve historical records, improve estimating
consistency, make project financial status visible, and improve future
pricing through estimated-versus-actual learning.

## 2. Instruction to the App-Building AI

Treat every doc in `docs/` as a requirement source. Do not invent, silently
change, or substitute: business rules, financial definitions, fields,
formulas, units, pricing assumptions, workflow statuses, approval
requirements, permissions, M365 storage locations, or dashboard metrics.

When anything is missing, unclear, inconsistent, conflicting, or
technically impractical, flag it as an Open Decision (see
`12-open-decisions.md`) before building that behavior. See `CLAUDE.md` for
the doc precedence order.

You may improve usability, validation, navigation, responsiveness, and
error prevention only when doing so does not change a defined business
rule.

## 3. System Goal — Continuous Workflow

Lead/opportunity → documents and customer/project details → takeoff →
material and labor calculations → internal cost build-up → customer-facing
proposal → review and approval → sent estimate and follow-up → won project
and original budget → expenses, labor, subcontractors, change orders,
invoices, and payments → project profitability, dashboard reporting,
historical reference, and future pricing improvement.

## 4. Primary User Experience

- Employees do normal work in the web app; they should not need to work
  directly in SharePoint Lists or document libraries day to day.
- Clear, fast, desktop-friendly, mobile-responsive where practical, easy
  to search.
- Plain-language labels, prevent avoidable data-entry errors, make
  required next actions visible.
- Light mode, dark mode, and device-default appearance settings **per
  individual authenticated user**. Appearance settings are personal and
  saved to the user profile — one user's choice must never affect another
  user's.
- Both modes must preserve readable text, accessible contrast,
  understandable status colors, usable charts, and legible controls.

## 5. Core Design Principles

- One complete connected app, not separate unrelated tools.
- Opportunity, estimate, project, expense, payment, and file are linked
  records, not repeated/copied information.
- Estimators create flexible customer-facing proposal line items — **do
  not** force proposals into a fixed scope catalog.
- Every detailed internal estimate cost must be assigned to **both**:
  1. A customer-facing proposal line item.
  2. A standard internal Estimate Cost Category.
- Must support material-only sales and installation/project estimates.
- Must support residential and commercial work.
- Must support multiple takeoff segments/walls/material-sale sections
  within one estimate.
- Must support controlled manual overrides with a required reason and
  preserved history.
- Records searchable, filterable, auditable, and editable only when
  allowed by status and role.
- Do not rebuild mature M365, Outlook, Teams, To Do, SharePoint, or
  QuickBooks functionality unnecessarily.

## 6. Core Business Flow (15 steps)

1. Create or open a customer opportunity.
2. Add customer, project, contact, project-address, lead-source, owner,
   and supporting-file information.
3. Complete one or more takeoff segments.
4. Select wall/design details, site conditions, equipment, materials, and
   other required inputs.
5. Apply the documented material and labor calculation rules.
6. Create customer-facing proposal line items and assign detailed costs to
   each proposal line item and cost category.
7. Apply current Price Catalog data, Profit Goals rules, reserves, and any
   approved manual adjustments.
8. Review the estimate, customer price, contribution margin, net estimated
   profit, scope, inclusions, exclusions, and warnings.
9. Request and obtain any required internal approval.
10. Generate, save, and send the customer-facing proposal/PDF.
11. Automatically create follow-up actions until the opportunity is marked
    Won, Lost, On Hold, or Archived.
12. When an estimate is accepted, create a linked project and preserve the
    accepted estimate as the original project budget.
13. Record project expenses, internal labor, subcontractor costs, change
    orders, invoices, and customer payments.
14. Compare original budget, actual cost, projected cost, contract value,
    amount paid, amount owed, and profitability.
15. Close the project while retaining all files, revisions, costs, and
    outcomes for reporting and future reference.

## 7. Microsoft 365 and Data Ownership

- **Microsoft Entra ID**: employee authentication using existing company
  M365 accounts.
- **SharePoint Lists**: structured operational data — opportunities,
  estimates, takeoffs, cost rows, projects, expenses, payments, labor,
  subcontractors, change orders, price data.
- **SharePoint Document Libraries**: plans, photos, receipts, invoices,
  proposal PDFs, contracts, signed change orders, other project files.
- **Microsoft To Do and Outlook**: reminders/notifications, not the
  operational source of truth.
- **Outlook and Calendly**: email, appointments, calendar scheduling.
- **QuickBooks**: formal accounting, payroll, tax, reconciliation, books.
- **Web App**: daily employee interface, workflow, calculations,
  controlled data entry, approvals, search, reporting, dashboards.

All operational records and files belong to Austin Block Company. Store in
company-owned M365/SharePoint resources — never an individual employee's
personal OneDrive. At least two existing employees must be SharePoint Site
Owners. (See `10-system-architecture-m365.md` for full detail; this remains
**not connected** in a static-prototype build — see that doc for the exact
"Integration Readiness" requirement.)

## 8. Estimate History, Revision, and Budget Rules

- Price Catalog values are current reference values only.
- A catalog-price change must never alter a saved, sent, approved,
  accepted, or historical estimate.
- Saving, sending, approving, or accepting an estimate preserves an
  **immutable snapshot** of: estimate/project details, takeoff inputs,
  calculation outputs, material/labor quantities, detailed cost rows, unit
  costs, markup/margin settings, overhead reserve, contingency reserve,
  equipment repair reserve, customer price, profit calculations, proposal
  output/PDF.
- A material estimate change after a protected event creates a **new
  revision**. The previous revision remains viewable and unchanged.
- The accepted estimate snapshot becomes the **Original Project Budget**.
- Actual costs, payments, change orders, and later project updates must
  **never** overwrite the Original Project Budget.
- Approved change orders are stored separately and added to Total Project
  Value.

## 9. Financial Definitions (Exact — Do Not Redefine)

- **Direct Estimated Cost**: all detailed job costs before overhead
  reserve, contingency reserve, equipment repair reserve, and profit.
  Includes Materials, Labor, Subcontractors, Equipment, Freight/Delivery,
  Mobilization, Admin/General Conditions, Extras/Allowances, Fuel (when
  used), and any other approved estimate cost category.
- **Contribution Margin Dollars** = Selling Price − Direct Estimated Cost.
- **Contribution Margin Percentage** = Contribution Margin Dollars ÷
  Selling Price.
- **Overhead Reserve**: internal allowance for company operating costs.
  Starting default **21.5%** of Direct Estimated Cost. Controlled
  adjustment range **19%–23%**; exceptions require a documented reason and
  required approval.
- **Contingency Reserve**: visible risk allowance based on project tier
  and job-specific uncertainty. Not hidden inside profit.
- **Equipment Repair Reserve**: visible internal allowance for jobs using
  company-owned equipment. Not hidden inside profit.
- **Net Estimated Profit Dollars** = Selling Price − Direct Estimated Cost
  − Overhead Reserve − Contingency Reserve − Equipment Repair Reserve.
- **Net Estimated Profit Percentage** = Net Estimated Profit Dollars ÷
  Selling Price.
- **Original Project Budget**: the accepted estimate's saved Direct
  Estimated Cost by category. Does not change when actual costs are
  entered.
- **Actual Project Cost**: approved actual expenses + approved
  subcontractor costs + approved internal ABC Construction labor entered
  against a project. Payment status is tracked separately.
- **Contract Value / Total Project Value**: original accepted contract
  value + approved change orders.
- **Amount Paid**: total customer payments actually received.
- **Amount Owed** = Total Project Value − Amount Paid.
- **Actual Project Profit** = Total Project Value − Actual Project Cost.
  This is an incurred-cost view and must be labeled as such.
- **Projected Final Profit** = Total Project Value − Actual Project Cost −
  documented forecast-to-complete cost. Show **only** once a
  forecast-to-complete process exists.
- **Markup and margin are not interchangeable** — calculate and label them
  separately, always.

## 10. Cost Categories

Every detailed estimate-cost row and actual project-cost row must use a
standardized Estimate Cost Category (IDs, not free text). Approved initial
categories: Materials, Labor, Subcontractors, Equipment, Freight/Delivery,
Mobilization, Admin/General Conditions, Extras/Allowances, Fuel, and
Permits/Fees (only if Austin Block chooses to report it separately — not
active by default; see Open Decision). Full detail in
`07-estimate-cost-categories.md`.

## 11. Pricing, Profit, and Approval Rules

- Profit targets use a tiered range based on project value, project type,
  and risk (see `11-profit-goals.md`).
- Smaller jobs need higher margin targets (fixed estimating/mobilization/
  supervision costs are less diluted). Larger jobs may use lower targets
  only when scope, production, contract, schedule, payment, and risk are
  understood. Residential may use slightly higher targets than comparable
  commercial.
- Every estimate must display its selected pricing tier, target range,
  actual contribution margin, net estimated profit, financial breakdown,
  and clear visual status.
- Below-floor pricing requires a written explanation and
  management/ownership approval.
- Pricing rules must remain editable by authorized users and retain
  effective dates/change history.
- Do not label a bid "competitive" solely from generic market information —
  competitiveness comes from Austin Block's own win/loss data, competitor
  notes when known, and actual completed-job results.

## 12. Project Financial Rules

- Project Financials begins with a searchable/filterable project list and
  a New Project action.
- A project financial summary must show: project info, Original Project
  Budget, Contract Value, approved change orders, Total Project Value,
  Amount Paid, Amount Owed, Actual Cost, estimated profit, actual profit,
  expense breakdown by category.
- Each project must include linked areas for: Expenses, Payments/Invoices,
  Change Orders, Subcontractors, ABC Construction Labor, Files, activity
  history.
- Expense, subcontractor, and internal labor records remain distinct entry
  types but roll up to standard Estimate Cost Categories for job-cost
  reporting.
- Expense records must support: category, vendor, description/notes,
  amount before tax, tax, total amount, date, attachment, approval status,
  paid/unpaid status, payment information.
- **Customer payments must be separate from invoices.** An invoice is a
  request for money; a payment is money actually received.
- Approved costs count toward Actual Project Cost. Paid status remains
  separately visible for cash/accounting tracking.
- QuickBooks remains the formal accounting system of record.

## 13. Required Status Definitions (Controlled Lists — Exact)

**Opportunity Status:** New, Active, Estimate in Progress, Estimate Under
Review, Estimate Sent, Won, Lost, On Hold, Archived.

**Estimate Status:** Draft, In Progress, Ready for Review, Revision
Requested, Approved to Send, Sent, Superseded, Accepted, Declined,
Expired, Archived.

**Project Status:** Setup, Scheduled, Active, On Hold, Substantially
Complete, Closed, Cancelled.

**Expense Approval Status:** Draft, Submitted, Approved, Rejected, Void.

**Expense Payment Status:** Unpaid, Partially Paid, Paid.

**Change Order Status:** Draft, Submitted, Approved, Rejected, Void.

**Invoice Status:** Draft, Sent, Partially Paid, Paid, Overdue, Void.

Never allow arbitrary typed status labels. Status transitions, required
fields, and approval actions are governed by `02-estimator-workflow.md`.

## 14. One-Build Scope and Testing Order

Build the complete connected app in one build; release as one system. The
following is a *recommended implementation/testing order only*, not a
separate-release plan:

1. Authentication, user profiles/preferences, opportunities,
   customer/project records, document upload, takeoff, calculation
   engine, Price Catalog, cost categories, custom proposal line items,
   profit analysis, estimate snapshots/revisions, internal approval, PDF
   proposal generation, sending, search, follow-up.
2. Won-estimate-to-project conversion, project records, SharePoint project
   files, expenses, invoices, payments, change orders, subcontractors,
   ABC Construction Labor, project financial summaries,
   budget-versus-actual reporting.
3. Home Dashboard, Microsoft To Do reminders, Outlook customer/contact
   integration, reporting refinements, exports, visual enhancements.

Before production use: test the full connected workflow using realistic
sample jobs from opportunity creation through closeout, including
revisions, pricing exceptions, approvals, documents, expenses,
subcontractor costs, labor, change orders, invoices, payments, category
reporting, historical snapshots, and estimated-versus-actual reporting.

## App Modules (Version-One Scope)

1. Home Dashboard
2. Opportunities and customer/project records
3. Opportunity detail and activity history
4. File/document placeholders linked to records
5. Estimates
6. Estimate detail workspace
7. Flexible proposal line items
8. Takeoff segments and workbook-defined input fields
9. Material and labor calculation engine (only where fully defined)
10. Price Catalog
11. Estimate Cost Categories
12. Detailed internal cost rows
13. Profit Goals, reserve calculations, pricing-tier display, warnings,
    required-approval indicators
14. Estimate snapshots, revisions, protected-history views
15. Proposal preview and printable proposal page (browser print-to-PDF)
16. Internal review and approval workflow
17. Sent proposal record and 10-day/28-day follow-up tracking
18. Won-estimate conversion into a linked project
19. Project detail page
20. Project financial summary
21. Expenses
22. Subcontractor costs
23. ABC Construction internal labor
24. Change orders
25. Invoices
26. Customer payments
27. Budget-versus-actual reporting by cost category
28. Historical search and filters
29. Open Decisions register
30. Settings and appearance preferences

## 17. Version-One Success Criteria

An authorized employee can:

1. Sign in with company M365 account and retain their own light/dark/
   device appearance preference (prototype: demo-user switcher instead of
   real sign-in — see `10-system-architecture-m365.md`).
2. Create, search, update an opportunity with customer/project details and
   supporting files.
3. Complete one or more takeoff segments.
4. Generate material quantities and labor man-hours using approved named
   rules.
5. Build flexible customer-facing proposal line items with detailed
   internal costs.
6. Review accurate cost, reserve, contribution-margin, and
   net-estimated-profit breakdowns.
7. Request and receive required approval.
8. Generate, save, locate, and send a client-ready proposal/PDF.
9. Reopen or revise an estimate without changing protected historical
   revisions.
10. Convert an accepted estimate into a linked project with an unchanged
    Original Project Budget.
11. Enter and approve expenses, subcontractor costs, internal labor,
    change orders, invoices, and customer payments.
12. View accurate project financial status and estimated-versus-actual
    results.
13. Search historical opportunities, estimates, projects, financial
    records, and files.
14. View the required Dashboard metrics using saved operational records.
