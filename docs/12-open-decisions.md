# Open Decisions Register

Source: workbook tab "README" §16 (seed list) plus every "⚠️ UNDEFINED"
item flagged across the other docs. **This is not optional scaffolding —
build an actual in-app Open Decisions module (see
`01-readme-and-business-rules.md` App Modules #29) that displays every
entry below with these exact fields:**

1. Decision title
2. Related workbook tab / doc file and requirement ID
3. Why it is unresolved
4. What decision Austin Block Company needs to make
5. Feature behavior while unresolved

Users may add company-specific entries through the app; they must never be
able to delete the seeded entries below. When an entry is resolved by
Austin Block, update the corresponding calculation/rule in code **and**
mark the entry resolved here — do not just delete it (preserve the
decision history).

## Seed Entries

**OD-001 — Mason Sand Tonnage conversion factor (Fieldstone Wall)**
Related: `04-material-calculation-rules.md`, CALC-008. Unresolved because:
the rule says "use the established dry-mortar-to-sand conversion from the
applicable price and material standard" without giving the numeric ratio.
Decision needed: Austin Block must supply the exact conversion factor.
Behavior while unresolved: show Dry Mortar Bags (fully defined) but flag
an "Unresolved calculation" notice for Mason Sand Tonnage on Fieldstone
segments; require manual quantity entry with a reason.

**OD-002 — Shared Geogrid SQFT/embedment calculation (all wall types)**
Related: `04-material-calculation-rules.md`, CALC-011/029/044/060/061.
Unresolved because: every wall type's geogrid rule says "use the agreed
shared geogrid calculation and engineering override behavior" without ever
defining that formula. Decision needed: Austin Block must document the
actual geogrid area formula, or confirm it is always manually entered from
engineered plans. Behavior while unresolved: never auto-calculate geogrid
SQFT; only accept the Manual Geogrid Area Override (TO-041) with a required
reason (TO-042); show an unresolved-calculation notice.

**OD-003 — Height-based schedules for Chopped Stone and Keystone/CMU
footers/gravel bed**
Related: `04-material-calculation-rules.md`, CALC-046, CALC-049, CALC-050,
CALC-062. Unresolved because: each references an "established height-based
schedule" that is never tabulated anywhere in the workbook. Decision
needed: Austin Block must provide the actual height-to-dimension lookup
tables for these wall systems. Behavior while unresolved: require manual
estimator entry with a documented override reason; show an
unresolved-calculation notice on the affected segment.

**OD-004 — Loaded labor cost basis (man-hours → dollar cost)**
Related: `05-labor-calculation-rules.md` (all rules), `06-price-catalog.md`
COST-060. Unresolved because: labor rules fully define man-hours, but no
tab states a per-man-hour loaded labor cost; the catalog only gives a
Crew/Day rate for a 6-man crew, which doesn't cleanly convert without an
unstated assumption. Decision needed: Austin Block must confirm the loaded
labor cost basis (e.g., $/man-hour, or how the Crew/Day rate apportions).
Behavior while unresolved: calculate and display man-hours using the
defined rules, but require a manual dollar entry with a reason for the
resulting labor cost row.

**OD-005 — Equipment-to-labor-rule toggle mapping completeness**
Related: `03-takeoff-inputs.md` TO-058–TO-062; `05-labor-calculation-
rules.md` (all rules). Unresolved because: rules reference specific
spreadsheet-column equipment toggles per calculation; where a rule
explicitly names equipment and a percentage it is implementable, but the
complete cross-reference of every catalog equipment item against every
rule is not exhaustively given. Decision needed: Austin Block should
confirm the complete equipment-to-rule applicability matrix. Behavior
while unresolved: apply only the equipment adjustments explicitly stated
in a given rule's formula text; flag any selected equipment not named in a
rule as "not applied to this labor rule" rather than silently ignoring it.

**OD-006 — Contingency Reserve override limits**
Related: `11-profit-goals.md`; `01-readme-and-business-rules.md` §9.
Unresolved because: a starting contingency percentage is given per tier,
but unlike Overhead Reserve (stated 19%–23% band), no override range or
approval trigger is given for contingency deviations. Decision needed:
Austin Block must define the allowed contingency adjustment range and what
deviation requires approval. Behavior while unresolved: Contingency
Reserve is editable per estimate with a mandatory override reason, but no
automatic floor/ceiling or approval trigger is enforced beyond the tier's
starting percentage.

**OD-007 — Equipment Repair Reserve basis (per-project qualification)**
Related: `11-profit-goals.md`; `03-takeoff-inputs.md` TO-061. Unresolved
because: Profit Goals gives a reserve percentage per tier, and TO-061
notes the reserve "applies only where Profit Goals says company-owned
equipment qualifies," but no tab actually states the qualifying rule.
Decision needed: Austin Block must confirm whether the reserve applies
whenever any company-owned equipment row exists on an estimate, or under
some other rule. Behavior while unresolved: apply the tier's reserve
percentage only when at least one equipment row is marked Company-Owned,
and visibly label this as an interpretation pending confirmation.

**OD-008 — Named employee roles, permissions, and approval dollar limits**
Related: `10-system-architecture-m365.md`; `01-readme-and-business-
rules.md` §11. Unresolved because: README defers the approval permission
matrix to System Architecture, which in turn states the matrix is "defined
in System Architecture" without ever listing named roles, permissions, or
dollar thresholds — a circular reference. Decision needed: Austin Block
must name actual employee roles, assign permissions, and set explicit
dollar-based approval limits if any exist beyond the Profit Goals tier
triggers. Behavior while unresolved: ship generic role placeholders
(Estimator, Manager/Approver, Owner, Accounting, Admin) assignable to demo
users; enforce only the specific approval triggers Profit Goals explicitly
states.

**OD-009 — Final SharePoint site, List, and library structure**
Related: `10-system-architecture-m365.md`; `01-readme-and-business-
rules.md` §16. Unresolved because: the workbook intentionally defers the
final SharePoint site name, List names, document-library names, folder
naming convention, retention policy, and access groups. Decision needed:
Austin Block and its M365 administrator must finalize this before any live
Graph integration is built. Behavior while unresolved: the Integration
Readiness screen shows only intended category-level mapping (e.g.,
"Opportunities → SharePoint List"), clearly labeled "Not connected in this
static prototype." No real site or list names are invented.

**OD-010 — Permits/Fees as a separate cost category**
Related: `07-estimate-cost-categories.md`; `01-readme-and-business-
rules.md` §10. Unresolved because: README lists "Permits/Fees, only if
Austin Block chooses to report it separately" as conditional, but the
Estimate Cost Categories tab never actually defines an ID, markup, or unit
basis for it. Decision needed: Austin Block must decide whether to
activate Permits/Fees as its own category or continue folding it into
Admin/General Conditions or Extras/Allowances. Behavior while unresolved:
only the 9 fully defined categories (CAT-001–CAT-009) are active/
selectable; permit costs default to Admin/General Conditions or Extras/
Allowances.

**OD-011 — Proposal template, terms, and signature/acceptance process**
Related: `02-estimator-workflow.md` STEP-016; `01-readme-and-business-
rules.md` §16. Unresolved because: the workbook explicitly defers the
exact proposal document template, legal terms, signature/acceptance
workflow, and PDF filename convention. Decision needed: Austin Block
(with legal/ownership input) must finalize proposal terms language,
whether e-signature is required, and a PDF naming convention. Behavior
while unresolved: the proposal preview/print page uses neutral placeholder
terms text clearly marked as a draft template; acceptance is recorded as
an internal "Won" entry, not a captured digital signature.

**OD-012 — QuickBooks reconciliation and export process**
Related: `10-system-architecture-m365.md`; `09-expense-payment-
tracking.md` FIN-006. Unresolved because: the workbook states QuickBooks
remains the system of record for formal accounting but explicitly defers
the exact reconciliation/export process. Decision needed: Austin Block's
accountant must define the required export format and reconciliation
cadence. Behavior while unresolved: support a generic JSON/CSV export of
financial records for manual use, labeled "Not connected in this static
prototype" rather than a live QuickBooks integration.

**OD-013 — Final controlled lists (lead sources, project types, loss
reasons, vendors, wall types, closeout reasons)**
Related: `01-readme-and-business-rules.md` §16. Unresolved because: the
workbook explicitly defers these final controlled lists to a future
company decision. Decision needed: Austin Block must approve final
controlled values. Behavior while unresolved: ship editable starter lists
clearly labeled "Demo starter list — confirm final values" in Settings, so
the workflow is testable without presenting invented values as final
policy.

## Rule for Adding New Entries During Development

If you (the coding agent) encounter any other business rule, formula,
status, approval trigger, permission, or integration detail in `docs/`
that is missing, unclear, inconsistent, or technically impractical, do not
resolve it by assumption. Add a new entry here using the same five-field
format, wire the affected feature to behave safely (manual entry with a
reason, or a visible "unresolved" notice) instead of guessing, and
continue building the rest of the app around it.
