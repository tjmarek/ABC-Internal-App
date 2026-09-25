# Labor (Man-Hours) Calculation Rules

Source: workbook tab "Labor (Man-Hours) Calculation Rules". Named labor-
production rules: inputs, productivity rates, crew assumptions, equipment/
condition adjustments, rounding, outputs, permitted overrides.

**General pattern for every rule below:** Man-hours = (quantity ÷ adjusted
productivity rate) × condition multiplier, subject to a stated minimum
crew-hours floor, then rounded UP to the nearest 0.5 hour. If the input
quantity is 0/blank, the result is 0. Equipment "boosts" and condition
"factors" are percentage additions (or credits, which subtract) to the
baseline productivity rate or to the multiplier, exactly as stated per
rule — do not apply a boost/factor that isn't explicitly listed for that
rule, and do not apply an equipment boost from one rule to another rule.

**⚠️ Loaded labor cost basis is NOT defined anywhere in this workbook.**
These rules produce man-hours only. Converting man-hours to a dollar cost
requires a $/hour or $/crew-day basis that is never stated (the Price
Catalog's "Labor" item is a $1,327.50/Crew-Day rate for a 6-man crew,
which does not cleanly convert to a per-man-hour rate without an
assumption the workbook doesn't make). **Flag this as an Open Decision**
and require a manual dollar entry with a reason for every labor cost row
until Austin Block Company confirms the basis.

## Demolition

- **CALC-064 Site Clearing**: baseline 500 SF/hr; equipment boosts: Big
  Excavator +60%, Mini Excavator +35%, Skid Steer +45%, 2nd Skid Steer
  +15%, Backhoe +40%, Wheel Loader +30%. Condition factors: +85% if Heavy
  else +35% if Moderate; +50% if Stumps/Roots; +40% if Tight Access. Min
  crew 1. Round up to 0.5 hr.
- **CALC-065 Tree Removal**: baseline 1 tree/hr @ 3-person crew. Equipment:
  Big Excavator +75%, 2nd Skidsteer +20%, Backhoe +40%. Conditions: Large
  tree +100% else Small tree −25%; Tight access +40%; Stump removal +90%;
  Haul/Disposal +70%. Min crew factor 3. Mini excavator, primary skid,
  loader, and hammer toggles are ignored for this rule.
- **CALC-066 Existing Fence Removal**: baseline 120 LF/hr @ 2-person crew.
  Equipment: 2nd Skidsteer +15% only. Factors: worst of Chainlink −20%
  credit or Iron +80% penalty, plus Set-in-Concrete +60%, plus Tight
  Access +40%. Min crew 2. Big/mini excavators, primary skid, backhoe,
  loader, hammers ignored.
- **CALC-067 Demo Existing Wall (Stone)**: baseline 80 SF/hr @ 2-person
  crew. Equipment: Big Excavator +70%, 2nd Skidsteer +15%, Backhoe +50%,
  Wheel Loader +30%; rock hammers add +40% (little) and/or +90% (big) to
  productivity **only when** Hammer Needed is checked (both apply
  simultaneously if both hammers are marked). Wall factors: worst of
  Dry-stack −15% credit or Mortared +75% penalty, plus Hammer Needed
  +120%, Tight Access +30%, Tall +25%. Min crew 2.
- **CALC-068 Demo Existing Wall (CMU/Brick)**: baseline 70 SF/hr @
  2-person crew. Equipment: Big Excavator +65%, 2nd Skidsteer +15%,
  Backhoe +50%, Wheel Loader +35% (only when Double/Filled or Rebar is
  checked). Wall factors: effectively +80% if Double/Filled (no credit for
  Brick veneer); Rebar +40%; Tight Access +30%. Min crew 2.
- **CALC-069 Demo Existing Wall (Timber/Railroad Tie)**: baseline 90 SF/hr
  @ 2-person crew. Equipment: Big Excavator +60%, 2nd Skidsteer +20%,
  Backhoe +40%, Wheel Loader +35%. Factors: Rot/Wet +30%; Pinned +60%;
  Tight Access +30%. Min crew 2. Mini excavator and primary skid ignored.
- **CALC-070 Demo Existing Wall (Poured Concrete)**: baseline 40 SF/hr @
  3-person crew. Equipment: Big Excavator +70%, 2nd Skidsteer +10%,
  Backhoe +60%, Wheel Loader +35%. Thickness multiplier (max of checked):
  6"=1.0, 8"=1.35, 12"=2.0, 18"=3.5, 24"=5.0. Min crew 3. Mini excavator,
  primary skid, hammer toggles ignored.
- **CALC-071 Drainage Removal**: baseline 6 CY/hr @ 2-person crew.
  Equipment: Big Excavator +60%, 2nd Skidsteer +15%, Backhoe +50%, Wheel
  Loader +30%. Factors: Plastic −15% credit; Glued +25%; Concrete pipe
  +85%; Gravel & Fabric +40%; Tight Access +30%. Min crew 2. Mini/primary
  skid and rock hammers ignored.
- **CALC-072 Footer Demo/Remove**: baseline 3 CY/hr @ 3-person crew.
  Equipment: Big Excavator +70%, 2nd Skidsteer +15%, Backhoe +60%, Wheel
  Loader +35%; rock hammers add +50% (little) or +110% (big) **only when**
  Hammer Required is checked. Factors: Reinforced +60%; Thick/Mass +80%;
  Deep embedment +50%; Hammer Required +100%; Tight Access +30%. Min crew
  3. Mini excavator and primary skid ignored.
- **CALC-073 Sort Materials**: baseline 8 CY/hr @ 2-person crew. Equipment:
  Big Excavator +50%, 2nd Skidsteer +20%, Backhoe +40%, Wheel Loader +40%.
  Factors: Metal/Concrete +40%; Salvage Stone +60%; Wet/Muddy +35%; Tight
  Access +30%; Long Carry +45%. Min crew 2. Mini excavator and primary
  skid ignored.

## Excavation

- **CALC-074 Site Excavation**: baseline 10 CY/hr @ 2-man crew. Equipment:
  Big Excavator +50%, 2nd Skidsteer +10%, Backhoe +40%, Wheel Loader +30%.
  Conditions: Loose/Fatty −15%, plus worse of Semi-rocky +35% or Breakable
  rock +85%; Tight access +40%; hammer time only if Hammer Needed is
  checked → Big hammer +15% else Little hammer +5%. Min crew 2. (This
  formula is identical to CALC-076 and CALC-103 — same shared rule.)
- **CALC-075 Excavate for Drainage Trench (Behind Wall)**: identical
  formula/baseline to CALC-074 (10 CY/hr @ 2-man, same boosts/conditions).
  *Note: a differently-baselined version of this same-named calculation
  also appears as CALC-102 at 6 CY/hr — see below; these are two distinct
  rules sharing a similar name. Implement each by its own Calc ID and
  baseline exactly as stated, do not merge them.*
- **CALC-076 Excavate Trench for Footer & Subgrade**: same formula as
  CALC-074 (shared).
- **CALC-077 Level & Compact Subgrade (Earthen Pad)**: baseline 500 SF/hr
  @ 2-man crew. Equipment: 2nd Skidsteer +10%, Backhoe +25%, Wheel Loader
  +40%. Thickness multiplier (max of checked): 4"=1.0, 6"=1.5, 8"=2.0,
  12"=3.0, 18"=4.5. Min crew 2. Big/mini excavators, primary skid, rollers
  ignored. (Shared formula with CALC-079 and CALC-104.)
- **CALC-078 Spoils Sorting**: baseline 8 units/hr @ 2-person crew.
  Equipment: 2nd Skidsteer +20%, Backhoe +40%, Wheel Loader +45%. Factors:
  four condition slots at +25%, +30%, +35%, +60%, +30% respectively (per
  the rule's five listed factor slots). Min crew 2. Only the three listed
  equipment toggles apply; others ignored.

## Footer Construction

- **CALC-079 Place & Compact Base Material**: same formula as CALC-077
  (shared).
- **CALC-080 Concrete Footer – Rebar Set & Tie**: baseline 1.5 CY/hr, no
  equipment applies at all (rollers/hammers don't affect tying). Rebar
  factors: ≥#6 rebar +50%; ≤6" OCEW +35%; Double mat +80%; Curves/steps
  +30%; Tight access +30%. Min crew 2.
- **CALC-081 Concrete Footer – Form Setting**: baseline 35 LF/hr @ 2-man
  crew, all equipment ignored. Form factors: Curves/steps +40%;
  Double-sided +60%; Soft subgrade +30%; height penalty (max of): 6–12"
  +30%, ≥12" +60%. Min crew 2.
- **CALC-082 Concrete Footer – Pour & Finish Concrete**: distinct
  structure (not the general pattern). Pour hours = CY ÷ placement rate.
  Placement rate = (Trucks/day × 10 CY) ÷ (9 hr × 0.9 utilization).
  Trucks/day = highest of the checked options {1, 2, 3, 4}, default 2 if
  none checked. Pour days = CEILING(CY ÷ (Trucks/day × 10)). Total
  man-hours = pour hours + (1.5 hr × pour days). Min pour crew 4; round
  up. Heavy equipment is not a significant driver here — crew pacing and
  truck flow are.
- **CALC-083 Concrete Footer – Wreck Forms**: baseline 50 LF/hr @ 2-man
  crew, all equipment ignored. Wreck factors: Curves/steps +30%;
  Double-sided +45%; Soft subgrade +25%; height penalty (max of): 6–12"
  +20%, ≥12" +40%. Min crew 2.

## Wall Construction

- **CALC-084 Base Course – Set Blocks (Block Wall)**: baseline 2
  blocks/hr @ 3-man crew (derived from 18 blocks in 9 hr with 3-man crew).
  Equipment: Big Excavator +15%, 2nd Skidsteer +10%. Penalties: Mortared
  +35%; Earthen base +30%; Curves/steps +25%; Long carry +35%; Pinned to
  footer +30%. Min crew 3. Other equipment ignored.
- **CALC-085 Wall Stacking – Set Additional Blocks (Block Wall)**:
  baseline 25/9 blocks/hr @ 3-man crew (24 blocks in 9 hr). Equipment: Big
  Excavator +15%, 2nd Skidsteer +10%. Penalties: Mortared +20%; Earthen
  base +25%; Curves/steps +30%; Long carry +35%; Pinned to footer +25%.
  Min crew 3. Other equipment ignored.
- **CALC-086 Cut & Fit (Corners/Curves) (Block Wall)**: cuts × 25 minutes
  each (25/60 hr); no equipment factors; round up.
- **CALC-087 Block Face Chipping (Block Wall)**: blocks × 5 minutes each ×
  (+25% if Tight Access checked); round up. Equipment not relevant.
- **CALC-088 Block Drilling for Pins (Block Wall)**: blocks × 8 minutes
  each; round up. Equipment/checkboxes not applicable.
- **CALC-089 Drain Outlet Block Cutting (Block Wall)**: outlets × 20
  minutes each; round up. Equipment/checkboxes not applicable.
- **CALC-090 Block Placement & Mortar (Chopped Stone)**: baseline 550/9 ≈
  61.1 SF/hr @ 4-man crew. Equipment: 2nd Skidsteer +10%. Penalties: Tight
  access +30%; Curves/steps +25%; Complex pattern +40%; Double-sided +60%.
  Min crew 4. All other equipment ignored.
- **CALC-091 Set Forms (Field Stone)**: baseline 1000/9 ≈ 111.1 LF/hr @
  4-man crew, all equipment ignored. Penalties: Curves/steps +35%;
  Double-sided +60%; Soft subgrade +30%; ≥8' tall +40%. Min crew 4.
- **CALC-092 Stone Placement & Mortar (Field Stone)**: baseline 450/9 = 50
  SF/hr @ 4-man crew. Equipment: 2nd Skidsteer +10%, Backhoe +8%, Wheel
  Loader +15%. Penalties: Tight access +30%; ≥8' tall +35%; ≥3' base width
  +25%; Curves/steps +25%; Complex pattern +40%. Min crew 4.
- **CALC-093 Block Placement (Keystone)**: baseline 500/9 ≈ 55.6 SF/hr @
  3-man crew. Equipment: Big Excavator +20%, 2nd Skidsteer +8%. Penalties:
  Curves/corners +25%; Tight access +30%. Min crew 3. All other equipment
  ignored.
- **CALC-094 Install Drain Pipe (All)**: baseline 120 LF/hr @ 2-man crew,
  all equipment ignored. Factors: Plastic −10%; Many fittings +40%; Tight
  access +30%. Min crew 2.
- **CALC-095 Place Drainage Gravel (All)**: baseline 12 tons/hr @ 2-man
  crew. Equipment: Wheel Loader +60%, Big Excavator +20%, 2nd Skidsteer
  +10%, Backhoe +25%. Penalties: Long haul +40%; Tight access +30%. Min
  crew 2. Primary skidsteer ignored.
- **CALC-096 Install Geotextile Filter Fabric (All)**: baseline 900 SF/hr
  @ 2-man crew, all equipment ignored. Factors: Curves/corners +30%; Steep
  slope +35%; Straight runs −10% credit; Obstacles +40%. Min crew 2.
- **CALC-097 Install Geogrid (Cut, Roll, Tension, Pin Back) (All)**:
  baseline 700 SF/hr @ 3-man crew. Light equipment assists: Big Excavator
  +15% (tension), Skid Steer +10%, Loader +15%. Factors: Curves/corners
  +25%; Soil pinning +30%; Steep slope +35%; Tight access +30%; Straight
  runs −10%. Min crew 3.
- **CALC-098 Install Backfill (All)**: baseline 12 tons/hr @ 2-person
  crew. Equipment: Big Excavator +20%, 2nd Skidsteer +10%, Backhoe +25%,
  Wheel Loader +50%. Penalties: three condition slots at +40%, +30%, +40%.
  Min crew 2. Primary skidsteer ignored.
- **CALC-099 Compact Backfill in Lifts (All)**: baseline 40 tons/hr @
  1-person. Equipment: Big Roller +60%; little roller is **ignored**.
  Penalties: Thin lifts +30%; Steep slope +30%; Tight access +25%. Min
  crew 1.
- **CALC-100 Final Grade (All)**: baseline 1500 SF/hr @ 2-man crew.
  Equipment: Big Excavator +20%, Skidsteer +15%, Wheel Loader +25%.
  Penalty: Tight access +25%. Min crew 2. Mini excavator ignored.
- **CALC-101 Mortar Mixing – Dry Mortar Bags, Sand & Water (All)**:
  baseline 3 units/hr @ 1-person, all equipment ignored. Two condition
  factors at +30% and +25%. Min crew 1.
- **CALC-102 Excavate for Drainage Trench (Behind Wall) (All)**: baseline
  6 CY/hr @ 2-man crew (distinct from CALC-074/075/076/103's 10 CY/hr
  baseline — implement as its own rule). Equipment: Big Excavator +50%,
  2nd Skidsteer +8%, Backhoe +40%, Loader +20% (mini and primary
  skidsteer ignored). Factors: Loose −10% credit; worst of Semi-rocky +35%
  or Breakable rock +85%; Hammer needed +100%; Tight access +40%. Min crew
  2.
- **CALC-103 Excavate Trench for Footer & Subgrade**: same formula as
  CALC-074 (shared, 10 CY/hr baseline).
- **CALC-104 Level & Compact Subgrade (Earthen Pad)**: same formula as
  CALC-077/079 (shared, 500 SF/hr baseline).

## Implementation Notes

- Every rule: round the final man-hours result **up** to the nearest 0.5
  hour, and enforce the stated minimum crew-hours floor before rounding.
- If a rule's quantity input is 0 or blank, the result is 0 — do not run
  the formula.
- Only apply the equipment boosts and condition factors explicitly listed
  per rule. If a piece of equipment is selected on the estimate but not
  named in a given rule's formula, treat it as a cost-only line for that
  labor calculation and visibly note it is "not applied to this labor
  rule" rather than silently ignoring it without explanation.
- See the Open Decision at the top of this file regarding the loaded
  labor-cost-per-hour basis needed to turn these man-hour outputs into
  dollar cost rows.
