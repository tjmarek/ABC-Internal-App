# Profit Goals

Source: workbook tab "Profit Goals". Tiered pricing policy, margin/markup
definitions, reserves, approval thresholds, estimate-level alerts,
financial visualizations, editable policy settings. High precedence for
financial rules — see `CLAUDE.md`.

**Starting overhead reserve default across all tiers: 21.5% of Direct
Estimated Cost. Controlled adjustment range: 19%–23%; exceptions require a
documented reason and required approval** (see
`01-readme-and-business-rules.md` §9).

Each tier row: **Section ID | Tier | Applies To | Project Value Range |
Project Type | Target Gross Margin | Minimum Gross Margin | Maximum Gross
Margin | Overhead Reserve | Contingency Reserve | Equipment Repair Reserve
| Approval Rule | Visual Indicator | Notes**

## Small Project Tier ($15,000–$49,999)

- **PG-004 (Residential)**: Target 38%, Min 34%, Max 45%. Overhead 21.5%.
  Contingency 5%. Equipment Repair 1.0%. Approval required below 34%;
  review above 45%. Visual: Red <34%, Amber 34–37.9%, Green 38–45%, Blue
  >45%. Note: small jobs need stronger margin because mobilization,
  estimating, and supervision costs are less diluted.
- **PG-005 (Commercial)**: Target 35%, Min 31%, Max 42%. Overhead 21.5%.
  Contingency 5%. Equipment Repair 1.0%. Approval required below 31%;
  review above 42%. Visual: Red <31%, Amber 31–34.9%, Green 35–42%, Blue
  >42%. Note: commercial may price more competitively but should not erase
  risk protection.

## Lower-Mid Project Tier ($50,000–$149,999)

- **PG-006 (Residential)**: Target 35%, Min 31%, Max 41%. Overhead 21.5%.
  Contingency 4%. Equipment Repair 0.8%. Approval required below 31%.
  Visual: Red <31%, Amber 31–34.9%, Green 35–41%, Blue >41%. Note: use 4%
  contingency only when scope, site conditions, and material quantities
  are reasonably defined.
- **PG-007 (Commercial)**: Target 32%, Min 28%, Max 38%. Overhead 21.5%.
  Contingency 4%. Equipment Repair 0.8%. Approval required below 28%.
  Visual: Red <28%, Amber 28–31.9%, Green 32–38%, Blue >38%. Note: use
  owner review for unusual schedule, contract, insurance, or coordination
  risk.

## Mid Project Tier ($150,000–$299,999)

- **PG-008 (Residential)**: Target 32%, Min 28%, Max 37%. Overhead 21.5%.
  Contingency 3%. Equipment Repair 0.6%. Approval required below 28%.
  Visual: Red <28%, Amber 28–31.9%, Green 32–37%, Blue >37%. Note: lower
  target recognizes scale, but don't lower it merely to chase work.
- **PG-009 (Commercial)**: Target 29%, Min 25%, Max 34%. Overhead 21.5%.
  Contingency 3%. Equipment Repair 0.6%. Approval required below 25%.
  Visual: Red <25%, Amber 25–28.9%, Green 29–34%, Blue >34%. Note:
  management should review production plan and payment terms before
  sending.

## Large Project Tier ($300,000–$499,999)

- **PG-010 (Residential)**: Target 29%, Min 25%, Max 34%. Overhead 21.5%.
  Contingency 2.5%. Equipment Repair 0.5%. **Management approval required
  before sending.** Visual: Red <25%, Amber 25–28.9%, Green 29–34%, Blue
  >34%. Note: require review of cash flow, staffing, schedule, equipment
  plan.
- **PG-011 (Commercial)**: Target 27%, Min 23%, Max 32%. Overhead 21.5%.
  Contingency 2.5%. Equipment Repair 0.5%. **Management approval required
  before sending.** Visual: Red <23%, Amber 23–26.9%, Green 27–32%, Blue
  >32%. Note: do not use this lower threshold when contract risk or scope
  uncertainty is unusually high.

## Major Project Tier ($500,000–$1,000,000, and >$1,000,000)

- **PG-012 ($500,000–$1,000,000, Residential or Commercial)**: Target 25%,
  Min 22%, Max 30%. Overhead 21.5%. Contingency 2%. Equipment Repair 0.4%.
  **Ownership approval required before sending.** Visual: Red <22%, Amber
  22–24.9%, Green 25–30%, Blue >30%. Note: build a project-specific risk
  review — the percentage is only a starting gate.
- **PG-013 (>$1,000,000, Residential or Commercial)**: Target 22%, Min
  18%, Max 28%. Overhead 21.5%. Contingency 2%. Equipment Repair 0.4%.
  **Ownership approval required before sending.** Visual: Red <20%, Amber
  20–22.9%, Green 23–28%, Blue >28%. Note: require detailed production,
  cash-flow, contractual-risk, and contingency review rather than relying
  on standard tiers alone.

## Tier Selection Logic

Match the estimate's selling price (or Direct Estimated Cost, if selling
price isn't yet set) against the Project Value Range, and match
Residential vs. Commercial against the estimate's customer type. Major tier
rows apply to "Residential or Commercial" — no split needed above
$500,000.

## Governing Rules

- Every estimate must display its selected pricing tier, target range,
  actual contribution margin, net estimated profit, financial breakdown,
  and clear visual status (per the color bands above).
- Below-floor pricing (contribution margin below the tier's Minimum Gross
  Margin) requires a written explanation and management/ownership
  approval.
- Do not label contribution margin and net estimated profit as the same
  measure (see `01-readme-and-business-rules.md` §9 for the exact
  definitions and formulas).

## Open Decisions From This Document

- **Contingency Reserve override limits**: unlike Overhead Reserve (which
  has a stated 19%–23% band), no override range or approval trigger is
  given for deviating from a tier's starting contingency percentage. Flag
  as Open Decision; allow editing with a mandatory reason, but do not
  invent a floor/ceiling.
- **Equipment Repair Reserve qualification basis**: the reserve applies
  "only where Profit Goals says company-owned equipment qualifies" per
  `03-takeoff-inputs.md` TO-061, but no actual qualifying rule is stated
  here. A defensible default is to apply the reserve whenever at least one
  Company-Owned equipment row exists on the estimate — implement this as
  a clearly labeled interpretation pending confirmation, not as settled
  policy.
- **Final pricing targets/floors/maximums** are explicitly labeled
  "Starting policy" throughout this tab — they are subject to change after
  initial company review. Build the UI so these percentages are editable
  by authorized users with effective-dated change history, not hardcoded.
