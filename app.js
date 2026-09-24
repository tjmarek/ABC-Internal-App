/* =========================================================================
   AUSTIN BLOCK COMPANY INTERNAL OPERATIONS APP
   app.js

   PURPOSE
   The router, event-delegation layer, and application bootstrap. This file
   is the only place that:
     - Listens for hash changes and renders the matching view via ui.js
     - Wires every data-* action hook rendered by ui.js (clicks and form
       submits) to the corresponding AbcData / AbcCalculations call
     - Opens modals with the correct form, and saves their submissions
     - Bootstraps demo data, appearance, and the initial route on load

   Routing pattern: '#/module' or '#/module/:id' or '#/module/:id/:tab'
   All data mutations happen through AbcData; this file never touches
   localStorage directly.
   ========================================================================= */

(function () {
  "use strict";

  var D = window.AbcData;
  var C = window.AbcCalculations;
  var S = window.AbcStorage;
  var U = window.AbcUI;

  var viewRoot = document.getElementById("view-root");

  // Simple in-memory UI state for list filters (not persisted; resets on reload).
  var uiState = {
    opportunities: {},
    estimates: {},
    priceCatalog: {},
    projects: {},
    reports: {}
  };

  function activeUser() {
    return D.getUserById(D.getActiveUserId());
  }

  // =========================================================================
  // ROUTER
  // =========================================================================

  function parseHash() {
    var hash = window.location.hash || "#/dashboard";
    var parts = hash.replace(/^#\//, "").split("/").filter(Boolean);
    return { module: parts[0] || "dashboard", id: parts[1] || null, tab: parts[2] || null };
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function renderRoute() {
    var route = parseHash();
    U.setActiveNavLink(route.module);
    U.closeMobileSidebar();

    var html = "";
    switch (route.module) {
      case "dashboard":
        html = U.renderDashboard();
        break;
      case "opportunities":
        if (route.id) html = U.renderOpportunityDetail(route.id);
        else html = U.renderOpportunitiesList(uiState.opportunities);
        break;
      case "estimates":
        if (route.id) html = U.renderEstimateWorkspace(route.id, route.tab);
        else html = U.renderEstimatesList(uiState.estimates);
        break;
      case "price-catalog":
        html = U.renderPriceCatalog(uiState.priceCatalog);
        break;
      case "cost-categories":
        html = U.renderCostCategories();
        break;
      case "profit-goals":
        html = U.renderProfitGoals();
        break;
      case "projects":
        if (route.id) html = U.renderProjectDetail(route.id, route.tab);
        else html = U.renderProjectsList(uiState.projects);
        break;
      case "reports":
        html = U.renderReports(uiState.reports);
        break;
      case "integration":
        html = U.renderIntegrationReadiness();
        break;
      case "open-decisions":
        html = U.renderOpenDecisions();
        break;
      case "settings":
        html = U.renderSettings();
        break;
      default:
        html = U.emptyState("&#10067;", "Page not found", "Use the sidebar to navigate to a valid section.");
    }
    viewRoot.innerHTML = html;
    document.getElementById("main-content").focus();
  }

  window.addEventListener("hashchange", renderRoute);

  // =========================================================================
  // GENERIC MUTATION HELPER
  // Wraps a data-mutating action with a try/catch so a bad input never
  // crashes the whole app; shows a friendly error toast instead.
  // =========================================================================

  function safeRun(fn) {
    try {
      fn();
    } catch (err) {
      console.error(err);
      U.showToast("Something went wrong: " + (err && err.message ? err.message : "please try again."), "danger");
    }
  }

  function refreshCurrentRoute() {
    renderRoute();
  }

  // =========================================================================
  // GLOBAL EVENT DELEGATION: CLICKS
  // =========================================================================

  document.addEventListener("click", function (e) {
    var target = e.target;

    // ---- row navigation (clickable table rows) ----
    var navRow = target.closest("[data-nav]");
    if (navRow && !target.closest("button") && !target.closest("a")) {
      navigate(navRow.getAttribute("data-nav"));
      return;
    }

    // ---- close modal buttons ----
    if (target.closest("[data-close-modal]")) {
      U.closeModal();
      return;
    }

    // ---- mobile nav toggle ----
    if (target.closest("#mobile-nav-toggle")) { U.openMobileSidebar(); return; }
    if (target.closest("#sidebar-close") || target.closest("#sidebar-backdrop")) { U.closeMobileSidebar(); return; }

    // ---- appearance toggle (topbar + settings) ----
    var appearanceBtn = target.closest(".appearance-btn");
    if (appearanceBtn) {
      U.setAppearanceForActiveUser(appearanceBtn.getAttribute("data-mode"));
      return;
    }

    // ---- demo banner ----
    if (target.closest("#demo-banner-dismiss")) { document.getElementById("demo-banner").hidden = true; return; }
    if (target.closest("#demo-banner-reset")) { confirmResetDemoData(); return; }
    if (target.closest("#reset-demo-data-btn")) { confirmResetDemoData(); return; }

    // ---- export / import ----
    if (target.closest("#export-data-btn")) { exportData(); return; }

    // ---- OPPORTUNITIES ----
    if (target.closest("#new-opportunity-btn") || target.closest("#empty-new-opportunity-btn")) { openNewOpportunityModal(); return; }
    if (target.closest("#edit-opp-btn")) { openEditOpportunityModal(parseHash().id); return; }
    if (target.closest("#mark-lost-btn")) { U.openModal(U.renderMarkLostForm(parseHash().id)); return; }
    if (target.closest("#mark-hold-btn")) { U.openModal(U.renderMarkHoldForm(parseHash().id)); return; }
    if (target.closest("#new-estimate-btn")) { U.openModal(U.renderNewEstimateForm(parseHash().id)); return; }

    var addFileBtn = target.closest("[data-add-file]");
    if (addFileBtn) { U.openModal(U.renderAddFileForm(addFileBtn.getAttribute("data-add-file"), addFileBtn.getAttribute("data-record-type"))); return; }
    var delFileBtn = target.closest("[data-delete-file]");
    if (delFileBtn) {
      var fileId = delFileBtn.getAttribute("data-delete-file");
      U.openConfirm("Remove this file placeholder?", "<p>This only removes the placeholder record in this prototype.</p>", function () {
        safeRun(function () { D.deleteFilePlaceholder(fileId); refreshCurrentRoute(); U.showToast("File placeholder removed.", "success"); });
      }, { danger: true });
      return;
    }

    // ---- ESTIMATE WORKSPACE TABS ----
    var estTabBtn = target.closest("[data-est-tab]");
    if (estTabBtn) { navigate("#/estimates/" + estTabBtn.getAttribute("data-est-id") + "/" + estTabBtn.getAttribute("data-est-tab")); return; }

    if (target.closest("#edit-estimate-header-btn")) { var est1 = D.getEstimateById(parseHash().id); U.openModal(U.renderEditEstimateHeaderForm(est1)); return; }
    if (target.closest("#create-revision-btn")) { U.openModal(U.renderRevisionReasonForm(parseHash().id)); return; }

    if (target.closest("#add-line-item-btn")) { var estLI = D.getEstimateById(parseHash().id); U.openModal(U.renderLineItemForm(estLI, null)); return; }
    var editLI = target.closest("[data-edit-line-item]");
    if (editLI) {
      var estForLI = D.getEstimateById(editLI.getAttribute("data-est-id"));
      var li = estForLI.proposalLineItems.find(function (x) { return x.id === editLI.getAttribute("data-edit-line-item"); });
      U.openModal(U.renderLineItemForm(estForLI, li));
      return;
    }

    if (target.closest("#add-segment-btn")) { var estSeg = D.getEstimateById(parseHash().id); U.openModal(U.renderSegmentForm(estSeg, null), { wide: true }); return; }
    var editSeg = target.closest("[data-edit-segment]");
    if (editSeg) {
      var estForSeg = D.getEstimateById(editSeg.getAttribute("data-est-id"));
      var seg = estForSeg.takeoffSegments.find(function (x) { return x.id === editSeg.getAttribute("data-edit-segment"); });
      U.openModal(U.renderSegmentForm(estForSeg, seg), { wide: true });
      return;
    }
    if (target.closest("#run-calculations-btn")) { runEstimateCalculations(parseHash().id); return; }

    if (target.closest("#add-cost-row-btn")) { var estCR = D.getEstimateById(parseHash().id); U.openModal(U.renderCostRowForm(estCR, null)); return; }
    var editCR = target.closest("[data-edit-cost-row]");
    if (editCR) {
      var estForCR = D.getEstimateById(editCR.getAttribute("data-est-id"));
      var row = estForCR.costRows.find(function (x) { return x.id === editCR.getAttribute("data-edit-cost-row"); });
      U.openModal(U.renderCostRowForm(estForCR, row));
      return;
    }

    if (target.closest("#print-proposal-btn")) { printProposal(parseHash().id); return; }

    if (target.closest("#submit-for-review-btn")) { submitEstimateForReview(parseHash().id); return; }
    if (target.closest("#approve-estimate-btn")) { approveEstimate(parseHash().id); return; }
    if (target.closest("#request-revision-btn")) { requestRevision(parseHash().id); return; }
    if (target.closest("#send-proposal-btn")) { sendProposal(parseHash().id); return; }
    if (target.closest("#mark-won-btn")) { U.openModal(U.renderMarkWonForm(parseHash().id)); return; }
    if (target.closest("#mark-declined-btn")) { U.openModal(U.renderDeclineForm(parseHash().id)); return; }

    var completeFU = target.closest("[data-complete-followup]");
    if (completeFU) { U.openModal(U.renderCompleteFollowUpForm(completeFU.getAttribute("data-complete-followup"))); return; }

    // ---- PROJECTS TABS ----
    var projTabBtn = target.closest("[data-proj-tab]");
    if (projTabBtn) { navigate("#/projects/" + projTabBtn.getAttribute("data-proj-id") + "/" + projTabBtn.getAttribute("data-proj-tab")); return; }

    if (target.closest("#new-project-btn")) { U.openModal(U.renderNewProjectForm()); return; }
    if (target.closest("#edit-project-btn")) { var proj1 = D.getProjectById(parseHash().id); U.openModal(U.renderEditProjectForm(proj1)); return; }
    if (target.closest("#close-project-btn")) { var proj2 = D.getProjectById(parseHash().id); U.openModal(U.renderCloseProjectForm(proj2)); return; }

    // ---- EXPENSES ----
    if (target.closest("#add-expense-btn")) { var pForExp = D.getProjectById(parseHash().id); U.openModal(U.renderExpenseForm(pForExp, null)); return; }
    var submitExp = target.closest("[data-submit-expense]");
    if (submitExp) { safeRun(function () { D.updateExpense(submitExp.getAttribute("data-submit-expense"), { approvalStatus: "Submitted" }, activeUser(), "Submitted expense for approval"); refreshCurrentRoute(); U.showToast("Expense submitted.", "success"); }); return; }
    var approveExp = target.closest("[data-approve-expense]");
    if (approveExp) { safeRun(function () { D.updateExpense(approveExp.getAttribute("data-approve-expense"), { approvalStatus: "Approved", approvedByUserId: activeUser().id }, activeUser(), "Approved expense"); refreshCurrentRoute(); U.showToast("Expense approved.", "success"); }); return; }
    var rejectExp = target.closest("[data-reject-expense]");
    if (rejectExp) { U.openModal(U.renderRejectExpenseForm(rejectExp.getAttribute("data-reject-expense"))); return; }
    var payExp = target.closest("[data-pay-expense]");
    if (payExp) { U.openModal(U.renderMarkExpensePaidForm(payExp.getAttribute("data-pay-expense"))); return; }

    // ---- SUBCONTRACTORS ----
    if (target.closest("#add-sub-btn")) { var pForSub = D.getProjectById(parseHash().id); U.openModal(U.renderSubForm(pForSub, null)); return; }
    var approveSub = target.closest("[data-approve-sub]");
    if (approveSub) { safeRun(function () { D.updateSubcontractorCost(approveSub.getAttribute("data-approve-sub"), { approvalStatus: "Approved" }, activeUser(), "Approved subcontractor cost"); refreshCurrentRoute(); U.showToast("Subcontractor cost approved.", "success"); }); return; }
    var rejectSub = target.closest("[data-reject-sub]");
    if (rejectSub) { U.openModal(U.renderRejectSubForm(rejectSub.getAttribute("data-reject-sub"))); return; }
    var paySub = target.closest("[data-pay-sub]");
    if (paySub) {
      var subId = paySub.getAttribute("data-pay-sub");
      U.openConfirm("Mark this subcontractor invoice as paid?", "", function () {
        safeRun(function () { D.updateSubcontractorCost(subId, { paid: true, paidDate: new Date().toISOString() }, activeUser(), "Marked subcontractor invoice paid"); refreshCurrentRoute(); U.showToast("Marked paid.", "success"); });
      });
      return;
    }

    // ---- ABC LABOR ----
    if (target.closest("#add-labor-btn")) { var pForLabor = D.getProjectById(parseHash().id); U.openModal(U.renderLaborForm(pForLabor, null)); return; }
    var approveLabor = target.closest("[data-approve-labor]");
    if (approveLabor) { safeRun(function () { D.updateLaborEntry(approveLabor.getAttribute("data-approve-labor"), { approvalStatus: "Approved" }, activeUser(), "Approved labor entry"); refreshCurrentRoute(); U.showToast("Labor entry approved.", "success"); }); return; }
    var rejectLabor = target.closest("[data-reject-labor]");
    if (rejectLabor) { U.openModal(U.renderRejectLaborForm(rejectLabor.getAttribute("data-reject-labor"))); return; }
    var payrollBtn = target.closest("[data-process-payroll]");
    if (payrollBtn) {
      var laborId = payrollBtn.getAttribute("data-process-payroll");
      U.openConfirm("Mark this labor entry as payroll processed?", "", function () {
        safeRun(function () { D.updateLaborEntry(laborId, { payrollProcessed: true }, activeUser(), "Marked payroll processed"); refreshCurrentRoute(); U.showToast("Marked payroll processed.", "success"); });
      });
      return;
    }

    // ---- CHANGE ORDERS ----
    if (target.closest("#add-co-btn")) { var pForCO = D.getProjectById(parseHash().id); U.openModal(U.renderChangeOrderForm(pForCO)); return; }
    var submitCO = target.closest("[data-submit-co]");
    if (submitCO) { safeRun(function () { D.updateChangeOrder(submitCO.getAttribute("data-submit-co"), { status: "Submitted" }, activeUser(), "Submitted change order"); refreshCurrentRoute(); U.showToast("Change order submitted.", "success"); }); return; }
    var approveCO = target.closest("[data-approve-co]");
    if (approveCO) { safeRun(function () { D.updateChangeOrder(approveCO.getAttribute("data-approve-co"), { status: "Approved", approvedDate: new Date().toISOString() }, activeUser(), "Approved change order"); refreshCurrentRoute(); U.showToast("Change order approved.", "success"); }); return; }
    var rejectCO = target.closest("[data-reject-co]");
    if (rejectCO) { U.openModal(U.renderRejectCoForm(rejectCO.getAttribute("data-reject-co"))); return; }

    // ---- INVOICES ----
    if (target.closest("#add-invoice-btn")) { var pForInv = D.getProjectById(parseHash().id); U.openModal(U.renderInvoiceForm(pForInv)); return; }
    var sendInv = target.closest("[data-send-invoice]");
    if (sendInv) { safeRun(function () { D.updateInvoice(sendInv.getAttribute("data-send-invoice"), { status: "Sent" }, activeUser(), "Marked invoice sent"); refreshCurrentRoute(); U.showToast("Invoice marked sent.", "success"); }); return; }
    var voidInv = target.closest("[data-void-invoice]");
    if (voidInv) {
      var invId = voidInv.getAttribute("data-void-invoice");
      U.openConfirm("Void this invoice?", "<p>Voided invoices are excluded from Total Invoiced reporting.</p>", function () {
        safeRun(function () { D.updateInvoice(invId, { status: "Void" }, activeUser(), "Voided invoice"); refreshCurrentRoute(); U.showToast("Invoice voided.", "success"); });
      }, { danger: true });
      return;
    }

    // ---- PAYMENTS ----
    if (target.closest("#add-payment-btn")) { var pForPay = D.getProjectById(parseHash().id); U.openModal(U.renderPaymentForm(pForPay)); return; }

    // ---- OPEN DECISIONS ----
    if (target.closest("#add-open-decision-btn")) { U.openModal(U.renderAddOpenDecisionForm()); return; }
  });

  // =========================================================================
  // GLOBAL EVENT DELEGATION: CHANGE (filters, selects that act immediately)
  // =========================================================================

  document.addEventListener("change", function (e) {
    var target = e.target;

    if (target.id === "opp-status-filter") { uiState.opportunities.status = target.value; refreshCurrentRoute(); return; }
    if (target.id === "est-status-filter") { uiState.estimates.status = target.value; refreshCurrentRoute(); return; }
    if (target.id === "catalog-category-filter") { uiState.priceCatalog.categoryId = target.value; refreshCurrentRoute(); return; }
    if (target.id === "proj-status-filter") { uiState.projects.status = target.value; refreshCurrentRoute(); return; }

    if (target.id === "active-user-select") {
      D.setActiveUserId(target.value);
      U.initAppearanceForActiveUser();
      updateSidebarUserChip();
      U.showToast("Switched active user to " + D.getUserById(target.value).name + ".", "success");
      refreshCurrentRoute();
      return;
    }

    if (target.id === "settings-user-select") {
      D.setActiveUserId(target.value);
      U.initAppearanceForActiveUser();
      updateSidebarUserChip();
      syncTopbarUserSelect();
      U.showToast("Switched active user to " + D.getUserById(target.value).name + ".", "success");
      refreshCurrentRoute();
      return;
    }

    if (target.id === "import-data-input") { handleImportFile(target); return; }
  });

  // =========================================================================
  // GLOBAL EVENT DELEGATION: INPUT (debounced search boxes)
  // =========================================================================

  var searchDebounceTimer = null;
  document.addEventListener("input", function (e) {
    var target = e.target;
    var isSearchBox = ["opp-search", "est-search", "catalog-search", "proj-search", "reports-search"].indexOf(target.id) !== -1;
    if (!isSearchBox) return;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function () {
      if (target.id === "opp-search") uiState.opportunities.search = target.value;
      if (target.id === "est-search") uiState.estimates.search = target.value;
      if (target.id === "catalog-search") uiState.priceCatalog.search = target.value;
      if (target.id === "proj-search") uiState.projects.search = target.value;
      if (target.id === "reports-search") uiState.reports.search = target.value;
      // Preserve focus across re-render for search inputs.
      var caret = target.selectionStart;
      refreshCurrentRoute();
      var newEl = document.getElementById(target.id);
      if (newEl) { newEl.focus(); try { newEl.setSelectionRange(caret, caret); } catch (e2) {} }
    }, 220);
  });

  // =========================================================================
  // GLOBAL EVENT DELEGATION: FORM SUBMIT
  // =========================================================================

  document.addEventListener("submit", function (e) {
    var form = e.target;
    e.preventDefault();

    switch (form.id) {
      case "new-opportunity-form": return handleNewOpportunity(form);
      case "edit-opportunity-form": return handleEditOpportunity(form);
      case "mark-lost-form": return handleMarkLost(form);
      case "mark-hold-form": return handleMarkHold(form);
      case "new-estimate-form": return handleNewEstimate(form);
      case "add-file-form": return handleAddFile(form);

      case "edit-estimate-header-form": return handleEditEstimateHeader(form);
      case "revision-reason-form": return handleCreateRevision(form);
      case "line-item-form": return handleSaveLineItem(form);
      case "segment-form": return handleSaveSegment(form);
      case "cost-row-form": return handleSaveCostRow(form);
      case "pricing-adjustments-form": return handlePricingAdjustments(form);
      case "complete-followup-form": return handleCompleteFollowUp(form);
      case "decline-form": return handleDecline(form);
      case "mark-won-form": return handleMarkWon(form);

      case "new-project-form": return handleNewProject(form);
      case "edit-project-form": return handleEditProject(form);
      case "close-project-form": return handleCloseProject(form);

      case "expense-form": return handleSaveExpense(form);
      case "reject-expense-form": return handleRejectExpense(form);
      case "mark-expense-paid-form": return handleMarkExpensePaid(form);

      case "sub-form": return handleSaveSub(form);
      case "reject-sub-form": return handleRejectSub(form);

      case "labor-form": return handleSaveLabor(form);
      case "reject-labor-form": return handleRejectLabor(form);

      case "co-form": return handleSaveChangeOrder(form);
      case "reject-co-form": return handleRejectChangeOrder(form);

      case "invoice-form": return handleSaveInvoice(form);
      case "payment-form": return handleSavePayment(form);

      case "add-open-decision-form": return handleAddOpenDecision(form);
      case "controlled-lists-form": return handleSaveControlledLists(form);

      default:
        console.warn("Unhandled form submit:", form.id);
    }
  });

  // =========================================================================
  // MODAL OPENERS THAT NEED A LOOKUP FIRST
  // =========================================================================

  function openNewOpportunityModal() {
    U.openModal(U.renderNewOpportunityForm());
  }

  function openEditOpportunityModal(oppId) {
    var opp = D.getOpportunityById(oppId);
    if (!opp) return;
    U.openModal(U.renderOpportunityEditForm(opp));
  }

  // =========================================================================
  // FORM HANDLERS: OPPORTUNITIES
  // =========================================================================

  function handleNewOpportunity(form) {
    var data = U.readForm(form, ["customerName", "primaryContact", "projectAddress", "projectType", "customerType", "leadSource", "description"]);
    var dup = D.findPossibleDuplicateOpportunity(data.customerName, data.projectAddress, null);
    if (dup) {
      var warnArea = document.getElementById("duplicate-warning-area");
      if (warnArea && !warnArea.dataset.confirmed) {
        warnArea.innerHTML = '<div class="callout callout-warning mt-2">An active opportunity already exists for this customer and address (' + U.esc(dup.id) + '). Submit again to create a duplicate anyway, or cancel and open the existing record.</div>';
        warnArea.dataset.confirmed = "true";
        return;
      }
    }
    safeRun(function () {
      var opp = D.createOpportunity(data, activeUser());
      U.closeModal();
      U.showToast("Opportunity " + opp.id + " created.", "success");
      navigate("#/opportunities/" + opp.id);
    });
  }

  function handleEditOpportunity(form) {
    var oppId = parseHash().id;
    var data = U.readForm(form, ["customerName", "primaryContact", "projectAddress", "projectType", "customerType", "leadSource", "status", "nextActionDate", "description"]);
    safeRun(function () {
      D.updateOpportunity(oppId, data, activeUser(), "Edited opportunity details");
      U.closeModal();
      U.showToast("Opportunity updated.", "success");
      refreshCurrentRoute();
    });
  }

  function handleMarkLost(form) {
    var oppId = form.getAttribute("data-opp-id");
    var data = U.readForm(form, ["lossReason", "lossNotes"]);
    safeRun(function () {
      D.updateOpportunity(oppId, { status: "Lost", lossReason: data.lossReason, lossNotes: data.lossNotes, closeDate: new Date().toISOString() }, activeUser(), "Marked Lost: " + data.lossReason);
      var current = D.getCurrentEstimateForOpportunity(oppId);
      if (current && (current.status === "Sent" || current.status === "Approved to Send")) {
        D.updateEstimate(current.id, { status: "Declined", declineReason: data.lossReason }, activeUser(), "Estimate declined (opportunity lost)");
      }
      D.stopFollowUpsForOpportunity(oppId);
      U.closeModal();
      U.showToast("Opportunity marked Lost.", "success");
      refreshCurrentRoute();
    });
  }

  function handleMarkHold(form) {
    var oppId = form.getAttribute("data-opp-id");
    var data = U.readForm(form, ["holdReason", "nextReviewDate"]);
    safeRun(function () {
      D.updateOpportunity(oppId, { status: "On Hold", nextActionDate: data.nextReviewDate }, activeUser(), "Placed On Hold: " + data.holdReason);
      U.closeModal();
      U.showToast("Opportunity placed on hold.", "success");
      refreshCurrentRoute();
    });
  }

  function handleNewEstimate(form) {
    var oppId = form.getAttribute("data-opp-id");
    var data = U.readForm(form, ["estimateType", "customerType", "proposalExpirationDate", "estimateNotes"]);
    safeRun(function () {
      var est = D.createEstimate(oppId, data, activeUser());
      U.closeModal();
      U.showToast("Estimate " + est.id + " created.", "success");
      navigate("#/estimates/" + est.id);
    });
  }

  function handleAddFile(form) {
    var recordId = form.getAttribute("data-record-id");
    var recordType = form.getAttribute("data-record-type");
    var data = U.readForm(form, ["fileName", "fileCategory", "notes"]);
    safeRun(function () {
      D.addFilePlaceholder(recordId, recordType, data, activeUser());
      U.closeModal();
      U.showToast("File placeholder added.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: ESTIMATE WORKSPACE
  // =========================================================================

  function handleEditEstimateHeader(form) {
    var estId = form.getAttribute("data-est-id");
    var data = U.readForm(form, ["estimateType", "customerType", "jobAddress", "proposalExpirationDate", "proposalValidityDays", "estimateNotes"]);
    safeRun(function () {
      D.updateEstimate(estId, data, activeUser(), "Edited estimate header");
      U.closeModal();
      U.showToast("Estimate information saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleCreateRevision(form) {
    var estId = form.getAttribute("data-est-id");
    var data = U.readForm(form, ["revisionReason"]);
    safeRun(function () {
      var newRev = D.createEstimateRevision(estId, activeUser(), data.revisionReason);
      U.closeModal();
      U.showToast("Revision " + newRev.revisionNumber + " created.", "success");
      navigate("#/estimates/" + newRev.id);
    });
  }

  function handleSaveLineItem(form) {
    var estId = form.getAttribute("data-est-id");
    var lineItemId = form.getAttribute("data-line-item-id");
    var data = U.readForm(form, ["title", "description", "customerFacingNote", "sortOrder", "visibleOnProposal"]);
    safeRun(function () {
      var est = D.getEstimateById(estId);
      var items = est.proposalLineItems.slice();
      if (lineItemId) {
        var idx = items.findIndex(function (i) { return i.id === lineItemId; });
        items[idx] = Object.assign({}, items[idx], data);
      } else {
        items.push(Object.assign({ id: "PLI-" + estId + "-" + (items.length + 1) }, data));
      }
      D.updateEstimate(estId, { proposalLineItems: items }, activeUser(), (lineItemId ? "Edited" : "Added") + " proposal line item: " + data.title);
      U.closeModal();
      U.showToast("Line item saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleSaveSegment(form) {
    var estId = form.getAttribute("data-est-id");
    var segmentId = form.getAttribute("data-segment-id");
    var fieldIds = [
      "segmentName", "assignedProposalLineItemId", "segmentType", "wallType",
      "wallLength", "averageExposedHeight", "minimumExposedHeight", "maximumExposedHeight",
      "wallShape", "cornerReturnEndCount", "numberOfCourses", "blockHeight", "blockLength", "blockDepth",
      "wallDepthThickness", "baseWidth", "capRequired",
      "drainageRequired", "gravelBedWidth", "drainOutletCount", "geogridRequired",
      "manualGeogridAreaOverride", "manualGeogridAreaOverrideReason",
      "demolitionRequired", "demolitionScopeType", "demolitionQuantity",
      "accessLevel", "siteSlope", "soilCondition"
    ];
    var data = U.readForm(form, fieldIds);
    safeRun(function () {
      var est = D.getEstimateById(estId);
      var segments = est.takeoffSegments.slice();
      var idx = segments.findIndex(function (s) { return s.id === segmentId; });
      var merged = Object.assign({ id: segmentId, equipmentRows: idx !== -1 ? segments[idx].equipmentRows : [] }, idx !== -1 ? segments[idx] : {}, data);
      if (idx !== -1) segments[idx] = merged; else segments.push(merged);
      D.updateEstimate(estId, { takeoffSegments: segments }, activeUser(), (idx !== -1 ? "Edited" : "Added") + " takeoff segment: " + data.segmentName);
      U.closeModal();
      U.showToast("Takeoff segment saved. Run calculations to update material quantities.", "success");
      refreshCurrentRoute();
    });
  }

  function runEstimateCalculations(estId) {
    safeRun(function () {
      var est = D.getEstimateById(estId);
      var result = C.recalculateEstimate(est);
      D.updateEstimate(estId, result, activeUser(), "Ran material and labor calculations");
      U.showToast("Calculations updated.", "success");
      refreshCurrentRoute();
    });
  }

  function handleSaveCostRow(form) {
    var estId = form.getAttribute("data-est-id");
    var costRowId = form.getAttribute("data-cost-row-id");
    var data = U.readForm(form, ["proposalLineItemId", "costCategoryId", "priceCatalogLookup", "description", "quantity", "unit", "unitCost", "sourceType", "overrideReason"]);
    if (data.priceCatalogLookup) {
      var catalogItem = D.getPriceCatalog().find(function (c) { return c.id === data.priceCatalogLookup; });
      if (catalogItem) {
        if (!data.description) data.description = catalogItem.item;
        if (!data.unit || data.unit === "EA") data.unit = catalogItem.unit;
        data.unitCost = catalogItem.cost;
        data.sourceType = "Catalog";
      }
    }
    delete data.priceCatalogLookup;
    safeRun(function () {
      var est = D.getEstimateById(estId);
      var rows = est.costRows.slice();
      if (costRowId) {
        var idx = rows.findIndex(function (r) { return r.id === costRowId; });
        rows[idx] = Object.assign({}, rows[idx], data);
      } else {
        rows.push(Object.assign({ id: S.generateToken() }, data));
      }
      var updated = D.updateEstimate(estId, { costRows: rows }, activeUser(), (costRowId ? "Edited" : "Added") + " cost row: " + data.description);
      var fin = C.computeEstimateFinancials(updated);
      D.updateEstimate(estId, { calculatedSnapshot: fin, sellingPrice: updated.manualPriceOverride || fin.sellingPrice || updated.sellingPrice }, activeUser(), "Recalculated financials after cost row change");
      U.closeModal();
      U.showToast("Cost row saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handlePricingAdjustments(form) {
    var estId = form.getAttribute("data-est-id");
    var data = U.readForm(form, ["manualPriceOverride", "overheadReservePct", "contingencyReservePct", "equipmentRepairReservePct", "belowFloorReason"]);
    safeRun(function () {
      var changes = {
        manualPriceOverride: data.manualPriceOverride,
        overheadReservePct: data.overheadReservePct !== null ? data.overheadReservePct / 100 : D.OVERHEAD_RESERVE_DEFAULT,
        contingencyReservePct: data.contingencyReservePct !== null ? data.contingencyReservePct / 100 : null,
        equipmentRepairReservePct: data.equipmentRepairReservePct !== null ? data.equipmentRepairReservePct / 100 : null,
        belowFloorReason: data.belowFloorReason
      };
      var est = D.updateEstimate(estId, changes, activeUser(), "Updated pricing/reserve settings");
      var fin = C.computeEstimateFinancials(est);
      var finalSellingPrice = data.manualPriceOverride !== null ? data.manualPriceOverride : fin.sellingPrice;
      D.updateEstimate(estId, { calculatedSnapshot: fin, sellingPrice: finalSellingPrice }, activeUser(), "Recalculated financial breakdown");
      U.showToast("Financials recalculated.", "success");
      refreshCurrentRoute();
    });
  }

  function submitEstimateForReview(estId) {
    safeRun(function () {
      D.createEstimateSnapshot(estId, "Submitted", activeUser());
      var est = D.updateEstimate(estId, { status: "Ready for Review" }, activeUser(), "Generated proposal preview and submitted for internal review");
      D.updateOpportunity(est.opportunityId, { status: "Estimate Under Review" }, activeUser(), "Estimate submitted for review");
      U.showToast("Estimate submitted for review.", "success");
      refreshCurrentRoute();
    });
  }

  function approveEstimate(estId) {
    safeRun(function () {
      D.createEstimateSnapshot(estId, "Approved", activeUser());
      D.updateEstimate(estId, { status: "Approved to Send" }, activeUser(), "Approved to send by " + activeUser().name);
      U.showToast("Estimate approved to send.", "success");
      refreshCurrentRoute();
    });
  }

  function requestRevision(estId) {
    U.openConfirm("Request a revision for this estimate?", "<p>This returns the estimate to an editable state.</p>", function () {
      safeRun(function () {
        D.updateEstimate(estId, { status: "Revision Requested" }, activeUser(), "Revision requested by " + activeUser().name);
        D.updateEstimate(estId, { status: "In Progress" }, activeUser(), "Unlocked for editing");
        U.showToast("Revision requested; estimate unlocked for editing.", "success");
        refreshCurrentRoute();
      });
    });
  }

  function sendProposal(estId) {
    safeRun(function () {
      var sentDate = new Date().toISOString();
      D.createEstimateSnapshot(estId, "Sent", activeUser());
      var est = D.updateEstimate(estId, {
        status: "Sent",
        sentHistory: (D.getEstimateById(estId).sentHistory || []).concat([{ sentDate: sentDate, sentBy: activeUser().name, method: "Recorded manually" }])
      }, activeUser(), "Proposal sent to customer");
      D.updateOpportunity(est.opportunityId, { status: "Estimate Sent" }, activeUser(), "Estimate sent");
      D.scheduleFollowUps(estId, est.opportunityId, sentDate, activeUser());
      U.showToast("Proposal marked sent. 10-day and 28-day follow-ups scheduled.", "success");
      refreshCurrentRoute();
    });
  }

  function handleDecline(form) {
    var estId = form.getAttribute("data-est-id");
    var data = U.readForm(form, ["declineReason"]);
    safeRun(function () {
      var est = D.updateEstimate(estId, { status: "Declined", declineReason: data.declineReason }, activeUser(), "Estimate declined: " + data.declineReason);
      D.updateOpportunity(est.opportunityId, { status: "Lost", lossReason: data.declineReason, closeDate: new Date().toISOString() }, activeUser(), "Opportunity marked Lost");
      D.stopFollowUpsForOpportunity(est.opportunityId);
      U.closeModal();
      U.showToast("Estimate marked Declined; opportunity marked Lost.", "success");
      refreshCurrentRoute();
    });
  }

  function handleMarkWon(form) {
    var estId = form.getAttribute("data-est-id");
    var data = U.readForm(form, ["acceptedContractValue", "acceptanceEvidence", "expectedStartDate"]);
    safeRun(function () {
      D.createEstimateSnapshot(estId, "Accepted", activeUser());
      var est = D.updateEstimate(estId, {
        status: "Accepted",
        acceptedDate: new Date().toISOString(),
        acceptedContractValue: data.acceptedContractValue
      }, activeUser(), "Marked Accepted. Evidence: " + data.acceptanceEvidence);
      D.updateOpportunity(est.opportunityId, { status: "Won", closeDate: new Date().toISOString() }, activeUser(), "Opportunity marked Won");
      D.stopFollowUpsForOpportunity(est.opportunityId);
      var project = D.convertEstimateToProject(estId, { status: "Setup", startDate: data.expectedStartDate || null }, activeUser());
      U.closeModal();
      U.showToast("Opportunity Won. Project " + project.id + " created with the Original Project Budget locked in.", "success");
      navigate("#/projects/" + project.id);
    });
  }

  function handleCompleteFollowUp(form) {
    var followUpId = form.getAttribute("data-followup-id");
    var data = U.readForm(form, ["contactMethod", "outcomeNote"]);
    safeRun(function () {
      D.completeFollowUp(followUpId, data, activeUser());
      U.closeModal();
      U.showToast("Follow-up marked complete.", "success");
      refreshCurrentRoute();
    });
  }

  function printProposal(estId) {
    var est = D.getEstimateById(estId);
    var opp = D.getOpportunityById(est.opportunityId);
    var visibleItems = est.proposalLineItems.filter(function (li) { return li.visibleOnProposal; }).sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    var printRoot = document.getElementById("print-root");
    printRoot.innerHTML = '<div class="proposal-preview">' + U.buildProposalHtml(est, opp, visibleItems) + '</div>';
    window.print();
  }

  // =========================================================================
  // FORM HANDLERS: PROJECTS
  // =========================================================================

  function handleNewProject(form) {
    var data = U.readForm(form, ["customerName", "jobAddress", "originalContractValue", "notes"]);
    safeRun(function () {
      var projectId = S.generateId("PRJ", "project");
      var record = {
        id: projectId, projectNumber: projectId, opportunityId: null, acceptedEstimateId: null,
        status: "Setup", customerName: data.customerName, jobAddress: data.jobAddress,
        projectManagerUserId: null, projectType: "", startDate: null, completionDate: null,
        closeoutNotes: null, closeoutReason: null,
        originalProjectBudget: { totalDirectEstimatedCost: null, byCategory: {}, snapshotTakenAt: new Date().toISOString() },
        originalContractValue: data.originalContractValue, createdDate: new Date().toISOString(), isDemoData: false
      };
      S.upsertRecord(S.KEYS.PROJECTS, record);
      D.logActivity(projectId, "Project", "Project created manually (exception path). " + (data.notes || ""), activeUser());
      U.closeModal();
      U.showToast("Project " + projectId + " created.", "success");
      navigate("#/projects/" + projectId);
    });
  }

  function handleEditProject(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["status", "projectManagerUserId", "startDate"]);
    safeRun(function () {
      D.updateProject(projId, data, activeUser(), "Edited project details");
      U.closeModal();
      U.showToast("Project updated.", "success");
      refreshCurrentRoute();
    });
  }

  function handleCloseProject(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["completionDate", "closeoutReason", "closeoutNotes"]);
    safeRun(function () {
      D.updateProject(projId, {
        status: "Closed", completionDate: data.completionDate, closeoutReason: data.closeoutReason, closeoutNotes: data.closeoutNotes
      }, activeUser(), "Project closed: " + data.closeoutReason);
      U.closeModal();
      U.showToast("Project closed.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: EXPENSES
  // =========================================================================

  function handleSaveExpense(form) {
    var projId = form.getAttribute("data-proj-id");
    var expenseId = form.getAttribute("data-expense-id");
    var data = U.readForm(form, ["expenseDate", "costCategoryId", "vendor", "description", "amountBeforeTax", "tax"]);
    safeRun(function () {
      if (expenseId) D.updateExpense(expenseId, data, activeUser(), "Edited expense");
      else D.createExpense(projId, data, activeUser());
      U.closeModal();
      U.showToast("Expense saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleRejectExpense(form) {
    var expenseId = form.getAttribute("data-expense-id");
    var data = U.readForm(form, ["rejectionNote"]);
    safeRun(function () {
      D.updateExpense(expenseId, { approvalStatus: "Rejected", rejectionNote: data.rejectionNote }, activeUser(), "Rejected expense: " + data.rejectionNote);
      U.closeModal();
      U.showToast("Expense rejected.", "success");
      refreshCurrentRoute();
    });
  }

  function handleMarkExpensePaid(form) {
    var expenseId = form.getAttribute("data-expense-id");
    var data = U.readForm(form, ["paidDate", "paymentMethod"]);
    safeRun(function () {
      D.updateExpense(expenseId, { paymentStatus: "Paid", paidDate: data.paidDate, paymentMethod: data.paymentMethod }, activeUser(), "Marked expense paid");
      U.closeModal();
      U.showToast("Expense marked paid.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: SUBCONTRACTORS
  // =========================================================================

  function handleSaveSub(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["subcontractorName", "scopeDescription", "costCategoryId", "commitmentAmount", "invoiceDate", "invoiceNumber", "invoiceAmount", "retainage"]);
    safeRun(function () {
      D.createSubcontractorCost(projId, data, activeUser());
      U.closeModal();
      U.showToast("Subcontractor cost saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleRejectSub(form) {
    var subId = form.getAttribute("data-sub-id");
    var data = U.readForm(form, ["rejectionNote"]);
    safeRun(function () {
      D.updateSubcontractorCost(subId, { approvalStatus: "Rejected" }, activeUser(), "Rejected subcontractor cost: " + data.rejectionNote);
      U.closeModal();
      U.showToast("Subcontractor cost rejected.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: ABC LABOR
  // =========================================================================

  function handleSaveLabor(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["workDate", "employeeName", "role", "laborType", "hours", "hourlyInternalRate", "manualAmountOverride", "manualAmountOverrideReason"]);
    safeRun(function () {
      D.createLaborEntry(projId, data, activeUser());
      U.closeModal();
      U.showToast("Labor entry saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleRejectLabor(form) {
    var laborId = form.getAttribute("data-labor-id");
    var data = U.readForm(form, ["rejectionNote"]);
    safeRun(function () {
      D.updateLaborEntry(laborId, { approvalStatus: "Rejected" }, activeUser(), "Rejected labor entry: " + data.rejectionNote);
      U.closeModal();
      U.showToast("Labor entry rejected.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: CHANGE ORDERS
  // =========================================================================

  function handleSaveChangeOrder(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["description", "amount", "notes"]);
    safeRun(function () {
      D.createChangeOrder(projId, data, activeUser());
      U.closeModal();
      U.showToast("Change order saved.", "success");
      refreshCurrentRoute();
    });
  }

  function handleRejectChangeOrder(form) {
    var coId = form.getAttribute("data-co-id");
    var data = U.readForm(form, ["rejectionNote"]);
    safeRun(function () {
      D.updateChangeOrder(coId, { status: "Rejected" }, activeUser(), "Rejected change order: " + data.rejectionNote);
      U.closeModal();
      U.showToast("Change order rejected.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: INVOICES & PAYMENTS
  // =========================================================================

  function handleSaveInvoice(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["invoiceDate", "dueDate", "invoiceAmount", "notes"]);
    safeRun(function () {
      D.createInvoice(projId, data, activeUser());
      U.closeModal();
      U.showToast("Invoice created.", "success");
      refreshCurrentRoute();
    });
  }

  function handleSavePayment(form) {
    var projId = form.getAttribute("data-proj-id");
    var data = U.readForm(form, ["paymentDate", "amount", "paymentMethod", "paymentReference", "notes"]);
    safeRun(function () {
      D.createPayment(projId, data, activeUser());
      U.closeModal();
      U.showToast("Payment recorded.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // FORM HANDLERS: OPEN DECISIONS & SETTINGS
  // =========================================================================

  function handleAddOpenDecision(form) {
    var data = U.readForm(form, ["title", "relatedTab", "relatedRequirement", "whyUnresolved", "decisionNeeded", "behaviorWhileUnresolved"]);
    safeRun(function () {
      D.addCustomOpenDecision(data, activeUser());
      U.closeModal();
      U.showToast("Open Decision added.", "success");
      refreshCurrentRoute();
    });
  }

  function handleSaveControlledLists(form) {
    var data = U.readForm(form, ["leadSources", "projectTypes", "lossReasons", "closeoutReasons"]);
    function toList(text) { return text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean); }
    safeRun(function () {
      D.setControlledLists({
        leadSources: toList(data.leadSources),
        projectTypes: toList(data.projectTypes),
        lossReasons: toList(data.lossReasons),
        closeoutReasons: toList(data.closeoutReasons)
      });
      U.showToast("Controlled lists saved.", "success");
      refreshCurrentRoute();
    });
  }

  // =========================================================================
  // EXPORT / IMPORT / RESET
  // =========================================================================

  function exportData() {
    safeRun(function () {
      var payload = S.exportAllData();
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "abc-ops-app-export-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      U.showToast("Data exported.", "success");
    });
  }

  function handleImportFile(inputEl) {
    var file = inputEl.files && inputEl.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      safeRun(function () {
        var payload = JSON.parse(reader.result);
        U.openConfirm("Import this data file?", "<p>This will overwrite all current data in this browser with the contents of the imported file.</p>", function () {
          safeRun(function () {
            S.importAllData(payload);
            U.showToast("Data imported successfully.", "success");
            bootstrap(true);
          });
        }, { danger: true });
      });
    };
    reader.readAsText(file);
    inputEl.value = "";
  }

  function confirmResetDemoData() {
    U.openConfirm("Reset all demo data?", "<p>This permanently erases every record currently in this browser and rebuilds the original labeled demo dataset. This cannot be undone.</p>", function () {
      safeRun(function () {
        D.resetDemoData();
        U.showToast("Demo data has been reset.", "success");
        bootstrap(true);
      });
    }, { danger: true });
  }

  // =========================================================================
  // SIDEBAR / TOPBAR USER CHIP SYNC
  // =========================================================================

  function updateSidebarUserChip() {
    var user = activeUser();
    if (!user) return;
    document.getElementById("sidebar-user-avatar").textContent = user.initials;
    document.getElementById("sidebar-user-name").textContent = user.name;
    document.getElementById("sidebar-user-role").textContent = user.role;
  }

  function syncTopbarUserSelect() {
    var select = document.getElementById("active-user-select");
    if (!select) return;
    var users = D.getUsers();
    select.innerHTML = users.map(function (u) { return '<option value="' + u.id + '">' + U.esc(u.name) + ' (' + U.esc(u.role) + ')</option>'; }).join('');
    select.value = D.getActiveUserId();
  }

  function syncAppearanceButtons() {
    var prefs = D.getPreferences(D.getActiveUserId());
    document.querySelectorAll(".appearance-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode") === (prefs.appearanceMode || "device") ? "true" : "false");
    });
  }

  // =========================================================================
  // BOOTSTRAP
  // =========================================================================

  function bootstrap(isReload) {
    D.ensureSeeded();
    U.initAppearanceForActiveUser();
    updateSidebarUserChip();
    syncTopbarUserSelect();
    syncAppearanceButtons();
    if (!S.isStorageAvailable) {
      U.showToast("Your browser is blocking local storage (e.g., private browsing). Data will not be saved between sessions.", "warning");
    }
    if (!window.location.hash) window.location.hash = "#/dashboard";
    renderRoute();
    if (isReload) U.showToast("Workspace refreshed.", "success");
  }

  document.addEventListener("DOMContentLoaded", function () {
    bootstrap(false);
  });

})();
