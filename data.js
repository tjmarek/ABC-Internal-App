/* =========================================================================
   AUSTIN BLOCK COMPANY INTERNAL OPERATIONS APP
   data.js

   PURPOSE
   Defines the application's data model, controlled reference data taken
   directly from the workbook (Price Catalog, Estimate Cost Categories,
   Profit Goals, controlled status lists), the Open Decisions register
   content, and the demo dataset used to demonstrate the full connected
   workflow: opportunity -> estimate -> won project -> financials.

   All persistence goes through AbcStorage (storage.js). This file adds
   the domain-specific "service" functions (create/read/update opportunity,
   estimate, project, etc.) that ui.js and app.js call. Nothing in this
   file talks to localStorage directly - it always goes through AbcStorage,
   so a future developer can swap the storage backend for SharePoint /
   Microsoft Graph without touching this file's public function shapes.

   PRECEDENCE NOTE: Where the workbook did not fully define a rule, this
   file records that gap as an Open Decision (see OPEN_DECISIONS_SEED
   below) instead of inventing behavior.
   ========================================================================= */

(function (global) {
  "use strict";

  var S = global.AbcStorage;

  // =========================================================================
  // CONTROLLED STATUS LISTS (README section 13 - exact, not editable by users)
  // =========================================================================

  var OPPORTUNITY_STATUSES = [
    "New", "Active", "Estimate in Progress", "Estimate Under Review",
    "Estimate Sent", "Won", "Lost", "On Hold", "Archived"
  ];

  var ESTIMATE_STATUSES = [
    "Draft", "In Progress", "Ready for Review", "Revision Requested",
    "Approved to Send", "Sent", "Superseded", "Accepted", "Declined",
    "Expired", "Archived"
  ];

  var PROJECT_STATUSES = [
    "Setup", "Scheduled", "Active", "On Hold",
    "Substantially Complete", "Closed", "Cancelled"
  ];

  var EXPENSE_APPROVAL_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Void"];
  var EXPENSE_PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];
  var CHANGE_ORDER_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Void"];
  var INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Void"];

  // Subcontractor and labor approval statuses are not separately enumerated
  // in the workbook's Section 13 list; Expense & Payment Tracking (FIN-009,
  // FIN-010) describes "approval status" and "paid" as concepts without a
  // separate controlled list. We reuse the Expense Approval Status list for
  // consistency, since it is the closest governing status set (README
  // precedence item 3: Profit Goals and Expense & Payment Tracking govern
  // financial rules). This reuse itself is flagged in Open Decisions.
  var SUBCONTRACTOR_APPROVAL_STATUSES = EXPENSE_APPROVAL_STATUSES;
  var LABOR_APPROVAL_STATUSES = EXPENSE_APPROVAL_STATUSES;

  var WALL_TYPES = ["Fieldstone Wall", "Block Wall", "Chopped Stone Wall", "Keystone/CMU Wall", "Other"];
  var TAKEOFF_SEGMENT_TYPES = ["Installed Wall", "Material-Only Sale", "Demolition Only", "Other Custom Scope"];
  var ACCESS_LEVELS = ["Easy", "Moderate", "Difficult", "Restricted"];
  var SITE_SLOPES = ["Level", "Moderate Slope", "Steep Slope", "Irregular Terrain"];
  var SOIL_CONDITIONS = ["Normal Soil", "Loose / Fatty Soil", "Clay", "Semi-Rocky", "Breakable Rock", "Solid Rock", "Wet / Muddy", "Unknown", "Other"];
  var WALL_SHAPES = ["Straight", "Curved", "Stepped", "Terraced", "Angled", "Other"];
  var DEMOLITION_SCOPE_TYPES = ["Site Clearing", "Tree Removal", "Fence Removal", "Stone Wall", "CMU / Brick Wall", "Timber / Railroad Tie Wall", "Poured Concrete Wall", "Drainage Removal", "Footer Removal", "Material Sorting", "Other"];
  var EQUIPMENT_ROLES = ["Production Adjustment", "Cost Only", "Both"];
  var EQUIPMENT_OWNERSHIP = ["Company-Owned", "Rented", "Subcontractor-Provided"];
  var ADJUSTMENT_TYPES = ["Material Quantity", "Labor Hours", "Equipment Duration", "Freight", "Scope", "Other"];

  // -------------------------------------------------------------------------
  // Starter controlled lists explicitly deferred by the workbook (README
  // section 16 Open Decisions). Shipped as clearly labeled starter values,
  // editable from Settings, NOT presented as final company policy.
  // -------------------------------------------------------------------------
  var STARTER_LEAD_SOURCES = ["Referral", "Website Inquiry", "Repeat Customer", "Walk-In", "Phone Call", "Other"];
  var STARTER_PROJECT_TYPES = ["Residential Retaining Wall", "Commercial Retaining Wall", "Material-Only Sale", "Other"];
  var STARTER_LOSS_REASONS = ["Price", "Timing / Schedule", "Chose Another Contractor", "Scope Changed", "No Response", "Other"];
  var STARTER_CLOSEOUT_REASONS = ["Completed as Scoped", "Completed with Changes", "Customer-Requested Early Stop", "Other"];

  // =========================================================================
  // ESTIMATE COST CATEGORIES (from "Estimate Cost Categories" tab, CAT-001..009)
  // =========================================================================

  var COST_CATEGORIES_SEED = [
    { id: "CAT-001", name: "Materials", type: "Direct Cost", description: "Physical products and materials supplied or installed on the job.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.35, defaultUnitBasis: "EA, LF, SF, CY, TON, PALLET, LOAD", notes: "Use for any material purchased specifically for the job." },
    { id: "CAT-002", name: "Labor", type: "Direct Cost", description: "Internal company labor directly used to perform job work.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.65, defaultUnitBasis: "Hours", notes: "Use actual loaded labor cost if you track it; do not mix subcontractor invoices here." },
    { id: "CAT-003", name: "Subcontractors", type: "Direct Cost", description: "Outside companies or independent subcontractors performing job scope.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.50, defaultUnitBasis: "Lump Sum, Hours, EA", notes: "Use vendor/subcontractor name on each cost row." },
    { id: "CAT-004", name: "Equipment", type: "Direct Cost", description: "Owned or rented equipment used specifically for the project.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.25, defaultUnitBasis: "Hours, Days, EA", notes: "Decide later whether owned-equipment cost is an internal rate, fuel-only, or both." },
    { id: "CAT-005", name: "Freight / Delivery", type: "Direct Cost", description: "Delivery, trucking, hauling, and job-specific transportation charges.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.15, defaultUnitBasis: "Load, Trip, Mile, Lump Sum", notes: "Keep freight separate from materials so estimator accuracy is visible." },
    { id: "CAT-006", name: "Fuel", type: "Direct Cost", description: "Fuel for equipment use on site.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.15, defaultUnitBasis: "Gallon", notes: "Use a safe average cost of diesel in Central Texas depending on equipment selected and days on site." },
    { id: "CAT-007", name: "Extras / Allowances", type: "Direct Cost", description: "Engineering, permitting, or any other one-off prices that may not be included in most estimates but need to be added to a single one.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.20, defaultUnitBasis: "Each", notes: "Not always included." },
    { id: "CAT-008", name: "Mobilization", type: "Direct Cost", description: "Job-specific mobilization, demobilization, transport, loading, and setup costs for equipment or crews.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.15, defaultUnitBasis: "Each, Load, Trip", notes: "Keep separate from daily equipment cost and material freight." },
    { id: "CAT-009", name: "Admin / General Conditions", type: "Direct Cost", description: "Project-specific administrative, site-support, compliance, and temporary-job-condition costs.", useInEstimate: true, useForActuals: true, defaultInternal: true, defaultMarkup: 0.20, defaultUnitBasis: "Day, Week, Lump Sum", notes: "Use only for costs directly attributable to a specific project; do not use for company-wide overhead." }
    // NOTE: "Permits / Fees" category (README section 10) is explicitly conditional
    // ("only if Austin Block chooses to report it separately") and is not seeded
    // as an active category. See Open Decisions register (OD-010).
  ];

  // =========================================================================
  // PRICE CATALOG (from "Price Catalog" tab - representative full set)
  // Each row: catalog item id, name, wall type applicability, unit cost,
  // unit, category id, taxed flag, stock markup %, comments.
  // Tax rate used across taxed items is 8.25% per the tab header.
  // =========================================================================

  var TAX_RATE_DEFAULT = 0.0825;

  var PRICE_CATALOG_SEED = [
    { id: "COST-001", item: "Permitting Assistance", wallType: "Any", cost: 1000.00, unit: "Each", categoryId: "CAT-009", taxed: false, markup: 0.20 },
    { id: "COST-002", item: "Engineering and Wall Design", wallType: "Any", cost: 2500.00, unit: "Each", categoryId: "CAT-007", taxed: false, markup: 0.20 },
    { id: "COST-003", item: "Wall Layout and Staking", wallType: "Any", cost: 2500.00, unit: "Each", categoryId: "CAT-009", taxed: false, markup: 0.20 },
    { id: "COST-004", item: "Safety Fencing", wallType: "Any", cost: 250.00, unit: "Each", categoryId: "CAT-009", taxed: false, markup: 0.20 },
    { id: "COST-005", item: "Crew Restroom Facilities", wallType: "Any", cost: 200.00, unit: "Each", categoryId: "CAT-009", taxed: false, markup: 0.20 },
    { id: "COST-006", item: "Rock Hammering Allowance", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-007", taxed: false, markup: 0.20 },
    { id: "COST-007", item: "Skid Steer Mobilization x2", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-008", taxed: false, markup: 0.15 },
    { id: "COST-008", item: "Excavator Mobilization", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-008", taxed: false, markup: 0.15 },
    { id: "COST-009", item: "Mini Excavator Mobilization", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-008", taxed: false, markup: 0.15 },
    { id: "COST-010", item: "Roller Mobilization", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-008", taxed: false, markup: 0.15 },
    { id: "COST-011", item: "Wheel Loader Mobilization", wallType: "Any", cost: 500.00, unit: "Each", categoryId: "CAT-008", taxed: false, markup: 0.15 },
    { id: "COST-012", item: "Mini Excavator", wallType: "Any", cost: 150.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-013", item: "Skid Steer (Tracks)", wallType: "Any", cost: 180.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-014", item: "Skid Steer (Tracks) - Second Unit", wallType: "Any", cost: 180.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-015", item: "Excavator", wallType: "Any", cost: 240.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-016", item: "Backhoe", wallType: "Any", cost: 95.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-017", item: "Lil' Roller", wallType: "Any", cost: 140.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-018", item: "Roller", wallType: "Any", cost: 60.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-019", item: "Wheel Loader", wallType: "Any", cost: 360.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-020", item: "Company Truck", wallType: "Any", cost: 85.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-021", item: "Equipment Fuel", wallType: "Any", cost: 270.00, unit: "Day", categoryId: "CAT-006", taxed: false, markup: 0.25 },
    { id: "COST-022", item: "Lil' Rock Hammer", wallType: "Any", cost: 165.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-023", item: "Big Rock Hammer", wallType: "Any", cost: 335.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-024", item: "Dumpster - Rental", wallType: "Any", cost: 95.00, unit: "Day", categoryId: "CAT-004", taxed: false, markup: 0.25 },
    { id: "COST-025", item: "Dump Truck Haul Off", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-026", item: "Flatbed Haul Off", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-027", item: "Dumpster Haul Off", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-028", item: "Trailer Haul Off", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-029", item: "Base Freight", wallType: "Any", cost: 250.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-030", item: "Rebar & Forms Freight", wallType: "Any", cost: 250.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-031", item: "Misc Materials Freight", wallType: "Any", cost: 175.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15, comments: "2 loads per week on site" },
    { id: "COST-032", item: "Gravel Freight", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-033", item: "Backfill Freight", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-034", item: "Mason Sand Freight", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-035", item: "Mortar Freight", wallType: "Any", cost: 400.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15, comments: "Dry mortar only" },
    { id: "COST-036", item: "Flexbase", wallType: "Footer", cost: 9.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-037", item: "Form Boards", wallType: "Footer", cost: 3.45, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "2\" X 4\" X 16' board" },
    { id: "COST-038", item: "Wooden Stakes", wallType: "Footer", cost: 3.45, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-039", item: "Concrete", wallType: "Footer", cost: 150.00, unit: "Cubic Yard", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-040", item: "Tie Wire", wallType: "Footer", cost: 25.00, unit: "Box", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "100 LNFT spool" },
    { id: "COST-041", item: "White Type S Mortar - 70 lb Bags", wallType: "Block Wall or Chopped Stone", cost: 11.93, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "40 bags per pallet" },
    { id: "COST-042", item: "Grey Type N Mortar - 70 lb Bags", wallType: "Block Wall or Chopped Stone", cost: 9.30, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "40 bags per pallet" },
    { id: "COST-043", item: "Manufactured Sand", wallType: "Block Wall or Chopped Stone", cost: 14.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-044", item: "Masonry Sand", wallType: "Block Wall or Chopped Stone", cost: 25.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-045", item: "Drainage Gravel", wallType: "All", cost: 13.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-046", item: "Mirafi 140N Geotextile Fabric", wallType: "All", cost: 360.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "15' x 360' roll (5,400 SF)" },
    { id: "COST-047", item: "Mirafi 3XT Geogrid Reinforcement", wallType: "All", cost: 260.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "12' x 150' roll (1,800 SF)" },
    { id: "COST-048", item: "4\" HDPE Sock Pipe", wallType: "All", cost: 109.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "Per 100' roll" },
    { id: "COST-049", item: "Drain Tees", wallType: "All", cost: 7.40, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-050", item: "Drain Caps", wallType: "All", cost: 4.11, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-051", item: "Rock Saw Blades", wallType: "Block Wall", cost: 98.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-052", item: "Backfill", wallType: "Any", cost: 6.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-053", item: "#4 Rebar", wallType: "Block Wall or Field Stone", cost: 8.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "20' stick" },
    { id: "COST-054", item: "Adhesive Tube", wallType: "Keystone or CMU", cost: 15.00, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-055", item: "Fiberglass Pins", wallType: "Keystone", cost: 0.24, unit: "Each", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-056", item: "Flexbase", wallType: "Any", cost: 14.00, unit: "Ton", categoryId: "CAT-001", taxed: true, markup: 0.35 },
    { id: "COST-057", item: "Wet Mortar - 9YD Trucks", wallType: "Block Wall, Chopped Stone, Field Stone, or CMU", cost: 205.00, unit: "Cubic Yard", categoryId: "CAT-001", taxed: true, markup: 0.35, comments: "Freight included" },
    { id: "COST-058", item: "Travel Per Diem", wallType: "Any", cost: 50.00, unit: "Worker/Day", categoryId: "CAT-002", taxed: false, markup: 0.15 },
    { id: "COST-059", item: "Hotel", wallType: "Any", cost: 100.00, unit: "Worker/Day", categoryId: "CAT-002", taxed: true, markup: 0.25 },
    { id: "COST-060", item: "Labor", wallType: "Any", cost: 1327.50, unit: "Crew/Day", categoryId: "CAT-002", taxed: false, markup: 0.65, comments: "6-man crew" },
    { id: "COST-061", item: "Total SQFT + LF (<= 5' H)", wallType: "Fieldstone", cost: 5.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-062", item: "Total SQFT + LF (5' - 6' H)", wallType: "Fieldstone", cost: 6.00, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-063", item: "Total SQFT + LF (6' - 7' H)", wallType: "Fieldstone", cost: 6.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-064", item: "Total SQFT + LF (7' - 8' H)", wallType: "Fieldstone", cost: 7.00, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-065", item: "Total SQFT + LF (8' - 9' H)", wallType: "Fieldstone", cost: 7.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-066", item: "Total SQFT + LF (9' - 10' H)", wallType: "Fieldstone", cost: 8.00, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-067", item: "Total SQFT + LF (10' - 11' H)", wallType: "Fieldstone", cost: 8.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-068", item: "Total SQFT + LF (11' - 12' H)", wallType: "Fieldstone", cost: 9.00, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-069", item: "Total SQFT + LF (12' - 13' H)", wallType: "Fieldstone", cost: 9.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-070", item: "Total SQFT + LF (13' - 14' H)", wallType: "Fieldstone", cost: 10.00, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-071", item: "Total SQFT + LF (14' - 15' H)", wallType: "Fieldstone", cost: 10.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-072", item: "Total SQFT + LF (> 15')", wallType: "Fieldstone", cost: 11.50, unit: "SQFT+LF", categoryId: "CAT-003", taxed: false, markup: 0.55 },
    { id: "COST-073", item: "1' X 5' Limestone Quarry Blocks", wallType: "Block Wall", cost: 95.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "20 blocks per load" },
    { id: "COST-074", item: "2' X 5' Limestone Quarry Blocks", wallType: "Block Wall", cost: 85.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "16 blocks per load" },
    { id: "COST-075", item: "2' X 6' Limestone Quarry Blocks", wallType: "Block Wall", cost: 100.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12 blocks per load" },
    { id: "COST-076", item: "Keystone Blocks / Per Block", wallType: "Block Wall", cost: 4.60, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "40 blocks per pallet, 12 pallets per truck" },
    { id: "COST-077", item: "Keystone 4\" Cap Block / Per Block", wallType: "Keystone", cost: 3.49, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "80 blocks per pallet, 12 pallets per truck" },
    { id: "COST-078", item: "Chopped Limestone Blocks", wallType: "Chopped Stone", cost: 105.00, unit: "Ton", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "2 tons per pallet, 12 pallets per truck" },
    { id: "COST-079", item: "Random Cut Field Stone", wallType: "Field Stone", cost: 15.00, unit: "Ton", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 tons per dump truck" },
    { id: "COST-080", item: "Stone Freight", wallType: "All", cost: 425.00, unit: "Load", categoryId: "CAT-005", taxed: false, markup: 0.15 },
    { id: "COST-081", item: "Tan Venetian 2'x4'", wallType: "Block Wall", cost: 135.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "20 per load" },
    { id: "COST-082", item: "Tan Venetian 2'x5'", wallType: "Block Wall", cost: 235.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "16 per load" },
    { id: "COST-083", item: "Cave Select 2'x4'", wallType: "Block Wall", cost: 100.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 per load" },
    { id: "COST-084", item: "Cave Select 2'x5'", wallType: "Block Wall", cost: 115.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "15 per load" },
    { id: "COST-085", item: "Cave Select 2'x6'", wallType: "Block Wall", cost: 195.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12 per load" },
    { id: "COST-086", item: "Cave Select (Watersawn Face) 2'x4'", wallType: "Block Wall", cost: 260.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 per load" },
    { id: "COST-087", item: "Cave Select (Watersawn Face) 2'x5'", wallType: "Block Wall", cost: 275.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "15 per load" },
    { id: "COST-088", item: "Cave Select (Watersawn Face) 2'x6'", wallType: "Block Wall", cost: 300.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12 per load" },
    { id: "COST-089", item: "Charcoal Block 2'x4'", wallType: "Block Wall", cost: 150.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 per load" },
    { id: "COST-090", item: "Charcoal Block 2'x5'", wallType: "Block Wall", cost: 175.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "15 per load" },
    { id: "COST-091", item: "Charcoal Mini 1'x4'", wallType: "Block Wall", cost: 85.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "68 per load" },
    { id: "COST-092", item: "Butterstick Block 2'x4'", wallType: "Block Wall", cost: 110.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "20 per load" },
    { id: "COST-093", item: "Butterstick Block 2'x5'", wallType: "Block Wall", cost: 125.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "16 per load" },
    { id: "COST-094", item: "Butterstick Block 2'x6'", wallType: "Block Wall", cost: 155.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12 per load" },
    { id: "COST-095", item: "Austin White 2'x4'", wallType: "Block Wall", cost: 170.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "20 per load" },
    { id: "COST-096", item: "Austin White 2'x5'", wallType: "Block Wall", cost: 195.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "16 per load" },
    { id: "COST-097", item: "Limestone Mini 1'x4'", wallType: "Block Wall", cost: 45.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "80 per load" },
    { id: "COST-098", item: "Limestone Thin 2'x5'", wallType: "Block Wall", cost: 75.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "25 per load" },
    { id: "COST-099", item: "Sunflower 2'x3'", wallType: "Block Wall", cost: 115.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "24 per load" },
    { id: "COST-100", item: "Sunflower 2'x4'", wallType: "Block Wall", cost: 110.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "20 per load" },
    { id: "COST-101", item: "Sunflower 2'x5'", wallType: "Block Wall", cost: 125.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "16 per load" },
    { id: "COST-102", item: "Sunflower 2'x6'", wallType: "Block Wall", cost: 155.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12 per load" },
    { id: "COST-103", item: "Thin Brulee Block 2'x5'", wallType: "Block Wall", cost: 95.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "12\"-14\" wide; 25 per load" },
    { id: "COST-104", item: "Watersawn Butterstick 2'x5'", wallType: "Block Wall", cost: 115.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 per load" },
    { id: "COST-105", item: "Snow White 2'x5'", wallType: "Block Wall", cost: 225.00, unit: "Each", categoryId: "CAT-001", taxed: false, markup: 0.28, comments: "18 per load" }
  ];

  // =========================================================================
  // PROFIT GOALS (from "Profit Goals" tab, PG-004..PG-013)
  // minValue/maxValue null = open-ended (Major tier over $1,000,000).
  // Reserves stored as decimal fractions of Direct Estimated Cost.
  // =========================================================================

  var PROFIT_GOALS_SEED = [
    { id: "PG-004", tier: "Small Project Tier", minValue: 15000, maxValue: 49999, projectType: "Residential", targetMargin: 0.38, minMargin: 0.34, maxMargin: 0.45, overheadReserve: 0.215, contingencyReserve: 0.05, equipmentRepairReserve: 0.010, approvalRule: "Approval required below 34% margin; review required above 45%.", notes: "Small jobs need stronger margin because mobilization, estimating, supervision, and fixed setup work are less diluted." },
    { id: "PG-005", tier: "Small Project Tier", minValue: 15000, maxValue: 49999, projectType: "Commercial", targetMargin: 0.35, minMargin: 0.31, maxMargin: 0.42, overheadReserve: 0.215, contingencyReserve: 0.05, equipmentRepairReserve: 0.010, approvalRule: "Approval required below 31% margin; review required above 42%.", notes: "Commercial work may price more competitively but should not erase risk protection." },
    { id: "PG-006", tier: "Lower-Mid Project Tier", minValue: 50000, maxValue: 149999, projectType: "Residential", targetMargin: 0.35, minMargin: 0.31, maxMargin: 0.41, overheadReserve: 0.215, contingencyReserve: 0.04, equipmentRepairReserve: 0.008, approvalRule: "Approval required below 31% margin.", notes: "Use 4% contingency only when scope, site conditions, and material quantities are reasonably defined." },
    { id: "PG-007", tier: "Lower-Mid Project Tier", minValue: 50000, maxValue: 149999, projectType: "Commercial", targetMargin: 0.32, minMargin: 0.28, maxMargin: 0.38, overheadReserve: 0.215, contingencyReserve: 0.04, equipmentRepairReserve: 0.008, approvalRule: "Approval required below 28% margin.", notes: "Use owner review for unusual schedule, contract, insurance, or coordination risk." },
    { id: "PG-008", tier: "Mid Project Tier", minValue: 150000, maxValue: 299999, projectType: "Residential", targetMargin: 0.32, minMargin: 0.28, maxMargin: 0.37, overheadReserve: 0.215, contingencyReserve: 0.03, equipmentRepairReserve: 0.006, approvalRule: "Approval required below 28% margin.", notes: "Lower target recognizes scale, but do not lower it merely to chase work." },
    { id: "PG-009", tier: "Mid Project Tier", minValue: 150000, maxValue: 299999, projectType: "Commercial", targetMargin: 0.29, minMargin: 0.25, maxMargin: 0.34, overheadReserve: 0.215, contingencyReserve: 0.03, equipmentRepairReserve: 0.006, approvalRule: "Approval required below 25% margin.", notes: "Management should review production plan and payment terms before sending." },
    { id: "PG-010", tier: "Large Project Tier", minValue: 300000, maxValue: 499999, projectType: "Residential", targetMargin: 0.29, minMargin: 0.25, maxMargin: 0.34, overheadReserve: 0.215, contingencyReserve: 0.025, equipmentRepairReserve: 0.005, approvalRule: "Management approval required before sending.", notes: "Require review of cash flow, staffing, schedule, and equipment plan." },
    { id: "PG-011", tier: "Large Project Tier", minValue: 300000, maxValue: 499999, projectType: "Commercial", targetMargin: 0.27, minMargin: 0.23, maxMargin: 0.32, overheadReserve: 0.215, contingencyReserve: 0.025, equipmentRepairReserve: 0.005, approvalRule: "Management approval required before sending.", notes: "Do not use this lower threshold when contract risk or scope uncertainty is unusually high." },
    { id: "PG-012", tier: "Major Project Tier", minValue: 500000, maxValue: 1000000, projectType: "Residential or Commercial", targetMargin: 0.25, minMargin: 0.22, maxMargin: 0.30, overheadReserve: 0.215, contingencyReserve: 0.02, equipmentRepairReserve: 0.004, approvalRule: "Ownership approval required before sending.", notes: "Build a project-specific risk review; the percentage is only a starting gate." },
    { id: "PG-013", tier: "Major Project Tier", minValue: 1000000, maxValue: null, projectType: "Residential or Commercial", targetMargin: 0.22, minMargin: 0.18, maxMargin: 0.28, overheadReserve: 0.215, contingencyReserve: 0.02, equipmentRepairReserve: 0.004, approvalRule: "Ownership approval required before sending.", notes: "Require detailed production, cash-flow, contractual-risk, and contingency review rather than relying on standard tiers alone." }
  ];

  var OVERHEAD_RESERVE_DEFAULT = 0.215; // README section 9: 21.5% starting default
  var OVERHEAD_RESERVE_MIN = 0.19;
  var OVERHEAD_RESERVE_MAX = 0.23;

  // =========================================================================
  // OPEN DECISIONS REGISTER SEED
  // Each item: title, workbook tab/requirement, why unresolved, decision
  // needed, and current feature behavior while unresolved. Users may not
  // delete these; they may add company-specific ones (marked custom:true).
  // =========================================================================

  var OPEN_DECISIONS_SEED = [
    {
      code: "OD-001",
      title: "Mason Sand Tonnage conversion factor (Fieldstone Wall)",
      relatedTab: "Material Calculation Rules",
      relatedRequirement: "CALC-008 Mason Sand Tonnage",
      whyUnresolved: "The rule states to 'use the established dry-mortar-to-sand conversion from the applicable price and material standard' but does not give the numeric conversion factor.",
      decisionNeeded: "Austin Block Company must supply the exact dry-mortar-to-sand conversion ratio used for Fieldstone walls.",
      behaviorWhileUnresolved: "The app shows Dry Mortar Bags (which IS fully defined) but displays an 'Unresolved calculation' notice for Mason Sand Tonnage on Fieldstone segments and requires a manual quantity entry with a reason instead of auto-calculating."
    },
    {
      code: "OD-002",
      title: "Shared Geogrid SQFT / embedment calculation",
      relatedTab: "Material Calculation Rules",
      relatedRequirement: "CALC-011, CALC-029, CALC-044, CALC-060, CALC-061",
      whyUnresolved: "Every wall type's geogrid rule says to 'use the agreed shared geogrid calculation and engineering override behavior' without ever defining that shared formula.",
      decisionNeeded: "Austin Block Company must document the actual geogrid area formula (or confirm it is always manually entered from engineered plans).",
      behaviorWhileUnresolved: "Geogrid SQFT is never auto-calculated. The app only accepts the Manual Geogrid Area Override (TO-041) with a required reason (TO-042), and shows an unresolved-calculation notice next to the field."
    },
    {
      code: "OD-003",
      title: "Height-based schedules for Chopped Stone and Keystone/CMU footers",
      relatedTab: "Material Calculation Rules",
      relatedRequirement: "CALC-046 (Chopped Stone footer excavation), CALC-049/CALC-050 (Keystone/CMU footer depth & width), CALC-062 (Keystone/CMU gravel bed width)",
      whyUnresolved: "Each references an 'established height-based schedule' that is never tabulated anywhere in the workbook.",
      decisionNeeded: "Austin Block Company must provide the actual height-to-dimension lookup tables for these wall systems.",
      behaviorWhileUnresolved: "These fields require manual estimator entry with a documented override reason; the app will not guess a schedule. An unresolved-calculation notice is shown on the affected takeoff segment."
    },
    {
      code: "OD-004",
      title: "Loaded labor cost basis for converting man-hours to a dollar cost",
      relatedTab: "Labor (Man-Hours) Calculation Rules / Price Catalog",
      relatedRequirement: "All CALC-064 through CALC-104 labor rules; COST-060 Labor (Crew/Day rate)",
      whyUnresolved: "The labor rules fully define man-hours, but the workbook never states a per-man-hour loaded labor cost. The Price Catalog only provides a Crew/Day rate for a 6-man crew (COST-060), which does not map cleanly to a per-hour or per-person basis without an assumption the workbook does not make.",
      decisionNeeded: "Austin Block Company must confirm the loaded labor cost basis (e.g., dollars per man-hour, or how the Crew/Day rate should be apportioned) to use for internal labor cost rows.",
      behaviorWhileUnresolved: "The app calculates and displays man-hours using the defined labor rules, but the resulting internal labor cost row requires a manual dollar entry with a reason instead of an automatic conversion."
    },
    {
      code: "OD-005",
      title: "Equipment-to-labor-rule toggle mapping completeness",
      relatedTab: "Takeoff Inputs / Labor (Man-Hours) Calculation Rules",
      relatedRequirement: "TO-058 through TO-062; CALC-064 through CALC-104 equipment assist toggles",
      whyUnresolved: "Labor rules reference specific spreadsheet-column equipment toggles (e.g., 'Big Excavator +50% (C136)') per calculation. Where a rule explicitly names the equipment and percentage, it is implemented; some combinations of catalog equipment items across all ~40 rules are not explicitly cross-referenced.",
      decisionNeeded: "Austin Block Company should confirm the complete equipment-to-rule applicability matrix so every catalog equipment item is definitively mapped (or excluded) for every labor rule.",
      behaviorWhileUnresolved: "The calculation engine applies only the equipment adjustments explicitly stated in a given rule's formula text. Any selected equipment that is not named in a rule is treated as a cost-only line and is visibly flagged as 'not applied to this labor rule.'"
    },
    {
      code: "OD-006",
      title: "Contingency Reserve override limits",
      relatedTab: "Profit Goals / README Financial Definitions",
      relatedRequirement: "Contingency Reserve definition; PG-004 through PG-013 contingency starting percentages",
      whyUnresolved: "The workbook gives a starting contingency percentage per tier but, unlike the Overhead Reserve (stated 19%-23% band), never states a permitted adjustment range or approval trigger specific to contingency deviations.",
      decisionNeeded: "Austin Block Company must define the allowed contingency adjustment range and what deviation, if any, requires approval.",
      behaviorWhileUnresolved: "Contingency Reserve is editable per estimate with a mandatory override reason, but the app does not enforce an automatic floor/ceiling or approval trigger on contingency changes beyond the tier's starting percentage."
    },
    {
      code: "OD-007",
      title: "Equipment Repair Reserve basis (per-project trigger)",
      relatedTab: "Profit Goals / Takeoff Inputs",
      relatedRequirement: "Equipment Repair Reserve definition; TO-061 Company-Owned or Rented",
      whyUnresolved: "Profit Goals gives a reserve percentage per tier and TO-061 notes the reserve 'applies only where Profit Goals says company-owned equipment qualifies,' but no tab actually states the qualifying rule.",
      decisionNeeded: "Austin Block Company must confirm whether the Equipment Repair Reserve applies whenever any company-owned equipment row exists on an estimate, or under some other rule.",
      behaviorWhileUnresolved: "The app applies the tier's Equipment Repair Reserve percentage only when at least one equipment row on the estimate is marked Company-Owned, and visibly labels this as an interpretation pending confirmation."
    },
    {
      code: "OD-008",
      title: "Named employee roles, permissions, and approval dollar limits",
      relatedTab: "System Architecture & M365 Integration / README Open Decisions",
      relatedRequirement: "Section 11 approval rules; System Architecture permission matrix reference",
      whyUnresolved: "README defers the approval permission matrix to System Architecture & M365 Integration, which in turn states the matrix is 'defined in System Architecture' without ever listing named roles, permissions, or dollar thresholds.",
      decisionNeeded: "Austin Block Company must name actual employee roles, assign permissions, and set explicit dollar-based approval limits if any exist beyond the Profit Goals tier triggers.",
      behaviorWhileUnresolved: "The app ships with generic role placeholders (Estimator, Manager/Approver, Owner, Accounting, Admin) assignable to demo users, and enforces only the specific approval triggers Profit Goals explicitly states (below-floor pricing, tier-based management/ownership approval)."
    },
    {
      code: "OD-009",
      title: "Final SharePoint site, List, and library structure",
      relatedTab: "System Architecture & M365 Integration / README Open Decisions",
      relatedRequirement: "Operational Records and File Storage rows",
      whyUnresolved: "The workbook intentionally defers the final SharePoint site name, List names, document library names, folder naming convention, retention policy, and access groups.",
      decisionNeeded: "Austin Block Company and its M365 administrator must finalize the SharePoint site/list/library architecture before any live Graph integration is built.",
      behaviorWhileUnresolved: "The Integration Readiness screen shows only the intended category-level mapping (e.g., 'Opportunities -> SharePoint List') and is clearly labeled Not Connected in this static prototype. No real site or list names are invented."
    },
    {
      code: "OD-010",
      title: "Permits / Fees as a separate cost category",
      relatedTab: "README / Estimate Cost Categories",
      relatedRequirement: "README section 10 cost category list",
      whyUnresolved: "README lists 'Permits / Fees, only if Austin Block chooses to report it separately' as a conditional category that the Estimate Cost Categories tab does not actually define with an ID, markup, or unit basis.",
      decisionNeeded: "Austin Block Company must decide whether to activate Permits/Fees as its own Estimate Cost Category (with defined ID, markup, and unit basis) or continue folding permit costs into Admin/General Conditions or Extras/Allowances.",
      behaviorWhileUnresolved: "Only the 9 fully defined categories (CAT-001 through CAT-009) are active and selectable. Permit-related costs default to Admin/General Conditions or Extras/Allowances until this decision is made."
    },
    {
      code: "OD-011",
      title: "Proposal template, terms, and signature/acceptance process",
      relatedTab: "README Open Decisions / Estimator Workflow STEP-016",
      relatedRequirement: "Proposal generation and sending requirements",
      whyUnresolved: "The workbook explicitly defers the exact proposal document template, legal terms, signature/acceptance workflow, and PDF filename convention to a future decision.",
      decisionNeeded: "Austin Block Company (with input from ownership/legal) must finalize proposal terms language, whether e-signature is required, and a PDF naming convention.",
      behaviorWhileUnresolved: "The proposal preview/print page uses neutral placeholder terms text clearly marked as a draft template, and the acceptance action is recorded as an internal 'Won' entry rather than a digital signature capture."
    },
    {
      code: "OD-012",
      title: "QuickBooks reconciliation and export process",
      relatedTab: "README Open Decisions / System Architecture & M365 Integration",
      relatedRequirement: "Accounting System row; Expense Status Rules note",
      whyUnresolved: "The workbook states QuickBooks remains the system of record for formal accounting but explicitly defers the exact reconciliation/export process.",
      decisionNeeded: "Austin Block Company's accountant must define the required export format and reconciliation cadence between the app and QuickBooks.",
      behaviorWhileUnresolved: "The app supports a generic JSON/CSV export of financial records for manual use, labeled 'Not connected in this static prototype' rather than a live QuickBooks integration."
    },
    {
      code: "OD-013",
      title: "Final controlled lists (lead sources, project types, loss reasons, vendors, closeout reasons)",
      relatedTab: "README Open Decisions",
      relatedRequirement: "Section 16 final controlled lists",
      whyUnresolved: "The workbook explicitly defers these final controlled lists to a future company decision.",
      decisionNeeded: "Austin Block Company must approve final controlled values for these lists.",
      behaviorWhileUnresolved: "The app ships editable starter lists clearly labeled 'Demo starter list - confirm final values' in Settings so the workflow is testable without presenting invented values as final policy."
    }
  ];

  // =========================================================================
  // ID / COUNTER NAME CONSTANTS
  // =========================================================================

  var ID_PREFIXES = {
    OPPORTUNITY: "OPP",
    ESTIMATE: "EST",
    PROJECT: "PRJ",
    EXPENSE: "EXP",
    SUBCONTRACTOR_COST: "SUB",
    LABOR_ENTRY: "LAB",
    CHANGE_ORDER: "CO",
    INVOICE: "INV",
    PAYMENT: "PMT",
    FILE: "FILE",
    USER: "USR"
  };

  // =========================================================================
  // SERVICE LAYER - generic record helpers wired to specific collections
  // =========================================================================

  function nowIso() { return new Date().toISOString(); }

  // ---------- Users & Preferences ----------

  function getUsers() { return S.getCollection(S.KEYS.USERS); }

  function getUserById(id) { return S.getRecordById(S.KEYS.USERS, id); }

  function getActiveUserId() { return S.readJSON(S.KEYS.ACTIVE_USER_ID, null); }

  function setActiveUserId(userId) { S.writeJSON(S.KEYS.ACTIVE_USER_ID, userId); }

  function getPreferences(userId) {
    var all = S.readJSON(S.KEYS.PREFERENCES, {});
    return all[userId] || { appearanceMode: "device" };
  }

  function setPreferences(userId, prefs) {
    var all = S.readJSON(S.KEYS.PREFERENCES, {});
    all[userId] = Object.assign({}, all[userId], prefs);
    S.writeJSON(S.KEYS.PREFERENCES, all);
  }

  // ---------- Opportunities ----------

  function getOpportunities() { return S.getCollection(S.KEYS.OPPORTUNITIES); }
  function getOpportunityById(id) { return S.getRecordById(S.KEYS.OPPORTUNITIES, id); }

  function createOpportunity(fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.OPPORTUNITY, "opportunity"),
      status: "New",
      createdDate: nowIso(),
      ownerUserId: actingUser ? actingUser.id : null,
      customerName: "",
      primaryContact: "",
      projectAddress: "",
      projectType: "",
      customerType: "Residential",
      leadSource: "",
      description: "",
      nextActionDate: null,
      lossReason: null,
      lossNotes: null,
      closeDate: null,
      isDemoData: false
    }, fields);
    S.upsertRecord(S.KEYS.OPPORTUNITIES, record);
    logActivity(record.id, "Opportunity", "Created opportunity", actingUser);
    return record;
  }

  function updateOpportunity(id, changes, actingUser, changeNote) {
    var record = getOpportunityById(id);
    if (!record) throw new Error("Opportunity not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.OPPORTUNITIES, updated);
    logActivity(id, "Opportunity", changeNote || "Updated opportunity", actingUser);
    return updated;
  }

  function findPossibleDuplicateOpportunity(customerName, projectAddress, excludeId) {
    var opps = getOpportunities();
    var openStatuses = ["New", "Active", "Estimate in Progress", "Estimate Under Review", "Estimate Sent"];
    return opps.find(function (o) {
      return o.id !== excludeId &&
        openStatuses.indexOf(o.status) !== -1 &&
        (o.customerName || "").trim().toLowerCase() === (customerName || "").trim().toLowerCase() &&
        (o.projectAddress || "").trim().toLowerCase() === (projectAddress || "").trim().toLowerCase() &&
        customerName;
    }) || null;
  }

  // ---------- Activity History (opportunities + projects) ----------

  function logActivity(recordId, recordType, note, actingUser, extra) {
    var activities = S.getCollection(S.KEYS.ACTIVITIES);
    var entry = Object.assign({
      id: S.generateToken(),
      recordId: recordId,
      recordType: recordType,
      note: note,
      userId: actingUser ? actingUser.id : null,
      userName: actingUser ? actingUser.name : "System",
      timestamp: nowIso()
    }, extra || {});
    activities.push(entry);
    S.setCollection(S.KEYS.ACTIVITIES, activities);
    return entry;
  }

  function getActivitiesForRecord(recordId) {
    return S.getCollection(S.KEYS.ACTIVITIES)
      .filter(function (a) { return a.recordId === recordId; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  }

  // ---------- File placeholders ----------

  function getFilesForRecord(recordId) {
    return S.getCollection(S.KEYS.FILES).filter(function (f) { return f.recordId === recordId; });
  }

  function addFilePlaceholder(recordId, recordType, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.FILE, "file"),
      recordId: recordId,
      recordType: recordType,
      fileName: "",
      fileCategory: "Other",
      uploadedDate: nowIso(),
      uploadedByUserId: actingUser ? actingUser.id : null,
      sharePointStatus: "Not connected in this static prototype",
      notes: ""
    }, fields);
    S.upsertRecord(S.KEYS.FILES, record);
    logActivity(recordId, recordType, "Added file placeholder: " + record.fileName, actingUser);
    return record;
  }

  function deleteFilePlaceholder(fileId) {
    return S.deleteRecord(S.KEYS.FILES, fileId);
  }

  // ---------- Price Catalog / Cost Categories / Profit Goals (reference data) ----------

  function getPriceCatalog() { return S.getCollection(S.KEYS.PRICE_CATALOG); }
  function getCostCategories() { return S.getCollection(S.KEYS.COST_CATEGORIES); }
  function getCostCategoryById(id) { return S.getRecordById(S.KEYS.COST_CATEGORIES, id); }
  function getProfitGoals() { return S.getCollection(S.KEYS.PROFIT_GOALS); }

  function findProfitGoalTier(contractValue, projectType) {
    var tiers = getProfitGoals();
    var normalizedType = (projectType === "Commercial") ? "Commercial" : "Residential";
    var match = tiers.find(function (t) {
      var inRange = contractValue >= t.minValue && (t.maxValue === null || contractValue <= t.maxValue);
      var typeMatches = t.projectType === normalizedType || t.projectType === "Residential or Commercial";
      return inRange && typeMatches;
    });
    return match || null;
  }

  // ---------- Open Decisions ----------

  function getOpenDecisions() { return S.getCollection(S.KEYS.OPEN_DECISIONS); }

  function addCustomOpenDecision(fields, actingUser) {
    var record = Object.assign({
      code: "OD-CUSTOM-" + S.generateToken(),
      title: "",
      relatedTab: "",
      relatedRequirement: "",
      whyUnresolved: "",
      decisionNeeded: "",
      behaviorWhileUnresolved: "",
      custom: true,
      createdAt: nowIso(),
      createdBy: actingUser ? actingUser.name : "Unknown"
    }, fields);
    var list = getOpenDecisions();
    list.push(record);
    S.setCollection(S.KEYS.OPEN_DECISIONS, list);
    return record;
  }

  // ---------- Controlled Lists (editable starter lists) ----------

  function getControlledLists() {
    return S.readJSON(S.KEYS.CONTROLLED_LISTS, {
      leadSources: STARTER_LEAD_SOURCES.slice(),
      projectTypes: STARTER_PROJECT_TYPES.slice(),
      lossReasons: STARTER_LOSS_REASONS.slice(),
      closeoutReasons: STARTER_CLOSEOUT_REASONS.slice()
    });
  }

  function setControlledLists(lists) {
    S.writeJSON(S.KEYS.CONTROLLED_LISTS, lists);
  }

  // ---------- Estimates ----------

  function getEstimates() { return S.getCollection(S.KEYS.ESTIMATES); }
  function getEstimateById(id) { return S.getRecordById(S.KEYS.ESTIMATES, id); }

  function getEstimatesForOpportunity(opportunityId) {
    return getEstimates()
      .filter(function (e) { return e.opportunityId === opportunityId; })
      .sort(function (a, b) { return b.revisionNumber - a.revisionNumber; });
  }

  function getCurrentEstimateForOpportunity(opportunityId) {
    var all = getEstimatesForOpportunity(opportunityId);
    var nonSuperseded = all.filter(function (e) {
      return e.status !== "Superseded" && e.status !== "Declined" && e.status !== "Expired" && e.status !== "Archived";
    });
    return nonSuperseded[0] || all[0] || null;
  }

  function createEstimate(opportunityId, fields, actingUser) {
    var opp = getOpportunityById(opportunityId);
    if (!opp) throw new Error("Opportunity not found: " + opportunityId);
    var estimateNumber = S.generateId(ID_PREFIXES.ESTIMATE, "estimate");
    var record = Object.assign({
      id: estimateNumber,
      estimateNumber: estimateNumber,
      opportunityId: opportunityId,
      revisionNumber: 1,
      parentEstimateId: null,
      status: "Draft",
      estimatorUserId: actingUser ? actingUser.id : null,
      estimateType: "Installation/Project",
      customerType: opp.customerType || "Residential",
      jobAddress: opp.projectAddress || "",
      proposalExpirationDate: null,
      estimateNotes: "",
      proposalValidityDays: 30,
      createdDate: nowIso(),
      proposalLineItems: [],
      takeoffSegments: [],
      costRows: [],
      overrides: [],
      selectedTierId: null,
      overheadReservePct: OVERHEAD_RESERVE_DEFAULT,
      overheadReserveOverrideReason: null,
      contingencyReservePct: null,
      contingencyOverrideReason: null,
      equipmentRepairReservePct: null,
      sellingPrice: 0,
      manualPriceOverride: null,
      manualPriceOverrideReason: null,
      belowFloorReason: null,
      reviewHistory: [],
      sentHistory: [],
      acceptedDate: null,
      acceptedContractValue: null,
      declineReason: null,
      isDemoData: false
    }, fields);
    S.upsertRecord(S.KEYS.ESTIMATES, record);
    updateOpportunity(opportunityId, { status: "Estimate in Progress" }, actingUser, "Estimate " + estimateNumber + " created");
    logActivity(opportunityId, "Opportunity", "Created estimate " + estimateNumber + " (Revision 1)", actingUser);
    logActivity(estimateNumber, "Estimate", "Estimate created as Draft Revision 1", actingUser);
    return record;
  }

  function updateEstimate(id, changes, actingUser, changeNote) {
    var record = getEstimateById(id);
    if (!record) throw new Error("Estimate not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.ESTIMATES, updated);
    logActivity(id, "Estimate", changeNote || "Updated estimate", actingUser);
    return updated;
  }

  /**
   * Creates a protected snapshot copy of an estimate (used when submitting
   * for review, approving, sending, or accepting per README section 8).
   * The snapshot is stored inline on the estimate record as an immutable
   * object so historical values can never be altered by later edits.
   */
  function createEstimateSnapshot(estimateId, snapshotType, actingUser) {
    var est = getEstimateById(estimateId);
    if (!est) throw new Error("Estimate not found: " + estimateId);
    var snapshot = {
      snapshotId: S.generateToken(),
      snapshotType: snapshotType, // "Submitted" | "Approved" | "Sent" | "Accepted"
      createdAt: nowIso(),
      createdBy: actingUser ? actingUser.name : "System",
      dataSnapshot: JSON.parse(JSON.stringify({
        proposalLineItems: est.proposalLineItems,
        takeoffSegments: est.takeoffSegments,
        costRows: est.costRows,
        overrides: est.overrides,
        selectedTierId: est.selectedTierId,
        overheadReservePct: est.overheadReservePct,
        contingencyReservePct: est.contingencyReservePct,
        equipmentRepairReservePct: est.equipmentRepairReservePct,
        sellingPrice: est.sellingPrice,
        manualPriceOverride: est.manualPriceOverride,
        estimateNotes: est.estimateNotes,
        status: est.status
      }))
    };
    var history = est.reviewHistory || [];
    history.push(snapshot);
    updateEstimate(estimateId, { reviewHistory: history }, actingUser, "Protected snapshot created (" + snapshotType + ")");
    return snapshot;
  }

  /**
   * Creates a new revision of an estimate. The prior revision is left
   * completely unchanged in storage - only its status flips to Superseded.
   */
  function createEstimateRevision(estimateId, actingUser, revisionReason) {
    var prior = getEstimateById(estimateId);
    if (!prior) throw new Error("Estimate not found: " + estimateId);
    var newRevisionNumber = prior.revisionNumber + 1;
    var newId = prior.estimateNumber + "-R" + newRevisionNumber;
    var clone = JSON.parse(JSON.stringify(prior));
    clone.id = newId;
    clone.revisionNumber = newRevisionNumber;
    clone.parentEstimateId = prior.id;
    clone.status = "In Progress";
    clone.createdDate = nowIso();
    clone.reviewHistory = [];
    clone.sentHistory = [];
    clone.acceptedDate = null;
    clone.acceptedContractValue = null;
    clone.declineReason = null;
    clone.revisionReason = revisionReason || "";
    S.upsertRecord(S.KEYS.ESTIMATES, clone);
    updateEstimate(prior.id, { status: "Superseded" }, actingUser, "Superseded by revision " + newRevisionNumber);
    logActivity(clone.opportunityId, "Opportunity", "Created estimate revision " + newRevisionNumber + " (" + newId + ")", actingUser);
    logActivity(newId, "Estimate", "Revision " + newRevisionNumber + " created. Reason: " + (revisionReason || "Not specified"), actingUser);
    return clone;
  }

  // ---------- Follow-ups (10-day / 28-day tracking) ----------

  function getFollowUpsForEstimate(estimateId) {
    return S.getCollection(S.KEYS.FOLLOW_UPS).filter(function (f) { return f.estimateId === estimateId; });
  }

  function scheduleFollowUps(estimateId, opportunityId, sentDate, actingUser) {
    var base = new Date(sentDate);
    var day10 = new Date(base); day10.setDate(day10.getDate() + 10);
    var day28 = new Date(base); day28.setDate(day28.getDate() + 28);
    var list = S.getCollection(S.KEYS.FOLLOW_UPS);
    [
      { dueDate: day10.toISOString(), label: "10-day follow-up" },
      { dueDate: day28.toISOString(), label: "28-day follow-up" }
    ].forEach(function (fu) {
      list.push({
        id: S.generateToken(),
        estimateId: estimateId,
        opportunityId: opportunityId,
        label: fu.label,
        dueDate: fu.dueDate,
        completed: false,
        completedDate: null,
        contactMethod: null,
        outcomeNote: null,
        createdAt: nowIso()
      });
    });
    S.setCollection(S.KEYS.FOLLOW_UPS, list);
    logActivity(opportunityId, "Opportunity", "Scheduled 10-day and 28-day follow-ups from sent date", actingUser);
  }

  function completeFollowUp(followUpId, outcome, actingUser) {
    var list = S.getCollection(S.KEYS.FOLLOW_UPS);
    var idx = list.findIndex(function (f) { return f.id === followUpId; });
    if (idx === -1) throw new Error("Follow-up not found: " + followUpId);
    list[idx] = Object.assign({}, list[idx], {
      completed: true,
      completedDate: nowIso(),
      contactMethod: outcome.contactMethod || null,
      outcomeNote: outcome.outcomeNote || null
    });
    S.setCollection(S.KEYS.FOLLOW_UPS, list);
    logActivity(list[idx].opportunityId, "Opportunity", "Completed " + list[idx].label + ": " + (outcome.outcomeNote || ""), actingUser);
    return list[idx];
  }

  function stopFollowUpsForOpportunity(opportunityId) {
    var list = S.getCollection(S.KEYS.FOLLOW_UPS);
    var updated = list.map(function (f) {
      if (f.opportunityId === opportunityId && !f.completed) {
        return Object.assign({}, f, { completed: true, completedDate: nowIso(), outcomeNote: "Stopped automatically (opportunity closed)." });
      }
      return f;
    });
    S.setCollection(S.KEYS.FOLLOW_UPS, updated);
  }

  // ---------- Projects ----------

  function getProjects() { return S.getCollection(S.KEYS.PROJECTS); }
  function getProjectById(id) { return S.getRecordById(S.KEYS.PROJECTS, id); }

  /**
   * Converts a Won/Accepted estimate into a linked project. The estimate's
   * cost-row snapshot (by category) becomes the immutable Original Project
   * Budget per README section 8/9. This function NEVER mutates the source
   * estimate's cost rows - it only reads them to build the budget snapshot.
   */
  function convertEstimateToProject(estimateId, fields, actingUser) {
    var est = getEstimateById(estimateId);
    if (!est) throw new Error("Estimate not found: " + estimateId);
    var opp = getOpportunityById(est.opportunityId);

    var budgetByCategory = {};
    (est.costRows || []).forEach(function (row) {
      if (!budgetByCategory[row.costCategoryId]) budgetByCategory[row.costCategoryId] = 0;
      budgetByCategory[row.costCategoryId] += (row.quantity * row.unitCost);
    });

    var projectId = S.generateId(ID_PREFIXES.PROJECT, "project");
    var record = Object.assign({
      id: projectId,
      projectNumber: projectId,
      opportunityId: est.opportunityId,
      acceptedEstimateId: est.id,
      status: "Setup",
      customerName: opp ? opp.customerName : "",
      jobAddress: opp ? opp.projectAddress : est.jobAddress,
      projectManagerUserId: null,
      projectType: opp ? opp.projectType : "",
      startDate: null,
      completionDate: null,
      closeoutNotes: null,
      closeoutReason: null,
      // ORIGINAL PROJECT BUDGET - immutable once set. Never modified after creation.
      originalProjectBudget: {
        totalDirectEstimatedCost: est.calculatedSnapshot ? est.calculatedSnapshot.directEstimatedCost : null,
        byCategory: budgetByCategory,
        overheadReservePct: est.overheadReservePct,
        contingencyReservePct: est.contingencyReservePct,
        equipmentRepairReservePct: est.equipmentRepairReservePct,
        sellingPrice: est.sellingPrice,
        snapshotTakenAt: nowIso()
      },
      originalContractValue: est.acceptedContractValue || est.sellingPrice,
      createdDate: nowIso(),
      isDemoData: false
    }, fields);

    S.upsertRecord(S.KEYS.PROJECTS, record);
    logActivity(projectId, "Project", "Project created from accepted estimate " + est.id, actingUser);
    logActivity(est.opportunityId, "Opportunity", "Project " + projectId + " created from accepted estimate", actingUser);
    return record;
  }

  function updateProject(id, changes, actingUser, changeNote) {
    var record = getProjectById(id);
    if (!record) throw new Error("Project not found: " + id);
    // Guard: never allow originalProjectBudget or originalContractValue to be
    // silently overwritten through the generic update path.
    var safeChanges = Object.assign({}, changes);
    delete safeChanges.originalProjectBudget;
    var updated = Object.assign({}, record, safeChanges);
    S.upsertRecord(S.KEYS.PROJECTS, updated);
    logActivity(id, "Project", changeNote || "Updated project", actingUser);
    return updated;
  }

  // ---------- Expenses ----------

  function getExpensesForProject(projectId) {
    return S.getCollection(S.KEYS.EXPENSES).filter(function (e) { return e.projectId === projectId; });
  }

  function createExpense(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.EXPENSE, "expense"),
      projectId: projectId,
      expenseDate: nowIso(),
      costCategoryId: "CAT-001",
      proposalLineItemId: null,
      vendor: "",
      description: "",
      amountBeforeTax: 0,
      tax: 0,
      totalAmount: 0,
      approvalStatus: "Draft",
      paymentStatus: "Unpaid",
      paidDate: null,
      paymentMethod: null,
      submittedByUserId: actingUser ? actingUser.id : null,
      approvedByUserId: null,
      rejectionNote: null,
      attachmentPlaceholder: null,
      quickBooksReference: null
    }, fields);
    record.totalAmount = round2(record.amountBeforeTax + record.tax);
    S.upsertRecord(S.KEYS.EXPENSES, record);
    logActivity(projectId, "Project", "Added expense: " + record.description + " ($" + record.totalAmount.toFixed(2) + ")", actingUser);
    return record;
  }

  function updateExpense(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.EXPENSES, id);
    if (!record) throw new Error("Expense not found: " + id);
    var updated = Object.assign({}, record, changes);
    if (changes.amountBeforeTax !== undefined || changes.tax !== undefined) {
      updated.totalAmount = round2(updated.amountBeforeTax + updated.tax);
    }
    S.upsertRecord(S.KEYS.EXPENSES, updated);
    S.appendAuditEntry({ recordType: "Expense", recordId: id, projectId: updated.projectId, action: changeNote || "Updated", userId: actingUser ? actingUser.id : null, userName: actingUser ? actingUser.name : "System" });
    logActivity(updated.projectId, "Project", changeNote || "Updated expense " + id, actingUser);
    return updated;
  }

  // ---------- Subcontractor Costs ----------

  function getSubcontractorCostsForProject(projectId) {
    return S.getCollection(S.KEYS.SUBCONTRACTOR_COSTS).filter(function (s) { return s.projectId === projectId; });
  }

  function createSubcontractorCost(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.SUBCONTRACTOR_COST, "subcontractor"),
      projectId: projectId,
      subcontractorName: "",
      scopeDescription: "",
      proposalLineItemId: null,
      costCategoryId: "CAT-003",
      commitmentAmount: 0,
      invoiceDate: null,
      invoiceNumber: null,
      invoiceAmount: 0,
      retainage: 0,
      approvalStatus: "Draft",
      paid: false,
      paidDate: null,
      notes: "",
      attachmentPlaceholder: null,
      quickBooksReference: null
    }, fields);
    S.upsertRecord(S.KEYS.SUBCONTRACTOR_COSTS, record);
    logActivity(projectId, "Project", "Added subcontractor cost: " + record.subcontractorName, actingUser);
    return record;
  }

  function updateSubcontractorCost(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.SUBCONTRACTOR_COSTS, id);
    if (!record) throw new Error("Subcontractor cost not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.SUBCONTRACTOR_COSTS, updated);
    logActivity(updated.projectId, "Project", changeNote || "Updated subcontractor cost " + id, actingUser);
    return updated;
  }

  // ---------- ABC Construction Internal Labor ----------

  function getLaborEntriesForProject(projectId) {
    return S.getCollection(S.KEYS.LABOR_ENTRIES).filter(function (l) { return l.projectId === projectId; });
  }

  function createLaborEntry(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.LABOR_ENTRY, "labor"),
      projectId: projectId,
      workDate: nowIso(),
      employeeName: "",
      role: "",
      proposalLineItemId: null,
      laborType: "Crew Hours",
      hours: 0,
      hourlyInternalRate: 0,
      manualAmountOverride: null,
      manualAmountOverrideReason: null,
      totalLaborCost: 0,
      notes: "",
      enteredByUserId: actingUser ? actingUser.id : null,
      approvalStatus: "Draft",
      payrollProcessed: false,
      payrollReference: null
    }, fields);
    record.totalLaborCost = record.manualAmountOverride !== null && record.manualAmountOverride !== undefined
      ? record.manualAmountOverride
      : round2(record.hours * record.hourlyInternalRate);
    S.upsertRecord(S.KEYS.LABOR_ENTRIES, record);
    logActivity(projectId, "Project", "Added ABC Construction labor entry: " + record.employeeName + " (" + record.hours + " hrs)", actingUser);
    return record;
  }

  function updateLaborEntry(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.LABOR_ENTRIES, id);
    if (!record) throw new Error("Labor entry not found: " + id);
    var updated = Object.assign({}, record, changes);
    updated.totalLaborCost = updated.manualAmountOverride !== null && updated.manualAmountOverride !== undefined
      ? updated.manualAmountOverride
      : round2(updated.hours * updated.hourlyInternalRate);
    S.upsertRecord(S.KEYS.LABOR_ENTRIES, updated);
    logActivity(updated.projectId, "Project", changeNote || "Updated labor entry " + id, actingUser);
    return updated;
  }

  // ---------- Change Orders ----------

  function getChangeOrdersForProject(projectId) {
    return S.getCollection(S.KEYS.CHANGE_ORDERS).filter(function (c) { return c.projectId === projectId; });
  }

  function createChangeOrder(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.CHANGE_ORDER, "changeorder"),
      projectId: projectId,
      changeOrderNumber: null,
      description: "",
      amount: 0,
      status: "Draft",
      approvedDate: null,
      requestedByUserId: actingUser ? actingUser.id : null,
      attachmentPlaceholder: null,
      notes: ""
    }, fields);
    if (!record.changeOrderNumber) {
      var existing = getChangeOrdersForProject(projectId);
      record.changeOrderNumber = "CO-" + (existing.length + 1);
    }
    S.upsertRecord(S.KEYS.CHANGE_ORDERS, record);
    logActivity(projectId, "Project", "Added change order " + record.changeOrderNumber + ": " + record.description, actingUser);
    return record;
  }

  function updateChangeOrder(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.CHANGE_ORDERS, id);
    if (!record) throw new Error("Change order not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.CHANGE_ORDERS, updated);
    logActivity(updated.projectId, "Project", changeNote || "Updated change order " + id, actingUser);
    return updated;
  }

  // ---------- Invoices ----------

  function getInvoicesForProject(projectId) {
    return S.getCollection(S.KEYS.INVOICES).filter(function (i) { return i.projectId === projectId; });
  }

  function createInvoice(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.INVOICE, "invoice"),
      projectId: projectId,
      invoiceNumber: null,
      invoiceDate: nowIso(),
      dueDate: null,
      invoiceAmount: 0,
      status: "Draft",
      notes: "",
      attachmentPlaceholder: null,
      quickBooksReference: null
    }, fields);
    if (!record.invoiceNumber) {
      var existing = getInvoicesForProject(projectId);
      record.invoiceNumber = "INV-" + (existing.length + 1);
    }
    S.upsertRecord(S.KEYS.INVOICES, record);
    logActivity(projectId, "Project", "Created invoice " + record.invoiceNumber + " for $" + record.invoiceAmount.toFixed(2), actingUser);
    return record;
  }

  function updateInvoice(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.INVOICES, id);
    if (!record) throw new Error("Invoice not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.INVOICES, updated);
    logActivity(updated.projectId, "Project", changeNote || "Updated invoice " + id, actingUser);
    return updated;
  }

  // ---------- Customer Payments ----------

  function getPaymentsForProject(projectId) {
    return S.getCollection(S.KEYS.PAYMENTS).filter(function (p) { return p.projectId === projectId; });
  }

  function createPayment(projectId, fields, actingUser) {
    var record = Object.assign({
      id: S.generateId(ID_PREFIXES.PAYMENT, "payment"),
      projectId: projectId,
      relatedInvoiceId: null,
      paymentDate: nowIso(),
      amount: 0,
      paymentMethod: "Check",
      paymentReference: null,
      notes: "",
      quickBooksReference: null
    }, fields);
    S.upsertRecord(S.KEYS.PAYMENTS, record);
    logActivity(projectId, "Project", "Recorded customer payment of $" + record.amount.toFixed(2), actingUser);
    return record;
  }

  function updatePayment(id, changes, actingUser, changeNote) {
    var record = S.getRecordById(S.KEYS.PAYMENTS, id);
    if (!record) throw new Error("Payment not found: " + id);
    var updated = Object.assign({}, record, changes);
    S.upsertRecord(S.KEYS.PAYMENTS, updated);
    logActivity(updated.projectId, "Project", changeNote || "Updated payment " + id, actingUser);
    return updated;
  }

  // ---------- Small utility ----------

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  // =========================================================================
  // SEEDING - demo dataset. Everything created here is marked isDemoData:true
  // wherever the field exists, and the whole dataset can be wiped and rebuilt
  // by Reset Demo Data (see resetDemoData below).
  // =========================================================================

  function seedReferenceData() {
    S.setCollection(S.KEYS.COST_CATEGORIES, COST_CATEGORIES_SEED);
    S.setCollection(S.KEYS.PRICE_CATALOG, PRICE_CATALOG_SEED);
    S.setCollection(S.KEYS.PROFIT_GOALS, PROFIT_GOALS_SEED);
    S.setCollection(S.KEYS.OPEN_DECISIONS, OPEN_DECISIONS_SEED);
    setControlledLists({
      leadSources: STARTER_LEAD_SOURCES.slice(),
      projectTypes: STARTER_PROJECT_TYPES.slice(),
      lossReasons: STARTER_LOSS_REASONS.slice(),
      closeoutReasons: STARTER_CLOSEOUT_REASONS.slice()
    });
  }

  function seedUsers() {
    var users = [
      { id: "USR-0001", name: "Taylor Nguyen", role: "Estimator", initials: "TN" },
      { id: "USR-0002", name: "Morgan Blake", role: "Manager / Approver", initials: "MB" },
      { id: "USR-0003", name: "Sam Rivera", role: "Owner", initials: "SR" },
      { id: "USR-0004", name: "Jordan Lee", role: "Accounting", initials: "JL" },
      { id: "USR-0005", name: "Casey Ford", role: "Project Manager", initials: "CF" }
    ];
    S.setCollection(S.KEYS.USERS, users);
    S.writeJSON(S.KEYS.ACTIVE_USER_ID, users[0].id);
    return users;
  }

  /**
   * Builds a full connected demo workflow: one won opportunity/estimate/
   * project with financial activity, plus a couple of opportunities in
   * earlier stages so every list view has content to show.
   */
  function seedDemoWorkflow(users) {
    var estimator = users[0], approver = users[1], owner = users[2], accountant = users[3], pm = users[4];

    // ---- Opportunity 1: full won workflow through project financials ----
    var opp1 = createOpportunity({
      customerName: "Hill Country Residence - Lantana Trail",
      primaryContact: "Dana Whitfield",
      projectAddress: "4820 Lantana Trail, Austin, TX 78735",
      projectType: "Residential Retaining Wall",
      customerType: "Residential",
      leadSource: "Referral",
      description: "Front yard limestone block retaining wall replacing a failing timber wall, with drainage.",
      status: "New",
      isDemoData: true
    }, estimator);

    updateOpportunity(opp1.id, { status: "Active" }, estimator, "Confirmed customer and project details");

    addFilePlaceholder(opp1.id, "Opportunity", {
      fileName: "Site-Visit-Photos.zip",
      fileCategory: "Photos",
      notes: "Demo placeholder - representative of photos taken during initial site visit."
    }, estimator);
    addFilePlaceholder(opp1.id, "Opportunity", {
      fileName: "Property-Survey.pdf",
      fileCategory: "Plans",
      notes: "Demo placeholder - representative of a customer-provided survey document."
    }, estimator);

    var est1 = createEstimate(opp1.id, {
      estimateType: "Installation/Project",
      customerType: "Residential",
      proposalExpirationDate: addDaysIso(nowIso(), 30),
      estimateNotes: "Front wall replacement with drainage; Block Wall system.",
      proposalLineItems: [
        { id: "PLI-" + opp1.id + "-1", title: "Front Retaining Wall Installation", description: "Remove existing timber wall and install new limestone block retaining wall with drainage.", sortOrder: 1, visibleOnProposal: true, customerFacingNote: "Includes demolition of existing wall, new limestone block wall, drainage gravel, and perforated drain pipe behind wall." },
        { id: "PLI-" + opp1.id + "-2", title: "Limestone Cap Installation", description: "Install limestone cap along the full wall length.", sortOrder: 2, visibleOnProposal: true, customerFacingNote: "Limestone cap finish along the top of the new wall." }
      ]
    }, estimator);

    var segment1 = {
      id: "SEG-" + est1.id + "-1",
      segmentName: "Front Retaining Wall",
      assignedProposalLineItemId: "PLI-" + opp1.id + "-1",
      segmentType: "Installed Wall",
      wallType: "Block Wall",
      scopeDescription: "Replace existing timber wall with limestone block retaining wall.",
      wallLength: 48.0,
      averageExposedHeight: 4.0,
      numberOfCourses: 6,
      blockHeight: 0.67,
      blockLength: 2.0,
      wallShape: "Straight",
      cornerReturnEndCount: 2,
      capRequired: true,
      capProductCatalogId: "COST-077",
      demolitionRequired: true,
      demolitionScopeType: "Timber / Railroad Tie Wall",
      demolitionQuantity: 192.0,
      demolitionUnit: "SF",
      demolitionConditions: ["Rot / Wet"],
      drainageRequired: true,
      gravelBedWidth: 2.0,
      drainOutletCount: 1,
      geogridRequired: false,
      engineeringRequired: false,
      accessLevel: "Moderate",
      siteSlope: "Moderate Slope",
      soilCondition: "Clay",
      equipmentRows: [
        { id: "EQ-1", catalogId: "COST-013", label: "Skid Steer (Tracks)", durationValue: 2, durationUnit: "Days", role: "Both", ownership: "Company-Owned" },
        { id: "EQ-2", catalogId: "COST-016", label: "Backhoe", durationValue: 1, durationUnit: "Days", role: "Cost Only", ownership: "Company-Owned" }
      ],
      manualAdjustmentNeeded: false,
      calculatedOutputs: null,
      overrides: []
    };

    est1.takeoffSegments = [segment1];
    updateEstimate(est1.id, { takeoffSegments: [segment1] }, estimator, "Added takeoff segment: Front Retaining Wall");

    // Run the calculation engine (calculations.js) to populate cost rows and
    // financials, if available at seed time.
    if (global.AbcCalculations && typeof global.AbcCalculations.recalculateEstimate === "function") {
      var recalculated = global.AbcCalculations.recalculateEstimate(getEstimateById(est1.id));
      updateEstimate(est1.id, recalculated, estimator, "Ran material and labor calculations");
    }

    // Move through the workflow to Won using the same status-transition
    // functions the UI will call, so the demo data is a true product of
    // the governed workflow rather than a hand-faked end state.
    var current = getEstimateById(est1.id);
    updateEstimate(current.id, { status: "In Progress" }, estimator, "Estimate information complete");
    updateEstimate(current.id, { status: "Ready for Review" }, estimator, "Proposal preview generated");
    createEstimateSnapshot(current.id, "Submitted", estimator);
    updateEstimate(current.id, { status: "Ready for Review" }, estimator, "Submitted for internal review");
    updateOpportunity(opp1.id, { status: "Estimate Under Review" }, estimator, "Estimate submitted for review");

    createEstimateSnapshot(current.id, "Approved", approver);
    updateEstimate(current.id, { status: "Approved to Send" }, approver, "Approved to send by manager");

    var sentDate = addDaysIso(nowIso(), -35);
    createEstimateSnapshot(current.id, "Sent", estimator);
    updateEstimate(current.id, { status: "Sent", sentHistory: [{ sentDate: sentDate, sentBy: estimator.name, method: "Email (recorded manually)" }] }, estimator, "Proposal sent to customer");
    updateOpportunity(opp1.id, { status: "Estimate Sent" }, estimator, "Estimate sent");
    scheduleFollowUps(current.id, opp1.id, sentDate, estimator);

    var completedFollowUps = getFollowUpsForEstimate(current.id);
    if (completedFollowUps[0]) {
      completeFollowUp(completedFollowUps[0].id, { contactMethod: "Phone", outcomeNote: "Customer reviewing with spouse, positive signal." }, estimator);
    }

    var finalEstimate = getEstimateById(current.id);
    var acceptedValue = finalEstimate.sellingPrice || 0;
    createEstimateSnapshot(current.id, "Accepted", estimator);
    updateEstimate(current.id, {
      status: "Accepted",
      acceptedDate: nowIso(),
      acceptedContractValue: acceptedValue
    }, estimator, "Marked as accepted by customer");
    updateOpportunity(opp1.id, { status: "Won", closeDate: nowIso() }, estimator, "Opportunity marked Won");
    stopFollowUpsForOpportunity(opp1.id);

    var project1 = convertEstimateToProject(current.id, {
      projectManagerUserId: pm.id,
      status: "Active",
      startDate: addDaysIso(nowIso(), -25),
      isDemoData: true
    }, estimator);

    updateProject(project1.id, { status: "Active" }, pm, "Project mobilized and started");

    // Financial activity on the won project
    var exp1 = createExpense(project1.id, {
      expenseDate: addDaysIso(nowIso(), -20),
      costCategoryId: "CAT-001",
      vendor: "Central Texas Stone Supply",
      description: "Limestone block delivery",
      amountBeforeTax: 3200.00,
      tax: 264.00,
      approvalStatus: "Submitted",
      isDemoData: true
    }, pm);
    updateExpense(exp1.id, { approvalStatus: "Approved", approvedByUserId: accountant.id }, accountant, "Approved expense");
    updateExpense(exp1.id, { paymentStatus: "Paid", paidDate: addDaysIso(nowIso(), -18), paymentMethod: "Company Card" }, accountant, "Marked expense paid");

    var exp2 = createExpense(project1.id, {
      expenseDate: addDaysIso(nowIso(), -15),
      costCategoryId: "CAT-006",
      vendor: "Circle K Fuel",
      description: "Equipment fuel - week 1",
      amountBeforeTax: 210.00,
      tax: 0,
      approvalStatus: "Submitted",
      isDemoData: true
    }, pm);
    updateExpense(exp2.id, { approvalStatus: "Approved", approvedByUserId: accountant.id }, accountant, "Approved expense");

    var sub1 = createSubcontractorCost(project1.id, {
      subcontractorName: "Rivera Excavation LLC",
      scopeDescription: "Excavation and demolition support",
      costCategoryId: "CAT-003",
      commitmentAmount: 2800.00,
      invoiceDate: addDaysIso(nowIso(), -12),
      invoiceNumber: "RIV-1042",
      invoiceAmount: 2800.00,
      approvalStatus: "Submitted",
      isDemoData: true
    }, pm);
    updateSubcontractorCost(sub1.id, { approvalStatus: "Approved" }, accountant, "Approved subcontractor invoice");
    updateSubcontractorCost(sub1.id, { paid: true, paidDate: addDaysIso(nowIso(), -8) }, accountant, "Marked subcontractor invoice paid");

    var labor1 = createLaborEntry(project1.id, {
      workDate: addDaysIso(nowIso(), -10),
      employeeName: "ABC Crew - Wall Installation",
      role: "Wall Installer",
      laborType: "Crew Hours",
      hours: 36,
      hourlyInternalRate: 27.65,
      approvalStatus: "Submitted",
      isDemoData: true
    }, pm);
    updateLaborEntry(labor1.id, { approvalStatus: "Approved" }, accountant, "Approved labor entry");

    var co1 = createChangeOrder(project1.id, {
      description: "Add 6 additional linear feet of wall at customer request",
      amount: 1450.00,
      status: "Submitted",
      isDemoData: true
    }, pm);
    updateChangeOrder(co1.id, { status: "Approved", approvedDate: addDaysIso(nowIso(), -6) }, owner, "Approved change order");

    var inv1 = createInvoice(project1.id, {
      invoiceDate: addDaysIso(nowIso(), -24),
      dueDate: addDaysIso(nowIso(), -10),
      invoiceAmount: round2(acceptedValue * 0.5),
      status: "Paid",
      isDemoData: true
    }, accountant);

    createPayment(project1.id, {
      relatedInvoiceId: inv1.id,
      paymentDate: addDaysIso(nowIso(), -22),
      amount: round2(acceptedValue * 0.5),
      paymentMethod: "Check",
      paymentReference: "Check #1042",
      isDemoData: true
    }, accountant);

    var inv2 = createInvoice(project1.id, {
      invoiceDate: addDaysIso(nowIso(), -5),
      dueDate: addDaysIso(nowIso(), 9),
      invoiceAmount: round2((acceptedValue * 0.5) + 1450.00),
      status: "Sent",
      isDemoData: true
    }, accountant);

    // ---- Opportunity 2: earlier-stage opportunity (Estimate in Progress) ----
    var opp2 = createOpportunity({
      customerName: "Riverside Commercial Plaza",
      primaryContact: "Pat Osei",
      projectAddress: "1200 Riverside Dr, Austin, TX 78704",
      projectType: "Commercial Retaining Wall",
      customerType: "Commercial",
      leadSource: "Website Inquiry",
      description: "Parking lot grade change requiring a chopped stone retaining wall section.",
      status: "Active",
      isDemoData: true
    }, estimator);

    var est2 = createEstimate(opp2.id, {
      estimateType: "Installation/Project",
      customerType: "Commercial",
      estimateNotes: "Awaiting finalized site plan before takeoff can be completed.",
      proposalLineItems: [
        { id: "PLI-" + opp2.id + "-1", title: "Parking Lot Retaining Wall", description: "Chopped stone retaining wall along the east parking edge.", sortOrder: 1, visibleOnProposal: true, customerFacingNote: "" }
      ],
      isDemoData: true
    }, estimator);
    updateEstimate(est2.id, { status: "In Progress" }, estimator, "Awaiting site plan for takeoff");

    // ---- Opportunity 3: lost opportunity (for win/loss reporting demo) ----
    var opp3 = createOpportunity({
      customerName: "Circle C Backyard Wall",
      primaryContact: "Jamie Sutter",
      projectAddress: "9010 Slaughter Ln, Austin, TX 78748",
      projectType: "Residential Retaining Wall",
      customerType: "Residential",
      leadSource: "Phone Call",
      description: "Small backyard fieldstone wall inquiry.",
      status: "Active",
      isDemoData: true
    }, estimator);
    var est3 = createEstimate(opp3.id, { estimateType: "Installation/Project", customerType: "Residential", isDemoData: true }, estimator);
    updateEstimate(est3.id, { status: "Sent", sentHistory: [{ sentDate: addDaysIso(nowIso(), -50), sentBy: estimator.name, method: "Email" }] }, estimator, "Proposal sent");
    updateOpportunity(opp3.id, { status: "Estimate Sent" }, estimator, "Estimate sent");
    updateEstimate(est3.id, { status: "Declined", declineReason: "Price" }, estimator, "Customer declined - price");
    updateOpportunity(opp3.id, { status: "Lost", lossReason: "Price", closeDate: addDaysIso(nowIso(), -45) }, estimator, "Opportunity marked Lost - Price");
    stopFollowUpsForOpportunity(opp3.id);
  }

  function addDaysIso(isoString, days) {
    var d = new Date(isoString);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  /**
   * Full demo seed entry point. Wipes all data and rebuilds reference data,
   * demo users, and the connected demo workflow described above.
   */
  function seedAll() {
    S.clearAllData();
    S.writeJSON(S.KEYS.SCHEMA_VERSION, S.SCHEMA_VERSION);
    seedReferenceData();
    var users = seedUsers();
    S.setCollection(S.KEYS.PREFERENCES, {});
    seedDemoWorkflow(users);
    S.writeJSON(S.KEYS.SEEDED_FLAG, true);
  }

  function isSeeded() {
    return !!S.readJSON(S.KEYS.SEEDED_FLAG, false);
  }

  /**
   * Reset Demo Data action. Caller (ui.js) is responsible for confirming
   * this destructive action with the user before calling it.
   */
  function resetDemoData() {
    seedAll();
  }

  function ensureSeeded() {
    if (!isSeeded()) {
      seedAll();
    }
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  global.AbcData = {
    // constants / controlled lists
    OPPORTUNITY_STATUSES: OPPORTUNITY_STATUSES,
    ESTIMATE_STATUSES: ESTIMATE_STATUSES,
    PROJECT_STATUSES: PROJECT_STATUSES,
    EXPENSE_APPROVAL_STATUSES: EXPENSE_APPROVAL_STATUSES,
    EXPENSE_PAYMENT_STATUSES: EXPENSE_PAYMENT_STATUSES,
    CHANGE_ORDER_STATUSES: CHANGE_ORDER_STATUSES,
    INVOICE_STATUSES: INVOICE_STATUSES,
    SUBCONTRACTOR_APPROVAL_STATUSES: SUBCONTRACTOR_APPROVAL_STATUSES,
    LABOR_APPROVAL_STATUSES: LABOR_APPROVAL_STATUSES,
    WALL_TYPES: WALL_TYPES,
    TAKEOFF_SEGMENT_TYPES: TAKEOFF_SEGMENT_TYPES,
    ACCESS_LEVELS: ACCESS_LEVELS,
    SITE_SLOPES: SITE_SLOPES,
    SOIL_CONDITIONS: SOIL_CONDITIONS,
    WALL_SHAPES: WALL_SHAPES,
    DEMOLITION_SCOPE_TYPES: DEMOLITION_SCOPE_TYPES,
    EQUIPMENT_ROLES: EQUIPMENT_ROLES,
    EQUIPMENT_OWNERSHIP: EQUIPMENT_OWNERSHIP,
    ADJUSTMENT_TYPES: ADJUSTMENT_TYPES,
    TAX_RATE_DEFAULT: TAX_RATE_DEFAULT,
    OVERHEAD_RESERVE_DEFAULT: OVERHEAD_RESERVE_DEFAULT,
    OVERHEAD_RESERVE_MIN: OVERHEAD_RESERVE_MIN,
    OVERHEAD_RESERVE_MAX: OVERHEAD_RESERVE_MAX,
    ID_PREFIXES: ID_PREFIXES,

    // users & preferences
    getUsers: getUsers,
    getUserById: getUserById,
    getActiveUserId: getActiveUserId,
    setActiveUserId: setActiveUserId,
    getPreferences: getPreferences,
    setPreferences: setPreferences,

    // opportunities
    getOpportunities: getOpportunities,
    getOpportunityById: getOpportunityById,
    createOpportunity: createOpportunity,
    updateOpportunity: updateOpportunity,
    findPossibleDuplicateOpportunity: findPossibleDuplicateOpportunity,

    // activity & files
    logActivity: logActivity,
    getActivitiesForRecord: getActivitiesForRecord,
    getFilesForRecord: getFilesForRecord,
    addFilePlaceholder: addFilePlaceholder,
    deleteFilePlaceholder: deleteFilePlaceholder,

    // reference data
    getPriceCatalog: getPriceCatalog,
    getCostCategories: getCostCategories,
    getCostCategoryById: getCostCategoryById,
    getProfitGoals: getProfitGoals,
    findProfitGoalTier: findProfitGoalTier,
    getOpenDecisions: getOpenDecisions,
    addCustomOpenDecision: addCustomOpenDecision,
    getControlledLists: getControlledLists,
    setControlledLists: setControlledLists,

    // estimates
    getEstimates: getEstimates,
    getEstimateById: getEstimateById,
    getEstimatesForOpportunity: getEstimatesForOpportunity,
    getCurrentEstimateForOpportunity: getCurrentEstimateForOpportunity,
    createEstimate: createEstimate,
    updateEstimate: updateEstimate,
    createEstimateSnapshot: createEstimateSnapshot,
    createEstimateRevision: createEstimateRevision,

    // follow-ups
    getFollowUpsForEstimate: getFollowUpsForEstimate,
    scheduleFollowUps: scheduleFollowUps,
    completeFollowUp: completeFollowUp,
    stopFollowUpsForOpportunity: stopFollowUpsForOpportunity,

    // projects
    getProjects: getProjects,
    getProjectById: getProjectById,
    convertEstimateToProject: convertEstimateToProject,
    updateProject: updateProject,

    // expenses
    getExpensesForProject: getExpensesForProject,
    createExpense: createExpense,
    updateExpense: updateExpense,

    // subcontractor costs
    getSubcontractorCostsForProject: getSubcontractorCostsForProject,
    createSubcontractorCost: createSubcontractorCost,
    updateSubcontractorCost: updateSubcontractorCost,

    // labor
    getLaborEntriesForProject: getLaborEntriesForProject,
    createLaborEntry: createLaborEntry,
    updateLaborEntry: updateLaborEntry,

    // change orders
    getChangeOrdersForProject: getChangeOrdersForProject,
    createChangeOrder: createChangeOrder,
    updateChangeOrder: updateChangeOrder,

    // invoices
    getInvoicesForProject: getInvoicesForProject,
    createInvoice: createInvoice,
    updateInvoice: updateInvoice,

    // payments
    getPaymentsForProject: getPaymentsForProject,
    createPayment: createPayment,
    updatePayment: updatePayment,

    // seeding / reset / import-export passthrough
    seedAll: seedAll,
    isSeeded: isSeeded,
    resetDemoData: resetDemoData,
    ensureSeeded: ensureSeeded,

    // utility
    round2: round2,
    addDaysIso: addDaysIso
  };

})(window);
