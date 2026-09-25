# Estimate Cost Categories

Source: workbook tab "Estimate Cost Categories". Standard category IDs,
labels, definitions, estimate/actual usage, defaults, and reporting
behavior. **The app must save category IDs, never uncontrolled free-text
labels.** Every detailed estimate-cost row and actual project-cost row
must use one of these.

| Category ID | Name | Type | Description | Use in Estimate? | Use for Project Actuals? | Default Internal? | Default Markup | Default Unit Basis | Typical Examples | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| CAT-001 | Materials | Direct Cost | Physical products and materials supplied or installed on the job. | Yes | Yes | Yes | 35% | EA, LF, SF, CY, TON, PALLET, LOAD | Block, capstone, base, gravel, drainage pipe, geogrid, mortar, fabric | Use for any material purchased specifically for the job. |
| CAT-002 | Labor | Direct Cost | Internal company labor directly used to perform job work. | Yes | Yes | Yes | 65% | Hours | Crew hours, excavation, base prep, wall installation, cleanup | Use actual loaded labor cost if tracked; do not mix subcontractor invoices here. |
| CAT-003 | Subcontractors | Direct Cost | Outside companies or independent subcontractors performing job scope. | Yes | Yes | Yes | 50% | Lump Sum, Hours, EA | Concrete work, hauling, engineering, specialty installation | Use vendor/subcontractor name on each cost row. |
| CAT-004 | Equipment | Direct Cost | Owned or rented equipment used specifically for the project. | Yes | Yes | Yes | 25% | Hours, Days, EA | Mini excavator, skid steer, attachments, rentals | Decide later whether owned-equipment cost is an internal rate, fuel-only, or both — see Open Decisions. |
| CAT-005 | Freight / Delivery | Direct Cost | Delivery, trucking, hauling, and job-specific transportation charges. | Yes | Yes | Yes | 15% | Load, Trip, Mile, Lump Sum | Material delivery, trucking, freight, dump fees | Keep freight separate from materials so estimator accuracy is visible. |
| CAT-006 | Fuel | Direct Cost | Fuel for equipment use on site. | Yes | Yes | Yes | 15% | Gallon | Price per day for job operational fuel expenses | Use a safe average cost of diesel in Central Texas depending on equipment selected and days on site. |
| CAT-007 | Extras / Allowances | Direct Cost | Engineering, permitting, or any other one-off prices that may not be included in most estimates but need to be added to a single one. | Yes | Yes | Yes | 20% | Each | Engineering, permitting, surveying | Not always included. |
| CAT-008 | Mobilization | Direct Cost | Job-specific mobilization, demobilization, transport, loading, and setup costs for equipment or crews. | Yes | Yes | Yes | 15% | Each, Load, Trip | Equipment mobilization, crew mobilization, delivery setup, demobilization | Keep separate from daily equipment cost and material freight. |
| CAT-009 | Admin / General Conditions | Direct Cost | Project-specific administrative, site-support, compliance, and temporary-job-condition costs. | Yes | Yes | Yes | 20% | Day, Week, Lump Sum | Permitting assistance, safety fencing, restroom facilities, temporary protection, project coordination | Use only for costs directly attributable to a specific project — not company-wide overhead. |

## Conditional Tenth Category

**Permits / Fees** — README section 10 mentions this "only if Austin Block
chooses to report it separately," but this tab does not define a category
ID, default markup, or unit basis for it. **Do not activate this as a
selectable category.** Default permit-related costs to Admin/General
Conditions (CAT-009) or Extras/Allowances (CAT-007) until Austin Block
confirms whether/how to split it out. Log as an Open Decision.

## Reporting Rule

All nine active categories (CAT-001 through CAT-009) are used both in
estimate cost-row entry and in project actual-cost entry (expenses,
subcontractor costs, and ABC Construction labor all roll up to these same
category IDs for job-cost / budget-vs-actual reporting per
`09-expense-payment-tracking.md`).
