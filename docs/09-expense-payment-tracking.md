# Expense & Payment Tracking (Project Financials)

Source: workbook tab "Expense & Payment Tracking". Project Financials
screens, fields, approvals, calculations, expense records, subcontractors,
internal labor, change orders, invoices, payments, attachments,
budget-versus-actual reporting. High precedence for financial rules — see
`CLAUDE.md`.

## FIN-001 Project Financials List

All authorized employees. Purpose: searchable/filterable list of all
projects with financial tracking. Actions: search, filter, open a project,
click New Project, view financial status. Fields: project name, project
number, customer, job address, project status, project manager, accepted
contract value, total paid, amount owed, estimated profit, actual cost,
actual profit, payment status, last activity date. Calculated: Amount Owed
= Total Project Value − Payments Received; Actual Profit = Total Project
Value − Approved Actual Costs. Filters: project/customer/address/project
number search; active/closed; project manager; customer; payment status;
date range; project type. Show most useful columns by default; allow
sorting by balance owed, profit, status, recent activity.

## FIN-002 New Project

Button action. Purpose: create a new financial project record when a
project did not originate from an accepted estimate, or to manually create
a missing record. Fields: project name, number, customer, job address,
project type, project manager, start date, accepted estimate reference,
initial contract value, notes. If created from an accepted estimate, copy
customer/project details and the accepted budget snapshot **without
re-entering data**. **Normal path is Won Estimate → Project; New Project is
the exception path only.**

## FIN-003 Project Financial Summary

Authorized employees. Purpose: view one project's financial condition,
costs, payments, and profitability in one place. Actions: view summary,
switch between Expense/Payments/Subcontractors/ABC Construction Labor
pages, add records, open files. Fields: project info, customer, address,
status, project manager, accepted estimate reference, contract value,
approved change orders, total project value, payments received, amount
owed, estimated cost budget, actual approved cost, estimated profit,
actual profit, expense breakdown by category, recent activity. Rules:
Total Project Value = original accepted contract value + approved change
orders. Amount Owed = Total Project Value − Payments Received. Actual
Cost = approved/recorded costs across all expense types. Actual Profit =
Total Project Value − Actual Cost. Page tabs: Summary, Expenses, Payments,
Subcontractors, ABC Construction Labor, Files. **Keep the original
accepted estimate budget unchanged for accurate estimated-versus-actual
reporting.**

## FIN-004 Expense Breakdown

Summary component. Purpose: show actual spending by standard cost category
vs. the accepted estimate budget. Fields: category, estimated budget,
actual approved cost, pending/unapproved cost, variance dollars, variance
percentage, count of expenses. Rules: Variance $ = Actual Approved Cost −
Estimated Budget. Variance % = Variance $ ÷ Estimated Budget (when budget
> 0). Filter by expense status and date range. Use the standard categories
from `07-estimate-cost-categories.md`.

## FIN-005 Expenses Page

Employees entering job expenses; approvers reviewing them. Purpose: add
and manage normal project expenses (materials, equipment, freight, fuel,
permit fees, misc job costs). Actions: create expense, edit draft, upload
receipt/invoice, select category, mark paid status, submit for review,
approve/reject if authorized. Fields: expense date, project, custom
proposal line item (optional), category, vendor, description/notes, amount
before tax, tax, total amount, paid checkbox, paid date, payment method,
approval status, submitted by, approved by, receipt/invoice attachment,
QuickBooks reference (optional). Rules: Total Amount = Amount Before Tax +
Tax. Actual Project Cost includes **approved** expenses only. Paid status
is separate from approval status. Filters: project, category, vendor,
paid/unpaid, approval status, submitted-by, expense date, missing receipt.
**Vendors are not CRM contacts** — allow free-text vendor or an
Outlook-vendor lookup without syncing vendors into CRM.

## FIN-006 Expense Status Rules

System/authorized employees. Purpose: define status behavior so expenses
don't distort project cost reporting. Actions: create draft, submit,
approve, reject, mark paid, correct or void a record. Statuses: Draft,
Submitted, Approved, Rejected, Void; Paid, Unpaid; Paid Date; Approver;
Rejection Note. **Rule: include Approved expenses in actual incurred
cost; show Paid status separately for cash tracking. Rejected and Void
expenses never count.** Confirm this rule with the accountant if
QuickBooks reconciliation later requires different treatment (flag as
Open Decision if it changes).

## FIN-007 Payments Page

Authorized employees. Purpose: track project contract value, change
orders, client invoices, and customer payments received. Actions: add
original contract, add change order, add invoice, add payment, edit
payment, attach payment evidence, mark invoice paid/partial/overdue.
Fields: original accepted contract amount, contract date, contract
document, change order number/description/amount/approved date, invoice
number/date/due date/amount, customer payment date/amount/method/
reference/status, notes, QuickBooks reference (optional). Rules: Total
Project Value = original contract + approved change orders. Total Paid =
sum of recorded customer payments. Remaining Balance = Total Project Value
− Total Paid. Filter invoices/payments by paid status, due date, customer,
date range, payment method. **Keep contract value and money collected
separate. An invoice is a request; a payment is money received.**

## FIN-008 Payments Summary

Summary component. Purpose: show high-level project receivables status.
Fields: original contract value, approved change orders, total project
value, total invoiced, total paid to date, remaining balance, overdue
invoices, next payment due. Rules: Remaining Balance = Total Project Value
− Total Paid to Date. Total Invoiced is informational and does not replace
Total Project Value. Filter by invoice/payment status and due date. Use
this same payment total for revenue reporting only if revenue is defined
as cash received.

## FIN-009 Subcontractors Page

Project manager, estimator, accounting-authorized users. Purpose: enter
and track subcontractor commitments and actual costs separately from
ordinary project expenses. Actions: add subcontractor commitment, enter
invoice/expense, attach quote or invoice, mark approved, mark paid,
compare committed vs. actual cost. Fields: subcontractor company, contact
name (optional), scope description, linked proposal line item (optional),
cost category (default Subcontractors), commitment amount, invoice date,
invoice number, invoice amount, retainage (optional), approval status,
paid checkbox, paid date, notes, attachment, QuickBooks reference
(optional). Rules: Actual Subcontractor Cost = sum of approved
subcontractor invoices/expenses. Remaining Commitment = Commitment Amount
− Approved Actual Subcontractor Cost. Filters: subcontractor, project,
paid/unpaid, approval status, scope. **Do not create CRM customer records
for subcontractors** — keep as vendor/operational records.

## FIN-010 ABC Construction Labor Page

Authorized office staff, project managers, supervisors. Purpose: record
job-specific internal labor cost for ABC Construction drivers and
construction crew. Actions: add labor entry (select worker, labor type,
date, hours or amount, notes), review/edit entries, attach support if
needed. Fields: work date, employee/driver name, role, project, linked
proposal line item (optional), labor type, hours, hourly internal cost
rate, manual amount override, total labor cost, notes, entered by,
approval status, paid/payroll-processed indicator, payroll reference
(optional). Rules: Total Labor Cost = Hours × Hourly Internal Cost Rate
unless a documented manual amount override is used. **Approved labor
entries roll into actual project Labor cost.** Filters: employee, role,
project, date range, labor type, approval status, payroll processed
status. **Use internal labor-cost rates, not employee pay visible to
unauthorized users. Set role-based access carefully.**

## FIN-011 Financial Audit History

System/authorized users. Purpose: protect accountability and explain
changes to financial records. Actions: view record history, see changes,
identify who created/edited/approved/rejected/voided/marked a record paid.
Fields: record type, record ID, project, action, old value summary, new
value summary, user, timestamp, note/reason. Rule: **financial records
retain history — edits to approved/paid records must create traceable
adjustments instead of silently replacing values.** Filters: project,
record type, employee, date, action. Required for confidence in
profitability reporting and later QuickBooks reconciliation.

## Rules Cross-Reference

See `01-readme-and-business-rules.md` §9 for the exact financial
definitions (Direct Estimated Cost, Contract Value, Amount Paid, Amount
Owed, Actual Project Profit, etc.) and §13 for the controlled status
lists used throughout this document.
