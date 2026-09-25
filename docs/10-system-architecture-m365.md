# System Architecture & M365 Integration

Source: workbook tab "System Architecture & M365 Integration". Data
ownership, technical responsibilities, M365/SharePoint structure,
authentication, roles, integrations, storage, security, environments,
deployment requirements. Second-highest precedence document — see
`CLAUDE.md`.

**For a static-prototype v1 build (localStorage, no backend): every
integration below is NOT CONNECTED.** Build an "Integration Readiness"
screen documenting the intended mapping (per row below), labeled clearly
as "Not connected in this static prototype." Do not fake live
connectivity to any of these. Structure the data layer (see
`storage.js` pattern) so a future developer can swap localStorage for real
Microsoft Graph calls without redesigning the UI.

## System Area → Tool Mapping

| System Area | Primary Tool / Location | Purpose | What Employees Do in the Web App | What Is Stored/Managed There | Integration Method | Ownership/Access | Priority |
|---|---|---|---|---|---|---|---|
| Web Application | Netlify-hosted internal web app | Main employee workspace for CRM, takeoffs, estimates, projects, expenses, payments, dashboards. | Sign in, create/edit/search/filter/save/approve, upload files, generate proposals, view dashboards. | App interface and workflow logic. | Netlify frontend + secure backend functions connected to Microsoft Graph (future). | All company employees sign in with existing Microsoft work accounts; role-based access. | High |
| Employee Sign-In | Microsoft Entra ID | Secure app authentication via existing company accounts. | Click "Sign In with Microsoft." | User identity, session, access rules, permissions. | Entra ID app registration + Microsoft auth flow. | No new paid user required. | High |
| Operational Records | SharePoint Lists (Austin Block Operations site) | Store structured, searchable, editable, reportable company records. | Create/update opportunities, estimates, takeoffs, projects, costs, expenses, payments, labor, subcontractor entries, price catalog data. | Structured business records and links between them. | Microsoft Graph read/write to SharePoint Lists. | Company-owned site; ≥2 employees as Site Owners; staff permissions by role. | High |
| File Storage | SharePoint Document Libraries (Austin Block Operations site) | Store company project documents and uploaded evidence. | Upload, view, download, open, organize, link plans, proposal PDFs, receipts, invoices, signed contracts, photos, closeout files. | Files, folders, file metadata, SharePoint version history. | Microsoft Graph SharePoint drive/document-library access. | Company-owned shared storage — never one employee's OneDrive. | High |
| Customer/Prospect Contacts | CRM records + selected Outlook contact folder | Keep revenue-related customer/prospect contact info available in both systems. | Create/edit customer and prospect records in CRM; view linked Outlook contact info. | CRM records + linked Outlook contact ID + sync history. | Microsoft Graph Outlook Contacts API, selected sync scope only. | Only customer/prospect records sync; vendors/truckers/subcontractors stay outside CRM sync. | Medium |
| Outlook Calendar / Calendly | Outlook shared/employee calendars | Meetings, booking availability, site visits, date-specific reminders. | View relevant dates or create links; do not build a custom calendar UI. | Outlook events and Calendly-created appointments. | Calendly connects directly to Outlook; Graph can read event data if needed. | Shared calendars managed by existing users/groups. | Medium |
| Tasks and Reminders | Microsoft To Do and Outlook | Notify employees about required workflow actions. | App creates a task when a workflow step requires action; employee completes/reminds in To Do/Outlook. | Personal To Do tasks with due dates, reminders, notes, links back to app records. | Microsoft Graph To Do API, linked resource back to app record. | Tasks assigned to existing employee accounts. | Medium |
| Email and Notifications | Outlook shared mailboxes | Send proposals, project messages, alerts, notifications through existing M365 email. | Create proposal/email drafts or send approved workflow notifications when needed. | Email records/links and shared-mailbox communications as applicable. | Microsoft Graph Mail API or Outlook deep links, minimum permissions. | Existing individual/shared mailbox access rules. | Medium |
| Team Communication | Microsoft Teams | Use existing chat/channel communication for project/approval coordination. | Open Teams links or receive activity/notification links when useful later. | Teams conversations remain in Teams. | Microsoft Graph or Teams deep links, later if useful. | — | Low |
| Accounting System | QuickBooks | System of record for formal bookkeeping, reconciliation, taxes, payroll, accountant-controlled accounting. | Enter operational expenses, subcontractor costs, labor, client payments, references in the app; export/reconcile as needed. | Official accounting ledger, bank reconciliation, tax records, payroll, accountant processes. | Manual export/reconciliation first; controlled QuickBooks integration later if needed. | Accountant retains QuickBooks control; employees don't need QuickBooks access. | High |
| Reporting and Dashboards | Web app using SharePoint operational records | Show company summaries and project-level estimated-vs-actual data. | View Home Dashboard, project financial summaries, pipeline, win/loss, revenue, profit, costs, payment info. | Calculated metrics and filtered reporting based on saved operational records. | Web-app calculations; SharePoint List data queried through Graph. | Role-based visibility; sensitive financial details can be limited by role. | High |
| Code and Deployment | GitHub + Netlify | Store code safely and deploy the web app. | No direct employee use beyond the finished application. | Source-code history, deployment configuration, environment variables, deployment logs. | GitHub repository connected to Netlify. | Approved technical admins manage deployment access. | High |

## Data Ownership Rules

- All operational records and files belong to Austin Block Company. Store
  in company-owned M365/SharePoint resources — **never** an individual
  employee's personal OneDrive.
- At least two existing company employees must be SharePoint Site Owners.
- Never store client secrets, access tokens, or production credentials in
  the public codebase.

## Explicitly Deferred / Open Decisions From This Document

- Final SharePoint site name, List names, document-library names, folder
  naming convention, retention policy, access groups.
- Named employee roles, role permissions, approval roles, approval dollar
  limits (the workbook states the "final permission matrix is defined in
  System Architecture" — but no matrix is actually given here; this is
  circular and must be flagged, not resolved by guessing).
- Exact QuickBooks reconciliation/export process.

## For the v1 Static Prototype

Build an **Integration Readiness** screen listing every row above with a
status badge reading "Not connected in this static prototype" and a short
note on the intended mapping. Do not simulate live Entra ID, SharePoint,
Outlook, Microsoft To Do, QuickBooks, or Calendly connectivity. Use
localStorage as the working data store, and write `storage.js` (or
equivalent) so its public functions return plain data shapes a future
developer could re-implement against Microsoft Graph without changing any
calling code elsewhere in the app.
