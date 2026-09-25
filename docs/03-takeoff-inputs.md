# Takeoff Inputs

Source: workbook tab "Takeoff Inputs". Estimator-entered takeoff fields:
data types, units, required conditions, validation, multi-segment support,
calculation inputs. Each field below: **ID | Group | Label | Type | Unit |
Required? | When Required | Validation | Feeds | Override Rule | Notes**

## Record Identity

- **TO-001 Takeoff Segment Name** — Text. Required always. Must be unique
  within the estimate. Feeds all takeoff calc records and estimate
  display. Each estimate may contain multiple takeoff segments.
- **TO-002 Assigned Proposal Line Item** — Dropdown (text-backed).
  Required always. Must select an existing proposal line item on the same
  estimate. Do not use a fixed customer-facing scope catalog.
- **TO-003 Takeoff Segment Type** — Dropdown. Required always. Values:
  Installed Wall; Material-Only Sale; Demolition Only; Other Custom Scope.
  Material-only sale segments do not require retaining-wall geometry
  unless the estimator chooses to use it.
- **TO-004 Wall Type / System** — Dropdown. Conditional: required when
  Segment Type = Installed Wall. Values: Fieldstone Wall; Block Wall;
  Chopped Stone Wall; Keystone/CMU Wall; Other (list is
  authorized-user-maintained). Determines available calculation rules and
  design inputs.
- **TO-005 Scope Description** — Long text. Optional. Internal by default;
  customer-facing wording belongs on proposal line items.

## Wall Geometry

- **TO-006 Wall Length** (LF) — Decimal. Conditional (installed wall
  rules). Must be > 0 when required. Use measured face length, not trench
  length, unless a rule expressly requires trench length.
- **TO-007 Average Exposed Height** (FT) — Decimal. Conditional. ≥ 0.
  Excludes cap height unless the selected wall rule states otherwise.
- **TO-008 Minimum Exposed Height** (FT) — Decimal. Optional (when height
  varies). Must be ≤ Maximum Exposed Height when both entered. Used only
  by rules that explicitly require minimum height.
- **TO-009 Maximum Exposed Height** (FT) — Decimal. Optional. Must be ≥
  Average and Minimum when entered. Used for stepped walls, engineering,
  risk review.
- **TO-010 Calculated Above-Ground Wall Face Area** (SF) — System-
  calculated, read-only. May be overridden only through TO-011.
- **TO-011 Wall Face Area Override** (SF) — Decimal. Optional, only when
  calculated area is not appropriate. Must be > 0; requires TO-012 reason.
  Overrides the calculated output only for the current estimate revision.
  App must show both calculated and override values plus the reason.
- **TO-012 Wall Face Area Override Reason** — Long text. Required when
  TO-011 is entered. Do not allow an override without this reason.
- **TO-013 Wall Shape / Alignment** — Dropdown. Conditional (installed
  wall). Values: Straight; Curved; Stepped; Terraced; Angled; Other
  (requires explanatory note).
- **TO-014 Corner / Return / End Count** (EA) — Whole number. Optional. ≥
  0 integer.
- **TO-015 Wall Depth / Thickness** (FT) — Decimal. Conditional (when
  selected material rule requires it). Must be > 0 when required. Not the
  same as base width or gravel-bed width.
- **TO-016 Base Width** (FT) — Decimal. Conditional. Must be > 0 when
  required. For block/stone systems may come from a design profile;
  preserve selected source.
- **TO-017 Cap Required?** — Boolean. Conditional (installed wall). May be
  a separate customer-facing proposal line item while remaining linked to
  this segment.
- **TO-018 Cap Product / Type** — Dropdown. Conditional (Cap Required =
  Yes). Must select an active compatible Price Catalog item or approved
  custom item. Save catalog item ID and price snapshot when used.
- **TO-019 Cap Thickness / Height** (IN or FT) — Decimal. Optional (only
  when required by selected rule). Use one standard stored unit; display
  conversion if needed.
- **TO-020 Steps / Stairs Required?** — Boolean. Conditional (installed
  wall). Complex stairs may use their own takeoff segment.
- **TO-021 Number of Steps / Risers** (EA) — Whole number. Conditional
  (Steps Required = Yes). Positive integer.
- **TO-022 Step Width** (FT) — Decimal. Conditional (Steps Required = Yes
  and a selected rule requires it). Must be > 0 when required.

## Excavation

- **TO-023 Base Trench Length** (LF) — Decimal. Conditional. Defaults from
  Wall Length but may be changed; must be > 0 when required. Store whether
  defaulted or manually changed.
- **TO-024 Excavation Depth** (FT) — Decimal. Conditional. Must be > 0
  when required. Do not confuse with wall embedment depth.
- **TO-025 Excavation Width** (FT) — Decimal. Conditional. Must be > 0
  when required. Do not auto-set equal to base width unless a rule states
  it.
- **TO-026 Wall Embedment Depth** (FT) — Decimal, read-only when
  calculated, manual only when rule permits. For Block Wall, the selected
  rule may calculate this from course count/block height and exposed
  height.
- **TO-027 Demolition / Removal Required?** — Boolean. Required always.
  When Yes, require at least one demolition scope record.
- **TO-028 Demolition Scope Type** — Repeatable dropdown. Conditional
  (TO-027 = Yes). Values: Site Clearing; Tree Removal; Fence Removal;
  Stone Wall; CMU/Brick Wall; Timber/Railroad Tie Wall; Poured Concrete
  Wall; Drainage Removal; Footer Removal; Material Sorting; Other. Use
  repeatable records — a project may have multiple demolition types.
- **TO-029 Demolition Quantity** — Decimal, unit depends on scope type
  (e.g., SF, LF, CY, EA). Conditional, required per demolition scope
  record. Must be > 0.
- **TO-030 Demolition Condition Inputs** — Multi-select/structured.
  Conditional (when selected labor rule requires conditions). UI must show
  only conditions used by the selected labor rule.
- **TO-031 Demolition Description / Disposal Notes** — Long text.
  Conditional (TO-027 = Yes), required text. Does not replace structured
  quantity/condition inputs.

## Drainage

- **TO-032 Drainage Required?** — Boolean. Conditional (installed wall
  work). Use the actual selected system; do not assume all projects use
  identical drainage.
- **TO-033 Drain Pipe Length** (LF) — Decimal. Conditional (Drainage
  Required = Yes and rule doesn't calculate it). May default from wall
  length; override requires reason if materially different.
- **TO-034 Drain Outlet Count** (EA) — Whole number. Optional. ≥ 0
  integer.
- **TO-035 Drainage Gravel Bed Width** (FT) — Decimal. Conditional
  (required when selected material rule requires it). Must be > 0 when
  required. Not the same as base width unless a rule explicitly states it.
- **TO-036 Drainage Gravel Height / Depth** (FT) — Decimal. Conditional.
  Must be > 0 when required.
- **TO-037 Drain Pipe Product** — Dropdown. Conditional (Drainage Required
  = Yes). Must select active compatible Price Catalog item or approved
  custom item. Save item ID and price snapshot when used.

## Reinforcement

- **TO-038 Geogrid Required?** — Boolean. Conditional (installed wall).
  Engineering or selected design profile may require it.
- **TO-039 Geogrid Row Count** (EA) — Whole number. Conditional (Geogrid
  Required = Yes and not derived from engineering/design rule). Positive
  integer. May be generated from an engineering schedule; manual override
  requires reason.
- **TO-040 Geogrid Embedment Length** (FT) — Decimal. Conditional (Geogrid
  Required = Yes and applicable rule requires it). Must be > 0 when
  required. May be generated by a wall-height/design rule; override
  requires reason.
- **TO-041 Manual Geogrid Area Override** (SF) — Decimal. Optional, only
  when engineered plan/approved design provides a different quantity. Must
  be > 0; requires TO-042 reason. Use SF as standard storage unit; convert
  from SY only for display/input.
- **TO-042 Manual Geogrid Area Override Reason** — Long text. Required
  when TO-041 is entered.
- **TO-043 Engineering Required?** — Boolean. Conditional (installed wall
  work).
- **TO-044 Engineering / Grid Notes** — Long text. Conditional
  (Engineering Required = Yes), required text and supporting file
  reference when available. Not a substitute for a stamped design
  document.

## Access and Conditions

- **TO-045 Access Level** — Dropdown. Required always. Values: Easy;
  Moderate; Difficult; Restricted. Map rule-specific factors only where
  explicitly defined.
- **TO-046 Access Notes** — Long text. Optional.
- **TO-047 Carry / Material Movement Distance** (FT) — Decimal. Optional
  (when long carry affects a selected labor rule). ≥ 0. Use selected
  threshold rules rather than a hidden blanket multiplier.
- **TO-048 Site Slope / Terrain** — Dropdown. Required always. Values:
  Level; Moderate Slope; Steep Slope; Irregular Terrain.
- **TO-049 Soil / Ground Condition** — Dropdown. Required always. Values:
  Normal Soil; Loose/Fatty Soil; Clay; Semi-Rocky; Breakable Rock; Solid
  Rock; Wet/Muddy; Unknown; Other. Other requires notes. **Unknown must
  create a visible risk/contingency warning.**
- **TO-050 Utility / Site Constraint Notes** — Long text. Optional. Do not
  represent this as verified utility-location data.
- **TO-051 Restricted Work / Safety Condition?** — Boolean. Optional.
- **TO-052 Restricted Work / Safety Notes** — Long text. Conditional
  (TO-051 = Yes), required text.

## Logistics

- **TO-053 Delivery Distance Zone** — Dropdown or decimal (miles or
  zone). Conditional (material freight/delivery applies). Use one approved
  method per freight item — do not mix mileage and zone without defined
  precedence.
- **TO-054 Expected Material Deliveries** (EA) — Whole number. Optional. ≥
  0. May be calculated from item load capacity; manual override requires
  reason if used for pricing.
- **TO-055 Haul-Off / Disposal Required?** — Boolean. Optional.
- **TO-056 Haul-Off Quantity** — Decimal (Load, CY, or Ton). Conditional
  (TO-055 = Yes). Select one quantity unit consistent with selected
  haul-off item.
- **TO-057 Staging / Delivery Notes** — Long text. Optional.

## Equipment

- **TO-058 Equipment Selection** — Repeatable dropdown. Optional (when
  equipment is needed). Must select active Price Catalog equipment item or
  approved custom equipment. One equipment record per equipment type.
- **TO-059 Equipment Duration** (Hours or Days) — Decimal. Conditional per
  selected item. Must be > 0; unit required. Do not use one duration field
  for multiple equipment types.
- **TO-060 Equipment Role in Calculation** — Dropdown. Conditional per
  item. Values: Production Adjustment; Cost Only; Both. Prevents every
  selected equipment cost item from automatically changing labor
  productivity.
- **TO-061 Company-Owned or Rented** — Dropdown. Conditional per item.
  Values: Company-Owned; Rented; Subcontractor-Provided. Equipment repair
  reserve applies only where Profit Goals says company-owned equipment
  qualifies (see Open Decision — basis not fully defined).
- **TO-062 Equipment Notes** — Long text. Optional.

## Manual Adjustment

- **TO-063 Quantity / Scope Adjustment Needed?** — Boolean. Required
  always.
- **TO-064 Adjustment Type** — Dropdown. Conditional (TO-063 = Yes).
  Values: Material Quantity; Labor Hours; Equipment Duration; Freight;
  Scope; Other.
- **TO-065 Adjustment Description and Reason** — Long text. Conditional,
  required text.
- **TO-066 Adjustment Amount / Replacement Value** — Decimal, rule-
  dependent unit. Conditional (when Adjustment Type requires a numerical
  value). Must record whether this **adds to** or **replaces** the
  calculated amount. Do not permit ambiguous manual adjustments.
- **TO-067 Adjustment Authorization** — Calculated/workflow status, not
  editable by estimator. System-created when approval is required. The
  app determines approval need from Profit Goals and adjustment
  type/value.

## Notes

- **TO-068 Estimator Notes** — Long text. Optional. Internal only unless
  deliberately copied to proposal text.
- **TO-069 Customer-Facing Scope Note** — Long text. Optional. Must be
  deliberately marked customer-visible; never expose internal notes by
  default.

## Calculated Outputs

- **TO-070 Calculated Takeoff Outputs** — System-generated record set,
  read-only, linked to named rule IDs (material quantities, labor
  quantities, equipment quantities, calculation warnings). Manual
  replacement only through documented override fields. Save rule IDs,
  inputs, constants, outputs, and override history in each protected
  estimate snapshot.
