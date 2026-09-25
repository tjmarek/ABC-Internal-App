# Material Calculation Rules

Source: workbook tab "Material Calculation Rules". Named material-
calculation rules, inputs, constants, formulas, output units, rounding,
waste, applicability, permitted overrides. **Implement only what is fully
defined below. Where a rule says "use the established/agreed..." without
giving the actual formula, do NOT guess — flag it in
`12-open-decisions.md` and require manual entry with a reason.**

## Fieldstone Wall

- **CALC-001 Wall Height**: Average wall height = (Maximum Height +
  Minimum Height) / 2. If a manual Average Exposed Height is entered, use
  that value for all downstream calculations instead.
- **CALC-002 Above Ground Wall Face SQFT**: Wall Length × Average Exposed
  Height. Return 0 if either input is blank.
- **CALC-003 Wall Area CBFT**: ((Cap Width + Base Width) / 2) × (Average
  Exposed Height + Embedment Depth) × Wall Length. Return 0 if required
  inputs are blank.
- **CALC-004 Total Wall SQFT**: Wall Length × (Average Exposed Height +
  Embedment Depth). Return 0 if required inputs are blank.
- **CALC-005 End Cut Tonnage**: (Total Wall Volume / 100) × 1.35 tons ×
  1.15 waste factor. Round up to 2 decimals.
- **CALC-006 Wet Mortar Yardage**: (Total Wall Volume × 30%) / 27 × 1.10
  waste factor. Round up to 2 decimals.
- **CALC-007 Dry Mortar Bags (70 lb)**: Total Wall Volume × 54.5. Round up
  to the next whole 70-lb bag.
- **CALC-008 Mason Sand Tonnage**: ⚠️ **UNDEFINED.** Says "use the
  established dry-mortar-to-sand conversion from the applicable price and
  material standard" without giving the ratio. Round up to 2 decimals
  once defined. **Flag as Open Decision; require manual entry meanwhile.**
- **CALC-014 Total Excavation CBFT**: (Average Exposed Height + Embedment
  Depth) × Wall Length × MAX(Base Width, Gravel Bed Width, Geogrid
  Embedment Width). Return 0 if required inputs are blank.
- **CALC-015 Placement Area**: Above-Ground Wall Face SQFT + (Embedment
  Depth × Wall Length). Return 0 if required inputs are blank.
- **CALC-016 Backfill Tonnage**: (Total Excavation Volume − Wall Volume −
  Drainage Gravel Volume) / 27 × 1.25 tons per CY. Return 0 if negative.
  Round up to 2 decimals.
- **CALC-017 Footer SQFT**: Wall Base Width × Wall Length. Return 0 if
  either input is blank.
- **CALC-018 Excavation SQFT**: MAX(Wall Base Width, Gravel Bed Width,
  Geogrid Embedment Width) × Wall Length. Return 0 if required inputs are
  blank.
- **CALC-019 Drainage Trench Excavation CBFT**: Above-Ground Wall Face
  SQFT × MAX(Gravel Bed Width, Geogrid Embedment Width). Return 0 when
  drainage and geogrid are both not required.
- **CALC-011 Geogrid SQFT**: ⚠️ **UNDEFINED.** "Use the agreed shared
  geogrid calculation and engineering override behavior." Return 0 when
  Geogrid Required is No. Preserve engineering design source, notes, and
  override reason with the estimate snapshot. **Flag as Open Decision;
  only accept the manual override (TO-041/TO-042).**

## Shared Rules (used across multiple wall types — "All Wall Types")

- **CALC-009 Drainage Gravel Tonnage**: (Wall Length × Gravel Bed Width ×
  Drainage Gravel Depth) / 27 × 1.33 tons per CY × 1.10 waste factor.
  Drainage Gravel Depth = 80% of Total Wall Height unless manually
  overridden. Return 0 when Drainage Required is No. Round up to 2
  decimals. (Referenced as shared by CALC-027, CALC-045, CALC-063.)
- **CALC-010 Geotextile Fabric SQFT**: ((Total Wall Height + Embedment
  Depth) × Wall Length) + (Gravel Bed Width × Wall Length), then × 1.10
  waste factor. Return 0 when Drainage Required is No. Purchase rolls =
  ROUNDUP(Required SQFT / 5400, 0). (Shared by CALC-028, CALC-041,
  CALC-057.)
- **CALC-012 4-Inch Sock Pipe LF**: Wall Length + ((Wall Base Width +
  Gravel Bed Width) × Number of Drain Tees or Drain Outlets). Return 0
  when Drainage Required is No. Round purchase quantity up to whole
  100-foot rolls. (Shared by CALC-030, CALC-042, CALC-058.)
- **CALC-013 Caps Tees**: ROUNDUP(Wall Length / 10, 0). Return 0 when caps
  are not required. (Shared by CALC-031, CALC-043, CALC-059.)

## Block Wall

- **CALC-020 Wall Embedment**: (Number of Courses × Block Height) −
  Average Exposed Height. Return 0 if blank or negative.
- **CALC-021 Above Ground Wall Face SQFT**: Wall Length × Average Exposed
  Height. Return 0 if either input is blank.
- **CALC-022 Total Wall SQFT**: Wall Length × (Average Exposed Height +
  Embedment Depth). Return 0 if required inputs are blank.
- **CALC-023 Block Count**: ROUNDUP((Wall Length / Block Length) × Number
  of Courses, 0). Return 0 if required inputs are blank.
- **CALC-024 Wet Mortar Yardage**: Calculate wet mortar yards for
  designated mortared courses using 1-inch joints and 2-block depth, then
  add 10% waste. Round up to 2 decimals. (The exact per-course
  aggregation method is not fully spelled out beyond "1-inch joints and
  2-block depth" — implement literally against total block volume and
  flag the interpretation for confirmation if ambiguous.)
- **CALC-025 Dry Mortar Bags (70 lb)**: ROUNDUP((Wet Mortar Yardage ×
  2700 lbs per CY) / 70 lbs per bag, 0). Return 0 if wet mortar yardage is
  0.
- **CALC-026 Mason Sand Tonnage**: Dry Mortar Bags × 0.0459 CY per bag ×
  1.35 tons per CY × 1.10 waste factor. Round up to 2 decimals. (This one
  IS fully defined, unlike Fieldstone's CALC-008.)
- **CALC-027 Drainage Gravel Tonnage**: shared CALC-009.
- **CALC-028 Geotextile Fabric SQFT**: shared CALC-010.
- **CALC-029 Geogrid SQFT**: ⚠️ UNDEFINED, same as CALC-011. Return 0 when
  Geogrid Required is No.
- **CALC-030 4-Inch Sock Pipe LF**: shared CALC-012.
- **CALC-031 Caps Tees**: shared CALC-013.
- **CALC-032 Rebar LF**: (Blocks per Course × Number of Pinned Courses ×
  32 inches per pinned block) / 12. Return 0 if required inputs are blank.
- **CALC-033 Total Excavation CBFT**: (Average Exposed Height + Embedment
  Depth) × Wall Length × MAX(Base Width, Gravel Bed Width, Geogrid
  Embedment Width). Return 0 if required inputs are blank.
- **CALC-034 Backfill Tonnage**: (Excavation Volume − Wall Volume −
  Drainage Gravel Volume) / 27 × 1.25 tons per CY. Return 0 if negative.
  Round up to 2 decimals.

## Chopped Stone Wall

- **CALC-035 CBFT Per Block**: Block Height × Block Length × Block Depth
  (convert all dimensions to feet first).
- **CALC-036 Block Face SQFT**: Block Height × Block Length (feet).
- **CALC-037 Block Count**: ROUNDUP((Wall Face SQFT / Block Face SQFT) ×
  Wall Depth in Linear Feet, 0).
- **CALC-038 Stone Tonnage**: Block Count × CBFT Per Block × 150 lbs per
  cubic foot / 2000. Round up to 2 decimals.
- **CALC-039 70-lb Dry Mortar Bags**: ROUNDUP(Block Count × 0.25, 0).
- **CALC-040 Mason Sand Tonnage**: Block Count × 0.00486. Round up to 2
  decimals.
- **CALC-041 Geotextile Fabric SQFT**: shared CALC-010.
- **CALC-042 4-Inch Sock Pipe LF**: shared CALC-012.
- **CALC-043 Caps Tees**: shared CALC-013.
- **CALC-044 Geogrid Embedment Length FT**: ⚠️ UNDEFINED, same shared-
  geogrid gap as CALC-011.
- **CALC-045 Drainage Gravel Tonnage**: shared CALC-009.
- **CALC-046 Footer Excavation CBFT**: ⚠️ **UNDEFINED.** "Use the
  established height-based footer excavation schedule for Chopped Stone
  Wall, subject to manual estimator override with required reason." No
  schedule is given anywhere in the workbook. Flag as Open Decision;
  require manual entry with reason.
- **CALC-047 Drainage Bed Excavation CBFT**: Wall Length × Gravel Bed
  Width × Drainage Gravel Depth. Return 0 when drainage is not required.

## Keystone/CMU Wall

- **CALC-048 Average Wall Height**: (Point A Height + Point B Height) /
  2. Use manual Average Exposed Height when entered instead.
- **CALC-049 Footer Depth**: ⚠️ **UNDEFINED.** "Use the established
  height-based footer-depth schedule for Keystone/CMU Wall, subject to
  manual estimator override with required reason." No schedule given.
  Flag as Open Decision.
- **CALC-050 Footer Width**: ⚠️ **UNDEFINED**, same gap as CALC-049 (no
  schedule given for footer width). Flag as Open Decision.
- **CALC-051 Footer SQFT**: Wall Length × Footer Width. Return 0 if either
  input is blank. (Footer Width itself depends on the unresolved
  CALC-050.)
- **CALC-052 Wall Face SQFT**: Wall Length × (Average Wall Height + Footer
  Depth). Return 0 if required inputs are blank.
- **CALC-053 CBFT Per Block**: Block Height × Block Length × Block Depth
  (feet).
- **CALC-054 Block Face SQFT**: Block Height × Block Length (feet).
- **CALC-055 Block Count**: ROUNDUP((Wall Face SQFT / Block Face SQFT) ×
  Wall Depth in Linear Feet, 0).
- **CALC-056 Base/Gravel Fill Tonnage**: Calculate base or gravel fill
  from the applicable footer and drainage geometry using 1.33 tons per CY
  and 10% waste. Round up to 2 decimals. (Depends on the unresolved footer
  geometry from CALC-049/050 — flag accordingly if those are unresolved.)
- **CALC-057 Geotextile Fabric SQFT**: shared CALC-010.
- **CALC-058 4-Inch Sock Pipe LF**: shared CALC-012.
- **CALC-059 Caps Tees**: shared CALC-013.
- **CALC-060 Geogrid Embedment Length FT**: ⚠️ UNDEFINED, same shared-
  geogrid gap.
- **CALC-061 Geogrid SQFT**: ⚠️ UNDEFINED, same shared-geogrid gap. Return
  0 when Geogrid Required is No.
- **CALC-062 Gravel Bed Width FT**: ⚠️ **UNDEFINED.** "Use the established
  height-based gravel-bed-width schedule for Keystone/CMU Wall, subject to
  manual estimator override with required reason." No schedule given.
  Flag as Open Decision.
- **CALC-063 Drainage Gravel Tonnage**: shared CALC-009.

## Summary of Undefined Formulas (must be Open Decisions, not guesses)

1. Mason Sand Tonnage conversion factor for Fieldstone Wall (CALC-008).
2. Shared Geogrid SQFT/embedment formula, used by CALC-011, 029, 044, 060,
   061 (every wall type).
3. Chopped Stone Wall height-based footer excavation schedule (CALC-046).
4. Keystone/CMU Wall height-based footer-depth schedule (CALC-049).
5. Keystone/CMU Wall height-based footer-width schedule (CALC-050).
6. Keystone/CMU Wall height-based gravel-bed-width schedule (CALC-062).
