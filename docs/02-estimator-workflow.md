# Estimator Workflow

Source: workbook tab "Estimator Workflow". Governs required employee
workflow, page sequence, actions, status transitions, handoffs, approvals,
follow-up, won/lost handling, project creation, and closeout. Precedence:
see `CLAUDE.md` (this doc governs *sequence*; `01-readme-and-business-rules.md`
governs the underlying statuses and financial rules if they ever conflict).

Each step below: **Step ID | Stage | Primary User | Required Starting
Status | User Action | Required Info/Validation | System Action/Output |
Resulting Status | Approval/Control Rule**

**STEP-001 — Create Opportunity**
Estimator or authorized employee. Starting status: None. Create a new
opportunity or open an existing one. Requires: customer name/company;
primary contact when known; project address/location; opportunity owner;
project type; residential or commercial; lead source; short description.
System: create unique Opportunity ID, set created date/owner, create
linked file area. Resulting status: Opportunity **New**. Control: do not
create duplicate opportunities for the same active customer/project
address without a warning and user confirmation.

**STEP-002 — Complete Opportunity Basics**
Opportunity owner. Starting status: New or Active. Enter/confirm customer
details, project details, estimate assignment. Requires: customer/contact
details; job address; project type; customer type; opportunity owner;
requested scope; desired timing when known. System: save details, set/
retain next action date. Resulting: Opportunity **Active**. Control:
opportunity may remain active without an estimate; required project
details must be complete before creating an estimate.

**STEP-003 — Upload Resources**
Estimator or authorized employee. Starting: New or Active. Upload/link
plans, photos, site-visit notes, engineering docs, customer docs. Requires:
files connected to Opportunity ID; file type and uploaded date retained.
System: store in linked SharePoint project/opportunity file area, show in
app. Resulting: Opportunity Active. Control: do not require files to
create an estimate, but show a visible warning if none are attached where
normally expected.

**STEP-004 — Create Estimate**
Estimator. Starting: Opportunity Active. Create new estimate linked to
opportunity. Requires: estimate name; estimator; estimate type; residential
or commercial; proposal expiration date; initial customer-facing proposal-
line-item structure. System: create unique Estimate ID and Revision 1,
copy relevant opportunity info, create draft snapshot workspace. Resulting:
Estimate **Draft**; Opportunity **Estimate in Progress**. Control: only one
current active estimate revision may exist at a time per opportunity;
existing protected estimates remain historical.

**STEP-005 — Set Estimate Information**
Estimator. Starting: Estimate Draft. Enter info to guide takeoff, pricing,
proposal creation. Requires: customer/project details; wall/system type
when applicable; project type; job address; tax treatment if applicable;
estimate notes; proposal validity period. System: save header, validate
required fields. Resulting: Estimate **In Progress**. Control: do not
calculate a final price until required header info is complete.

**STEP-006 — Create Proposal Line Items**
Estimator. Starting: Draft or In Progress. Create flexible customer-facing
line items in desired presentation order. Requires: title per line;
optional description; optional inclusion/exclusion display settings; line
order; visibility on proposal. System: create customer-facing line-item
records that detailed takeoff/cost records can be assigned to. Resulting:
In Progress. Control: **do not restrict estimators to a fixed catalog** of
customer-facing scopes.

**STEP-007 — Add Takeoff Segments**
Estimator. Starting: In Progress. Create one or more takeoff
segments/material-sale sections, assign each to a proposal line item.
Requires: segment name; assigned proposal line item; applicable
wall/system type; required Takeoff Inputs fields. System: create linked
Takeoff Segment IDs, preserve segment-level inputs/outputs. Resulting: In
Progress. Control: an estimate may contain multiple wall segments and
material-sale sections, each with different wall-type conditions/inputs.

**STEP-008 — Enter Design and Site Inputs**
Estimator. Starting: In Progress. Complete geometry/design/drainage/
reinforcement/demolition/access/logistics/site-condition inputs per
segment. Requires: all required Takeoff Inputs fields; conditional fields
when selected conditions apply; manual-override reason if any
calculated input/output is overridden. System: run field validation, show
missing/conditional required fields. Resulting: In Progress. Control: the
app must **not** silently substitute missing required inputs with guessed
values.

**STEP-009 — Select Equipment and Logistics**
Estimator. Starting: In Progress. Add each anticipated equipment item and
duration; select delivery/freight and job logistics assumptions. Requires:
equipment item; duration; duration unit; related segment/scope; delivery/
freight rule or manual allowance; required override reason. System: create
repeatable equipment/logistics records, calculate/add related cost rows.
Resulting: In Progress. Control: equipment must be repeatable rows —
each item may have a different duration, rate, and labor-productivity
role.

**STEP-010 — Run Material Calculations**
System-calculated during estimate input; estimator reviews. Requires: all
required material-rule inputs complete; override quantity/reason/user
saved when applied. System: run Material Calculation Rules, create
calculated quantity outputs, create/update linked detailed material cost
rows using current Price Catalog references. Resulting: In Progress.
Control: use named rules/units from `04-material-calculation-rules.md`.
Preserve calculation rule ID, constants, inputs, and results in the
estimate snapshot.

**STEP-011 — Run Labor Calculations**
System-calculated; estimator reviews. Requires: required labor-rule
inputs; selected equipment; applicable condition factors; override amount/
reason/user when changed. System: run Labor Calculation Rules, create
labor-hour outputs and linked detailed labor cost rows using the selected
labor cost basis. Resulting: In Progress. Control: use named rules/units
from `05-labor-calculation-rules.md`. Preserve labor-rule ID, productivity
settings, inputs, adjustment factors, and result in the snapshot.

**STEP-012 — Build Detailed Internal Costs**
Estimator. Starting: In Progress. Review/add all detailed cost rows
(calculated and manual). Requires: every cost row needs proposal line
item; Estimate Cost Category ID; description; quantity; unit; unit cost;
tax handling when applicable; source type (calculated/catalog/manual).
System: calculate direct estimated cost by proposal line item and by cost
category; retain source and price reference per row. Resulting: In
Progress. Control: manual cost rows require an explanation when they
replace or materially change a calculated/catalog-derived value.

**STEP-013 — Verify Current Job Pricing**
Estimator. Starting: In Progress. Verify vendor pricing, freight/delivery
cost, subcontractor quotes, equipment cost, project-specific pricing.
Requires: date/source for non-catalog price confirmation when changed;
vendor quote/attachment when applicable; updated cost row and reason.
System: use catalog price as starting reference, preserve project-specific
verified cost in the estimate revision, **do not** update the master
catalog automatically. Resulting: In Progress. Control: an estimate may
use a project-specific price without changing future catalog pricing.

**STEP-014 — Set Scope Inclusions and Exclusions**
Estimator. Starting: In Progress. Enter customer-facing scope
descriptions, inclusions, exclusions, assumptions, allowances,
clarifications. Requires: proposal text per line item and/or estimate;
required exclusions/assumptions for applicable scope. System: prepare
customer-facing proposal content **without exposing internal costs,
reserves, or margins**. Resulting: In Progress. Control: inclusions and
exclusions must be editable and preserved in every sent/protected
revision.

**STEP-015 — Review Financial Analysis**
Estimator. Starting: In Progress. Review direct estimated cost, overhead
reserve, contingency reserve, equipment repair reserve, selling price,
contribution margin, net estimated profit. Requires: all detailed costs
categorized; Profit Goals tier selected; risk/contingency inputs complete;
price/reserve overrides have required reasons. System: calculate/display
category totals, proposal-line-item totals, selected tier, target range,
contribution margin $/%, net estimated profit $/%, cost per square foot,
profit per square foot, cost per day, profit per day, and alerts.
Resulting: In Progress. Control: use `11-profit-goals.md` as governing
pricing policy. **Do not label contribution margin and net estimated
profit as the same measure.**

**STEP-016 — Prepare Proposal**
Estimator. Starting: In Progress. Preview customer-facing proposal, revise
customer-visible titles/descriptions/inclusions/exclusions/terms/line-item
arrangement. Requires: proposal must contain customer/project identity;
proposal number/revision; issue/expiration date; selected customer-facing
line items and totals; required terms; exclusions; signature/acceptance
area when enabled. System: generate proposal preview and draft PDF, save
as draft document linked to the estimate revision. Resulting: Estimate
**Ready for Review**. Control: proposal preview must **not** reveal
internal detailed costs, cost categories, reserves, markup, margins, or
internal notes.

**STEP-017 — Submit for Internal Review**
Estimator. Starting: Ready for Review. Submit estimate for manager/owner
review. Requires: no missing required fields; calculations successful;
proposal preview generated; all below-floor or special overrides include
written explanations. System: lock the submitted revision against
ordinary edits, notify assigned approver, create review activity record.
Resulting: Estimate Ready for Review; Opportunity **Estimate Under
Review**. Control: any material change after submission requires a new
revision or return to In Progress.

**STEP-018 — Internal Review Decision**
Manager or authorized approver. Starting: Ready for Review. Review scope,
costs, proposal totals, profit metrics, risk flags, exception reasons;
approve or request revision. Requires: approver decision; decision date;
approval/revision comments; explicit approval of any required exception.
System: record decision and audit trail; if approved, create protected
approved snapshot; if revision requested, unlock by
creating/returning to an editable revision. Resulting: Estimate **Approved
to Send** OR **Revision Requested**. Control: approval required when
defined by Profit Goals, including below-floor bids and large-project
thresholds. (Final permission matrix intended for System Architecture doc
— flagged as Open Decision; not fully defined.)

**STEP-019 — Revise Estimate When Needed**
Estimator. Starting: Revision Requested, or an editable estimate needing
material change. Create a new revision, make required scope/pricing/
calculation/proposal updates. Requires: revision reason; changed records;
recalculated values; revised proposal document. System: preserve prior
version unchanged, create next revision number, rerun review process when
required. Resulting: Estimate **In Progress**. Control: a sent, approved,
or accepted revision must never be overwritten.

**STEP-020 — Send Proposal**
Estimator or authorized sender. Starting: Approved to Send. Send approved
proposal by approved delivery method or record external delivery.
Requires: customer recipient; sent date/time; sent proposal PDF/revision;
optional message/email record. System: save sent PDF and delivery
activity, set follow-up schedule at **10 days and 28 days** after sent
date, create Microsoft To Do/Outlook reminders when integration is
enabled (not connected in the static prototype). Resulting: Estimate
**Sent**; Opportunity **Estimate Sent**. Control: only an Approved to Send
revision may be sent; sending creates a protected sent snapshot.

**STEP-021 — Perform Follow-Up**
Assigned estimator or opportunity owner. Starting: Estimate Sent;
Opportunity Estimate Sent. Complete scheduled follow-up, record result.
Requires: follow-up date; contact method; outcome/note; next action date;
customer feedback when known. System: mark task complete, create next
follow-up when appropriate, update activity history. Resulting: unchanged
statuses. Control: default reminders at 10 and 28 days after sending, then
stop when outcome is Won, Lost, On Hold, or Archived. Users may add
additional follow-ups.

**STEP-022 — Record Won Outcome**
Estimator, manager, or authorized employee. Starting: Sent or Approved to
Send; Opportunity Estimate Sent. Mark accepted estimate as won, record
acceptance evidence. Requires: accepted revision; acceptance date;
contract value; acceptance evidence/signature/communication; project
manager when known; expected start date when known. System: set
opportunity outcome, mark accepted estimate, protect accepted snapshot,
create linked project and Original Project Budget, create SharePoint
project folder/file structure (not connected in prototype), carry forward
customer/project/files/estimate budget. Resulting: Opportunity **Won**;
Estimate **Accepted**; Project **Setup**. Control: only one estimate
revision may be accepted per opportunity unless an authorized correction is
documented.

**STEP-023 — Record Lost Outcome**
Estimator, manager, or authorized employee. Starting: Active, Estimate
Under Review, or Estimate Sent. Mark opportunity lost, record reason.
Requires: controlled loss reason; close date; optional competitor/price/
scope/customer-feedback notes. System: stop automatic follow-ups, preserve
all estimate revisions/history, make record available for win/loss
reporting. Resulting: Opportunity **Lost**; current Estimate **Declined**
or **Expired** as applicable. Control: loss reason is required; **never
delete** lost opportunities or estimates.

**STEP-024 — Place Opportunity on Hold or Archive**
Opportunity owner or authorized employee. Starting: New, Active, Estimate
in Progress, Estimate Under Review, or Estimate Sent. Place on hold or
archive a non-active record without marking it lost. Requires: hold/
archive reason; next review date when on hold. System: pause active
reminders while on hold, retain history, allow authorized reactivation.
Resulting: Opportunity **On Hold** or **Archived**. Control: archived
records are read-only except for authorized administrators.

**STEP-025 — Project Setup and Handoff**
Project manager or authorized employee. Starting: Project Setup. Review
accepted estimate scope, original budget, schedule, files,
responsibilities, project-start requirements. Requires: project manager;
project status; accepted estimate reference; original contract value;
original budget; required project files; initial schedule/start info.
System: show project financial summary, create project task/file links,
maintain accepted estimate as read-only source budget. Resulting: Project
**Scheduled** or **Active**. Control: the accepted estimate budget must
remain unchanged; project staff may view/compare to actuals but may not
overwrite it.

**STEP-026 — Record Project Financial Activity**
Project manager, estimator, accounting-authorized user, or other
authorized employee. Starting: Setup, Scheduled, Active, or On Hold. Enter
and manage project expenses, subcontractor records, ABC Construction
Labor, change orders, invoices, payments, supporting documents. Requires:
fields/approval requirements defined in `09-expense-payment-tracking.md`.
System: update Actual Project Cost for approved cost records; update Total
Project Value for approved change orders; update Amount Paid for recorded
customer payments; maintain audit trail and attachments. Resulting:
project remains current. Control: do not treat invoices as payments; do
not include rejected/void costs in actual cost; preserve Original Project
Budget.

**STEP-027 — Monitor Project Financial Performance**
Project manager, manager, owner, or accounting-authorized user. Starting:
Setup, Scheduled, Active, or On Hold. Review budget-versus-actual category
performance, receivables, actual profit, projected final profit when
forecast data exists. Requires: project financial records current enough
for the review purpose; unresolved missing receipts/approvals visible.
System: display original budget, actual cost, pending cost, variance,
actual profit, and forecast-to-complete/projection when used. Resulting:
project remains current. Control: use incurred approved costs for Actual
Project Cost; label all financial measures clearly.

**STEP-028 — Close Project**
Project manager and authorized approver. Starting: Substantially Complete
or Active. Confirm work and financial record completion, then close.
Requires: completion date; final project status; closeout notes; required
files; unresolved balance/expense explanation if any; final actual-cost
review. System: mark project closed, preserve records/files, retain for
Dashboard and historical reporting, stop routine active-project reminders.
Resulting: Project **Closed**. Control: closed project records are
read-only except for authorized correction/reopen actions with an audit
reason.

**STEP-029 — Historical Search and Learning**
All authorized employees. Starting: any non-deleted record. Search
historical opportunities, estimates, projects, files, actual costs,
outcomes. Requires: search/filter terms; permissions. System: return
linked records and protected historical versions, feed Dashboard and
future pricing analysis. Resulting: no status change. Control: historical
records must remain searchable per employee permissions and retention
rules.
