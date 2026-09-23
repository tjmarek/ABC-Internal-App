/* =========================================================================
   AUSTIN BLOCK COMPANY INTERNAL OPERATIONS APP
   calculations.js

   PURPOSE
   Implements only the formulas that are FULLY DEFINED in the workbook:
     - Material Calculation Rules (CALC-001 through CALC-063)
     - Labor (Man-Hours) Calculation Rules (CALC-064 through CALC-104)
     - Profit Goals financial rollups (README Financial Definitions)

   Where the workbook explicitly defers to an undefined schedule, "agreed
   shared" formula, or unspecified constant, this file does NOT guess. It
   returns an "unresolved" result object that ui.js renders as an
   "Unresolved calculation" notice, matching the Open Decisions register
   in data.js (OD-001 through OD-007).

   Every calculation function returns an object of the shape:
     {
       calcId: "CALC-XXX",
       label: "...",
       status: "calculated" | "unresolved" | "not-applicable",
       inputs: {...},         // preserved for the estimate snapshot
       constants: {...},      // preserved for the estimate snapshot
       value: number|null,
       unit: "...",
       roundingNote: "...",
       unresolvedReason: "..." // only present when status === "unresolved"
     }
   This shape is what gets saved into TO-070 Calculated Takeoff Outputs so
   rule IDs, inputs, constants, outputs, and override history are preserved
   in every protected estimate snapshot, per README section 8.
   ========================================================================= */

(function (global) {
  "use strict";

  var D = global.AbcData;

  function roundUp(value, decimals) {
    var factor = Math.pow(10, decimals || 0);
    return Math.ceil((value + Number.EPSILON) * factor) / factor;
  }

  function isBlank(v) {
    return v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v));
  }

  function calculated(calcId, label, value, unit, inputs, constants, roundingNote) {
    return { calcId: calcId, label: label, status: "calculated", value: value, unit: unit, inputs: inputs || {}, constants: constants || {}, roundingNote: roundingNote || "" };
  }

  function unresolved(calcId, label, reason, inputs) {
    return { calcId: calcId, label: label, status: "unresolved", value: null, unit: null, inputs: inputs || {}, constants: {}, unresolvedReason: reason };
  }

  function notApplicable(calcId, label) {
    return { calcId: calcId, label: label, status: "not-applicable", value: 0, unit: null, inputs: {}, constants: {} };
  }

  // =========================================================================
  // SHARED CALCULATIONS (used by multiple wall types)
  // =========================================================================

  /** CALC-009: Drainage Gravel Tonnage (All Wall Types) */
  function calcDrainageGravelTonnage(seg, totalWallHeight) {
    if (!seg.drainageRequired) return notApplicable("CALC-009", "Drainage Gravel Tonnage");
    if (isBlank(seg.wallLength) || isBlank(seg.gravelBedWidth)) {
      return unresolved("CALC-009", "Drainage Gravel Tonnage", "Wall Length and Gravel Bed Width are required inputs and are currently blank.", seg);
    }
    var depth = !isBlank(seg.drainageGravelDepthOverride) ? seg.drainageGravelDepthOverride : (0.80 * totalWallHeight);
    var tons = (seg.wallLength * seg.gravelBedWidth * depth) / 27 * 1.33 * 1.10;
    return calculated("CALC-009", "Drainage Gravel Tonnage", roundUp(tons, 2), "Tons",
      { wallLength: seg.wallLength, gravelBedWidth: seg.gravelBedWidth, drainageGravelDepth: depth, depthWasOverridden: !isBlank(seg.drainageGravelDepthOverride) },
      { tonsPerCY: 1.33, wasteFactor: 1.10, defaultDepthPctOfWallHeight: 0.80 },
      "Round up to 2 decimals.");
  }

  /** CALC-010: Geotextile Fabric SQFT (All Wall Types) */
  function calcGeotextileFabricSqft(seg, totalWallHeight, embedmentDepth) {
    if (!seg.drainageRequired) return notApplicable("CALC-010", "Geotextile Fabric SQFT");
    if (isBlank(seg.wallLength) || isBlank(seg.gravelBedWidth)) {
      return unresolved("CALC-010", "Geotextile Fabric SQFT", "Wall Length and Gravel Bed Width are required and are currently blank.", seg);
    }
    var sqft = ((totalWallHeight + embedmentDepth) * seg.wallLength) + (seg.gravelBedWidth * seg.wallLength);
    sqft = sqft * 1.10;
    var rolls = Math.ceil(sqft / 5400);
    return calculated("CALC-010", "Geotextile Fabric SQFT", roundUp(sqft, 2), "SF",
      { wallLength: seg.wallLength, gravelBedWidth: seg.gravelBedWidth, totalWallHeight: totalWallHeight, embedmentDepth: embedmentDepth },
      { wasteFactor: 1.10, rollSizeSqft: 5400, purchaseRolls: rolls },
      "Purchase rolls = ROUNDUP(required SF / 5400, 0).");
  }

  /** CALC-011/029/044/060/061: Shared Geogrid SQFT - workbook defers to an "agreed shared" formula that is never defined. Always unresolved unless a manual override is supplied. */
  function calcGeogridSqft(calcId, seg) {
    if (!seg.geogridRequired) return notApplicable(calcId, "Geogrid SQFT");
    if (!isBlank(seg.manualGeogridAreaOverride)) {
      return calculated(calcId, "Geogrid SQFT (Manual Override)", seg.manualGeogridAreaOverride, "SF",
        { manualGeogridAreaOverride: seg.manualGeogridAreaOverride, overrideReason: seg.manualGeogridAreaOverrideReason },
        {}, "Value taken directly from the manual override field per engineered plan; the shared calculation formula is not defined in the workbook (see Open Decision OD-002).");
    }
    return unresolved(calcId, "Geogrid SQFT", "The workbook states to 'use the agreed shared geogrid calculation and engineering override behavior' without defining that formula (Open Decision OD-002). Enter a Manual Geogrid Area Override with a reason from engineered plans instead.", seg);
  }

  /** CALC-012: 4-Inch Sock Pipe LF (All Wall Types) */
  function calcSockPipeLF(seg, wallBaseWidth) {
    if (!seg.drainageRequired) return notApplicable("CALC-012", "4-Inch Sock Pipe LF");
    if (isBlank(seg.wallLength)) {
      return unresolved("CALC-012", "4-Inch Sock Pipe LF", "Wall Length is required and currently blank.", seg);
    }
    var outlets = seg.drainOutletCount || 0;
    var lf = seg.wallLength + ((wallBaseWidth + seg.gravelBedWidth) * outlets);
    var purchaseRolls = Math.ceil(lf / 100);
    return calculated("CALC-012", "4-Inch Sock Pipe LF", lf, "LF",
      { wallLength: seg.wallLength, wallBaseWidth: wallBaseWidth, gravelBedWidth: seg.gravelBedWidth, drainOutletCount: outlets },
      { rollLengthLF: 100, purchaseRolls: purchaseRolls },
      "Round purchase quantity up to whole 100-foot rolls.");
  }

  /** CALC-013: Caps Tees (All Wall Types) */
  function calcCapsTees(seg) {
    if (!seg.capRequired) return notApplicable("CALC-013", "Caps Tees");
    if (isBlank(seg.wallLength)) {
      return unresolved("CALC-013", "Caps Tees", "Wall Length is required and currently blank.", seg);
    }
    var tees = Math.ceil(seg.wallLength / 10);
    return calculated("CALC-013", "Caps Tees", tees, "EA", { wallLength: seg.wallLength }, {}, "ROUNDUP(Wall Length / 10, 0).");
  }

  // =========================================================================
  // FIELDSTONE WALL CALCULATIONS (CALC-001 through CALC-019)
  // =========================================================================

  function calcFieldstone(seg) {
    var out = {};

    // CALC-001 Wall Height
    var avgHeight;
    if (!isBlank(seg.averageExposedHeight)) {
      avgHeight = seg.averageExposedHeight;
      out["CALC-001"] = calculated("CALC-001", "Average Wall Height", avgHeight, "FT", { averageExposedHeightManual: seg.averageExposedHeight }, {}, "Manual Average Exposed Height used directly for all downstream calculations.");
    } else if (!isBlank(seg.minimumExposedHeight) && !isBlank(seg.maximumExposedHeight)) {
      avgHeight = (seg.maximumExposedHeight + seg.minimumExposedHeight) / 2;
      out["CALC-001"] = calculated("CALC-001", "Average Wall Height", avgHeight, "FT", { minimumExposedHeight: seg.minimumExposedHeight, maximumExposedHeight: seg.maximumExposedHeight }, {}, "(Max + Min) / 2.");
    } else {
      avgHeight = 0;
      out["CALC-001"] = unresolved("CALC-001", "Average Wall Height", "Enter Average Exposed Height, or both Minimum and Maximum Exposed Height.", seg);
    }

    var embedmentDepth = !isBlank(seg.wallEmbedmentDepth) ? seg.wallEmbedmentDepth : 0;
    var capWidth = !isBlank(seg.capWidth) ? seg.capWidth : 0;
    var baseWidth = !isBlank(seg.baseWidth) ? seg.baseWidth : 0;
    var gravelBedWidth = !isBlank(seg.gravelBedWidth) ? seg.gravelBedWidth : 0;
    var geogridEmbedmentWidth = !isBlank(seg.geogridEmbedmentLength) ? seg.geogridEmbedmentLength : 0;

    // CALC-002 Above Ground Wall Face SQFT
    var aboveGroundSqft = 0;
    if (isBlank(seg.wallLength) || isBlank(avgHeight)) {
      out["CALC-002"] = unresolved("CALC-002", "Above Ground Wall Face SQFT", "Wall Length and Average Exposed Height are required.", seg);
    } else {
      aboveGroundSqft = !isBlank(seg.wallFaceAreaOverride) ? seg.wallFaceAreaOverride : (seg.wallLength * avgHeight);
      out["CALC-002"] = calculated("CALC-002", "Above Ground Wall Face SQFT", aboveGroundSqft, "SF",
        { wallLength: seg.wallLength, averageExposedHeight: avgHeight, overrideApplied: !isBlank(seg.wallFaceAreaOverride), overrideReason: seg.wallFaceAreaOverrideReason || null },
        {}, "Wall Length x Average Exposed Height (or manual override).");
    }

    var totalWallHeight = avgHeight + embedmentDepth;

    // CALC-003 Wall Area CBFT (Wall Volume)
    var wallVolume = 0;
    if (isBlank(seg.wallLength) || isBlank(avgHeight)) {
      out["CALC-003"] = unresolved("CALC-003", "Wall Area CBFT", "Required geometry inputs are blank.", seg);
    } else {
      wallVolume = ((capWidth + baseWidth) / 2) * (avgHeight + embedmentDepth) * seg.wallLength;
      out["CALC-003"] = calculated("CALC-003", "Wall Volume (CBFT)", wallVolume, "CBFT",
        { capWidth: capWidth, baseWidth: baseWidth, averageExposedHeight: avgHeight, embedmentDepth: embedmentDepth, wallLength: seg.wallLength }, {},
        "((Cap Width + Base Width)/2) x (Avg Height + Embedment) x Wall Length.");
    }

    // CALC-004 Total Wall SQFT
    if (isBlank(seg.wallLength)) {
      out["CALC-004"] = unresolved("CALC-004", "Total Wall SQFT", "Wall Length required.", seg);
    } else {
      var totalWallSqft = seg.wallLength * totalWallHeight;
      out["CALC-004"] = calculated("CALC-004", "Total Wall SQFT", totalWallSqft, "SF", { wallLength: seg.wallLength, totalWallHeight: totalWallHeight }, {}, "Wall Length x (Avg Height + Embedment).");
    }

    // CALC-005 End Cut Tonnage
    if (wallVolume > 0) {
      var endCutTons = (wallVolume / 100) * 1.35 * 1.15;
      out["CALC-005"] = calculated("CALC-005", "End Cut Tonnage", roundUp(endCutTons, 2), "Tons", { wallVolume: wallVolume }, { tonsPerUnit: 1.35, wasteFactor: 1.15 }, "Round up to 2 decimals.");
    } else {
      out["CALC-005"] = notApplicable("CALC-005", "End Cut Tonnage");
    }

    // CALC-006 Wet Mortar Yardage
    if (wallVolume > 0) {
      var wetMortarYards = (wallVolume * 0.30) / 27 * 1.10;
      out["CALC-006"] = calculated("CALC-006", "Wet Mortar Yardage", roundUp(wetMortarYards, 2), "CY", { wallVolume: wallVolume }, { mortarFraction: 0.30, wasteFactor: 1.10 }, "Round up to 2 decimals.");
    } else {
      out["CALC-006"] = notApplicable("CALC-006", "Wet Mortar Yardage");
    }

    // CALC-007 Dry Mortar Bags (70 lb)
    var dryMortarBags = 0;
    if (wallVolume > 0) {
      dryMortarBags = Math.ceil(wallVolume * 54.5);
      out["CALC-007"] = calculated("CALC-007", "Dry Mortar Bags (70 lb)", dryMortarBags, "Bags", { wallVolume: wallVolume }, { bagsPerUnitVolume: 54.5 }, "Round up to next whole bag.");
    } else {
      out["CALC-007"] = notApplicable("CALC-007", "Dry Mortar Bags (70 lb)");
    }

    // CALC-008 Mason Sand Tonnage - conversion factor not defined (Open Decision OD-001)
    out["CALC-008"] = unresolved("CALC-008", "Mason Sand Tonnage", "The workbook refers to 'the established dry-mortar-to-sand conversion from the applicable price and material standard' without stating the numeric ratio (Open Decision OD-001). Enter this quantity manually with a reason.", { dryMortarBags: dryMortarBags });

    // CALC-009 / CALC-010 shared
    out["CALC-009"] = calcDrainageGravelTonnage(seg, totalWallHeight);
    out["CALC-010"] = calcGeotextileFabricSqft(seg, totalWallHeight, embedmentDepth);

    // CALC-011 Geogrid SQFT (shared, unresolved unless manual)
    out["CALC-011"] = calcGeogridSqft("CALC-011", seg);

    // CALC-012 / CALC-013 shared
    out["CALC-012"] = calcSockPipeLF(seg, baseWidth);
    out["CALC-013"] = calcCapsTees(seg);

    // CALC-014 Total Excavation CBFT
    var maxWidth = Math.max(baseWidth, gravelBedWidth, geogridEmbedmentWidth);
    if (isBlank(seg.wallLength) || maxWidth === 0) {
      out["CALC-014"] = unresolved("CALC-014", "Total Excavation CBFT", "Wall Length and at least one of Base Width, Gravel Bed Width, or Geogrid Embedment Width are required.", seg);
    } else {
      var totalExcavationVolume = (avgHeight + embedmentDepth) * seg.wallLength * maxWidth;
      out["CALC-014"] = calculated("CALC-014", "Total Excavation CBFT", totalExcavationVolume, "CBFT",
        { averageExposedHeight: avgHeight, embedmentDepth: embedmentDepth, wallLength: seg.wallLength, maxWidth: maxWidth }, {},
        "(Avg Height + Embedment) x Wall Length x MAX(Base Width, Gravel Bed Width, Geogrid Embedment Width).");
    }

    // CALC-015 Placement Area
    if (aboveGroundSqft > 0 && !isBlank(seg.wallLength)) {
      var placementArea = aboveGroundSqft + (embedmentDepth * seg.wallLength);
      out["CALC-015"] = calculated("CALC-015", "Placement Area", placementArea, "SF", { aboveGroundSqft: aboveGroundSqft, embedmentDepth: embedmentDepth, wallLength: seg.wallLength }, {}, "Above-Ground Wall Face SQFT + (Embedment Depth x Wall Length).");
    } else {
      out["CALC-015"] = unresolved("CALC-015", "Placement Area", "Requires Above-Ground Wall Face SQFT and Wall Length.", seg);
    }

    // CALC-016 Backfill Tonnage
    var totalExcavationVolume14 = out["CALC-014"].status === "calculated" ? out["CALC-014"].value : null;
    var drainageGravelVolumeCY = out["CALC-009"].status === "calculated" ? (out["CALC-009"].value / 1.33 / 1.10) : 0; // approx back out volume for the subtraction rule
    if (totalExcavationVolume14 !== null && wallVolume >= 0) {
      var backfillTons = (totalExcavationVolume14 - wallVolume - (drainageGravelVolumeCY * 27)) / 27 * 1.25;
      if (backfillTons < 0) {
        out["CALC-016"] = calculated("CALC-016", "Backfill Tonnage", 0, "Tons", {}, {}, "Result was negative; returned 0 per rule.");
      } else {
        out["CALC-016"] = calculated("CALC-016", "Backfill Tonnage", roundUp(backfillTons, 2), "Tons",
          { totalExcavationVolume: totalExcavationVolume14, wallVolume: wallVolume, drainageGravelVolumeCY: drainageGravelVolumeCY }, { tonsPerCY: 1.25 }, "Round up to 2 decimals; 0 if negative.");
      }
    } else {
      out["CALC-016"] = unresolved("CALC-016", "Backfill Tonnage", "Depends on Total Excavation CBFT, which is currently unresolved.", seg);
    }

    // CALC-017 Footer SQFT
    if (!isBlank(seg.wallLength) && baseWidth > 0) {
      out["CALC-017"] = calculated("CALC-017", "Footer SQFT", baseWidth * seg.wallLength, "SF", { baseWidth: baseWidth, wallLength: seg.wallLength }, {}, "Base Width x Wall Length.");
    } else {
      out["CALC-017"] = unresolved("CALC-017", "Footer SQFT", "Base Width and Wall Length are required.", seg);
    }

    // CALC-018 Excavation SQFT
    if (!isBlank(seg.wallLength) && maxWidth > 0) {
      out["CALC-018"] = calculated("CALC-018", "Excavation SQFT", maxWidth * seg.wallLength, "SF", { maxWidth: maxWidth, wallLength: seg.wallLength }, {}, "MAX(Base Width, Gravel Bed Width, Geogrid Embedment Width) x Wall Length.");
    } else {
      out["CALC-018"] = unresolved("CALC-018", "Excavation SQFT", "Requires Wall Length and at least one width input.", seg);
    }

    // CALC-019 Drainage Trench Excavation CBFT
    if (!seg.drainageRequired && !seg.geogridRequired) {
      out["CALC-019"] = notApplicable("CALC-019", "Drainage Trench Excavation CBFT");
    } else if (aboveGroundSqft > 0 && (gravelBedWidth > 0 || geogridEmbedmentWidth > 0)) {
      var trenchMax = Math.max(gravelBedWidth, geogridEmbedmentWidth);
      out["CALC-019"] = calculated("CALC-019", "Drainage Trench Excavation CBFT", aboveGroundSqft * trenchMax, "CBFT", { aboveGroundSqft: aboveGroundSqft, trenchMax: trenchMax }, {}, "Above-Ground Wall Face SQFT x MAX(Gravel Bed Width, Geogrid Embedment Width).");
    } else {
      out["CALC-019"] = unresolved("CALC-019", "Drainage Trench Excavation CBFT", "Requires Above-Ground Wall Face SQFT and a gravel bed or geogrid embedment width.", seg);
    }

    return { outputs: out, totalWallHeight: totalWallHeight, aboveGroundSqft: aboveGroundSqft, wallVolume: wallVolume, embedmentDepth: embedmentDepth };
  }

  // =========================================================================
  // BLOCK WALL CALCULATIONS (CALC-020 through CALC-034)
  // =========================================================================

  function calcBlockWall(seg) {
    var out = {};
    var blockHeight = !isBlank(seg.blockHeight) ? seg.blockHeight : null;
    var numCourses = !isBlank(seg.numberOfCourses) ? seg.numberOfCourses : null;

    // CALC-020 Wall Embedment
    var embedmentDepth = 0;
    if (!isBlank(seg.wallEmbedmentDepth)) {
      embedmentDepth = seg.wallEmbedmentDepth;
      out["CALC-020"] = calculated("CALC-020", "Wall Embedment", embedmentDepth, "FT", { manualEntry: true }, {}, "Manual entry per rule permission.");
    } else if (blockHeight !== null && numCourses !== null && !isBlank(seg.averageExposedHeight)) {
      var raw = (numCourses * blockHeight) - seg.averageExposedHeight;
      embedmentDepth = raw < 0 ? 0 : raw;
      out["CALC-020"] = calculated("CALC-020", "Wall Embedment", embedmentDepth, "FT", { numberOfCourses: numCourses, blockHeight: blockHeight, averageExposedHeight: seg.averageExposedHeight }, {}, "(Courses x Block Height) - Avg Exposed Height; 0 if negative.");
    } else {
      out["CALC-020"] = unresolved("CALC-020", "Wall Embedment", "Requires Number of Courses, Block Height, and Average Exposed Height.", seg);
    }

    var avgHeight = !isBlank(seg.averageExposedHeight) ? seg.averageExposedHeight : 0;
    var totalWallHeight = avgHeight + embedmentDepth;

    // CALC-021 Above Ground Wall Face SQFT
    var aboveGroundSqft = 0;
    if (isBlank(seg.wallLength) || isBlank(avgHeight)) {
      out["CALC-021"] = unresolved("CALC-021", "Above Ground Wall Face SQFT", "Wall Length and Average Exposed Height required.", seg);
    } else {
      aboveGroundSqft = !isBlank(seg.wallFaceAreaOverride) ? seg.wallFaceAreaOverride : (seg.wallLength * avgHeight);
      out["CALC-021"] = calculated("CALC-021", "Above Ground Wall Face SQFT", aboveGroundSqft, "SF", { wallLength: seg.wallLength, averageExposedHeight: avgHeight }, {}, "Wall Length x Average Exposed Height.");
    }

    // CALC-022 Total Wall SQFT
    if (!isBlank(seg.wallLength)) {
      out["CALC-022"] = calculated("CALC-022", "Total Wall SQFT", seg.wallLength * totalWallHeight, "SF", { wallLength: seg.wallLength, totalWallHeight: totalWallHeight }, {}, "Wall Length x (Avg Height + Embedment).");
    } else {
      out["CALC-022"] = unresolved("CALC-022", "Total Wall SQFT", "Wall Length required.", seg);
    }

    // CALC-023 Block Count
    var blockCount = 0;
    var blockLength = !isBlank(seg.blockLength) ? seg.blockLength : null;
    if (!isBlank(seg.wallLength) && blockLength && numCourses !== null) {
      blockCount = Math.ceil((seg.wallLength / blockLength) * numCourses);
      out["CALC-023"] = calculated("CALC-023", "Block Count", blockCount, "EA", { wallLength: seg.wallLength, blockLength: blockLength, numberOfCourses: numCourses }, {}, "ROUNDUP((Wall Length / Block Length) x Courses, 0).");
    } else {
      out["CALC-023"] = unresolved("CALC-023", "Block Count", "Requires Wall Length, Block Length, and Number of Courses.", seg);
    }

    // CALC-024 Wet Mortar Yardage - "designated mortared courses" not otherwise quantified beyond total block volume;
    // implement using total block volume basis consistent with the stated 1-inch joint / 2-block depth assumption
    // applied across the full block count (this is the most literal defensible reading of the stated method).
    var wetMortarYards = 0;
    if (blockCount > 0 && blockHeight && blockLength && !isBlank(seg.wallDepthThickness)) {
      var jointVolumeCF = blockCount * (1 / 12) * blockLength * (seg.wallDepthThickness / 2) * 2; // 1" joints, 2-block depth
      wetMortarYards = (jointVolumeCF / 27) * 1.10;
      out["CALC-024"] = calculated("CALC-024", "Wet Mortar Yardage", roundUp(wetMortarYards, 2), "CY",
        { blockCount: blockCount, blockHeight: blockHeight, blockLength: blockLength, wallDepthThickness: seg.wallDepthThickness },
        { jointThicknessIn: 1, blockDepthFactor: 2, wasteFactor: 1.10 },
        "1-inch joints across a 2-block depth basis, plus 10% waste. Round up to 2 decimals.");
    } else {
      out["CALC-024"] = unresolved("CALC-024", "Wet Mortar Yardage", "Requires Block Count, Block Height, Block Length, and Wall Depth/Thickness.", seg);
    }

    // CALC-025 Dry Mortar Bags (70 lb)
    if (out["CALC-024"].status === "calculated" && out["CALC-024"].value > 0) {
      var dryBags = Math.ceil((out["CALC-024"].value * 2700) / 70);
      out["CALC-025"] = calculated("CALC-025", "Dry Mortar Bags (70 lb)", dryBags, "Bags", { wetMortarYardage: out["CALC-024"].value }, { lbsPerCY: 2700, lbsPerBag: 70 }, "ROUNDUP((Wet Mortar Yards x 2700) / 70, 0).");
    } else {
      out["CALC-025"] = notApplicable("CALC-025", "Dry Mortar Bags (70 lb)");
    }

    // CALC-026 Mason Sand Tonnage (Block Wall - fully defined, unlike Fieldstone's CALC-008)
    if (out["CALC-025"].status === "calculated") {
      var masonSandTons = out["CALC-025"].value * 0.0459 * 1.35 * 1.10;
      out["CALC-026"] = calculated("CALC-026", "Mason Sand Tonnage", roundUp(masonSandTons, 2), "Tons", { dryMortarBags: out["CALC-025"].value }, { cyPerBag: 0.0459, tonsPerCY: 1.35, wasteFactor: 1.10 }, "Round up to 2 decimals.");
    } else {
      out["CALC-026"] = notApplicable("CALC-026", "Mason Sand Tonnage");
    }

    // CALC-027 / CALC-028 shared
    out["CALC-027"] = calcDrainageGravelTonnage(seg, totalWallHeight);
    out["CALC-028"] = calcGeotextileFabricSqft(seg, totalWallHeight, embedmentDepth);

    // CALC-029 Geogrid SQFT (shared, unresolved)
    out["CALC-029"] = calcGeogridSqft("CALC-029", seg);

    // CALC-030 / CALC-031 shared
    var baseWidth = !isBlank(seg.baseWidth) ? seg.baseWidth : 0;
    out["CALC-030"] = calcSockPipeLF(seg, baseWidth);
    out["CALC-031"] = calcCapsTees(seg);

    // CALC-032 Rebar LF
    if (!isBlank(seg.blocksPerCourse) && !isBlank(seg.numberOfPinnedCourses)) {
      var rebarLF = (seg.blocksPerCourse * seg.numberOfPinnedCourses * 32) / 12;
      out["CALC-032"] = calculated("CALC-032", "Rebar LF", rebarLF, "LF", { blocksPerCourse: seg.blocksPerCourse, numberOfPinnedCourses: seg.numberOfPinnedCourses }, { inchesPerPinnedBlock: 32 }, "(Blocks per Course x Pinned Courses x 32in) / 12.");
    } else {
      out["CALC-032"] = unresolved("CALC-032", "Rebar LF", "Requires Blocks per Course and Number of Pinned Courses.", seg);
    }

    // CALC-033 Total Excavation CBFT
    var gravelBedWidth = !isBlank(seg.gravelBedWidth) ? seg.gravelBedWidth : 0;
    var geogridEmbedmentWidth = !isBlank(seg.geogridEmbedmentLength) ? seg.geogridEmbedmentLength : 0;
    var maxWidth = Math.max(baseWidth, gravelBedWidth, geogridEmbedmentWidth);
    if (!isBlank(seg.wallLength) && maxWidth > 0) {
      var totalExcavationVolume = (avgHeight + embedmentDepth) * seg.wallLength * maxWidth;
      out["CALC-033"] = calculated("CALC-033", "Total Excavation CBFT", totalExcavationVolume, "CBFT", { averageExposedHeight: avgHeight, embedmentDepth: embedmentDepth, wallLength: seg.wallLength, maxWidth: maxWidth }, {}, "(Avg Height + Embedment) x Wall Length x MAX widths.");
    } else {
      out["CALC-033"] = unresolved("CALC-033", "Total Excavation CBFT", "Requires Wall Length and at least one width input.", seg);
    }

    // CALC-034 Backfill Tonnage
    var wallVolumeForBackfill = 0; // Block Wall volume basis: use Above Ground SQFT x avg wall depth as a defensible proxy is NOT stated;
    // the workbook only gives excavation, drainage gravel and a generic "Wall Volume" term. We use CALC-033 minus a
    // computed block wall volume (blockCount-based) when available, else flag unresolved rather than approximate further.
    if (out["CALC-033"].status === "calculated" && !isBlank(seg.wallDepthThickness) && !isBlank(seg.wallLength)) {
      wallVolumeForBackfill = totalWallHeight * seg.wallLength * seg.wallDepthThickness;
      var drainageGravelVolCY = out["CALC-027"].status === "calculated" ? (out["CALC-027"].value / 1.33 / 1.10) : 0;
      var backfillTons = (out["CALC-033"].value - wallVolumeForBackfill - (drainageGravelVolCY * 27)) / 27 * 1.25;
      if (backfillTons < 0) {
        out["CALC-034"] = calculated("CALC-034", "Backfill Tonnage", 0, "Tons", {}, {}, "Result negative; returned 0 per rule.");
      } else {
        out["CALC-034"] = calculated("CALC-034", "Backfill Tonnage", roundUp(backfillTons, 2), "Tons",
          { totalExcavationVolume: out["CALC-033"].value, wallVolume: wallVolumeForBackfill, drainageGravelVolumeCY: drainageGravelVolCY }, { tonsPerCY: 1.25 }, "Round up to 2 decimals; 0 if negative.");
      }
    } else {
      out["CALC-034"] = unresolved("CALC-034", "Backfill Tonnage", "Depends on Total Excavation CBFT and Wall Depth/Thickness.", seg);
    }

    return { outputs: out, totalWallHeight: totalWallHeight, aboveGroundSqft: aboveGroundSqft, embedmentDepth: embedmentDepth, blockCount: blockCount };
  }

  // =========================================================================
  // CHOPPED STONE WALL CALCULATIONS (CALC-035 through CALC-047)
  // =========================================================================

  function calcChoppedStoneWall(seg) {
    var out = {};
    var blockHeight = seg.blockHeight, blockLength = seg.blockLength, blockDepth = seg.blockDepth;

    // CALC-035 CBFT Per Block
    var cbftPerBlock = 0;
    if (!isBlank(blockHeight) && !isBlank(blockLength) && !isBlank(blockDepth)) {
      cbftPerBlock = blockHeight * blockLength * blockDepth;
      out["CALC-035"] = calculated("CALC-035", "CBFT Per Block", cbftPerBlock, "CBFT", { blockHeight: blockHeight, blockLength: blockLength, blockDepth: blockDepth }, {}, "Height x Length x Depth (feet).");
    } else {
      out["CALC-035"] = unresolved("CALC-035", "CBFT Per Block", "Requires Block Height, Length, and Depth in feet.", seg);
    }

    // CALC-036 Block Face SQFT
    var blockFaceSqft = 0;
    if (!isBlank(blockHeight) && !isBlank(blockLength)) {
      blockFaceSqft = blockHeight * blockLength;
      out["CALC-036"] = calculated("CALC-036", "Block Face SQFT", blockFaceSqft, "SF", { blockHeight: blockHeight, blockLength: blockLength }, {}, "Height x Length (feet).");
    } else {
      out["CALC-036"] = unresolved("CALC-036", "Block Face SQFT", "Requires Block Height and Length.", seg);
    }

    // CALC-037 Block Count
    var blockCount = 0;
    if (!isBlank(seg.wallLength) && !isBlank(seg.averageExposedHeight) && blockFaceSqft > 0 && !isBlank(seg.wallDepthThickness)) {
      var wallFaceSqft = seg.wallLength * seg.averageExposedHeight;
      blockCount = Math.ceil((wallFaceSqft / blockFaceSqft) * seg.wallDepthThickness);
      out["CALC-037"] = calculated("CALC-037", "Block Count", blockCount, "EA", { wallFaceSqft: wallFaceSqft, blockFaceSqft: blockFaceSqft, wallDepthThickness: seg.wallDepthThickness }, {}, "ROUNDUP((Wall Face SF / Block Face SF) x Wall Depth LF, 0).");
    } else {
      out["CALC-037"] = unresolved("CALC-037", "Block Count", "Requires Wall Length, Average Exposed Height, Block Face SQFT, and Wall Depth/Thickness.", seg);
    }

    // CALC-038 Stone Tonnage
    if (blockCount > 0 && cbftPerBlock > 0) {
      var stoneTons = (blockCount * cbftPerBlock * 150) / 2000;
      out["CALC-038"] = calculated("CALC-038", "Stone Tonnage", roundUp(stoneTons, 2), "Tons", { blockCount: blockCount, cbftPerBlock: cbftPerBlock }, { lbsPerCubicFoot: 150, lbsPerTon: 2000 }, "Round up to 2 decimals.");
    } else {
      out["CALC-038"] = notApplicable("CALC-038", "Stone Tonnage");
    }

    // CALC-039 Dry Mortar Bags (70 lb)
    if (blockCount > 0) {
      out["CALC-039"] = calculated("CALC-039", "Dry Mortar Bags (70 lb)", Math.ceil(blockCount * 0.25), "Bags", { blockCount: blockCount }, {}, "ROUNDUP(Block Count x 0.25, 0).");
    } else {
      out["CALC-039"] = notApplicable("CALC-039", "Dry Mortar Bags (70 lb)");
    }

    // CALC-040 Mason Sand Tonnage
    if (blockCount > 0) {
      var sandTons = blockCount * 0.00486;
      out["CALC-040"] = calculated("CALC-040", "Mason Sand Tonnage", roundUp(sandTons, 2), "Tons", { blockCount: blockCount }, { tonsPerBlock: 0.00486 }, "Round up to 2 decimals.");
    } else {
      out["CALC-040"] = notApplicable("CALC-040", "Mason Sand Tonnage");
    }

    var totalWallHeight = !isBlank(seg.averageExposedHeight) ? seg.averageExposedHeight : 0;
    out["CALC-041"] = calcGeotextileFabricSqft(seg, totalWallHeight, 0);
    out["CALC-042"] = calcSockPipeLF(seg, !isBlank(seg.baseWidth) ? seg.baseWidth : 0);
    out["CALC-043"] = calcCapsTees(seg);
    out["CALC-044"] = calcGeogridSqft("CALC-044", seg);

    // CALC-046 Footer Excavation CBFT - height-based schedule undefined (Open Decision OD-003)
    out["CALC-046"] = unresolved("CALC-046", "Footer Excavation CBFT", "The workbook refers to an 'established height-based footer excavation schedule for Chopped Stone Wall' that is not tabulated anywhere (Open Decision OD-003). Enter manually with an override reason.", seg);

    // CALC-047 Drainage Bed Excavation CBFT
    if (!seg.drainageRequired) {
      out["CALC-047"] = notApplicable("CALC-047", "Drainage Bed Excavation CBFT");
    } else if (!isBlank(seg.wallLength) && !isBlank(seg.gravelBedWidth)) {
      var depth047 = !isBlank(seg.drainageGravelDepthOverride) ? seg.drainageGravelDepthOverride : (0.80 * totalWallHeight);
      var vol047 = seg.wallLength * seg.gravelBedWidth * depth047;
      out["CALC-047"] = calculated("CALC-047", "Drainage Bed Excavation CBFT", vol047, "CBFT", { wallLength: seg.wallLength, gravelBedWidth: seg.gravelBedWidth, drainageGravelDepth: depth047 }, {}, "Wall Length x Gravel Bed Width x Drainage Gravel Depth.");
    } else {
      out["CALC-047"] = unresolved("CALC-047", "Drainage Bed Excavation CBFT", "Requires Wall Length and Gravel Bed Width.", seg);
    }

    return { outputs: out, totalWallHeight: totalWallHeight, blockCount: blockCount };
  }

  // =========================================================================
  // KEYSTONE / CMU WALL CALCULATIONS (CALC-048 through CALC-063)
  // =========================================================================

  function calcKeystoneCmuWall(seg) {
    var out = {};

    // CALC-048 Average Wall Height
    var avgHeight;
    if (!isBlank(seg.averageExposedHeight)) {
      avgHeight = seg.averageExposedHeight;
      out["CALC-048"] = calculated("CALC-048", "Average Wall Height", avgHeight, "FT", { manualEntry: true }, {}, "Manual Average Exposed Height used directly.");
    } else if (!isBlank(seg.pointAHeight) && !isBlank(seg.pointBHeight)) {
      avgHeight = (seg.pointAHeight + seg.pointBHeight) / 2;
      out["CALC-048"] = calculated("CALC-048", "Average Wall Height", avgHeight, "FT", { pointAHeight: seg.pointAHeight, pointBHeight: seg.pointBHeight }, {}, "(Point A + Point B) / 2.");
    } else {
      avgHeight = 0;
      out["CALC-048"] = unresolved("CALC-048", "Average Wall Height", "Enter Average Exposed Height, or both Point A and Point B heights.", seg);
    }

    // CALC-049 / CALC-050: height-based schedules undefined (Open Decision OD-003)
    out["CALC-049"] = unresolved("CALC-049", "Footer Depth", "References an 'established height-based footer-depth schedule for Keystone/CMU Wall' that is not tabulated in the workbook (Open Decision OD-003). Enter manually with an override reason.", seg);
    out["CALC-050"] = unresolved("CALC-050", "Footer Width", "References an 'established height-based footer-width schedule for Keystone/CMU Wall' that is not tabulated in the workbook (Open Decision OD-003). Enter manually with an override reason.", seg);

    var footerDepth = !isBlank(seg.footerDepthManual) ? seg.footerDepthManual : 0;
    var footerWidth = !isBlank(seg.footerWidthManual) ? seg.footerWidthManual : 0;

    // CALC-051 Footer SQFT
    if (!isBlank(seg.wallLength) && footerWidth > 0) {
      out["CALC-051"] = calculated("CALC-051", "Footer SQFT", seg.wallLength * footerWidth, "SF", { wallLength: seg.wallLength, footerWidth: footerWidth }, {}, "Wall Length x Footer Width.");
    } else {
      out["CALC-051"] = unresolved("CALC-051", "Footer SQFT", "Requires Wall Length and Footer Width (footer width depends on unresolved CALC-050).", seg);
    }

    // CALC-052 Wall Face SQFT
    if (!isBlank(seg.wallLength) && avgHeight >= 0) {
      var wallFaceSqft = seg.wallLength * (avgHeight + footerDepth);
      out["CALC-052"] = calculated("CALC-052", "Wall Face SQFT", wallFaceSqft, "SF", { wallLength: seg.wallLength, averageWallHeight: avgHeight, footerDepth: footerDepth }, {}, "Wall Length x (Avg Height + Footer Depth).");
    } else {
      out["CALC-052"] = unresolved("CALC-052", "Wall Face SQFT", "Requires Wall Length and Average Wall Height.", seg);
    }

    // CALC-053 CBFT Per Block
    var cbftPerBlock = 0;
    if (!isBlank(seg.blockHeight) && !isBlank(seg.blockLength) && !isBlank(seg.blockDepth)) {
      cbftPerBlock = seg.blockHeight * seg.blockLength * seg.blockDepth;
      out["CALC-053"] = calculated("CALC-053", "CBFT Per Block", cbftPerBlock, "CBFT", { blockHeight: seg.blockHeight, blockLength: seg.blockLength, blockDepth: seg.blockDepth }, {}, "Height x Length x Depth (feet).");
    } else {
      out["CALC-053"] = unresolved("CALC-053", "CBFT Per Block", "Requires Block Height, Length, and Depth.", seg);
    }

    // CALC-054 Block Face SQFT
    var blockFaceSqft = 0;
    if (!isBlank(seg.blockHeight) && !isBlank(seg.blockLength)) {
      blockFaceSqft = seg.blockHeight * seg.blockLength;
      out["CALC-054"] = calculated("CALC-054", "Block Face SQFT", blockFaceSqft, "SF", { blockHeight: seg.blockHeight, blockLength: seg.blockLength }, {}, "Height x Length.");
    } else {
      out["CALC-054"] = unresolved("CALC-054", "Block Face SQFT", "Requires Block Height and Length.", seg);
    }

    // CALC-055 Block Count
    var blockCount = 0;
    if (out["CALC-052"].status === "calculated" && blockFaceSqft > 0 && !isBlank(seg.wallDepthThickness)) {
      blockCount = Math.ceil((out["CALC-052"].value / blockFaceSqft) * seg.wallDepthThickness);
      out["CALC-055"] = calculated("CALC-055", "Block Count", blockCount, "EA", { wallFaceSqft: out["CALC-052"].value, blockFaceSqft: blockFaceSqft, wallDepthThickness: seg.wallDepthThickness }, {}, "ROUNDUP((Wall Face SF / Block Face SF) x Wall Depth LF, 0).");
    } else {
      out["CALC-055"] = unresolved("CALC-055", "Block Count", "Requires Wall Face SQFT, Block Face SQFT, and Wall Depth/Thickness.", seg);
    }

    // CALC-056 Base/Gravel Fill Tonnage - depends on unresolved footer/drainage geometry; flag rather than approximate
    out["CALC-056"] = unresolved("CALC-056", "Base/Gravel Fill Tonnage", "Depends on footer and drainage geometry derived from the undefined height-based schedules (Open Decision OD-003). Enter manually.", seg);

    var totalWallHeight = avgHeight;
    out["CALC-057"] = calcGeotextileFabricSqft(seg, totalWallHeight, footerDepth);
    out["CALC-058"] = calcSockPipeLF(seg, footerWidth);
    out["CALC-059"] = calcCapsTees(seg);
    out["CALC-060"] = calcGeogridSqft("CALC-060", seg);
    out["CALC-061"] = calcGeogridSqft("CALC-061", seg);
    out["CALC-062"] = unresolved("CALC-062", "Gravel Bed Width FT", "References an 'established height-based gravel-bed-width schedule for Keystone/CMU Wall' not tabulated in the workbook (Open Decision OD-003). Enter manually with an override reason.", seg);
    out["CALC-063"] = calcDrainageGravelTonnage(seg, totalWallHeight);

    return { outputs: out, totalWallHeight: totalWallHeight, blockCount: blockCount };
  }

  // =========================================================================
  // LABOR (MAN-HOURS) CALCULATIONS
  // Implements the fully-defined productivity rules. Each takes a plain
  // "inputs" object matching the segment's structured fields for that
  // scope (demolition record, excavation quantity, wall-construction
  // quantity) plus an "equipment" object describing which catalog items
  // are present with role "Production Adjustment" or "Both".
  // =========================================================================

  function hasEquip(equipmentRows, catalogId) {
    return (equipmentRows || []).some(function (e) { return e.catalogId === catalogId && (e.role === "Production Adjustment" || e.role === "Both"); });
  }

  function applyMinCrew(hours, minCrewHours) {
    return Math.max(hours, minCrewHours || 0);
  }

  function roundHalf(hours) {
    return Math.ceil(hours * 2) / 2;
  }

  /**
   * Generic runner for the common pattern:
   *   Man-hours = (quantity / adjustedRate) * conditionMultiplier, min crew floor, round up to 0.5
   * adjustedRate = baseRate * (1 + sum of applicable equipment boosts)
   * This mirrors the repeated structure across CALC-064 through CALC-104.
   */
  function runProductivityRule(calcId, label, quantity, unit, baseRatePerHour, equipmentBoosts, conditionMultiplier, minCrewFloorHours, extraNotes) {
    if (isBlank(quantity) || quantity === 0) {
      return notApplicable(calcId, label);
    }
    var boostSum = (equipmentBoosts || []).reduce(function (sum, b) { return sum + b; }, 0);
    var adjustedRate = baseRatePerHour * (1 + boostSum);
    var rawHours = quantity / adjustedRate;
    var withConditions = rawHours * (conditionMultiplier || 1);
    var withCrewFloor = applyMinCrew(withConditions, minCrewFloorHours);
    var rounded = roundHalf(withCrewFloor);
    return calculated(calcId, label, rounded, "Man-Hours",
      { quantity: quantity, unit: unit, baseRatePerHour: baseRatePerHour, equipmentBoostSum: boostSum, conditionMultiplier: conditionMultiplier },
      { minCrewFloorHours: minCrewFloorHours || 0 },
      extraNotes || "Rounded up to nearest 0.5 hour.");
  }

  /**
   * Labor rule catalog. Each entry documents which CALC-ID it implements
   * and the exact baseline/crew/condition text from the workbook so a
   * reviewer can trace every number back to its source rule.
   */
  var LaborRules = {

    siteClearing: function (sf, conditions, equipmentRows) {
      // CALC-064: baseline 500 SF/hr, min crew 1
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.60); // Big excavator
      if (hasEquip(equipmentRows, "COST-012")) boosts.push(0.35); // Mini excavator
      if (hasEquip(equipmentRows, "COST-013")) boosts.push(0.45); // Skid steer
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15); // 2nd skid steer
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40); // Backhoe
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.30); // Wheel loader
      var conditionMult = 1;
      if (conditions.heavy) conditionMult += 0.85; else if (conditions.moderate) conditionMult += 0.35;
      if (conditions.stumpsRoots) conditionMult += 0.50;
      if (conditions.tightAccess) conditionMult += 0.40;
      return runProductivityRule("CALC-064", "Site Clearing", sf, "SF", 500, boosts, conditionMult, 0);
    },

    treeRemoval: function (treeCount, conditions, equipmentRows) {
      // CALC-065: 1 tree/hr baseline @ 3-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.75);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40);
      var conditionMult = 1;
      if (conditions.largeTree) conditionMult += 1.00; else if (conditions.smallTree) conditionMult -= 0.25;
      if (conditions.tightAccess) conditionMult += 0.40;
      if (conditions.stumpRemoval) conditionMult += 0.90;
      if (conditions.haulDisposal) conditionMult += 0.70;
      return runProductivityRule("CALC-065", "Tree Removal", treeCount, "EA", 1 / 3, boosts, conditionMult, 3, "Baseline reflects 1 tree/hr at a 3-person crew (3 man-hours per tree before adjustments).");
    },

    fenceRemoval: function (lf, conditions, equipmentRows) {
      // CALC-066: 120 LF/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15);
      var conditionMult = 1;
      conditionMult += conditions.iron ? 0.80 : (conditions.chainlink ? -0.20 : 0);
      if (conditions.setInConcrete) conditionMult += 0.60;
      if (conditions.tightAccess) conditionMult += 0.40;
      return runProductivityRule("CALC-066", "Existing Fence Removal", lf, "LF", 120 / 2, boosts, conditionMult, 2, "Baseline 120 LF/hr at a 2-person crew.");
    },

    demoStoneWall: function (sf, conditions, equipmentRows) {
      // CALC-067: 80 SF/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.70);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.50);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.30);
      if (conditions.hammerNeeded) {
        if (hasEquip(equipmentRows, "COST-022")) boosts.push(0.40);
        if (hasEquip(equipmentRows, "COST-023")) boosts.push(0.90);
      }
      var conditionMult = 1;
      conditionMult += conditions.mortared ? 0.75 : (conditions.dryStack ? -0.15 : 0);
      if (conditions.hammerNeeded) conditionMult += 1.20;
      if (conditions.tightAccess) conditionMult += 0.30;
      if (conditions.tall) conditionMult += 0.25;
      return runProductivityRule("CALC-067", "Demo Existing Wall (Stone)", sf, "SF", 80 / 2, boosts, conditionMult, 2, "Baseline 80 SF/hr at a 2-person crew.");
    },

    demoCmuBrickWall: function (sf, conditions, equipmentRows) {
      // CALC-068: 70 SF/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.65);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.50);
      if ((conditions.doubleFilled || conditions.rebar) && hasEquip(equipmentRows, "COST-019")) boosts.push(0.35);
      var conditionMult = 1;
      if (conditions.doubleFilled) conditionMult += 0.80;
      if (conditions.rebar) conditionMult += 0.40;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-068", "Demo Existing Wall (CMU/Brick)", sf, "SF", 70 / 2, boosts, conditionMult, 2, "Baseline 70 SF/hr at a 2-person crew.");
    },

    demoTimberWall: function (sf, conditions, equipmentRows) {
      // CALC-069: 90 SF/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.60);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.35);
      var conditionMult = 1;
      if (conditions.rotWet) conditionMult += 0.30;
      if (conditions.pinned) conditionMult += 0.60;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-069", "Demo Existing Wall (Timber/Railroad Tie)", sf, "SF", 90 / 2, boosts, conditionMult, 2, "Baseline 90 SF/hr at a 2-person crew.");
    },

    demoConcreteWall: function (sf, thicknessKey, equipmentRows) {
      // CALC-070: 40 SF/hr @ 3-person crew, thickness multiplier
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.70);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.60);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.35);
      var thicknessMap = { "6in": 1.0, "8in": 1.35, "12in": 2.0, "18in": 3.5, "24in": 5.0 };
      var mult = thicknessMap[thicknessKey] || 1.0;
      return runProductivityRule("CALC-070", "Demo Existing Wall (Poured Concrete)", sf, "SF", 40 / 3, boosts, mult, 3, "Baseline 40 SF/hr at a 3-person crew; thickness multiplier per rule table.");
    },

    drainageRemoval: function (cy, conditions, equipmentRows) {
      // CALC-071: 6 CY/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.60);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.50);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.30);
      var conditionMult = 1;
      conditionMult += conditions.plastic ? -0.15 : 0;
      if (conditions.glued) conditionMult += 0.25;
      if (conditions.concretePipe) conditionMult += 0.85;
      if (conditions.gravelFabric) conditionMult += 0.40;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-071", "Drainage Removal", cy, "CY", 6 / 2, boosts, conditionMult, 2, "Baseline 6 CY/hr at a 2-person crew.");
    },

    footerDemo: function (cy, conditions, equipmentRows) {
      // CALC-072: 3 CY/hr @ 3-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.70);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.60);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.35);
      if (conditions.hammerRequired) {
        if (hasEquip(equipmentRows, "COST-022")) boosts.push(0.50);
        if (hasEquip(equipmentRows, "COST-023")) boosts.push(1.10);
      }
      var conditionMult = 1;
      if (conditions.reinforced) conditionMult += 0.60;
      if (conditions.thickMass) conditionMult += 0.80;
      if (conditions.deepEmbedment) conditionMult += 0.50;
      if (conditions.hammerRequired) conditionMult += 1.00;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-072", "Footer Demo/Remove", cy, "CY", 3 / 3, boosts, conditionMult, 3, "Baseline 3 CY/hr at a 3-person crew.");
    },

    sortMaterials: function (cy, conditions, equipmentRows) {
      // CALC-073: 8 CY/hr @ 2-person crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.50);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.40);
      var conditionMult = 1;
      if (conditions.metalConcrete) conditionMult += 0.40;
      if (conditions.salvageStone) conditionMult += 0.60;
      if (conditions.wetMuddy) conditionMult += 0.35;
      if (conditions.tightAccess) conditionMult += 0.30;
      if (conditions.longCarry) conditionMult += 0.45;
      return runProductivityRule("CALC-073", "Sort Materials", cy, "CY", 8 / 2, boosts, conditionMult, 2, "Baseline 8 CY/hr at a 2-person crew.");
    },

    siteExcavation: function (cy, conditions, equipmentRows) {
      // CALC-074 / CALC-076 / CALC-103: 10 CY/hr @ 2-man crew (identical shared formula)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.50);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.30);
      var conditionMult = 1;
      if (conditions.looseFatty) conditionMult -= 0.15;
      conditionMult += conditions.breakableRock ? 0.85 : (conditions.semiRocky ? 0.35 : 0);
      if (conditions.tightAccess) conditionMult += 0.40;
      if (conditions.hammerNeeded) {
        conditionMult += conditions.bigHammer ? 0.15 : 0.05;
      }
      return runProductivityRule("CALC-074", "Site Excavation", cy, "CY", 10 / 2, boosts, conditionMult, 2, "Baseline 10 CY/hr at a 2-man crew. Shared with CALC-076 (footer/subgrade trench) and CALC-103.");
    },

    excavateDrainageTrenchBehindWall: function (cy, conditions, equipmentRows) {
      // CALC-102: 6 CY/hr @ 2-man crew (distinct baseline from site excavation)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.50);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.08);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.40);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.20);
      var conditionMult = 1;
      if (conditions.loose) conditionMult -= 0.10;
      conditionMult += conditions.breakableRock ? 0.85 : (conditions.semiRocky ? 0.35 : 0);
      if (conditions.hammerNeeded) conditionMult += 1.00;
      if (conditions.tightAccess) conditionMult += 0.40;
      return runProductivityRule("CALC-102", "Excavate Drainage Trench Behind Wall", cy, "CY", 6 / 2, boosts, conditionMult, 2, "Baseline 6 CY/hr at a 2-man crew.");
    },

    levelCompactSubgrade: function (sf, thicknessKey, equipmentRows) {
      // CALC-077 / CALC-104: 500 SF/hr @ 2-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.25);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.40);
      var thicknessMap = { "4in": 1.0, "6in": 1.5, "8in": 2.0, "12in": 3.0, "18in": 4.5 };
      var mult = thicknessMap[thicknessKey] || 1.0;
      return runProductivityRule("CALC-077", "Level & Compact Subgrade (Earthen Pad)", sf, "SF", 500 / 2, boosts, mult, 2, "Baseline 500 SF/hr at a 2-man crew; shared with CALC-079 and CALC-104.");
    },

    concreteFooterRebarTie: function (cy, conditions) {
      // CALC-080: 1.5 CY/hr baseline, all equipment ignored
      var conditionMult = 1;
      if (conditions.gte6Rebar) conditionMult += 0.50;
      if (conditions.ocew6in) conditionMult += 0.35;
      if (conditions.doubleMat) conditionMult += 0.80;
      if (conditions.curvesSteps) conditionMult += 0.30;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-080", "Concrete Footer - Rebar Set & Tie", cy, "CY", 1.5, [], conditionMult, 2, "Baseline 1.5 CY/hr; all equipment ignored per rule.");
    },

    concreteFooterFormSetting: function (lf, conditions) {
      // CALC-081: 35 LF/hr @ 2-man crew, equipment ignored
      var conditionMult = 1;
      if (conditions.curvesSteps) conditionMult += 0.40;
      if (conditions.doubleSided) conditionMult += 0.60;
      if (conditions.softSubgrade) conditionMult += 0.30;
      conditionMult += conditions.heightGte12 ? 0.60 : (conditions.height6to12 ? 0.30 : 0);
      return runProductivityRule("CALC-081", "Concrete Footer - Form Setting", lf, "LF", 35 / 2, [], conditionMult, 2, "Baseline 35 LF/hr at a 2-man crew; all equipment ignored.");
    },

    concreteFooterPourFinish: function (cy, trucksPerDay) {
      // CALC-082: distinctive structure, not the generic productivity-rule pattern
      if (isBlank(cy) || cy === 0) return notApplicable("CALC-082", "Concrete Footer - Pour & Finish Concrete");
      var td = trucksPerDay && trucksPerDay >= 1 && trucksPerDay <= 4 ? trucksPerDay : 2;
      var placementRate = (td * 10) / (9 * 0.9);
      var pourHours = cy / placementRate;
      var pourDays = Math.ceil(cy / (td * 10));
      var hours = pourHours + (1.5 * pourDays);
      var rounded = roundHalf(applyMinCrew(hours, 4));
      return calculated("CALC-082", "Concrete Footer - Pour & Finish Concrete", rounded, "Man-Hours",
        { cy: cy, trucksPerDay: td },
        { placementRateCyPerHr: placementRate, pourDays: pourDays, minPourCrew: 4, utilizationFactor: 0.9 },
        "Pour hours = CY / placement rate, plus 1.5 hr per pour day; min pour crew 4; round up. Trucks/day defaults to 2 if not specified (see Open Decision on checkbox-to-input mapping).");
    },

    concreteFooterWreckForms: function (lf, conditions) {
      // CALC-083: 50 LF/hr @ 2-man crew, equipment ignored
      var conditionMult = 1;
      if (conditions.curvesSteps) conditionMult += 0.30;
      if (conditions.doubleSided) conditionMult += 0.45;
      if (conditions.softSubgrade) conditionMult += 0.25;
      conditionMult += conditions.heightGte12 ? 0.40 : (conditions.height6to12 ? 0.20 : 0);
      return runProductivityRule("CALC-083", "Concrete Footer - Wreck Forms", lf, "LF", 50 / 2, [], conditionMult, 2, "Baseline 50 LF/hr at a 2-man crew; all equipment ignored.");
    },

    baseCourseSetBlocks: function (blocks, conditions, equipmentRows) {
      // CALC-084: 2 blocks/hr @ 3-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      var conditionMult = 1;
      if (conditions.mortared) conditionMult += 0.35;
      if (conditions.earthenBase) conditionMult += 0.30;
      if (conditions.curvesSteps) conditionMult += 0.25;
      if (conditions.longCarry) conditionMult += 0.35;
      if (conditions.pinnedToFooter) conditionMult += 0.30;
      return runProductivityRule("CALC-084", "Base Course - Set Blocks", blocks, "EA", 2 / 3, boosts, conditionMult, 3, "Baseline 2 blocks/hr at a 3-man crew (18 blocks in 9 hr with 3-man).");
    },

    wallStackingAdditionalBlocks: function (blocks, conditions, equipmentRows) {
      // CALC-085: 25/9 blocks/hr @ 3-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      var conditionMult = 1;
      if (conditions.mortared) conditionMult += 0.20;
      if (conditions.earthenBase) conditionMult += 0.25;
      if (conditions.curvesSteps) conditionMult += 0.30;
      if (conditions.longCarry) conditionMult += 0.35;
      if (conditions.pinnedToFooter) conditionMult += 0.25;
      return runProductivityRule("CALC-085", "Wall Stacking - Set Additional Blocks", blocks, "EA", (25 / 9) / 3, boosts, conditionMult, 3, "Baseline 24 blocks in 9 hr at a 3-man crew.");
    },

    cutAndFit: function (cuts) {
      // CALC-086: 25 min per cut, no equipment factors
      if (isBlank(cuts) || cuts === 0) return notApplicable("CALC-086", "Cut & Fit (Corners/Curves)");
      var hours = cuts * (25 / 60);
      return calculated("CALC-086", "Cut & Fit (Corners/Curves)", roundHalf(hours), "Man-Hours", { cuts: cuts }, { minutesPerCut: 25 }, "No equipment factors; round up to 0.5 hr.");
    },

    blockFaceChipping: function (blocks, tightAccess) {
      // CALC-087: 5 min per block, +25% if tight access
      if (isBlank(blocks) || blocks === 0) return notApplicable("CALC-087", "Block Face Chipping");
      var hours = blocks * (5 / 60) * (tightAccess ? 1.25 : 1);
      return calculated("CALC-087", "Block Face Chipping", roundHalf(hours), "Man-Hours", { blocks: blocks, tightAccess: !!tightAccess }, { minutesPerBlock: 5 }, "Equipment not relevant; round up to 0.5 hr.");
    },

    blockDrillingForPins: function (blocks) {
      // CALC-088: 8 min per block
      if (isBlank(blocks) || blocks === 0) return notApplicable("CALC-088", "Block Drilling for Pins");
      var hours = blocks * (8 / 60);
      return calculated("CALC-088", "Block Drilling for Pins", roundHalf(hours), "Man-Hours", { blocks: blocks }, { minutesPerBlock: 8 }, "Round up to 0.5 hr.");
    },

    drainOutletBlockCutting: function (outlets) {
      // CALC-089: 20 min per outlet
      if (isBlank(outlets) || outlets === 0) return notApplicable("CALC-089", "Drain Outlet Block Cutting");
      var hours = outlets * (20 / 60);
      return calculated("CALC-089", "Drain Outlet Block Cutting", roundHalf(hours), "Man-Hours", { outlets: outlets }, { minutesPerOutlet: 20 }, "Round up to 0.5 hr.");
    },

    choppedStoneBlockPlacementMortar: function (sf, conditions, equipmentRows) {
      // CALC-090: 550/9 SF/hr @ 4-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      var conditionMult = 1;
      if (conditions.tightAccess) conditionMult += 0.30;
      if (conditions.curvesSteps) conditionMult += 0.25;
      if (conditions.complexPattern) conditionMult += 0.40;
      if (conditions.doubleSided) conditionMult += 0.60;
      return runProductivityRule("CALC-090", "Block Placement & Mortar (Chopped Stone)", sf, "SF", (550 / 9) / 4, boosts, conditionMult, 4, "Baseline ~61.1 SF/hr at a 4-man crew.");
    },

    fieldStoneSetForms: function (lf, conditions) {
      // CALC-091: 1000/9 LF/hr @ 4-man crew, all equipment ignored
      var conditionMult = 1;
      if (conditions.curvesSteps) conditionMult += 0.35;
      if (conditions.doubleSided) conditionMult += 0.60;
      if (conditions.softSubgrade) conditionMult += 0.30;
      if (conditions.tallGte8) conditionMult += 0.40;
      return runProductivityRule("CALC-091", "Set Forms (Field Stone)", lf, "LF", (1000 / 9) / 4, [], conditionMult, 4, "Baseline ~111.1 LF/hr at a 4-man crew; all equipment ignored.");
    },

    fieldStonePlacementMortar: function (sf, conditions, equipmentRows) {
      // CALC-092: 450/9 SF/hr @ 4-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.08);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.15);
      var conditionMult = 1;
      if (conditions.tightAccess) conditionMult += 0.30;
      if (conditions.tallGte8) conditionMult += 0.35;
      if (conditions.baseWidthGte3) conditionMult += 0.25;
      if (conditions.curvesSteps) conditionMult += 0.25;
      if (conditions.complexPattern) conditionMult += 0.40;
      return runProductivityRule("CALC-092", "Stone Placement & Mortar (Field Stone)", sf, "SF", (450 / 9) / 4, boosts, conditionMult, 4, "Baseline 50 SF/hr at a 4-man crew.");
    },

    keystoneBlockPlacement: function (sf, conditions, equipmentRows) {
      // CALC-093: 500/9 SF/hr @ 3-man crew
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.08);
      var conditionMult = 1;
      if (conditions.curvesCorners) conditionMult += 0.25;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-093", "Block Placement (Keystone)", sf, "SF", (500 / 9) / 3, boosts, conditionMult, 3, "Baseline ~55.6 SF/hr at a 3-man crew.");
    },

    installDrainPipe: function (lf, conditions) {
      // CALC-094: 120 LF/hr @ 2-man crew, all equipment ignored
      var conditionMult = 1;
      conditionMult += conditions.plastic ? -0.10 : 0;
      if (conditions.manyFittings) conditionMult += 0.40;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-094", "Install Drain Pipe", lf, "LF", 120 / 2, [], conditionMult, 2, "Baseline 120 LF/hr at a 2-man crew; all equipment ignored.");
    },

    placeDrainageGravel: function (tons, conditions, equipmentRows) {
      // CALC-095: 12 tons/hr @ 2-man crew (primary skid ignored)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.60);
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.25);
      var conditionMult = 1;
      if (conditions.longHaul) conditionMult += 0.40;
      if (conditions.tightAccess) conditionMult += 0.30;
      return runProductivityRule("CALC-095", "Place Drainage Gravel", tons, "Tons", 12 / 2, boosts, conditionMult, 2, "Baseline 12 tons/hr at a 2-man crew; primary skid steer ignored.");
    },

    installGeotexFabric: function (sf, conditions) {
      // CALC-096: 900 SF/hr @ 2-man crew, all equipment ignored
      var conditionMult = 1;
      if (conditions.curvesCorners) conditionMult += 0.30;
      if (conditions.steepSlope) conditionMult += 0.35;
      conditionMult += conditions.straightRuns ? -0.10 : 0;
      if (conditions.obstacles) conditionMult += 0.40;
      return runProductivityRule("CALC-096", "Install Geotextile Filter Fabric", sf, "SF", 900 / 2, [], conditionMult, 2, "Baseline 900 SF/hr at a 2-man crew; all equipment ignored.");
    },

    installGeogrid: function (sf, conditions, equipmentRows) {
      // CALC-097: 700 SF/hr @ 3-man crew, light assists
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-013") || hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.15);
      var conditionMult = 1;
      if (conditions.curvesCorners) conditionMult += 0.25;
      if (conditions.soilPinning) conditionMult += 0.30;
      if (conditions.steepSlope) conditionMult += 0.35;
      if (conditions.tightAccess) conditionMult += 0.30;
      conditionMult += conditions.straightRuns ? -0.10 : 0;
      return runProductivityRule("CALC-097", "Install Geogrid (Cut, Roll, Tension, Pin Back)", sf, "SF", 700 / 3, boosts, conditionMult, 3, "Baseline 700 SF/hr at a 3-man crew.");
    },

    installBackfill: function (tons, conditions, equipmentRows) {
      // CALC-098: 12 tons/hr @ 2-person crew (primary skid ignored)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-014")) boosts.push(0.10);
      if (hasEquip(equipmentRows, "COST-016")) boosts.push(0.25);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.50);
      var conditionMult = 1 + (conditions.factor1 ? 0.40 : 0) + (conditions.factor2 ? 0.30 : 0) + (conditions.factor3 ? 0.40 : 0);
      return runProductivityRule("CALC-098", "Install Backfill", tons, "Tons", 12 / 2, boosts, conditionMult, 2, "Baseline 12 tons/hr at a 2-person crew; primary skid steer ignored.");
    },

    compactBackfillLifts: function (tons, conditions, equipmentRows) {
      // CALC-099: 40 tons/hr @ 1-person (little roller ignored)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-017")) { /* little roller ignored per rule */ }
      if (hasEquip(equipmentRows, "COST-018")) { /* "Big Roller" per rule text = standard Roller catalog item */ }
      var conditionMult = 1;
      if (conditions.thinLifts) conditionMult += 0.30;
      if (conditions.steepSlope) conditionMult += 0.30;
      if (conditions.tightAccess) conditionMult += 0.25;
      return runProductivityRule("CALC-099", "Compact Backfill in Lifts", tons, "Tons", 40, [], conditionMult, 1, "Baseline 40 tons/hr at 1-person; little roller ignored per rule.");
    },

    finalGrade: function (sf, tightAccess, equipmentRows) {
      // CALC-100: 1500 SF/hr @ 2-man crew (mini excavator ignored)
      var boosts = [];
      if (hasEquip(equipmentRows, "COST-015")) boosts.push(0.20);
      if (hasEquip(equipmentRows, "COST-013")) boosts.push(0.15);
      if (hasEquip(equipmentRows, "COST-019")) boosts.push(0.25);
      var conditionMult = 1 + (tightAccess ? 0.25 : 0);
      return runProductivityRule("CALC-100", "Final Grade", sf, "SF", 1500 / 2, boosts, conditionMult, 2, "Baseline 1500 SF/hr at a 2-man crew; mini excavator ignored.");
    },

    mortarMixing: function (quantity, factorA, factorB) {
      // CALC-101: 3 units/hr @ 1-person, all equipment ignored
      var conditionMult = 1 + (factorA ? 0.30 : 0) + (factorB ? 0.25 : 0);
      return runProductivityRule("CALC-101", "Mortar Mixing - Dry Mortar Bags, Sand & Water", quantity, "Units", 3, [], conditionMult, 1, "Baseline 3 units/hr at 1-person; all equipment ignored.");
    }
  };

  // =========================================================================
  // ESTIMATE-LEVEL ORCHESTRATION
  // Runs the material engine for every takeoff segment on an estimate,
  // rolls detailed cost rows up by proposal line item and cost category,
  // and computes the full Profit Goals financial breakdown.
  // =========================================================================

  function runMaterialEngineForSegment(seg) {
    switch (seg.wallType) {
      case "Fieldstone Wall": return calcFieldstone(seg);
      case "Block Wall": return calcBlockWall(seg);
      case "Chopped Stone Wall": return calcChoppedStoneWall(seg);
      case "Keystone/CMU Wall": return calcKeystoneCmuWall(seg);
      default:
        return { outputs: {}, totalWallHeight: 0 };
    }
  }

  /**
   * Recalculates every takeoff segment's material outputs on an estimate
   * and returns the fields that should be merged back onto the estimate
   * record (takeoffSegments with calculatedOutputs populated, plus a
   * financial summary). Does NOT persist - caller (data.js / ui.js) saves
   * the result via AbcData.updateEstimate.
   */
  function recalculateEstimate(estimate) {
    var updatedSegments = (estimate.takeoffSegments || []).map(function (seg) {
      if (seg.segmentType !== "Installed Wall") {
        return Object.assign({}, seg, { calculatedOutputs: { outputs: {}, note: "Material-Only Sale / Demolition Only / Other Custom Scope segments do not run wall geometry calculations." } });
      }
      var result = runMaterialEngineForSegment(seg);
      return Object.assign({}, seg, { calculatedOutputs: result });
    });

    var financials = computeEstimateFinancials(Object.assign({}, estimate, { takeoffSegments: updatedSegments }));

    return {
      takeoffSegments: updatedSegments,
      calculatedSnapshot: financials,
      sellingPrice: financials.sellingPrice
    };
  }

  /**
   * Computes the full Profit Goals financial breakdown for an estimate,
   * using its costRows (detailed internal cost rows, each already
   * assigned to a proposal line item + cost category per the workbook's
   * "each detailed cost must be assigned to both" rule).
   */
  function computeEstimateFinancials(estimate) {
    var costRows = estimate.costRows || [];
    var byCategory = {};
    var directEstimatedCost = 0;

    costRows.forEach(function (row) {
      var lineTotal = (row.quantity || 0) * (row.unitCost || 0);
      directEstimatedCost += lineTotal;
      byCategory[row.costCategoryId] = (byCategory[row.costCategoryId] || 0) + lineTotal;
    });

    var sellingPrice = !isBlank(estimate.manualPriceOverride) ? estimate.manualPriceOverride : estimate.sellingPrice || 0;

    var tier = D.findProfitGoalTier(sellingPrice || directEstimatedCost, estimate.customerType);

    var overheadReservePct = !isBlank(estimate.overheadReservePct) ? estimate.overheadReservePct : D.OVERHEAD_RESERVE_DEFAULT;
    var contingencyReservePct = !isBlank(estimate.contingencyReservePct) ? estimate.contingencyReservePct : (tier ? tier.contingencyReserve : null);
    var hasCompanyOwnedEquipment = (estimate.takeoffSegments || []).some(function (seg) {
      return (seg.equipmentRows || []).some(function (e) { return e.ownership === "Company-Owned"; });
    });
    var equipmentRepairReservePct = !isBlank(estimate.equipmentRepairReservePct)
      ? estimate.equipmentRepairReservePct
      : (hasCompanyOwnedEquipment && tier ? tier.equipmentRepairReserve : 0);

    var overheadReserveDollars = directEstimatedCost * overheadReservePct;
    var contingencyReserveDollars = contingencyReservePct !== null ? directEstimatedCost * contingencyReservePct : 0;
    var equipmentRepairReserveDollars = directEstimatedCost * (equipmentRepairReservePct || 0);

    var contributionMarginDollars = sellingPrice - directEstimatedCost;
    var contributionMarginPct = sellingPrice > 0 ? contributionMarginDollars / sellingPrice : 0;

    var netEstimatedProfitDollars = sellingPrice - directEstimatedCost - overheadReserveDollars - contingencyReserveDollars - equipmentRepairReserveDollars;
    var netEstimatedProfitPct = sellingPrice > 0 ? netEstimatedProfitDollars / sellingPrice : 0;

    var belowFloor = tier ? contributionMarginPct < tier.minMargin : null;
    var aboveReviewCeiling = tier ? contributionMarginPct > tier.maxMargin : null;

    var overheadOutOfBand = overheadReservePct < D.OVERHEAD_RESERVE_MIN || overheadReservePct > D.OVERHEAD_RESERVE_MAX;

    return {
      directEstimatedCost: D.round2(directEstimatedCost),
      byCategory: mapValues(byCategory, D.round2),
      sellingPrice: D.round2(sellingPrice),
      tierId: tier ? tier.id : null,
      tierLabel: tier ? tier.tier : "No matching tier (check contract value and project type)",
      targetMargin: tier ? tier.targetMargin : null,
      minMargin: tier ? tier.minMargin : null,
      maxMargin: tier ? tier.maxMargin : null,
      overheadReservePct: overheadReservePct,
      overheadReserveDollars: D.round2(overheadReserveDollars),
      overheadOutOfBand: overheadOutOfBand,
      contingencyReservePct: contingencyReservePct,
      contingencyReserveDollars: D.round2(contingencyReserveDollars),
      equipmentRepairReservePct: equipmentRepairReservePct,
      equipmentRepairReserveDollars: D.round2(equipmentRepairReserveDollars),
      equipmentRepairReserveApplied: hasCompanyOwnedEquipment,
      contributionMarginDollars: D.round2(contributionMarginDollars),
      contributionMarginPct: contributionMarginPct,
      netEstimatedProfitDollars: D.round2(netEstimatedProfitDollars),
      netEstimatedProfitPct: netEstimatedProfitPct,
      belowFloor: belowFloor,
      aboveReviewCeiling: aboveReviewCeiling,
      requiresApproval: belowFloor === true || aboveReviewCeiling === true || overheadOutOfBand,
      calculatedAt: new Date().toISOString()
    };
  }

  function mapValues(obj, fn) {
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = fn(obj[k]); });
    return out;
  }

  // =========================================================================
  // PROJECT-LEVEL FINANCIAL ROLLUPS
  // Implements the Project Financial Summary definitions from README section
  // 9 and Expense & Payment Tracking (FIN-003, FIN-004, FIN-007, FIN-008).
  // =========================================================================

  function computeProjectFinancials(project, expenses, subcontractorCosts, laborEntries, changeOrders, invoices, payments) {
    var approvedExpenses = (expenses || []).filter(function (e) { return e.approvalStatus === "Approved"; });
    var approvedSubs = (subcontractorCosts || []).filter(function (s) { return s.approvalStatus === "Approved"; });
    var approvedLabor = (laborEntries || []).filter(function (l) { return l.approvalStatus === "Approved"; });
    var approvedChangeOrders = (changeOrders || []).filter(function (c) { return c.status === "Approved"; });

    var actualExpenseTotal = approvedExpenses.reduce(function (sum, e) { return sum + e.totalAmount; }, 0);
    var actualSubTotal = approvedSubs.reduce(function (sum, s) { return sum + s.invoiceAmount; }, 0);
    var actualLaborTotal = approvedLabor.reduce(function (sum, l) { return sum + l.totalLaborCost; }, 0);

    var actualProjectCost = actualExpenseTotal + actualSubTotal + actualLaborTotal;

    var approvedChangeOrderTotal = approvedChangeOrders.reduce(function (sum, c) { return sum + c.amount; }, 0);
    var contractValue = (project.originalContractValue || 0) + approvedChangeOrderTotal;
    var totalProjectValue = contractValue; // Contract Value / Total Project Value are the same figure per README definition.

    var amountPaid = (payments || []).reduce(function (sum, p) { return sum + p.amount; }, 0);
    var amountOwed = totalProjectValue - amountPaid;

    var actualProjectProfit = totalProjectValue - actualProjectCost;

    var totalInvoiced = (invoices || []).filter(function (i) { return i.status !== "Void"; }).reduce(function (sum, i) { return sum + i.invoiceAmount; }, 0);

    // Budget-versus-actual by category
    var budgetByCategory = (project.originalProjectBudget && project.originalProjectBudget.byCategory) || {};
    var actualByCategory = {};
    approvedExpenses.forEach(function (e) { actualByCategory[e.costCategoryId] = (actualByCategory[e.costCategoryId] || 0) + e.totalAmount; });
    approvedSubs.forEach(function (s) { actualByCategory[s.costCategoryId] = (actualByCategory[s.costCategoryId] || 0) + s.invoiceAmount; });
    approvedLabor.forEach(function (l) { actualByCategory["CAT-002"] = (actualByCategory["CAT-002"] || 0) + l.totalLaborCost; });

    var pendingByCategory = {};
    (expenses || []).filter(function (e) { return e.approvalStatus === "Submitted" || e.approvalStatus === "Draft"; }).forEach(function (e) {
      pendingByCategory[e.costCategoryId] = (pendingByCategory[e.costCategoryId] || 0) + e.totalAmount;
    });

    var categoryIds = uniqueMerge([Object.keys(budgetByCategory), Object.keys(actualByCategory), Object.keys(pendingByCategory)]);
    var categoryBreakdown = categoryIds.map(function (catId) {
      var budget = budgetByCategory[catId] || 0;
      var actual = actualByCategory[catId] || 0;
      var pending = pendingByCategory[catId] || 0;
      var variance = actual - budget;
      var variancePct = budget > 0 ? variance / budget : null;
      return { costCategoryId: catId, budget: D.round2(budget), actual: D.round2(actual), pending: D.round2(pending), variance: D.round2(variance), variancePct: variancePct };
    });

    return {
      originalProjectBudget: project.originalProjectBudget,
      contractValue: D.round2(contractValue),
      totalProjectValue: D.round2(totalProjectValue),
      approvedChangeOrderTotal: D.round2(approvedChangeOrderTotal),
      amountPaid: D.round2(amountPaid),
      amountOwed: D.round2(amountOwed),
      totalInvoiced: D.round2(totalInvoiced),
      actualProjectCost: D.round2(actualProjectCost),
      actualExpenseTotal: D.round2(actualExpenseTotal),
      actualSubcontractorTotal: D.round2(actualSubTotal),
      actualLaborTotal: D.round2(actualLaborTotal),
      actualProjectProfit: D.round2(actualProjectProfit),
      actualProjectProfitLabel: "Incurred-cost view (approved costs only, not necessarily paid). See Actual Project Profit definition.",
      categoryBreakdown: categoryBreakdown,
      projectedFinalProfit: null, // Only shown when forecast-to-complete data exists; not implemented (no forecast workflow defined in the workbook).
      calculatedAt: new Date().toISOString()
    };
  }

  function uniqueMerge(arraysOfKeys) {
    var set = {};
    arraysOfKeys.forEach(function (arr) { arr.forEach(function (k) { set[k] = true; }); });
    return Object.keys(set);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  global.AbcCalculations = {
    // orchestration
    runMaterialEngineForSegment: runMaterialEngineForSegment,
    recalculateEstimate: recalculateEstimate,
    computeEstimateFinancials: computeEstimateFinancials,
    computeProjectFinancials: computeProjectFinancials,

    // exposed for unit-level UI use (e.g., a "run this one calc" preview)
    calcFieldstone: calcFieldstone,
    calcBlockWall: calcBlockWall,
    calcChoppedStoneWall: calcChoppedStoneWall,
    calcKeystoneCmuWall: calcKeystoneCmuWall,
    LaborRules: LaborRules,

    // helpers
    roundUp: roundUp,
    roundHalf: roundHalf
  };

})(window);
