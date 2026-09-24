/* =========================================================================
   AUSTIN BLOCK COMPANY INTERNAL OPERATIONS APP
   ui.js

   PURPOSE
   The rendering layer. Every view function returns an HTML string that
   app.js's router injects into #view-root. This file also owns:
     - sidebar / mobile nav open-close behavior
     - appearance (light/dark/device) switching, saved per user
     - modal dialogs and confirm dialogs
     - toasts
     - shared render helpers (badges, tables, empty states, forms)
     - one render function per module (dashboard, opportunities, estimates,
       estimate workspace, price catalog, cost categories, profit goals,
       projects + financial sub-tabs, reports, integration readiness,
       open decisions, settings)

   This file reads/writes data ONLY through AbcData / AbcStorage /
   AbcCalculations. It never touches localStorage directly.
   ========================================================================= */

(function (global) {
  "use strict";

  var D = global.AbcData;
  var C = global.AbcCalculations;
  var S = global.AbcStorage;

  // =========================================================================
  // FORMAT HELPERS
  // =========================================================================

  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return "&mdash;";
    var neg = n < 0;
    var val = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? "-$" : "$") + val;
  }

  function fmtPct(n, decimals) {
    if (n === null || n === undefined || isNaN(n)) return "&mdash;";
    return (n * 100).toFixed(decimals === undefined ? 1 : decimals) + "%";
  }

  function fmtDate(iso) {
    if (!iso) return "&mdash;";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "&mdash;";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtDateTime(iso) {
    if (!iso) return "&mdash;";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "&mdash;";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function daysBetween(a, b) {
    var ms = new Date(b) - new Date(a);
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  function fmtMoneyPlain(n) { return "$" + n.toFixed(2); }

  // =========================================================================
  // STATUS BADGE MAPS
  // =========================================================================

  var STATUS_COLORS = {
    // Opportunity
    "New": "blue", "Active": "blue", "Estimate in Progress": "amber", "Estimate Under Review": "amber",
    "Estimate Sent": "purple", "Won": "green", "Lost": "red", "On Hold": "gray", "Archived": "gray",
    // Estimate
    "Draft": "gray", "In Progress": "amber", "Ready for Review": "purple", "Revision Requested": "red",
    "Approved to Send": "blue", "Sent": "purple", "Superseded": "gray", "Accepted": "green",
    "Declined": "red", "Expired": "gray",
    // Project
    "Setup": "blue", "Scheduled": "blue", "Substantially Complete": "amber", "Closed": "gray", "Cancelled": "red",
    // Expense / CO / Invoice
    "Submitted": "amber", "Approved": "green", "Rejected": "red", "Void": "gray",
    "Unpaid": "red", "Partially Paid": "amber", "Paid": "green", "Overdue": "red"
  };

  function badge(status) {
    var color = STATUS_COLORS[status] || "gray";
    return '<span class="badge badge-' + color + '">' + esc(status) + '</span>';
  }

  function tierBadge(color) {
    var map = { red: "red", amber: "amber", green: "green", blue: "blue" };
    return '<span class="badge badge-' + (map[color] || "gray") + '">' + esc(color ? color.toUpperCase() : "N/A") + '</span>';
  }

  function tierVisualColor(pct, tier) {
    if (!tier || pct === null || pct === undefined) return "gray";
    if (pct < tier.minMargin) return "red";
    if (pct < tier.targetMargin) return "amber";
    if (pct <= tier.maxMargin) return "green";
    return "blue";
  }

  // =========================================================================
  // SHARED STRUCTURAL HELPERS
  // =========================================================================

  function emptyState(icon, title, body, actionHtml) {
    return '' +
      '<div class="empty-state">' +
        '<span class="empty-icon" aria-hidden="true">' + icon + '</span>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p class="muted-text">' + body + '</p>' +
        (actionHtml || '') +
      '</div>';
  }

  function card(innerHtml, extraClass) {
    return '<div class="card ' + (extraClass || '') + '">' + innerHtml + '</div>';
  }

  function tableWrap(innerTableHtml) {
    return '<div class="table-wrap"><table class="data-table">' + innerTableHtml + '</table></div>';
  }

  function openDecisionCallout(code, shortText) {
    return '<div class="callout callout-open-decision mt-2">' +
      '<strong>Open Decision ' + esc(code) + ':</strong> ' + esc(shortText) +
      ' <a href="#/open-decisions">View in Open Decisions register &rarr;</a>' +
    '</div>';
  }

  // =========================================================================
  // TOASTS
  // =========================================================================

  function showToast(message, type) {
    var region = document.getElementById("toast-region");
    if (!region) return;
    var el = document.createElement("div");
    el.className = "toast" + (type ? " toast-" + type : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    region.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity 200ms ease";
      setTimeout(function () { if (el.parentNode) region.removeChild(el); }, 220);
    }, 3800);
  }

  // =========================================================================
  // MODALS
  // =========================================================================

  function openModal(innerHtml, opts) {
    var root = document.getElementById("modal-root");
    var wide = opts && opts.wide ? " modal-wide" : (opts && opts.narrow ? " modal-narrow" : "");
    root.innerHTML = '<div class="modal-dialog' + wide + '" role="dialog" aria-modal="true">' + innerHtml + '</div>';
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    var firstInput = root.querySelector("input, select, textarea, button");
    if (firstInput) firstInput.focus();
    root.onclick = function (e) { if (e.target === root && !(opts && opts.persistent)) closeModal(); };
  }

  function closeModal() {
    var root = document.getElementById("modal-root");
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = "";
  }

  function openConfirm(question, detailHtml, onConfirm, opts) {
    var root = document.getElementById("confirm-root");
    var danger = opts && opts.danger;
    root.innerHTML = '' +
      '<div class="modal-dialog modal-narrow" role="alertdialog" aria-modal="true">' +
        '<div class="modal-header"><h3>' + esc(question) + '</h3></div>' +
        '<div class="modal-body">' + (detailHtml || '') + '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>' +
          '<button type="button" class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" id="confirm-ok-btn">Confirm</button>' +
        '</div>' +
      '</div>';
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    document.getElementById("confirm-cancel-btn").onclick = closeConfirm;
    document.getElementById("confirm-ok-btn").onclick = function () {
      closeConfirm();
      onConfirm();
    };
    root.onclick = function (e) { if (e.target === root) closeConfirm(); };
    document.getElementById("confirm-ok-btn").focus();
  }

  function closeConfirm() {
    var root = document.getElementById("confirm-root");
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = "";
  }

  // =========================================================================
  // APPEARANCE (LIGHT / DARK / DEVICE)
  // =========================================================================

  function applyAppearance(mode) {
    var root = document.documentElement;
    var resolved = mode;
    if (mode === "device") {
      resolved = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    root.setAttribute("data-theme", resolved);
    document.querySelectorAll(".appearance-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode") === mode ? "true" : "false");
    });
  }

  function initAppearanceForActiveUser() {
    var userId = D.getActiveUserId();
    var prefs = D.getPreferences(userId);
    applyAppearance(prefs.appearanceMode || "device");
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        var current = D.getPreferences(D.getActiveUserId());
        if ((current.appearanceMode || "device") === "device") applyAppearance("device");
      });
    }
  }

  function setAppearanceForActiveUser(mode) {
    var userId = D.getActiveUserId();
    D.setPreferences(userId, { appearanceMode: mode });
    applyAppearance(mode);
    showToast("Appearance set to " + mode + " for your profile.", "success");
  }

  // =========================================================================
  // NAV / SIDEBAR BEHAVIOR
  // =========================================================================

  function setActiveNavLink(routeName) {
    document.querySelectorAll(".nav-link").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-route") === routeName);
    });
  }

  function closeMobileSidebar() {
    document.getElementById("sidebar-nav").classList.remove("open");
    document.getElementById("sidebar-backdrop").classList.remove("open");
    document.getElementById("sidebar-backdrop").hidden = true;
    document.getElementById("mobile-nav-toggle").setAttribute("aria-expanded", "false");
  }

  function openMobileSidebar() {
    document.getElementById("sidebar-nav").classList.add("open");
    document.getElementById("sidebar-backdrop").hidden = false;
    document.getElementById("sidebar-backdrop").classList.add("open");
    document.getElementById("mobile-nav-toggle").setAttribute("aria-expanded", "true");
  }

  function setPageHeader(title, subtitle) {
    document.getElementById("page-title").textContent = title;
    document.getElementById("page-subtitle").textContent = subtitle || "";
  }

  // =========================================================================
  // FORM FIELD RENDER HELPERS
  // =========================================================================

  function fieldText(id, label, value, opts) {
    opts = opts || {};
    return '' +
      '<div class="field-group' + (opts.fullWidth ? ' full-width' : '') + '">' +
        '<label for="' + id + '">' + esc(label) + (opts.required ? ' <span aria-hidden="true">*</span>' : '') + '</label>' +
        '<input class="input-control" type="' + (opts.type || 'text') + '" id="' + id + '" name="' + id + '" value="' + esc(value === undefined || value === null ? '' : value) + '" ' +
          (opts.required ? 'required aria-required="true"' : '') + (opts.step ? 'step="' + opts.step + '"' : '') + (opts.min !== undefined ? 'min="' + opts.min + '"' : '') + ' />' +
        (opts.hint ? '<span class="field-hint">' + esc(opts.hint) + '</span>' : '') +
      '</div>';
  }

  function fieldTextarea(id, label, value, opts) {
    opts = opts || {};
    return '' +
      '<div class="field-group' + (opts.fullWidth ? ' full-width' : '') + '">' +
        '<label for="' + id + '">' + esc(label) + (opts.required ? ' *' : '') + '</label>' +
        '<textarea class="textarea-control" id="' + id + '" name="' + id + '" ' + (opts.required ? 'required aria-required="true"' : '') + '>' + esc(value || '') + '</textarea>' +
        (opts.hint ? '<span class="field-hint">' + esc(opts.hint) + '</span>' : '') +
      '</div>';
  }

  function fieldSelect(id, label, value, options, opts) {
    opts = opts || {};
    var optsHtml = (opts.includeBlank ? '<option value="">' + esc(opts.blankLabel || "Select...") + '</option>' : '') +
      options.map(function (o) {
        var val = typeof o === "object" ? o.value : o;
        var text = typeof o === "object" ? o.label : o;
        return '<option value="' + esc(val) + '" ' + (String(val) === String(value) ? 'selected' : '') + '>' + esc(text) + '</option>';
      }).join('');
    return '' +
      '<div class="field-group' + (opts.fullWidth ? ' full-width' : '') + '">' +
        '<label for="' + id + '">' + esc(label) + (opts.required ? ' *' : '') + '</label>' +
        '<select class="select-control" id="' + id + '" name="' + id + '" ' + (opts.required ? 'required aria-required="true"' : '') + '>' + optsHtml + '</select>' +
        (opts.hint ? '<span class="field-hint">' + esc(opts.hint) + '</span>' : '') +
      '</div>';
  }

  function fieldCheckbox(id, label, checked) {
    return '' +
      '<div class="field-group">' +
        '<div class="checkbox-row">' +
          '<input type="checkbox" id="' + id + '" name="' + id + '" ' + (checked ? 'checked' : '') + ' />' +
          '<label for="' + id + '">' + esc(label) + '</label>' +
        '</div>' +
      '</div>';
  }

  function readForm(formEl, fieldIds) {
    var out = {};
    fieldIds.forEach(function (id) {
      var el = formEl.querySelector('[name="' + id + '"]');
      if (!el) return;
      if (el.type === "checkbox") out[id] = el.checked;
      else if (el.type === "number") out[id] = el.value === "" ? null : parseFloat(el.value);
      else out[id] = el.value;
    });
    return out;
  }

  // =========================================================================
  // VIEW: HOME DASHBOARD (DASH-001, MET-001..MET-014)
  // =========================================================================

  function renderDashboard() {
    setPageHeader("Home Dashboard", "Company-wide snapshot of pipeline, estimates, and profitability.");
    var opps = D.getOpportunities();
    var estimates = D.getEstimates();
    var projects = D.getProjects();

    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var yearStart = new Date(now.getFullYear(), 0, 1);

    var newOppsThisMonth = opps.filter(function (o) { return new Date(o.createdDate) >= monthStart; }).length;

    var openStatuses = ["New", "Active", "Estimate in Progress", "Estimate Under Review", "Estimate Sent"];
    var openOpps = opps.filter(function (o) { return openStatuses.indexOf(o.status) !== -1; });
    var pipelineValue = 0;
    openOpps.forEach(function (o) {
      var current = D.getCurrentEstimateForOpportunity(o.id);
      if (current) pipelineValue += (current.sellingPrice || 0);
    });

    function sentEstimatesInRange(start, end) {
      return estimates.filter(function (e) {
        var sh = e.sentHistory && e.sentHistory.length ? e.sentHistory[e.sentHistory.length - 1] : null;
        if (!sh) return false;
        var d = new Date(sh.sentDate);
        return d >= start && d <= end;
      });
    }
    var sentThisMonth = sentEstimatesInRange(monthStart, now);
    var sentLast30 = sentEstimatesInRange(new Date(now.getTime() - 29 * 86400000), now);
    var sentLast90 = sentEstimatesInRange(new Date(now.getTime() - 89 * 86400000), now);
    var sentYTD = sentEstimatesInRange(yearStart, now);

    function sumSelling(list) { return list.reduce(function (s, e) { return s + (e.sellingPrice || 0); }, 0); }

    var awaitingApproval = estimates.filter(function (e) { return e.status === "Ready for Review"; }).length;

    var closedYTD = opps.filter(function (o) { return o.closeDate && new Date(o.closeDate) >= yearStart && (o.status === "Won" || o.status === "Lost"); });
    var wonYTD = closedYTD.filter(function (o) { return o.status === "Won"; }).length;
    var lostYTD = closedYTD.filter(function (o) { return o.status === "Lost"; }).length;
    var winRate = (wonYTD + lostYTD) > 0 ? wonYTD / (wonYTD + lostYTD) : null;

    var lossReasonCounts = {};
    opps.filter(function (o) { return o.status === "Lost"; }).forEach(function (o) {
      var r = o.lossReason || "Not specified";
      lossReasonCounts[r] = (lossReasonCounts[r] || 0) + 1;
    });

    var allPayments = [];
    projects.forEach(function (p) { allPayments = allPayments.concat(D.getPaymentsForProject(p.id)); });
    var revenueYTD = allPayments.filter(function (p) { return new Date(p.paymentDate) >= yearStart; }).reduce(function (s, p) { return s + p.amount; }, 0);

    var allApprovedCostsYTD = 0;
    projects.forEach(function (p) {
      var exp = D.getExpensesForProject(p.id).filter(function (e) { return e.approvalStatus === "Approved" && new Date(e.expenseDate) >= yearStart; });
      var subs = D.getSubcontractorCostsForProject(p.id).filter(function (s) { return s.approvalStatus === "Approved" && s.invoiceDate && new Date(s.invoiceDate) >= yearStart; });
      var labor = D.getLaborEntriesForProject(p.id).filter(function (l) { return l.approvalStatus === "Approved" && new Date(l.workDate) >= yearStart; });
      allApprovedCostsYTD += exp.reduce(function (s, e) { return s + e.totalAmount; }, 0);
      allApprovedCostsYTD += subs.reduce(function (s, x) { return s + x.invoiceAmount; }, 0);
      allApprovedCostsYTD += labor.reduce(function (s, l) { return s + l.totalLaborCost; }, 0);
    });
    var profitYTD = revenueYTD - allApprovedCostsYTD;
    var profitYTDPct = revenueYTD > 0 ? profitYTD / revenueYTD : null;

    var twelveMoAgo = new Date(now.getTime() - 365 * 86400000);
    var acceptedLast12 = estimates.filter(function (e) { return e.status === "Accepted" && e.acceptedDate && new Date(e.acceptedDate) >= twelveMoAgo; });
    var materialOnly = acceptedLast12.filter(function (e) { return e.estimateType === "Material-Only Sale"; });
    var installProject = acceptedLast12.filter(function (e) { return e.estimateType !== "Material-Only Sale"; });
    var avgMaterialSale = materialOnly.length ? sumSelling(materialOnly) / materialOnly.length : null;
    var avgProjectValue = installProject.length ? sumSelling(installProject) / installProject.length : null;

    var metricCards = [
      { label: "New Opportunities (This Month)", value: newOppsThisMonth, sub: "By creation date" },
      { label: "Open Pipeline Value", value: fmtMoney(pipelineValue), sub: openOpps.length + " open opportunities" },
      { label: "Estimates Sent (This Month)", value: sentThisMonth.length + " &middot; " + fmtMoney(sumSelling(sentThisMonth)), sub: "" },
      { label: "Estimates Sent (Last 30 Days)", value: sentLast30.length + " &middot; " + fmtMoney(sumSelling(sentLast30)), sub: "Rolling window" },
      { label: "Estimates Sent (Last 90 Days)", value: sentLast90.length + " &middot; " + fmtMoney(sumSelling(sentLast90)), sub: "Rolling window" },
      { label: "Estimates Sent (Year to Date)", value: sentYTD.length + " &middot; " + fmtMoney(sumSelling(sentYTD)), sub: "" },
      { label: "Awaiting Approval to Send", value: awaitingApproval, sub: "Ready for Review status" },
      { label: "Win Rate (YTD)", value: winRate === null ? "&mdash;" : fmtPct(winRate, 0), sub: wonYTD + " won / " + lostYTD + " lost" },
      { label: "Revenue (YTD)", value: fmtMoney(revenueYTD), sub: "Payments actually received" },
      { label: "Profit (YTD)", value: fmtMoney(profitYTD) + (profitYTDPct !== null ? " (" + fmtPct(profitYTDPct, 0) + ")" : ""), sub: "Revenue received minus approved actual costs" },
      { label: "Avg Material-Only Sale (12 mo)", value: avgMaterialSale === null ? "&mdash;" : fmtMoney(avgMaterialSale), sub: materialOnly.length + " sales" },
      { label: "Avg Project Value (12 mo)", value: avgProjectValue === null ? "&mdash;" : fmtMoney(avgProjectValue), sub: installProject.length + " projects" }
    ];

    var metricsHtml = metricCards.map(function (m) {
      return '<div class="metric-card"><span class="metric-label">' + esc(m.label) + '</span><span class="metric-value">' + m.value + '</span><span class="metric-sub">' + esc(m.sub) + '</span></div>';
    }).join('');

    var maxCount = Math.max.apply(null, Object.values(lossReasonCounts).concat([1]));
    var lossReasonRows = Object.keys(lossReasonCounts).map(function (r) {
      var count = lossReasonCounts[r];
      var pct = Math.round((count / maxCount) * 100);
      return '<div class="bar-row"><span>' + esc(r) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div><span>' + count + '</span></div>';
    }).join('') || '<p class="muted-text">No lost opportunities recorded yet.</p>';

    var needsAttention = buildAttentionList(opps, estimates, projects);

    return '' +
      '<div class="dashboard-grid">' + metricsHtml + '</div>' +
      '<div class="card-grid">' +
        card('<h3>Win / Loss Reasons</h3><div class="bar-chart">' + lossReasonRows + '</div>', '') +
        card('<h3>Needs Attention</h3>' + needsAttention, '') +
      '</div>';
  }

  function buildAttentionList(opps, estimates, projects) {
    var items = [];
    estimates.filter(function (e) { return e.status === "Ready for Review"; }).forEach(function (e) {
      items.push('<li><a href="#/estimates/' + e.id + '">' + esc(e.estimateNumber) + '</a> is waiting for internal review approval.</li>');
    });
    var now = new Date();
    D.getEstimates().forEach(function (e) {
      if (e.status === "Sent") {
        var followUps = D.getFollowUpsForEstimate(e.id).filter(function (f) { return !f.completed && new Date(f.dueDate) <= now; });
        followUps.forEach(function (f) {
          items.push('<li><a href="#/estimates/' + e.id + '">' + esc(e.estimateNumber) + '</a> has an overdue ' + esc(f.label) + '.</li>');
        });
      }
    });
    projects.filter(function (p) { return p.status === "Substantially Complete"; }).forEach(function (p) {
      items.push('<li><a href="#/projects/' + p.id + '">' + esc(p.projectNumber) + '</a> is substantially complete and ready to close out.</li>');
    });
    if (!items.length) return '<p class="muted-text">Nothing needs attention right now.</p>';
    return '<ul>' + items.join('') + '</ul>';
  }

  // =========================================================================
  // VIEW: OPPORTUNITIES LIST
  // =========================================================================

  function renderOpportunitiesList(filterState) {
    setPageHeader("Opportunities", "Customer and project records, from first contact through Won or Lost.");
    var opps = D.getOpportunities();
    var f = filterState || {};

    var filtered = opps.filter(function (o) {
      if (f.status && o.status !== f.status) return false;
      if (f.search) {
        var s = f.search.toLowerCase();
        var hay = (o.customerName + " " + o.projectAddress + " " + o.id).toLowerCase();
        if (hay.indexOf(s) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return new Date(b.createdDate) - new Date(a.createdDate); });

    var statusOptions = [""].concat(D.OPPORTUNITY_STATUSES);
    var filterBar = '' +
      '<div class="flex-between mb-4">' +
        '<div class="flex-row">' +
          '<input class="input-control" id="opp-search" placeholder="Search customer, address, ID..." value="' + esc(f.search || '') + '" style="min-width:240px" />' +
          '<select class="select-control" id="opp-status-filter">' +
            statusOptions.map(function (s) { return '<option value="' + esc(s) + '" ' + (f.status === s ? 'selected' : '') + '>' + (s || "All Statuses") + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" id="new-opportunity-btn">+ New Opportunity</button>' +
      '</div>';

    if (!filtered.length) {
      return filterBar + card(emptyState("&#128188;", "No opportunities found", "Try adjusting your filters, or create a new opportunity to get started.",
        '<button type="button" class="btn btn-primary" id="empty-new-opportunity-btn">+ New Opportunity</button>'));
    }

    var rows = filtered.map(function (o) {
      var current = D.getCurrentEstimateForOpportunity(o.id);
      return '<tr class="row-clickable" data-nav="#/opportunities/' + o.id + '">' +
        '<td>' + esc(o.id) + (o.isDemoData ? ' <span class="badge badge-gray">Demo</span>' : '') + '</td>' +
        '<td>' + esc(o.customerName) + '</td>' +
        '<td>' + esc(o.projectAddress) + '</td>' +
        '<td>' + badge(o.status) + '</td>' +
        '<td>' + (current ? fmtMoney(current.sellingPrice) : '&mdash;') + '</td>' +
        '<td>' + fmtDate(o.createdDate) + '</td>' +
      '</tr>';
    }).join('');

    return filterBar + tableWrap(
      '<thead><tr><th>ID</th><th>Customer</th><th>Address</th><th>Status</th><th>Current Estimate</th><th>Created</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>'
    );
  }

  function renderNewOpportunityForm() {
    return '' +
      '<div class="modal-header"><h2>New Opportunity</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="new-opportunity-form">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("customerName", "Customer Name or Company", "", { required: true, fullWidth: true }) +
            fieldText("primaryContact", "Primary Contact", "") +
            fieldText("projectAddress", "Project Address / Location", "", { required: true }) +
            fieldSelect("projectType", "Project Type", "", D.getControlledLists().projectTypes, { required: true }) +
            fieldSelect("customerType", "Residential or Commercial", "Residential", ["Residential", "Commercial"], { required: true }) +
            fieldSelect("leadSource", "Lead Source", "", D.getControlledLists().leadSources, { required: true }) +
            fieldTextarea("description", "Short Project Description", "", { fullWidth: true }) +
          '</div>' +
          '<div id="duplicate-warning-area"></div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Create Opportunity</button>' +
        '</div>' +
      '</form>';
  }

  function renderOpportunityEditForm(opp) {
    return '' +
      '<div class="modal-header"><h2>Edit Opportunity</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="edit-opportunity-form">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("customerName", "Customer Name or Company", opp.customerName, { required: true, fullWidth: true }) +
            fieldText("primaryContact", "Primary Contact", opp.primaryContact) +
            fieldText("projectAddress", "Project Address / Location", opp.projectAddress, { required: true }) +
            fieldSelect("projectType", "Project Type", opp.projectType, D.getControlledLists().projectTypes, { required: true }) +
            fieldSelect("customerType", "Residential or Commercial", opp.customerType, ["Residential", "Commercial"], { required: true }) +
            fieldSelect("leadSource", "Lead Source", opp.leadSource, D.getControlledLists().leadSources, { required: true }) +
            fieldSelect("status", "Status", opp.status, D.OPPORTUNITY_STATUSES, { required: true }) +
            fieldText("nextActionDate", "Next Action Date", opp.nextActionDate ? opp.nextActionDate.substring(0, 10) : "", { type: "date" }) +
            fieldTextarea("description", "Short Project Description", opp.description, { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Changes</button>' +
        '</div>' +
      '</form>';
  }

  function renderMarkLostForm(oppId) {
    return '' +
      '<div class="modal-header"><h2>Mark Opportunity Lost</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="mark-lost-form" data-opp-id="' + oppId + '">' +
        '<div class="modal-body">' +
          fieldSelect("lossReason", "Loss Reason", "", D.getControlledLists().lossReasons, { required: true }) +
          fieldTextarea("lossNotes", "Additional Notes (Optional)", "") +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Mark Lost</button></div>' +
      '</form>';
  }

  function renderMarkHoldForm(oppId) {
    return '' +
      '<div class="modal-header"><h2>Place Opportunity On Hold</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="mark-hold-form" data-opp-id="' + oppId + '">' +
        '<div class="modal-body">' +
          fieldTextarea("holdReason", "Reason", "", { required: true }) +
          fieldText("nextReviewDate", "Next Review Date", "", { type: "date" }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Place On Hold</button></div>' +
      '</form>';
  }

  function renderNewEstimateForm(oppId) {
    return '' +
      '<div class="modal-header"><h2>Create New Estimate</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="new-estimate-form" data-opp-id="' + oppId + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldSelect("estimateType", "Estimate Type", "Installation/Project", ["Installation/Project", "Material-Only Sale"], { required: true }) +
            fieldSelect("customerType", "Residential or Commercial", "Residential", ["Residential", "Commercial"], { required: true }) +
            fieldText("proposalExpirationDate", "Proposal Expiration Date", "", { type: "date" }) +
            fieldTextarea("estimateNotes", "Estimate Notes (Internal)", "", { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Create Estimate</button></div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: OPPORTUNITY DETAIL (activity history, files, estimates)
  // =========================================================================

  function renderOpportunityDetail(oppId) {
    var opp = D.getOpportunityById(oppId);
    if (!opp) return emptyState("&#10060;", "Opportunity not found", "It may have been removed. Return to the opportunities list.");

    setPageHeader(opp.customerName, "Opportunity " + opp.id + " &middot; " + opp.projectAddress);

    var estimates = D.getEstimatesForOpportunity(opp.id);
    var files = D.getFilesForRecord(opp.id);
    var activities = D.getActivitiesForRecord(opp.id);
    var hasFiles = files.length > 0;

    var lossBlock = "";
    if (opp.status === "Lost") {
      lossBlock = card('<h3>Loss Details</h3><p><strong>Reason:</strong> ' + esc(opp.lossReason || "Not specified") + '</p><p class="muted-text">Closed ' + fmtDate(opp.closeDate) + '</p>', 'mt-4');
    }

    var header = '' +
      '<div class="flex-between mb-4">' +
        badge(opp.status) +
        '<div class="flex-row">' +
          '<button type="button" class="btn btn-secondary" id="edit-opp-btn">Edit Details</button>' +
          (["Won", "Lost", "Archived"].indexOf(opp.status) === -1 ?
            '<button type="button" class="btn btn-secondary" id="mark-lost-btn">Mark Lost</button>' +
            '<button type="button" class="btn btn-secondary" id="mark-hold-btn">Place On Hold</button>' : '') +
          (estimates.length === 0 && opp.status !== "Won" && opp.status !== "Lost" && opp.status !== "Archived" ?
            '<button type="button" class="btn btn-primary" id="new-estimate-btn">+ New Estimate</button>' : '') +
        '</div>' +
      '</div>';

    if (!hasFiles) {
      header += '<div class="callout callout-warning mb-4">No plans, photos, or site notes are attached to this opportunity yet. Files are not required to create an estimate, but are normally expected.</div>';
    }

    var infoCard = card('' +
      '<h3>Opportunity Details</h3>' +
      '<div class="financial-summary-grid">' +
        '<div><span class="field-label">Primary Contact</span><p>' + esc(opp.primaryContact || "&mdash;") + '</p></div>' +
        '<div><span class="field-label">Project Type</span><p>' + esc(opp.projectType || "&mdash;") + '</p></div>' +
        '<div><span class="field-label">Customer Type</span><p>' + esc(opp.customerType) + '</p></div>' +
        '<div><span class="field-label">Lead Source</span><p>' + esc(opp.leadSource || "&mdash;") + '</p></div>' +
        '<div><span class="field-label">Owner</span><p>' + esc(userName(opp.ownerUserId)) + '</p></div>' +
        '<div><span class="field-label">Created</span><p>' + fmtDate(opp.createdDate) + '</p></div>' +
      '</div>' +
      (opp.description ? '<p class="mt-3">' + esc(opp.description) + '</p>' : ''),
    '');

    var estimatesCard = card('' +
      '<div class="card-header"><h3>Estimates</h3></div>' +
      (estimates.length ? tableWrap(
        '<thead><tr><th>Estimate</th><th>Revision</th><th>Status</th><th>Selling Price</th><th></th></tr></thead>' +
        '<tbody>' + estimates.map(function (e) {
          return '<tr><td>' + esc(e.id) + '</td><td>' + e.revisionNumber + '</td><td>' + badge(e.status) + '</td><td>' + fmtMoney(e.sellingPrice) + '</td>' +
            '<td><a href="#/estimates/' + e.id + '" class="link-btn">Open &rarr;</a></td></tr>';
        }).join('') + '</tbody>'
      ) : emptyState("&#128203;", "No estimates yet", "Create the first estimate for this opportunity.")), '');

    var filesCard = renderFilesSection(opp.id, "Opportunity", files);

    var activityCard = card('<h3>Activity History</h3>' + renderActivityList(activities), '');

    return header + infoCard + '<div class="section-block"></div>' + estimatesCard + filesCard + activityCard + lossBlock;
  }

  function userName(userId) {
    var u = D.getUserById(userId);
    return u ? u.name : "Unassigned";
  }

  function renderActivityList(activities) {
    if (!activities.length) return '<p class="muted-text">No activity recorded yet.</p>';
    return '<ul>' + activities.slice(0, 25).map(function (a) {
      return '<li><strong>' + fmtDateTime(a.timestamp) + '</strong> &mdash; ' + esc(a.note) + ' <span class="muted-text">(' + esc(a.userName) + ')</span></li>';
    }).join('') + '</ul>';
  }

  function renderFilesSection(recordId, recordType, files) {
    var rows = files.length ? tableWrap(
      '<thead><tr><th>File Name</th><th>Category</th><th>Uploaded</th><th>SharePoint Status</th><th></th></tr></thead>' +
      '<tbody>' + files.map(function (f) {
        return '<tr><td>' + esc(f.fileName) + '</td><td>' + esc(f.fileCategory) + '</td><td>' + fmtDate(f.uploadedDate) + '</td>' +
          '<td><span class="badge badge-gray">' + esc(f.sharePointStatus) + '</span></td>' +
          '<td><button type="button" class="link-btn" data-delete-file="' + f.id + '">Remove</button></td></tr>';
      }).join('') + '</tbody>'
    ) : emptyState("&#128193;", "No files attached", "Add a file placeholder to represent plans, photos, or documents for this record.");

    return card('' +
      '<div class="card-header"><h3>Files</h3><button type="button" class="btn btn-secondary btn-sm" data-add-file="' + recordId + '" data-record-type="' + recordType + '">+ Add File Placeholder</button></div>' +
      rows +
      '<p class="field-hint mt-2">File storage is not connected in this static prototype. These are placeholder records representing where SharePoint document library files would appear.</p>',
    'mt-4');
  }

  function renderAddFileForm(recordId, recordType) {
    return '' +
      '<div class="modal-header"><h2>Add File Placeholder</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="add-file-form" data-record-id="' + recordId + '" data-record-type="' + recordType + '">' +
        '<div class="modal-body">' +
          fieldText("fileName", "File Name", "", { required: true, fullWidth: true, hint: "e.g., Site-Photos.zip, Signed-Contract.pdf" }) +
          fieldSelect("fileCategory", "File Category", "Other", ["Plans", "Photos", "Site Notes", "Engineering", "Contract", "Proposal PDF", "Receipt", "Invoice", "Other"]) +
          fieldTextarea("notes", "Notes", "") +
          '<div class="callout callout-info">File storage is not connected in this static prototype. This creates a placeholder record only.</div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Add Placeholder</button>' +
        '</div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: ESTIMATES LIST
  // =========================================================================

  function renderEstimatesList(filterState) {
    setPageHeader("Estimates", "All estimate revisions across every opportunity.");
    var f = filterState || {};
    var estimates = D.getEstimates().sort(function (a, b) { return new Date(b.createdDate) - new Date(a.createdDate); });

    var filtered = estimates.filter(function (e) {
      if (f.status && e.status !== f.status) return false;
      if (f.search) {
        var s = f.search.toLowerCase();
        var opp = D.getOpportunityById(e.opportunityId);
        var hay = (e.id + " " + (opp ? opp.customerName : "")).toLowerCase();
        if (hay.indexOf(s) === -1) return false;
      }
      return true;
    });

    var filterBar = '' +
      '<div class="flex-row mb-4">' +
        '<input class="input-control" id="est-search" placeholder="Search estimate ID or customer..." value="' + esc(f.search || '') + '" style="min-width:260px" />' +
        '<select class="select-control" id="est-status-filter">' +
          '<option value="">All Statuses</option>' +
          D.ESTIMATE_STATUSES.map(function (s) { return '<option value="' + s + '" ' + (f.status === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') +
        '</select>' +
      '</div>';

    if (!filtered.length) {
      return filterBar + card(emptyState("&#128203;", "No estimates found", "Create an estimate from an opportunity's detail page."));
    }

    var rows = filtered.map(function (e) {
      var opp = D.getOpportunityById(e.opportunityId);
      return '<tr class="row-clickable" data-nav="#/estimates/' + e.id + '">' +
        '<td>' + esc(e.id) + '</td>' +
        '<td>' + esc(opp ? opp.customerName : "&mdash;") + '</td>' +
        '<td>Rev ' + e.revisionNumber + '</td>' +
        '<td>' + badge(e.status) + '</td>' +
        '<td>' + fmtMoney(e.sellingPrice) + '</td>' +
        '<td>' + fmtDate(e.createdDate) + '</td>' +
      '</tr>';
    }).join('');

    return filterBar + tableWrap(
      '<thead><tr><th>Estimate</th><th>Customer</th><th>Revision</th><th>Status</th><th>Selling Price</th><th>Created</th></tr></thead><tbody>' + rows + '</tbody>'
    );
  }

  // =========================================================================
  // VIEW: ESTIMATE WORKSPACE (the largest module)
  // =========================================================================

  function renderEstimateWorkspace(estId, activeTab) {
    var est = D.getEstimateById(estId);
    if (!est) return emptyState("&#10060;", "Estimate not found", "It may have been superseded or removed.");
    var opp = D.getOpportunityById(est.opportunityId);
    var tab = activeTab || "overview";

    setPageHeader((opp ? opp.customerName : "Estimate") + " &mdash; " + est.id, "Revision " + est.revisionNumber + " &middot; " + est.status);

    var isLocked = ["Ready for Review", "Approved to Send", "Sent", "Superseded", "Accepted", "Declined", "Expired", "Archived"].indexOf(est.status) !== -1;

    var tabs = [
      ["overview", "Overview"],
      ["line-items", "Proposal Line Items"],
      ["takeoff", "Takeoff Segments"],
      ["costs", "Internal Costs"],
      ["financials", "Financial Analysis"],
      ["preview", "Proposal Preview"],
      ["review", "Review & Approval"],
      ["revisions", "Revisions & History"],
      ["followup", "Follow-Up"]
    ];

    var tabBar = '<div class="tabs">' + tabs.map(function (t) {
      return '<button type="button" class="tab-btn ' + (tab === t[0] ? "active" : "") + '" data-est-tab="' + t[0] + '" data-est-id="' + est.id + '">' + t[1] + '</button>';
    }).join('') + '</div>';

    var lockNotice = isLocked ? '<div class="callout callout-info mb-4">This revision is ' + badge(est.status) + ' and is locked against ordinary edits. Use "Create Revision" to make changes.</div>' : '';

    var body = "";
    switch (tab) {
      case "line-items": body = renderProposalLineItemsTab(est, isLocked); break;
      case "takeoff": body = renderTakeoffTab(est, isLocked); break;
      case "costs": body = renderInternalCostsTab(est, isLocked); break;
      case "financials": body = renderFinancialsTab(est); break;
      case "preview": body = renderProposalPreviewTab(est); break;
      case "review": body = renderReviewApprovalTab(est); break;
      case "revisions": body = renderRevisionsTab(est); break;
      case "followup": body = renderFollowUpTab(est); break;
      default: body = renderEstimateOverviewTab(est, opp, isLocked);
    }

    return tabBar + lockNotice + body;
  }

  function renderEstimateOverviewTab(est, opp, isLocked) {
    return '' +
      '<div class="flex-between mb-4">' +
        badge(est.status) +
        '<div class="flex-row">' +
          (isLocked && ["Superseded", "Accepted", "Declined", "Expired", "Archived"].indexOf(est.status) === -1 ?
            '<button type="button" class="btn btn-secondary" id="create-revision-btn" data-est-id="' + est.id + '">Create Revision</button>' : '') +
          '<button type="button" class="btn btn-secondary" id="edit-estimate-header-btn" data-est-id="' + est.id + '">Edit Estimate Info</button>' +
        '</div>' +
      '</div>' +
      card('' +
        '<h3>Estimate Information</h3>' +
        '<div class="financial-summary-grid">' +
          '<div><span class="field-label">Opportunity</span><p><a href="#/opportunities/' + est.opportunityId + '">' + esc(opp ? opp.customerName : est.opportunityId) + '</a></p></div>' +
          '<div><span class="field-label">Estimate Type</span><p>' + esc(est.estimateType) + '</p></div>' +
          '<div><span class="field-label">Customer Type</span><p>' + esc(est.customerType) + '</p></div>' +
          '<div><span class="field-label">Job Address</span><p>' + esc(est.jobAddress || "&mdash;") + '</p></div>' +
          '<div><span class="field-label">Estimator</span><p>' + esc(userName(est.estimatorUserId)) + '</p></div>' +
          '<div><span class="field-label">Proposal Expiration</span><p>' + fmtDate(est.proposalExpirationDate) + '</p></div>' +
        '</div>' +
        (est.estimateNotes ? '<p class="mt-3"><span class="field-label">Notes</span><br/>' + esc(est.estimateNotes) + '</p>' : '')
      , '') +
      card('<h3>Quick Status</h3><div class="financial-summary-grid">' +
        '<div><span class="field-label">Proposal Line Items</span><p>' + est.proposalLineItems.length + '</p></div>' +
        '<div><span class="field-label">Takeoff Segments</span><p>' + est.takeoffSegments.length + '</p></div>' +
        '<div><span class="field-label">Internal Cost Rows</span><p>' + est.costRows.length + '</p></div>' +
        '<div><span class="field-label">Selling Price</span><p>' + fmtMoney(est.sellingPrice) + '</p></div>' +
      '</div>', 'mt-4');
  }

  function renderEditEstimateHeaderForm(est) {
    return '' +
      '<div class="modal-header"><h2>Edit Estimate Information</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="edit-estimate-header-form" data-est-id="' + est.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldSelect("estimateType", "Estimate Type", est.estimateType, ["Installation/Project", "Material-Only Sale"], { required: true }) +
            fieldSelect("customerType", "Residential or Commercial", est.customerType, ["Residential", "Commercial"], { required: true }) +
            fieldText("jobAddress", "Job Address", est.jobAddress, { fullWidth: true }) +
            fieldText("proposalExpirationDate", "Proposal Expiration Date", est.proposalExpirationDate ? est.proposalExpirationDate.substring(0, 10) : "", { type: "date" }) +
            fieldText("proposalValidityDays", "Proposal Validity (Days)", est.proposalValidityDays, { type: "number", min: 1 }) +
            fieldTextarea("estimateNotes", "Estimate Notes (Internal)", est.estimateNotes, { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save</button>' +
        '</div>' +
      '</form>';
  }

  // ---------- Proposal Line Items tab ----------

  function renderProposalLineItemsTab(est, isLocked) {
    var rows = est.proposalLineItems.length ? est.proposalLineItems.map(function (li) {
      return '<tr><td>' + li.sortOrder + '</td><td>' + esc(li.title) + '</td><td>' + esc(li.description || "&mdash;") + '</td>' +
        '<td>' + (li.visibleOnProposal ? '<span class="badge badge-green">Visible</span>' : '<span class="badge badge-gray">Hidden</span>') + '</td>' +
        '<td>' + (isLocked ? '' : '<button type="button" class="link-btn" data-edit-line-item="' + li.id + '" data-est-id="' + est.id + '">Edit</button>') + '</td></tr>';
    }).join('') : '';

    return card('' +
      '<div class="card-header"><h3>Flexible Proposal Line Items</h3>' +
        (isLocked ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="add-line-item-btn" data-est-id="' + est.id + '">+ Add Line Item</button>') +
      '</div>' +
      '<p class="muted-text">These are customer-facing scope descriptions in your own words. There is no fixed catalog; add as many as needed and arrange them in the order the customer should see them.</p>' +
      (est.proposalLineItems.length ? tableWrap('<thead><tr><th>Order</th><th>Title</th><th>Description</th><th>Proposal Visibility</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128221;", "No proposal line items yet", "Add your first flexible line item to start building this estimate's customer-facing scope.")),
    '');
  }

  function renderLineItemForm(est, lineItem) {
    var li = lineItem || { id: null, title: "", description: "", sortOrder: est.proposalLineItems.length + 1, visibleOnProposal: true, customerFacingNote: "" };
    return '' +
      '<div class="modal-header"><h2>' + (lineItem ? "Edit" : "Add") + ' Proposal Line Item</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="line-item-form" data-est-id="' + est.id + '" data-line-item-id="' + (li.id || '') + '">' +
        '<div class="modal-body">' +
          fieldText("title", "Title (Customer-Facing)", li.title, { required: true, fullWidth: true }) +
          fieldTextarea("description", "Internal Description (Optional)", li.description) +
          fieldTextarea("customerFacingNote", "Customer-Facing Note (Optional)", li.customerFacingNote, { hint: "Shown on the printed proposal. Never shows internal costs or notes." }) +
          fieldText("sortOrder", "Display Order", li.sortOrder, { type: "number", min: 1 }) +
          fieldCheckbox("visibleOnProposal", "Visible on customer proposal", li.visibleOnProposal) +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Line Item</button>' +
        '</div>' +
      '</form>';
  }

  // ---------- Takeoff Segments tab ----------

  function renderTakeoffTab(est, isLocked) {
    var segRows = est.takeoffSegments.map(function (seg) {
      var lineItem = est.proposalLineItems.find(function (li) { return li.id === seg.assignedProposalLineItemId; });
      var calcCount = seg.calculatedOutputs && seg.calculatedOutputs.outputs ? Object.keys(seg.calculatedOutputs.outputs).length : 0;
      var unresolvedCount = seg.calculatedOutputs && seg.calculatedOutputs.outputs ? Object.values(seg.calculatedOutputs.outputs).filter(function (o) { return o.status === "unresolved"; }).length : 0;
      return '' +
        '<div class="segment-card">' +
          '<div class="flex-between">' +
            '<div><strong>' + esc(seg.segmentName) + '</strong> <span class="muted-text">(' + esc(seg.segmentType) + (seg.wallType ? " &middot; " + esc(seg.wallType) : "") + ')</span>' +
            '<p class="muted-text mb-0">Rolls up to: ' + esc(lineItem ? lineItem.title : "Unassigned") + '</p></div>' +
            '<div class="flex-row">' +
              (unresolvedCount ? '<span class="badge badge-amber">' + unresolvedCount + ' unresolved calc' + (unresolvedCount > 1 ? "s" : "") + '</span>' : (calcCount ? '<span class="badge badge-green">Calculated</span>' : '')) +
              (isLocked ? '' : '<button type="button" class="link-btn" data-edit-segment="' + seg.id + '" data-est-id="' + est.id + '">Edit</button>') +
            '</div>' +
          '</div>' +
          renderSegmentCalcOutputs(seg) +
        '</div>';
    }).join('');

    return card('' +
      '<div class="card-header"><h3>Takeoff Segments</h3>' +
        (isLocked ? '' : '<div class="flex-row"><button type="button" class="btn btn-secondary btn-sm" id="add-segment-btn" data-est-id="' + est.id + '">+ Add Segment</button>' +
          (est.takeoffSegments.length ? '<button type="button" class="btn btn-primary btn-sm" id="run-calculations-btn" data-est-id="' + est.id + '">Run Calculations</button>' : '') + '</div>') +
      '</div>' +
      (est.takeoffSegments.length ? segRows : emptyState("&#128207;", "No takeoff segments yet", "Add a segment for each wall area, material-sale section, or demolition-only scope.")),
    '');
  }

  function renderSegmentCalcOutputs(seg) {
    if (!seg.calculatedOutputs || !seg.calculatedOutputs.outputs || !Object.keys(seg.calculatedOutputs.outputs).length) {
      return '<p class="muted-text mt-2">Not yet calculated. Click "Run Calculations" to generate material quantities.</p>';
    }
    var rows = Object.keys(seg.calculatedOutputs.outputs).map(function (calcId) {
      var o = seg.calculatedOutputs.outputs[calcId];
      if (o.status === "not-applicable") return "";
      if (o.status === "unresolved") {
        return '<div class="calc-output-row"><span>' + esc(o.label) + ' (' + calcId + ')</span><span class="override-flag">Unresolved &mdash; see notice below</span></div>';
      }
      return '<div class="calc-output-row"><span>' + esc(o.label) + ' (' + calcId + ')</span><span>' + (typeof o.value === "number" ? o.value.toLocaleString() : o.value) + ' ' + esc(o.unit || '') + '</span></div>';
    }).join('');
    var unresolvedNotices = Object.values(seg.calculatedOutputs.outputs).filter(function (o) { return o.status === "unresolved"; })
      .map(function (o) { return '<div class="callout callout-open-decision mt-2"><strong>Unresolved calculation (' + o.calcId + ' &mdash; ' + esc(o.label) + '):</strong> ' + esc(o.unresolvedReason) + '</div>'; }).join('');
    return '<div class="mt-3">' + rows + '</div>' + unresolvedNotices;
  }

  function renderSegmentForm(est, segment) {
    var seg = segment || {
      id: "SEG-" + est.id + "-" + (est.takeoffSegments.length + 1),
      segmentName: "", assignedProposalLineItemId: "", segmentType: "Installed Wall", wallType: "Block Wall",
      wallLength: null, averageExposedHeight: null, minimumExposedHeight: null, maximumExposedHeight: null,
      numberOfCourses: null, blockHeight: null, blockLength: null, blockDepth: null, wallDepthThickness: null, baseWidth: null,
      capRequired: false, drainageRequired: false, gravelBedWidth: null, drainOutletCount: 0, geogridRequired: false,
      manualGeogridAreaOverride: null, manualGeogridAreaOverrideReason: "",
      demolitionRequired: false, demolitionScopeType: "", demolitionQuantity: null,
      accessLevel: "Moderate", siteSlope: "Level", soilCondition: "Normal Soil",
      equipmentRows: [], wallShape: "Straight", cornerReturnEndCount: 0
    };

    if (est.proposalLineItems.length === 0) {
      return '<div class="modal-header"><h2>Add Takeoff Segment</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
        '<div class="modal-body"><div class="callout callout-warning">You must create at least one Proposal Line Item before adding a takeoff segment, since every segment must roll up to a customer-facing line item.</div></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Close</button></div>';
    }

    return '' +
      '<div class="modal-header"><h2>' + (segment ? "Edit" : "Add") + ' Takeoff Segment</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="segment-form" data-est-id="' + est.id + '" data-segment-id="' + seg.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("segmentName", "Takeoff Segment Name", seg.segmentName, { required: true, fullWidth: true }) +
            fieldSelect("assignedProposalLineItemId", "Assigned Proposal Line Item", seg.assignedProposalLineItemId,
              est.proposalLineItems.map(function (li) { return { value: li.id, label: li.title }; }), { required: true, fullWidth: true }) +
            fieldSelect("segmentType", "Segment Type", seg.segmentType, D.TAKEOFF_SEGMENT_TYPES, { required: true }) +
            fieldSelect("wallType", "Wall Type / System", seg.wallType, D.WALL_TYPES, { hint: "Required for Installed Wall segments." }) +
          '</div>' +
          '<hr class="divider" />' +
          '<h4>Wall Geometry</h4>' +
          '<div class="form-grid">' +
            fieldText("wallLength", "Wall Length (LF)", seg.wallLength, { type: "number", step: "0.01" }) +
            fieldText("averageExposedHeight", "Average Exposed Height (FT)", seg.averageExposedHeight, { type: "number", step: "0.01" }) +
            fieldText("minimumExposedHeight", "Minimum Exposed Height (FT)", seg.minimumExposedHeight, { type: "number", step: "0.01" }) +
            fieldText("maximumExposedHeight", "Maximum Exposed Height (FT)", seg.maximumExposedHeight, { type: "number", step: "0.01" }) +
            fieldSelect("wallShape", "Wall Shape / Alignment", seg.wallShape, D.WALL_SHAPES) +
            fieldText("cornerReturnEndCount", "Corner / Return / End Count", seg.cornerReturnEndCount, { type: "number", min: 0 }) +
            fieldText("numberOfCourses", "Number of Courses (Block/Keystone)", seg.numberOfCourses, { type: "number", min: 0 }) +
            fieldText("blockHeight", "Block Height (FT)", seg.blockHeight, { type: "number", step: "0.01" }) +
            fieldText("blockLength", "Block Length (FT)", seg.blockLength, { type: "number", step: "0.01" }) +
            fieldText("blockDepth", "Block Depth (FT, Chopped/Keystone)", seg.blockDepth, { type: "number", step: "0.01" }) +
            fieldText("wallDepthThickness", "Wall Depth / Thickness (FT)", seg.wallDepthThickness, { type: "number", step: "0.01" }) +
            fieldText("baseWidth", "Base Width (FT)", seg.baseWidth, { type: "number", step: "0.01" }) +
            fieldCheckbox("capRequired", "Cap Required", seg.capRequired) +
          '</div>' +
          '<hr class="divider" />' +
          '<h4>Drainage &amp; Reinforcement</h4>' +
          '<div class="form-grid">' +
            fieldCheckbox("drainageRequired", "Drainage Required", seg.drainageRequired) +
            fieldText("gravelBedWidth", "Drainage Gravel Bed Width (FT)", seg.gravelBedWidth, { type: "number", step: "0.01" }) +
            fieldText("drainOutletCount", "Drain Outlet Count", seg.drainOutletCount, { type: "number", min: 0 }) +
            fieldCheckbox("geogridRequired", "Geogrid Required", seg.geogridRequired) +
            fieldText("manualGeogridAreaOverride", "Manual Geogrid Area Override (SF)", seg.manualGeogridAreaOverride, { type: "number", step: "0.01", hint: "Required because the shared geogrid formula is not defined in the workbook (Open Decision OD-002)." }) +
            fieldTextarea("manualGeogridAreaOverrideReason", "Geogrid Override Reason", seg.manualGeogridAreaOverrideReason) +
          '</div>' +
          '<hr class="divider" />' +
          '<h4>Demolition</h4>' +
          '<div class="form-grid">' +
            fieldCheckbox("demolitionRequired", "Demolition / Removal Required", seg.demolitionRequired) +
            fieldSelect("demolitionScopeType", "Demolition Scope Type", seg.demolitionScopeType, D.DEMOLITION_SCOPE_TYPES, { includeBlank: true }) +
            fieldText("demolitionQuantity", "Demolition Quantity", seg.demolitionQuantity, { type: "number", step: "0.01" }) +
          '</div>' +
          '<hr class="divider" />' +
          '<h4>Access &amp; Site Conditions</h4>' +
          '<div class="form-grid">' +
            fieldSelect("accessLevel", "Access Level", seg.accessLevel, D.ACCESS_LEVELS, { required: true }) +
            fieldSelect("siteSlope", "Site Slope / Terrain", seg.siteSlope, D.SITE_SLOPES, { required: true }) +
            fieldSelect("soilCondition", "Soil / Ground Condition", seg.soilCondition, D.SOIL_CONDITIONS, { required: true }) +
          '</div>' +
          (seg.soilCondition === "Unknown" ? '<div class="callout callout-warning">Unknown soil condition creates a visible risk/contingency warning per the workbook.</div>' : '') +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Segment</button>' +
        '</div>' +
      '</form>';
  }

  // ---------- Internal Costs tab ----------

  function renderInternalCostsTab(est, isLocked) {
    var categories = D.getCostCategories();
    var byCategory = {};
    est.costRows.forEach(function (r) {
      byCategory[r.costCategoryId] = byCategory[r.costCategoryId] || [];
      byCategory[r.costCategoryId].push(r);
    });

    var sections = categories.map(function (cat) {
      var rows = byCategory[cat.id] || [];
      if (!rows.length) return "";
      var lineTotal = rows.reduce(function (s, r) { return s + (r.quantity * r.unitCost); }, 0);
      var rowsHtml = rows.map(function (r) {
        var lineItem = est.proposalLineItems.find(function (li) { return li.id === r.proposalLineItemId; });
        return '<tr><td>' + esc(r.description) + '</td><td>' + esc(lineItem ? lineItem.title : "Unassigned") + '</td>' +
          '<td>' + r.quantity + ' ' + esc(r.unit) + '</td><td>' + fmtMoney(r.unitCost) + '</td><td>' + fmtMoney(r.quantity * r.unitCost) + '</td>' +
          '<td>' + esc(r.sourceType) + '</td>' +
          '<td>' + (isLocked ? '' : '<button type="button" class="link-btn" data-edit-cost-row="' + r.id + '" data-est-id="' + est.id + '">Edit</button>') + '</td></tr>';
      }).join('');
      return '<h4 class="mt-4">' + esc(cat.name) + ' <span class="muted-text">(' + fmtMoney(lineTotal) + ')</span></h4>' +
        tableWrap('<thead><tr><th>Description</th><th>Proposal Line Item</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Source</th><th></th></tr></thead><tbody>' + rowsHtml + '</tbody>');
    }).join('');

    return card('' +
      '<div class="card-header"><h3>Detailed Internal Cost Rows</h3>' +
        (isLocked ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="add-cost-row-btn" data-est-id="' + est.id + '">+ Add Cost Row</button>') +
      '</div>' +
      '<p class="muted-text">Every cost row is assigned to both a customer-facing proposal line item and a standard Estimate Cost Category.</p>' +
      (est.costRows.length ? sections : emptyState("&#128176;", "No internal cost rows yet", "Add cost rows manually, or run calculations on a takeoff segment to generate them from the Price Catalog.")),
    '');
  }

  function renderCostRowForm(est, costRow) {
    var row = costRow || { id: null, proposalLineItemId: "", costCategoryId: "CAT-001", description: "", quantity: 1, unit: "EA", unitCost: 0, sourceType: "Manual", overrideReason: "" };
    var catalog = D.getPriceCatalog();
    return '' +
      '<div class="modal-header"><h2>' + (costRow ? "Edit" : "Add") + ' Internal Cost Row</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="cost-row-form" data-est-id="' + est.id + '" data-cost-row-id="' + (row.id || '') + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldSelect("proposalLineItemId", "Proposal Line Item", row.proposalLineItemId, est.proposalLineItems.map(function (li) { return { value: li.id, label: li.title }; }), { required: true, fullWidth: true }) +
            fieldSelect("costCategoryId", "Estimate Cost Category", row.costCategoryId, D.getCostCategories().map(function (c) { return { value: c.id, label: c.name }; }), { required: true }) +
            fieldSelect("priceCatalogLookup", "Price Catalog Reference (Optional)", "", catalog.map(function (c) { return { value: c.id, label: c.item + " - " + fmtMoneyPlain(c.cost) + "/" + c.unit }; }), { includeBlank: true, blankLabel: "Manual entry (no catalog reference)" }) +
            fieldText("description", "Description", row.description, { required: true, fullWidth: true }) +
            fieldText("quantity", "Quantity", row.quantity, { type: "number", step: "0.01", required: true }) +
            fieldText("unit", "Unit", row.unit, { required: true }) +
            fieldText("unitCost", "Unit Cost", row.unitCost, { type: "number", step: "0.01", required: true }) +
            fieldSelect("sourceType", "Source Type", row.sourceType, ["Calculated", "Catalog", "Manual"], { required: true }) +
            fieldTextarea("overrideReason", "Override / Manual Reason (If Replacing a Calculated or Catalog Value)", row.overrideReason, { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Cost Row</button>' +
        '</div>' +
      '</form>';
  }

  // ---------- Financial Analysis tab ----------

  function renderFinancialsTab(est) {
    var fin = est.calculatedSnapshot || C.computeEstimateFinancials(est);
    var tiers = D.getProfitGoals();
    var tier = tiers.find(function (t) { return t.id === fin.tierId; });
    var color = tierVisualColor(fin.contributionMarginPct, tier);

    var categoryRows = D.getCostCategories().map(function (cat) {
      var amt = fin.byCategory[cat.id] || 0;
      if (!amt) return "";
      return '<tr><td>' + esc(cat.name) + '</td><td class="text-right">' + fmtMoney(amt) + '</td></tr>';
    }).join('');

    var overheadWarning = fin.overheadOutOfBand ? '<div class="callout callout-warning mt-2">Overhead Reserve (' + fmtPct(fin.overheadReservePct) + ') is outside the controlled 19%-23% adjustment range. This requires a documented reason and approval per the workbook.</div>' : '';
    var floorWarning = fin.belowFloor ? '<div class="callout callout-danger mt-2"><strong>Below-floor pricing.</strong> Contribution margin (' + fmtPct(fin.contributionMarginPct) + ') is below the ' + (tier ? fmtPct(tier.minMargin) : "tier floor") + ' minimum for this pricing tier. A written explanation and management/ownership approval are required before this estimate may be approved to send.</div>' : '';
    var ceilingNotice = fin.aboveReviewCeiling ? '<div class="callout callout-info mt-2">Contribution margin is above the tier\'s review ceiling (' + (tier ? fmtPct(tier.maxMargin) : "") + '). Consider reviewing pricing for competitiveness.</div>' : '';

    return '' +
      card('' +
        '<div class="flex-between"><h3>Pricing Tier</h3>' + tierBadge(color) + '</div>' +
        '<p>' + (tier ? esc(tier.tier) + " &middot; " + esc(tier.projectType) : "No matching tier found for this selling price / project type.") + '</p>' +
        (tier ? '<p class="muted-text">Target ' + fmtPct(tier.targetMargin) + ' &middot; Floor ' + fmtPct(tier.minMargin) + ' &middot; Ceiling ' + fmtPct(tier.maxMargin) + '</p>' : '') +
        overheadWarning + floorWarning + ceilingNotice,
      '') +
      '<div class="card-grid mt-4">' +
        card('<h3>Direct Estimated Cost by Category</h3>' + (categoryRows ? tableWrap('<thead><tr><th>Category</th><th class="text-right">Amount</th></tr></thead><tbody>' + categoryRows + '</tbody>') : '<p class="muted-text">No cost rows yet.</p>'), '') +
        card('' +
          '<h3>Financial Breakdown</h3>' +
          '<div class="financial-line"><span>Direct Estimated Cost</span><span>' + fmtMoney(fin.directEstimatedCost) + '</span></div>' +
          '<div class="financial-line"><span>Selling Price</span><span>' + fmtMoney(fin.sellingPrice) + '</span></div>' +
          '<div class="financial-line"><span>Contribution Margin ($)</span><span>' + fmtMoney(fin.contributionMarginDollars) + '</span></div>' +
          '<div class="financial-line"><span>Contribution Margin (%)</span><span>' + fmtPct(fin.contributionMarginPct) + '</span></div>' +
          '<div class="financial-line"><span>Overhead Reserve (' + fmtPct(fin.overheadReservePct) + ')</span><span>' + fmtMoney(fin.overheadReserveDollars) + '</span></div>' +
          '<div class="financial-line"><span>Contingency Reserve' + (fin.contingencyReservePct !== null ? ' (' + fmtPct(fin.contingencyReservePct) + ')' : '') + '</span><span>' + fmtMoney(fin.contingencyReserveDollars) + '</span></div>' +
          '<div class="financial-line"><span>Equipment Repair Reserve' + (fin.equipmentRepairReserveApplied ? ' (' + fmtPct(fin.equipmentRepairReservePct) + ')' : ' (not applied &mdash; no company-owned equipment)') + '</span><span>' + fmtMoney(fin.equipmentRepairReserveDollars) + '</span></div>' +
          '<div class="financial-line total"><span>Net Estimated Profit ($)</span><span>' + fmtMoney(fin.netEstimatedProfitDollars) + '</span></div>' +
          '<div class="financial-line total"><span>Net Estimated Profit (%)</span><span>' + fmtPct(fin.netEstimatedProfitPct) + '</span></div>' +
        '', '') +
      '</div>' +
      card('' +
        '<h3>Selling Price &amp; Reserve Adjustments</h3>' +
        '<form id="pricing-adjustments-form" data-est-id="' + est.id + '">' +
          '<div class="form-grid">' +
            fieldText("manualPriceOverride", "Selling Price Override", est.manualPriceOverride, { type: "number", step: "0.01", hint: "Leave blank to use the sum of internal costs plus reserves and markup." }) +
            fieldText("overheadReservePct", "Overhead Reserve %", (est.overheadReservePct * 100).toFixed(2), { type: "number", step: "0.1", hint: "Controlled range 19%-23%. Values outside this range require a reason." }) +
            fieldText("contingencyReservePct", "Contingency Reserve %", est.contingencyReservePct !== null && est.contingencyReservePct !== undefined ? (est.contingencyReservePct * 100).toFixed(2) : "", { type: "number", step: "0.1" }) +
            fieldText("equipmentRepairReservePct", "Equipment Repair Reserve %", est.equipmentRepairReservePct !== null && est.equipmentRepairReservePct !== undefined ? (est.equipmentRepairReservePct * 100).toFixed(2) : "", { type: "number", step: "0.1" }) +
            fieldTextarea("belowFloorReason", "Reason (Required for Below-Floor or Out-of-Range Reserve)", est.belowFloorReason, { fullWidth: true }) +
          '</div>' +
          '<div class="form-actions"><button type="submit" class="btn btn-primary">Recalculate &amp; Save</button></div>' +
        '</form>',
      'mt-4');
  }

  // ---------- Proposal Preview tab (customer-safe) ----------

  function renderProposalPreviewTab(est) {
    var opp = D.getOpportunityById(est.opportunityId);
    var visibleItems = est.proposalLineItems.filter(function (li) { return li.visibleOnProposal; }).sort(function (a, b) { return a.sortOrder - b.sortOrder; });

    return card('' +
      '<div class="flex-between mb-4"><h3>Proposal Preview</h3><button type="button" class="btn btn-primary" id="print-proposal-btn" data-est-id="' + est.id + '">Print / Save as PDF</button></div>' +
      '<div class="callout callout-info mb-4">This preview never shows internal costs, cost categories, reserves, markup, margins, or internal notes. Only titles, descriptions, customer-facing notes, and totals marked visible are shown below.</div>' +
      '<div class="proposal-preview">' + buildProposalHtml(est, opp, visibleItems) + '</div>',
    '');
  }

  function buildProposalHtml(est, opp, visibleItems) {
    var lineItemsHtml = visibleItems.map(function (li) {
      return '<div class="proposal-line-item"><h3>' + esc(li.title) + '</h3><p>' + esc(li.customerFacingNote || li.description || "") + '</p></div>';
    }).join('') || '<p>No customer-facing line items have been marked visible yet.</p>';

    return '' +
      '<div class="proposal-header-block">' +
        '<div><h1>Austin Block Company</h1><p>Proposal for: ' + esc(opp ? opp.customerName : "") + '</p><p>' + esc(opp ? opp.projectAddress : est.jobAddress) + '</p></div>' +
        '<div class="text-right"><p><strong>Proposal:</strong> ' + esc(est.id) + ' (Rev ' + est.revisionNumber + ')</p><p><strong>Issue Date:</strong> ' + fmtDate(est.createdDate) + '</p><p><strong>Expires:</strong> ' + fmtDate(est.proposalExpirationDate) + '</p></div>' +
      '</div>' +
      '<h2>Scope of Work</h2>' +
      lineItemsHtml +
      '<div class="proposal-total-box"><h2>Total: ' + fmtMoney(est.sellingPrice) + '</h2></div>' +
      '<h3 class="mt-4">Terms</h3>' +
      '<p class="muted-text">Draft terms template &mdash; final proposal terms, signature/acceptance process, and document numbering are pending an Austin Block Company decision (see Open Decision OD-011). This section is a placeholder for legal/ownership-approved language.</p>';
  }

  // ---------- Review & Approval tab ----------

  function renderReviewApprovalTab(est) {
    var fin = est.calculatedSnapshot || C.computeEstimateFinancials(est);
    var actions = "";

    if (est.status === "In Progress") {
      actions = '<button type="button" class="btn btn-primary" id="submit-for-review-btn" data-est-id="' + est.id + '">Generate Proposal Preview &amp; Submit for Review</button>';
    } else if (est.status === "Ready for Review") {
      actions = '' +
        '<div class="flex-row">' +
          '<button type="button" class="btn btn-primary" id="approve-estimate-btn" data-est-id="' + est.id + '">Approve to Send</button>' +
          '<button type="button" class="btn btn-secondary" id="request-revision-btn" data-est-id="' + est.id + '">Request Revision</button>' +
        '</div>';
    } else if (est.status === "Approved to Send") {
      actions = '<button type="button" class="btn btn-primary" id="send-proposal-btn" data-est-id="' + est.id + '">Send Proposal to Customer</button>';
    } else if (est.status === "Sent") {
      actions = '<button type="button" class="btn btn-primary" id="mark-won-btn" data-est-id="' + est.id + '">Mark Won &amp; Create Project</button>' +
        ' <button type="button" class="btn btn-secondary" id="mark-declined-btn" data-est-id="' + est.id + '">Mark Declined</button>';
    }

    var approvalRequiredNotice = fin.requiresApproval ? '<div class="callout callout-warning mb-4">This estimate requires explicit management/ownership approval before it can be sent (below-floor pricing, above-ceiling pricing, or an out-of-range overhead reserve).</div>' : '';

    var historyRows = (est.reviewHistory || []).map(function (h) {
      return '<tr><td>' + esc(h.snapshotType) + '</td><td>' + fmtDateTime(h.createdAt) + '</td><td>' + esc(h.createdBy) + '</td></tr>';
    }).join('');

    return approvalRequiredNotice +
      card('<h3>Workflow Actions</h3><p>Current status: ' + badge(est.status) + '</p>' + actions, '') +
      card('<h3>Protected Snapshot History</h3>' + (historyRows ? tableWrap('<thead><tr><th>Snapshot Type</th><th>Created</th><th>By</th></tr></thead><tbody>' + historyRows + '</tbody>') : '<p class="muted-text">No protected snapshots yet.</p>'), 'mt-4');
  }

  // ---------- Revisions & History tab ----------

  function renderRevisionsTab(est) {
    var opp = D.getOpportunityById(est.opportunityId);
    var allRevisions = opp ? D.getEstimatesForOpportunity(opp.id) : [est];
    var rows = allRevisions.map(function (e) {
      return '<tr' + (e.id === est.id ? ' style="font-weight:700"' : '') + '><td>Revision ' + e.revisionNumber + '</td><td>' + badge(e.status) + '</td><td>' + fmtMoney(e.sellingPrice) + '</td><td>' + fmtDate(e.createdDate) + '</td>' +
        '<td><a href="#/estimates/' + e.id + '" class="link-btn">' + (e.id === est.id ? "Viewing" : "View") + '</a></td></tr>';
    }).join('');
    return card('<h3>All Revisions for This Opportunity</h3><p class="muted-text">Prior revisions are permanently preserved and cannot be edited.</p>' + tableWrap('<thead><tr><th>Revision</th><th>Status</th><th>Selling Price</th><th>Created</th><th></th></tr></thead><tbody>' + rows + '</tbody>'), '');
  }

  // ---------- Follow-Up tab ----------

  function renderFollowUpTab(est) {
    var followUps = D.getFollowUpsForEstimate(est.id);
    if (est.status !== "Sent" && !followUps.length) {
      return card(emptyState("&#128197;", "No follow-ups scheduled", "Follow-ups are automatically created 10 and 28 days after an estimate is sent."), '');
    }
    var rows = followUps.map(function (f) {
      return '<tr><td>' + esc(f.label) + '</td><td>' + fmtDate(f.dueDate) + '</td>' +
        '<td>' + (f.completed ? '<span class="badge badge-green">Completed</span>' : '<span class="badge badge-amber">Pending</span>') + '</td>' +
        '<td>' + esc(f.outcomeNote || "&mdash;") + '</td>' +
        '<td>' + (!f.completed ? '<button type="button" class="link-btn" data-complete-followup="' + f.id + '">Mark Complete</button>' : '') + '</td></tr>';
    }).join('');
    return card('<h3>Follow-Up Schedule</h3>' + tableWrap('<thead><tr><th>Follow-Up</th><th>Due</th><th>Status</th><th>Outcome</th><th></th></tr></thead><tbody>' + rows + '</tbody>'), '');
  }

  function renderCompleteFollowUpForm(followUpId) {
    return '' +
      '<div class="modal-header"><h2>Complete Follow-Up</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="complete-followup-form" data-followup-id="' + followUpId + '">' +
        '<div class="modal-body">' +
          fieldSelect("contactMethod", "Contact Method", "Phone", ["Phone", "Email", "Text", "In Person"]) +
          fieldTextarea("outcomeNote", "Outcome / Notes", "", { required: true }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>' +
      '</form>';
  }

  function renderRevisionReasonForm(estId) {
    return '' +
      '<div class="modal-header"><h2>Create New Revision</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="revision-reason-form" data-est-id="' + estId + '">' +
        '<div class="modal-body">' +
          '<div class="callout callout-info mb-3">This creates a new editable revision. The current revision remains permanently protected and viewable.</div>' +
          fieldTextarea("revisionReason", "Reason for Revision", "", { required: true }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Create Revision</button></div>' +
      '</form>';
  }

  function renderDeclineForm(estId) {
    return '' +
      '<div class="modal-header"><h2>Mark Estimate Declined</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="decline-form" data-est-id="' + estId + '">' +
        '<div class="modal-body">' +
          fieldSelect("declineReason", "Reason", "", D.getControlledLists().lossReasons, { required: true }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Mark Declined</button></div>' +
      '</form>';
  }

  function renderMarkWonForm(estId) {
    var est = D.getEstimateById(estId);
    return '' +
      '<div class="modal-header"><h2>Mark Won &amp; Create Project</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="mark-won-form" data-est-id="' + estId + '">' +
        '<div class="modal-body">' +
          '<div class="callout callout-info mb-3">This preserves an immutable Accepted snapshot and creates a linked project with this estimate as the Original Project Budget.</div>' +
          fieldText("acceptedContractValue", "Accepted Contract Value", est.sellingPrice, { type: "number", step: "0.01", required: true }) +
          fieldTextarea("acceptanceEvidence", "Acceptance Evidence / Notes", "", { required: true, hint: "Signature, email confirmation, or verbal acceptance notes." }) +
          fieldText("expectedStartDate", "Expected Start Date (Optional)", "", { type: "date" }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Confirm Won</button></div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: PRICE CATALOG
  // =========================================================================

  function renderPriceCatalog(filterState) {
    setPageHeader("Price Catalog", "Current reference pricing. Changes here never alter saved or historical estimates.");
    var f = filterState || {};
    var categories = D.getCostCategories();
    var items = D.getPriceCatalog().filter(function (i) {
      if (f.categoryId && i.categoryId !== f.categoryId) return false;
      if (f.search && (i.item + " " + i.wallType).toLowerCase().indexOf(f.search.toLowerCase()) === -1) return false;
      return true;
    });

    var filterBar = '' +
      '<div class="flex-row mb-4">' +
        '<input class="input-control" id="catalog-search" placeholder="Search items..." value="' + esc(f.search || '') + '" style="min-width:220px" />' +
        '<select class="select-control" id="catalog-category-filter">' +
          '<option value="">All Categories</option>' +
          categories.map(function (c) { return '<option value="' + c.id + '" ' + (f.categoryId === c.id ? 'selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '</select>' +
      '</div>';

    var rows = items.map(function (i) {
      var cat = D.getCostCategoryById(i.categoryId);
      return '<tr><td>' + esc(i.id) + '</td><td>' + esc(i.item) + '</td><td>' + esc(i.wallType) + '</td><td>' + fmtMoney(i.cost) + '</td><td>' + esc(i.unit) + '</td>' +
        '<td>' + esc(cat ? cat.name : i.categoryId) + '</td><td>' + (i.taxed ? "8.25%" : "No") + '</td><td>' + fmtPct(i.markup, 0) + '</td></tr>';
    }).join('');

    return filterBar + tableWrap(
      '<thead><tr><th>ID</th><th>Item</th><th>Wall Type</th><th>Cost</th><th>Unit</th><th>Category</th><th>Taxed</th><th>Stock Markup</th></tr></thead><tbody>' + rows + '</tbody>'
    ) + '<p class="field-hint mt-2">' + items.length + ' of ' + D.getPriceCatalog().length + ' items shown. This is a read-only reference view in the prototype; catalog editing would be an authorized-user action in the full build.</p>';
  }

  // =========================================================================
  // VIEW: ESTIMATE COST CATEGORIES
  // =========================================================================

  function renderCostCategories() {
    setPageHeader("Estimate Cost Categories", "Standard categories used for every detailed estimate cost and actual project cost.");
    var rows = D.getCostCategories().map(function (c) {
      return '<tr><td>' + esc(c.id) + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.description) + '</td>' +
        '<td>' + fmtPct(c.defaultMarkup, 0) + '</td><td>' + esc(c.defaultUnitBasis) + '</td><td>' + esc(c.notes || "") + '</td></tr>';
    }).join('');
    return tableWrap('<thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Default Markup</th><th>Unit Basis</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody>') +
      openDecisionCallout("OD-010", "Permits / Fees is not yet an active category; it is only added \"if Austin Block chooses to report it separately.\"");
  }

  // =========================================================================
  // VIEW: PROFIT GOALS
  // =========================================================================

  function renderProfitGoals() {
    setPageHeader("Profit Goals", "Tiered pricing policy, reserves, and approval thresholds.");
    var rows = D.getProfitGoals().map(function (t) {
      var range = t.minValue.toLocaleString() + (t.maxValue ? " - " + t.maxValue.toLocaleString() : "+");
      return '<tr><td>' + esc(t.tier) + '</td><td>' + esc(t.projectType) + '</td><td>$' + range + '</td>' +
        '<td>' + fmtPct(t.targetMargin, 0) + '</td><td>' + fmtPct(t.minMargin, 0) + '</td><td>' + fmtPct(t.maxMargin, 0) + '</td>' +
        '<td>' + fmtPct(t.overheadReserve, 1) + '</td><td>' + fmtPct(t.contingencyReserve, 1) + '</td><td>' + fmtPct(t.equipmentRepairReserve, 1) + '</td>' +
        '<td>' + esc(t.approvalRule) + '</td></tr>';
    }).join('');
    return card('' +
      '<p>Starting overhead reserve default: <strong>21.5%</strong> of Direct Estimated Cost. Controlled adjustment range: <strong>19%-23%</strong>; exceptions require a documented reason and approval.</p>' +
      tableWrap('<thead><tr><th>Tier</th><th>Type</th><th>Value Range</th><th>Target Margin</th><th>Floor</th><th>Ceiling</th><th>Overhead</th><th>Contingency</th><th>Equip. Repair</th><th>Approval Rule</th></tr></thead><tbody>' + rows + '</tbody>'),
    '') +
    openDecisionCallout("OD-006", "Contingency Reserve has no stated override range or approval trigger beyond the tier starting percentage.") +
    openDecisionCallout("OD-007", "Equipment Repair Reserve qualification rule is inferred (applied when any Company-Owned equipment row exists) and pending confirmation.");
  }

  // =========================================================================
  // VIEW: PROJECTS LIST
  // =========================================================================

  function renderProjectsList(filterState) {
    setPageHeader("Projects", "Financial tracking for every won project, from setup through closeout.");
    var f = filterState || {};
    var projects = D.getProjects().filter(function (p) {
      if (f.status && p.status !== f.status) return false;
      if (f.search) {
        var s = f.search.toLowerCase();
        if ((p.customerName + " " + p.jobAddress + " " + p.id).toLowerCase().indexOf(s) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return new Date(b.createdDate) - new Date(a.createdDate); });

    var filterBar = '' +
      '<div class="flex-between mb-4">' +
        '<div class="flex-row">' +
          '<input class="input-control" id="proj-search" placeholder="Search project, customer, address..." value="' + esc(f.search || '') + '" style="min-width:240px" />' +
          '<select class="select-control" id="proj-status-filter">' +
            '<option value="">All Statuses</option>' +
            D.PROJECT_STATUSES.map(function (s) { return '<option value="' + s + '" ' + (f.status === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<button type="button" class="btn btn-secondary" id="new-project-btn">+ New Project (Exception Path)</button>' +
      '</div>';

    if (!projects.length) {
      return filterBar + card(emptyState("&#127959;", "No projects yet", "Projects are normally created automatically when an estimate is marked Won."));
    }

    var rows = projects.map(function (p) {
      var fin = C.computeProjectFinancials(p, D.getExpensesForProject(p.id), D.getSubcontractorCostsForProject(p.id), D.getLaborEntriesForProject(p.id), D.getChangeOrdersForProject(p.id), D.getInvoicesForProject(p.id), D.getPaymentsForProject(p.id));
      return '<tr class="row-clickable" data-nav="#/projects/' + p.id + '">' +
        '<td>' + esc(p.id) + '</td><td>' + esc(p.customerName) + '</td><td>' + badge(p.status) + '</td>' +
        '<td>' + fmtMoney(fin.totalProjectValue) + '</td><td>' + fmtMoney(fin.amountPaid) + '</td><td>' + fmtMoney(fin.amountOwed) + '</td>' +
        '<td>' + fmtMoney(fin.actualProjectProfit) + '</td></tr>';
    }).join('');

    return filterBar + tableWrap(
      '<thead><tr><th>Project</th><th>Customer</th><th>Status</th><th>Total Project Value</th><th>Paid</th><th>Owed</th><th>Actual Profit</th></tr></thead><tbody>' + rows + '</tbody>'
    );
  }

  function renderNewProjectForm() {
    var wonEstimates = D.getEstimates().filter(function (e) { return e.status === "Accepted"; });
    return '' +
      '<div class="modal-header"><h2>New Project (Exception Path)</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="new-project-form">' +
        '<div class="modal-body">' +
          '<div class="callout callout-warning mb-3">The normal path is Won Estimate to Project. Use this only when a project did not originate from an accepted estimate, or to manually create a missing record.</div>' +
          fieldText("customerName", "Customer Name", "", { required: true, fullWidth: true }) +
          fieldText("jobAddress", "Job Address", "", { required: true }) +
          fieldText("originalContractValue", "Initial Contract Value", 0, { type: "number", step: "0.01", required: true }) +
          fieldTextarea("notes", "Notes", "") +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Create Project</button></div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: PROJECT DETAIL (financial summary + sub-tabs)
  // =========================================================================

  function renderProjectDetail(projectId, activeTab) {
    var project = D.getProjectById(projectId);
    if (!project) return emptyState("&#10060;", "Project not found", "It may have been removed.");
    var tab = activeTab || "summary";

    setPageHeader(project.customerName, "Project " + project.id + " &middot; " + project.jobAddress);

    var expenses = D.getExpensesForProject(project.id);
    var subs = D.getSubcontractorCostsForProject(project.id);
    var labor = D.getLaborEntriesForProject(project.id);
    var cos = D.getChangeOrdersForProject(project.id);
    var invoices = D.getInvoicesForProject(project.id);
    var payments = D.getPaymentsForProject(project.id);
    var fin = C.computeProjectFinancials(project, expenses, subs, labor, cos, invoices, payments);

    var tabs = [["summary", "Summary"], ["budget", "Budget vs. Actual"], ["expenses", "Expenses"], ["subcontractors", "Subcontractors"], ["labor", "ABC Labor"], ["changeorders", "Change Orders"], ["invoices", "Invoices"], ["payments", "Payments"], ["files", "Files"], ["activity", "Activity"]];
    var tabBar = '<div class="tabs">' + tabs.map(function (t) {
      return '<button type="button" class="tab-btn ' + (tab === t[0] ? "active" : "") + '" data-proj-tab="' + t[0] + '" data-proj-id="' + project.id + '">' + t[1] + '</button>';
    }).join('') + '</div>';

    var statusBar = '<div class="flex-between mb-4">' + badge(project.status) +
      '<div class="flex-row">' +
        (project.status !== "Closed" ? '<button type="button" class="btn btn-secondary" id="edit-project-btn" data-proj-id="' + project.id + '">Edit Project</button>' : '') +
        (project.status === "Substantially Complete" || project.status === "Active" ? '<button type="button" class="btn btn-primary" id="close-project-btn" data-proj-id="' + project.id + '">Close Project</button>' : '') +
      '</div></div>';

    var body = "";
    switch (tab) {
      case "budget": body = renderBudgetVsActualTab(fin); break;
      case "expenses": body = renderExpensesTab(project, expenses); break;
      case "subcontractors": body = renderSubcontractorsTab(project, subs); break;
      case "labor": body = renderLaborTab(project, labor); break;
      case "changeorders": body = renderChangeOrdersTab(project, cos); break;
      case "invoices": body = renderInvoicesTab(project, invoices); break;
      case "payments": body = renderPaymentsTab(project, payments, fin); break;
      case "files": body = renderFilesSection(project.id, "Project", D.getFilesForRecord(project.id)); break;
      case "activity": body = card('<h3>Activity History</h3>' + renderActivityList(D.getActivitiesForRecord(project.id)), ''); break;
      default: body = renderProjectSummaryTab(project, fin);
    }

    return tabBar + statusBar + body;
  }

  function renderProjectSummaryTab(project, fin) {
    return '' +
      '<div class="financial-summary-grid mb-4">' +
        card('<span class="field-label">Original Project Budget</span><p class="metric-value">' + fmtMoney(fin.originalProjectBudget ? fin.originalProjectBudget.totalDirectEstimatedCost : null) + '</p><p class="muted-text">Locked at project creation; never changes.</p>', 'card-compact') +
        card('<span class="field-label">Contract Value / Total Project Value</span><p class="metric-value">' + fmtMoney(fin.totalProjectValue) + '</p><p class="muted-text">Original contract + approved change orders (' + fmtMoney(fin.approvedChangeOrderTotal) + ')</p>', 'card-compact') +
        card('<span class="field-label">Actual Project Cost</span><p class="metric-value">' + fmtMoney(fin.actualProjectCost) + '</p><p class="muted-text">Approved expenses, subcontractor costs, and internal labor only.</p>', 'card-compact') +
        card('<span class="field-label">Amount Paid</span><p class="metric-value">' + fmtMoney(fin.amountPaid) + '</p><p class="muted-text">Payments actually received.</p>', 'card-compact') +
        card('<span class="field-label">Amount Owed</span><p class="metric-value">' + fmtMoney(fin.amountOwed) + '</p><p class="muted-text">Total Project Value minus Amount Paid.</p>', 'card-compact') +
        card('<span class="field-label">Actual Project Profit</span><p class="metric-value">' + fmtMoney(fin.actualProjectProfit) + '</p><p class="muted-text">' + fin.actualProjectProfitLabel + '</p>', 'card-compact') +
      '</div>' +
      card('<h3>Project Information</h3><div class="financial-summary-grid">' +
        '<div><span class="field-label">Project Manager</span><p>' + esc(userName(project.projectManagerUserId)) + '</p></div>' +
        '<div><span class="field-label">Start Date</span><p>' + fmtDate(project.startDate) + '</p></div>' +
        '<div><span class="field-label">Accepted Estimate</span><p><a href="#/estimates/' + project.acceptedEstimateId + '">' + esc(project.acceptedEstimateId || "N/A") + '</a></p></div>' +
      '</div>', '');
  }

  function renderBudgetVsActualTab(fin) {
    var rows = fin.categoryBreakdown.map(function (c) {
      var cat = D.getCostCategoryById(c.costCategoryId);
      var overBudget = c.variance > 0;
      return '<tr><td>' + esc(cat ? cat.name : c.costCategoryId) + '</td><td class="text-right">' + fmtMoney(c.budget) + '</td>' +
        '<td class="text-right">' + fmtMoney(c.actual) + '</td><td class="text-right">' + fmtMoney(c.pending) + '</td>' +
        '<td class="text-right ' + (overBudget ? "text-danger" : "text-success") + '">' + fmtMoney(c.variance) + '</td>' +
        '<td class="text-right">' + (c.variancePct === null ? "&mdash;" : fmtPct(c.variancePct, 0)) + '</td></tr>';
    }).join('');
    return card('<h3>Budget vs. Actual by Cost Category</h3>' + tableWrap('<thead><tr><th>Category</th><th class="text-right">Budget</th><th class="text-right">Actual</th><th class="text-right">Pending</th><th class="text-right">Variance</th><th class="text-right">Variance %</th></tr></thead><tbody>' + rows + '</tbody>'), '');
  }

  function renderExpensesTab(project, expenses) {
    var rows = expenses.map(function (e) {
      var cat = D.getCostCategoryById(e.costCategoryId);
      return '<tr><td>' + fmtDate(e.expenseDate) + '</td><td>' + esc(cat ? cat.name : "") + '</td><td>' + esc(e.vendor) + '</td><td>' + esc(e.description) + '</td>' +
        '<td>' + fmtMoney(e.totalAmount) + '</td><td>' + badge(e.approvalStatus) + '</td><td>' + badge(e.paymentStatus) + '</td>' +
        '<td>' + renderExpenseRowActions(e) + '</td></tr>';
    }).join('');
    return card('' +
      '<div class="card-header"><h3>Expenses</h3><button type="button" class="btn btn-secondary btn-sm" id="add-expense-btn" data-proj-id="' + project.id + '">+ Add Expense</button></div>' +
      (expenses.length ? tableWrap('<thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Description</th><th>Total</th><th>Approval</th><th>Payment</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128179;", "No expenses recorded", "Add the first expense for this project.")),
    '');
  }

   function renderExpenseRowActions(e) {
    var actions = [];
    if (e.approvalStatus === "Draft") actions.push('<button type="button" class="link-btn" data-submit-expense="' + e.id + '">Submit</button>');
    if (e.approvalStatus === "Submitted") {
      actions.push('<button type="button" class="link-btn" data-approve-expense="' + e.id + '">Approve</button>');
      actions.push('<button type="button" class="link-btn" data-reject-expense="' + e.id + '">Reject</button>');
    }
    if (e.approvalStatus === "Approved" && e.paymentStatus !== "Paid") {
      actions.push('<button type="button" class="link-btn" data-pay-expense="' + e.id + '">Mark Paid</button>');
    }
    return actions.join(' &middot; ') || '&mdash;';
  }

  function renderExpenseForm(project, expense) {
    var e = expense || { id: null, expenseDate: new Date().toISOString().substring(0, 10), costCategoryId: "CAT-001", vendor: "", description: "", amountBeforeTax: 0, tax: 0 };
    return '' +
      '<div class="modal-header"><h2>' + (expense ? "Edit" : "Add") + ' Expense</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="expense-form" data-proj-id="' + project.id + '" data-expense-id="' + (e.id || '') + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("expenseDate", "Expense Date", e.expenseDate ? e.expenseDate.substring(0, 10) : "", { type: "date", required: true }) +
            fieldSelect("costCategoryId", "Cost Category", e.costCategoryId, D.getCostCategories().map(function (c) { return { value: c.id, label: c.name }; }), { required: true }) +
            fieldText("vendor", "Vendor", e.vendor, { required: true }) +
            fieldText("description", "Description", e.description, { required: true, fullWidth: true }) +
            fieldText("amountBeforeTax", "Amount Before Tax", e.amountBeforeTax, { type: "number", step: "0.01", required: true }) +
            fieldText("tax", "Tax", e.tax, { type: "number", step: "0.01" }) +
          '</div>' +
          '<div class="callout callout-info mt-2">New expenses start as Draft. Submit for review, then an authorized approver marks them Approved or Rejected. Only Approved expenses count toward Actual Project Cost. Paid status is tracked separately from approval status.</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save Expense</button></div>' +
      '</form>';
  }

  function renderRejectExpenseForm(expenseId) {
    return '' +
      '<div class="modal-header"><h2>Reject Expense</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="reject-expense-form" data-expense-id="' + expenseId + '">' +
        '<div class="modal-body">' +
          fieldTextarea("rejectionNote", "Rejection Reason", "", { required: true }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Reject Expense</button></div>' +
      '</form>';
  }

  function renderMarkExpensePaidForm(expenseId) {
    return '' +
      '<div class="modal-header"><h2>Mark Expense Paid</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="mark-expense-paid-form" data-expense-id="' + expenseId + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("paidDate", "Paid Date", new Date().toISOString().substring(0, 10), { type: "date", required: true }) +
            fieldSelect("paymentMethod", "Payment Method", "Company Card", ["Company Card", "Check", "ACH", "Cash", "Other"], { required: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Mark Paid</button></div>' +
      '</form>';
  }

  // ---------- Subcontractors tab ----------

  function renderSubcontractorsTab(project, subs) {
    var rows = subs.map(function (s) {
      return '<tr><td>' + esc(s.subcontractorName) + '</td><td>' + esc(s.scopeDescription) + '</td><td>' + fmtMoney(s.commitmentAmount) + '</td>' +
        '<td>' + fmtMoney(s.invoiceAmount) + '</td><td>' + badge(s.approvalStatus) + '</td>' +
        '<td>' + (s.paid ? '<span class="badge badge-green">Paid</span>' : '<span class="badge badge-gray">Unpaid</span>') + '</td>' +
        '<td>' + renderSubActions(s) + '</td></tr>';
    }).join('');
    return card('' +
      '<div class="card-header"><h3>Subcontractor Costs</h3><button type="button" class="btn btn-secondary btn-sm" id="add-sub-btn" data-proj-id="' + project.id + '">+ Add Subcontractor Cost</button></div>' +
      '<p class="muted-text">Subcontractor commitments and actual invoiced costs are tracked separately from ordinary project expenses.</p>' +
      (subs.length ? tableWrap('<thead><tr><th>Subcontractor</th><th>Scope</th><th>Commitment</th><th>Invoiced</th><th>Approval</th><th>Paid</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128119;", "No subcontractor costs recorded", "Add a subcontractor commitment and invoice.")),
    '');
  }

  function renderSubActions(s) {
    var actions = [];
    if (s.approvalStatus === "Draft" || s.approvalStatus === "Submitted") actions.push('<button type="button" class="link-btn" data-approve-sub="' + s.id + '">Approve</button>');
    if (s.approvalStatus === "Submitted" || s.approvalStatus === "Draft") actions.push('<button type="button" class="link-btn" data-reject-sub="' + s.id + '">Reject</button>');
    if (s.approvalStatus === "Approved" && !s.paid) actions.push('<button type="button" class="link-btn" data-pay-sub="' + s.id + '">Mark Paid</button>');
    return actions.join(' &middot; ') || '&mdash;';
  }

  function renderSubForm(project, sub) {
    var s = sub || { id: null, subcontractorName: "", scopeDescription: "", costCategoryId: "CAT-003", commitmentAmount: 0, invoiceNumber: "", invoiceAmount: 0, invoiceDate: new Date().toISOString().substring(0, 10) };
    return '' +
      '<div class="modal-header"><h2>Add Subcontractor Cost</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="sub-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("subcontractorName", "Subcontractor Name", s.subcontractorName, { required: true, fullWidth: true }) +
            fieldText("scopeDescription", "Scope Description", s.scopeDescription, { fullWidth: true }) +
            fieldSelect("costCategoryId", "Cost Category", s.costCategoryId, D.getCostCategories().map(function (c) { return { value: c.id, label: c.name }; }), { required: true }) +
            fieldText("commitmentAmount", "Commitment Amount", s.commitmentAmount, { type: "number", step: "0.01" }) +
            fieldText("invoiceDate", "Invoice Date", s.invoiceDate, { type: "date" }) +
            fieldText("invoiceNumber", "Invoice Number", s.invoiceNumber) +
            fieldText("invoiceAmount", "Invoice Amount", s.invoiceAmount, { type: "number", step: "0.01", required: true }) +
            fieldText("retainage", "Retainage (Optional)", s.retainage || 0, { type: "number", step: "0.01" }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>' +
      '</form>';
  }

  function renderRejectSubForm(subId) {
    return '' +
      '<div class="modal-header"><h2>Reject Subcontractor Cost</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="reject-sub-form" data-sub-id="' + subId + '">' +
        '<div class="modal-body">' + fieldTextarea("rejectionNote", "Rejection Reason", "", { required: true }) + '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Reject</button></div>' +
      '</form>';
  }

  // ---------- ABC Construction Labor tab ----------

  function renderLaborTab(project, labor) {
    var rows = labor.map(function (l) {
      return '<tr><td>' + fmtDate(l.workDate) + '</td><td>' + esc(l.employeeName) + '</td><td>' + esc(l.role) + '</td>' +
        '<td>' + esc(l.laborType) + '</td><td>' + l.hours + '</td><td>' + fmtMoney(l.hourlyInternalRate) + '</td>' +
        '<td>' + fmtMoney(l.totalLaborCost) + '</td><td>' + badge(l.approvalStatus) + '</td>' +
        '<td>' + (l.payrollProcessed ? '<span class="badge badge-green">Processed</span>' : '<span class="badge badge-gray">Pending</span>') + '</td>' +
        '<td>' + renderLaborActions(l) + '</td></tr>';
    }).join('');
    return card('' +
      '<div class="card-header"><h3>ABC Construction Internal Labor</h3><button type="button" class="btn btn-secondary btn-sm" id="add-labor-btn" data-proj-id="' + project.id + '">+ Add Labor Entry</button></div>' +
      '<p class="muted-text">Internal labor-cost rates are used here, not employee take-home pay. Approved entries roll into Actual Project Cost under the Labor category.</p>' +
      (labor.length ? tableWrap('<thead><tr><th>Date</th><th>Employee</th><th>Role</th><th>Type</th><th>Hours</th><th>Rate</th><th>Total</th><th>Approval</th><th>Payroll</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128119;", "No labor entries recorded", "Add the first ABC Construction labor entry for this project.")),
    '');
  }

  function renderLaborActions(l) {
    var actions = [];
    if (l.approvalStatus === "Draft" || l.approvalStatus === "Submitted") {
      actions.push('<button type="button" class="link-btn" data-approve-labor="' + l.id + '">Approve</button>');
      actions.push('<button type="button" class="link-btn" data-reject-labor="' + l.id + '">Reject</button>');
    }
    if (l.approvalStatus === "Approved" && !l.payrollProcessed) {
      actions.push('<button type="button" class="link-btn" data-process-payroll="' + l.id + '">Mark Payroll Processed</button>');
    }
    return actions.join(' &middot; ') || '&mdash;';
  }

  function renderLaborForm(project, labor) {
    var l = labor || { id: null, workDate: new Date().toISOString().substring(0, 10), employeeName: "", role: "", laborType: "Crew Hours", hours: 0, hourlyInternalRate: 0, manualAmountOverride: null, manualAmountOverrideReason: "" };
    return '' +
      '<div class="modal-header"><h2>Add ABC Construction Labor Entry</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="labor-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("workDate", "Work Date", l.workDate, { type: "date", required: true }) +
            fieldText("employeeName", "Employee / Driver Name", l.employeeName, { required: true }) +
            fieldText("role", "Role", l.role) +
            fieldSelect("laborType", "Labor Type", l.laborType, ["Crew Hours", "Excavation", "Base Prep", "Wall Installation", "Cleanup", "Driving / Delivery", "Other"], { required: true }) +
            fieldText("hours", "Hours", l.hours, { type: "number", step: "0.25", required: true }) +
            fieldText("hourlyInternalRate", "Hourly Internal Cost Rate", l.hourlyInternalRate, { type: "number", step: "0.01", required: true }) +
            fieldText("manualAmountOverride", "Manual Amount Override (Optional)", l.manualAmountOverride, { type: "number", step: "0.01" }) +
            fieldTextarea("manualAmountOverrideReason", "Override Reason (Required If Override Used)", l.manualAmountOverrideReason) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save Entry</button></div>' +
      '</form>';
  }

  function renderRejectLaborForm(laborId) {
    return '' +
      '<div class="modal-header"><h2>Reject Labor Entry</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="reject-labor-form" data-labor-id="' + laborId + '">' +
        '<div class="modal-body">' + fieldTextarea("rejectionNote", "Rejection Reason", "", { required: true }) + '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Reject</button></div>' +
      '</form>';
  }

  // ---------- Change Orders tab ----------

  function renderChangeOrdersTab(project, cos) {
    var rows = cos.map(function (c) {
      return '<tr><td>' + esc(c.changeOrderNumber) + '</td><td>' + esc(c.description) + '</td><td>' + fmtMoney(c.amount) + '</td>' +
        '<td>' + badge(c.status) + '</td><td>' + fmtDate(c.approvedDate) + '</td>' +
        '<td>' + renderChangeOrderActions(c) + '</td></tr>';
    }).join('');
    return card('' +
      '<div class="card-header"><h3>Change Orders</h3><button type="button" class="btn btn-secondary btn-sm" id="add-co-btn" data-proj-id="' + project.id + '">+ Add Change Order</button></div>' +
      '<p class="muted-text">Approved change orders are stored separately and added to Total Project Value. They never alter the Original Project Budget.</p>' +
      (cos.length ? tableWrap('<thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Status</th><th>Approved</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128196;", "No change orders yet", "Add a change order to adjust the contract value.")),
    '');
  }

  function renderChangeOrderActions(c) {
    var actions = [];
    if (c.status === "Draft") actions.push('<button type="button" class="link-btn" data-submit-co="' + c.id + '">Submit</button>');
    if (c.status === "Submitted") {
      actions.push('<button type="button" class="link-btn" data-approve-co="' + c.id + '">Approve</button>');
      actions.push('<button type="button" class="link-btn" data-reject-co="' + c.id + '">Reject</button>');
    }
    return actions.join(' &middot; ') || '&mdash;';
  }

  function renderChangeOrderForm(project) {
    return '' +
      '<div class="modal-header"><h2>Add Change Order</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="co-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          fieldText("description", "Description", "", { required: true, fullWidth: true }) +
          fieldText("amount", "Amount", 0, { type: "number", step: "0.01", required: true }) +
          fieldTextarea("notes", "Notes (Optional)", "") +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save Change Order</button></div>' +
      '</form>';
  }

  function renderRejectCoForm(coId) {
    return '' +
      '<div class="modal-header"><h2>Reject Change Order</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="reject-co-form" data-co-id="' + coId + '">' +
        '<div class="modal-body">' + fieldTextarea("rejectionNote", "Rejection Reason", "", { required: true }) + '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-danger">Reject</button></div>' +
      '</form>';
  }

  // ---------- Invoices tab ----------

  function renderInvoicesTab(project, invoices) {
    var rows = invoices.map(function (i) {
      return '<tr><td>' + esc(i.invoiceNumber) + '</td><td>' + fmtDate(i.invoiceDate) + '</td><td>' + fmtDate(i.dueDate) + '</td>' +
        '<td>' + fmtMoney(i.invoiceAmount) + '</td><td>' + badge(i.status) + '</td>' +
        '<td>' + renderInvoiceActions(i) + '</td></tr>';
    }).join('');
    return card('' +
      '<div class="card-header"><h3>Invoices</h3><button type="button" class="btn btn-secondary btn-sm" id="add-invoice-btn" data-proj-id="' + project.id + '">+ Create Invoice</button></div>' +
      '<div class="callout callout-info mb-3">An invoice is a request for money. It is not the same as a payment. Recording an invoice does not affect Amount Paid.</div>' +
      (invoices.length ? tableWrap('<thead><tr><th>Invoice #</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody>')
        : emptyState("&#128179;", "No invoices yet", "Create an invoice to request payment from the customer.")),
    '');
  }

  function renderInvoiceActions(i) {
    var actions = [];
    if (i.status === "Draft") actions.push('<button type="button" class="link-btn" data-send-invoice="' + i.id + '">Mark Sent</button>');
    if (i.status === "Sent" || i.status === "Overdue" || i.status === "Partially Paid") actions.push('<button type="button" class="link-btn" data-void-invoice="' + i.id + '">Void</button>');
    return actions.join(' &middot; ') || '&mdash;';
  }

  function renderInvoiceForm(project) {
    return '' +
      '<div class="modal-header"><h2>Create Invoice</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="invoice-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("invoiceDate", "Invoice Date", new Date().toISOString().substring(0, 10), { type: "date", required: true }) +
            fieldText("dueDate", "Due Date", "", { type: "date" }) +
            fieldText("invoiceAmount", "Invoice Amount", 0, { type: "number", step: "0.01", required: true }) +
            fieldTextarea("notes", "Notes (Optional)", "", { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Create Invoice</button></div>' +
      '</form>';
  }

  // ---------- Payments tab ----------

  function renderPaymentsTab(project, payments, fin) {
    var rows = payments.map(function (p) {
      return '<tr><td>' + fmtDate(p.paymentDate) + '</td><td>' + fmtMoney(p.amount) + '</td><td>' + esc(p.paymentMethod) + '</td>' +
        '<td>' + esc(p.paymentReference || "&mdash;") + '</td><td>' + esc(p.notes || "") + '</td></tr>';
    }).join('');
    return '' +
      card('<h3>Payments Summary</h3><div class="financial-summary-grid">' +
        '<div><span class="field-label">Total Project Value</span><p>' + fmtMoney(fin.totalProjectValue) + '</p></div>' +
        '<div><span class="field-label">Total Invoiced</span><p>' + fmtMoney(fin.totalInvoiced) + '</p></div>' +
        '<div><span class="field-label">Total Paid</span><p>' + fmtMoney(fin.amountPaid) + '</p></div>' +
        '<div><span class="field-label">Remaining Balance</span><p>' + fmtMoney(fin.amountOwed) + '</p></div>' +
      '</div>', '') +
      card('' +
        '<div class="card-header"><h3>Customer Payments Received</h3><button type="button" class="btn btn-secondary btn-sm" id="add-payment-btn" data-proj-id="' + project.id + '">+ Record Payment</button></div>' +
        '<div class="callout callout-info mb-3">A payment is money actually received. It is recorded separately from invoices.</div>' +
        (payments.length ? tableWrap('<thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody>')
          : emptyState("&#128176;", "No payments recorded", "Record the first customer payment received for this project.")),
      'mt-4');
  }

  function renderPaymentForm(project) {
    return '' +
      '<div class="modal-header"><h2>Record Customer Payment</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="payment-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldText("paymentDate", "Payment Date", new Date().toISOString().substring(0, 10), { type: "date", required: true }) +
            fieldText("amount", "Amount", 0, { type: "number", step: "0.01", required: true }) +
            fieldSelect("paymentMethod", "Payment Method", "Check", ["Check", "ACH", "Credit Card", "Cash", "Wire", "Other"], { required: true }) +
            fieldText("paymentReference", "Payment Reference (Optional)", "") +
            fieldTextarea("notes", "Notes (Optional)", "", { fullWidth: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Record Payment</button></div>' +
      '</form>';
  }

  // ---------- Edit Project / Close Project forms ----------

  function renderEditProjectForm(project) {
    return '' +
      '<div class="modal-header"><h2>Edit Project</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="edit-project-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            fieldSelect("status", "Project Status", project.status, D.PROJECT_STATUSES, { required: true }) +
            fieldSelect("projectManagerUserId", "Project Manager", project.projectManagerUserId, D.getUsers().map(function (u) { return { value: u.id, label: u.name }; }), { includeBlank: true }) +
            fieldText("startDate", "Start Date", project.startDate ? project.startDate.substring(0, 10) : "", { type: "date" }) +
          '</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>' +
      '</form>';
  }

  function renderCloseProjectForm(project) {
    return '' +
      '<div class="modal-header"><h2>Close Project</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="close-project-form" data-proj-id="' + project.id + '">' +
        '<div class="modal-body">' +
          fieldText("completionDate", "Completion Date", new Date().toISOString().substring(0, 10), { type: "date", required: true }) +
          fieldSelect("closeoutReason", "Closeout Reason", "", D.getControlledLists().closeoutReasons, { required: true }) +
          fieldTextarea("closeoutNotes", "Closeout Notes", "", { required: true }) +
          '<div class="callout callout-warning">Closed project records become read-only except for authorized correction/reopen actions with an audit reason.</div>' +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Close Project</button></div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: HISTORICAL SEARCH & FILTERS (module 28)
  // =========================================================================

  function renderReports(filterState) {
    setPageHeader("Historical Search & Reports", "Search across every opportunity, estimate, project, and financial record.");
    var f = filterState || {};
    var q = (f.search || "").toLowerCase();

    var oppMatches = D.getOpportunities().filter(function (o) { return !q || (o.customerName + " " + o.projectAddress + " " + o.id).toLowerCase().indexOf(q) !== -1; });
    var estMatches = D.getEstimates().filter(function (e) { return !q || (e.id + " " + e.jobAddress).toLowerCase().indexOf(q) !== -1; });
    var projMatches = D.getProjects().filter(function (p) { return !q || (p.customerName + " " + p.jobAddress + " " + p.id).toLowerCase().indexOf(q) !== -1; });

    var searchBar = '<div class="mb-4"><input class="input-control" id="reports-search" placeholder="Search everything..." value="' + esc(f.search || '') + '" style="max-width:420px" /></div>';

    var oppSection = card('<h3>Opportunities (' + oppMatches.length + ')</h3>' + (oppMatches.length ? tableWrap(
      '<thead><tr><th>ID</th><th>Customer</th><th>Status</th><th></th></tr></thead><tbody>' +
      oppMatches.slice(0, 20).map(function (o) { return '<tr><td>' + esc(o.id) + '</td><td>' + esc(o.customerName) + '</td><td>' + badge(o.status) + '</td><td><a href="#/opportunities/' + o.id + '" class="link-btn">Open</a></td></tr>'; }).join('') +
      '</tbody>') : '<p class="muted-text">No matches.</p>'), '');

    var estSection = card('<h3>Estimates (' + estMatches.length + ')</h3>' + (estMatches.length ? tableWrap(
      '<thead><tr><th>ID</th><th>Status</th><th>Selling Price</th><th></th></tr></thead><tbody>' +
      estMatches.slice(0, 20).map(function (e) { return '<tr><td>' + esc(e.id) + '</td><td>' + badge(e.status) + '</td><td>' + fmtMoney(e.sellingPrice) + '</td><td><a href="#/estimates/' + e.id + '" class="link-btn">Open</a></td></tr>'; }).join('') +
      '</tbody>') : '<p class="muted-text">No matches.</p>'), 'mt-4');

    var projSection = card('<h3>Projects (' + projMatches.length + ')</h3>' + (projMatches.length ? tableWrap(
      '<thead><tr><th>ID</th><th>Customer</th><th>Status</th><th></th></tr></thead><tbody>' +
      projMatches.slice(0, 20).map(function (p) { return '<tr><td>' + esc(p.id) + '</td><td>' + esc(p.customerName) + '</td><td>' + badge(p.status) + '</td><td><a href="#/projects/' + p.id + '" class="link-btn">Open</a></td></tr>'; }).join('') +
      '</tbody>') : '<p class="muted-text">No matches.</p>'), 'mt-4');

    return searchBar + oppSection + estSection + projSection;
  }

  // =========================================================================
  // VIEW: INTEGRATION READINESS (module: M365/SharePoint mapping)
  // =========================================================================

  function renderIntegrationReadiness() {
    setPageHeader("Integration Readiness", "Intended Microsoft 365 / SharePoint mappings for a future connected build.");

    var mappings = [
      { area: "Employee Sign-In", tool: "Microsoft Entra ID", status: "Not connected in this static prototype", note: "Prototype uses a selectable demo-user list instead of real authentication." },
      { area: "Opportunities, Estimates, Takeoffs, Projects, Costs, Expenses, Payments, Labor, Subcontractors, Price Catalog", tool: "SharePoint Lists (Austin Block Operations site)", status: "Not connected in this static prototype", note: "All of this data currently lives in browser localStorage." },
      { area: "Plans, Photos, Receipts, Invoices, Proposal PDFs, Contracts, Signed Change Orders", tool: "SharePoint Document Libraries", status: "Not connected in this static prototype", note: "File records in this prototype are placeholders only; no real files are stored or uploaded." },
      { area: "Reminders & Notifications", tool: "Microsoft To Do / Outlook", status: "Not connected in this static prototype", note: "Follow-up due dates are tracked inside the app instead." },
      { area: "Email & Calendar", tool: "Outlook / Calendly", status: "Not connected in this static prototype", note: "No email is sent from this prototype." },
      { area: "Formal Accounting", tool: "QuickBooks", status: "Not connected in this static prototype", note: "JSON/CSV export is available from Settings for manual use." },
      { area: "Code & Deployment", tool: "GitHub + Netlify", status: "Not connected in this static prototype", note: "This prototype is a static site with no build step, deployable to Netlify directly." }
    ];

    var rows = mappings.map(function (m) {
      return '<tr><td>' + esc(m.area) + '</td><td>' + esc(m.tool) + '</td><td><span class="badge badge-gray">' + esc(m.status) + '</span></td><td class="muted-text">' + esc(m.note) + '</td></tr>';
    }).join('');

    return card('' +
      '<p>This screen documents the intended integration architecture per the workbook\'s System Architecture &amp; M365 Integration tab. No live Entra ID, SharePoint, Outlook, Microsoft To Do, QuickBooks, or Calendly connectivity exists in this prototype. All data lives in this browser\'s localStorage.</p>' +
      tableWrap('<thead><tr><th>Operational Area</th><th>Intended Microsoft 365 / SharePoint Tool</th><th>Status</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody>'),
    '') +
    openDecisionCallout("OD-009", "Final SharePoint site name, List names, library names, folder convention, retention, and access groups are not yet decided.");
  }

  // =========================================================================
  // VIEW: OPEN DECISIONS REGISTER
  // =========================================================================

  function renderOpenDecisions() {
    setPageHeader("Open Decisions", "Unresolved workbook items flagged instead of guessed, pending an Austin Block Company decision.");
    var decisions = D.getOpenDecisions();

    var cards = decisions.map(function (d) {
      return card('' +
        '<div class="flex-between"><h3>' + esc(d.code) + ': ' + esc(d.title) + '</h3>' + (d.custom ? '<span class="badge badge-blue">Custom</span>' : '') + '</div>' +
        '<p><strong>Related Workbook Tab / Requirement:</strong> ' + esc(d.relatedTab) + (d.relatedRequirement ? " &mdash; " + esc(d.relatedRequirement) : "") + '</p>' +
        '<p><strong>Why It Is Unresolved:</strong> ' + esc(d.whyUnresolved) + '</p>' +
        '<p><strong>Decision Austin Block Company Needs to Make:</strong> ' + esc(d.decisionNeeded) + '</p>' +
        '<p><strong>Feature Behavior While Unresolved:</strong> ' + esc(d.behaviorWhileUnresolved) + '</p>',
      'mt-4');
    }).join('');

    return '' +
      '<div class="flex-between mb-4"><p class="muted-text">' + decisions.length + ' open decisions on record.</p><button type="button" class="btn btn-secondary" id="add-open-decision-btn">+ Add Company-Specific Decision</button></div>' +
      cards;
  }

  function renderAddOpenDecisionForm() {
    return '' +
      '<div class="modal-header"><h2>Add Open Decision</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close">&times;</button></div>' +
      '<form id="add-open-decision-form">' +
        '<div class="modal-body">' +
          fieldText("title", "Decision Title", "", { required: true, fullWidth: true }) +
          fieldText("relatedTab", "Related Workbook Tab", "", { required: true }) +
          fieldText("relatedRequirement", "Related Requirement", "") +
          fieldTextarea("whyUnresolved", "Why It Is Unresolved", "", { required: true, fullWidth: true }) +
          fieldTextarea("decisionNeeded", "What Decision Is Needed", "", { required: true, fullWidth: true }) +
          fieldTextarea("behaviorWhileUnresolved", "Feature Behavior While Unresolved", "", { required: true, fullWidth: true }) +
        '</div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Add Decision</button></div>' +
      '</form>';
  }

  // =========================================================================
  // VIEW: SETTINGS
  // =========================================================================

  function renderSettings() {
    setPageHeader("Settings", "Appearance preferences, demo data controls, and prototype data management.");
    var userId = D.getActiveUserId();
    var prefs = D.getPreferences(userId);
    var users = D.getUsers();

    var appearanceCard = card('' +
      '<h3>Appearance</h3>' +
      '<p class="muted-text">Saved to your individual browser profile only. It does not affect any other user.</p>' +
      '<div class="appearance-toggle" role="group" aria-label="Appearance mode" id="settings-appearance-toggle">' +
        '<button type="button" class="appearance-btn" data-mode="light" aria-pressed="' + (prefs.appearanceMode === "light") + '">Light</button>' +
        '<button type="button" class="appearance-btn" data-mode="dark" aria-pressed="' + (prefs.appearanceMode === "dark") + '">Dark</button>' +
        '<button type="button" class="appearance-btn" data-mode="device" aria-pressed="' + (prefs.appearanceMode === "device" || !prefs.appearanceMode) + '">Match Device</button>' +
      '</div>',
    '');

    var userCard = card('' +
      '<h3>Active Demo User</h3>' +
      '<p class="muted-text">Switch which demo employee you are acting as. This affects who is recorded as performing each action.</p>' +
      '<select class="select-control" id="settings-user-select" style="max-width:320px">' +
        users.map(function (u) { return '<option value="' + u.id + '" ' + (u.id === userId ? 'selected' : '') + '>' + esc(u.name) + ' (' + esc(u.role) + ')</option>'; }).join('') +
      '</select>',
    'mt-4');

    var listsCard = card('' +
      '<h3>Controlled Lists (Demo Starter Values)</h3>' +
      '<div class="callout callout-open-decision mb-3">These are demo starter lists, not final Austin Block Company policy (Open Decision OD-013). Edit and save below.</div>' +
      '<form id="controlled-lists-form">' +
        fieldTextarea("leadSources", "Lead Sources (one per line)", D.getControlledLists().leadSources.join("\n"), { fullWidth: true }) +
        fieldTextarea("projectTypes", "Project Types (one per line)", D.getControlledLists().projectTypes.join("\n"), { fullWidth: true }) +
        fieldTextarea("lossReasons", "Loss Reasons (one per line)", D.getControlledLists().lossReasons.join("\n"), { fullWidth: true }) +
        fieldTextarea("closeoutReasons", "Project Closeout Reasons (one per line)", D.getControlledLists().closeoutReasons.join("\n"), { fullWidth: true }) +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Lists</button></div>' +
      '</form>',
    'mt-4');

    var dataCard = card('' +
      '<h3>Prototype Data Management</h3>' +
      '<div class="flex-row">' +
        '<button type="button" class="btn btn-secondary" id="export-data-btn">Export Data (JSON)</button>' +
        '<label class="btn btn-secondary" for="import-data-input" style="cursor:pointer">Import Data (JSON)</label>' +
        '<input type="file" id="import-data-input" accept="application/json" style="display:none" />' +
        '<button type="button" class="btn btn-danger" id="reset-demo-data-btn">Reset Demo Data</button>' +
      '</div>' +
      '<p class="field-hint mt-2">Reset Demo Data permanently erases all current data in this browser and rebuilds the labeled demo workflow.</p>',
    'mt-4');

    return appearanceCard + userCard + listsCard + dataCard;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  global.AbcUI = {
    // formatting
    fmtMoney: fmtMoney, fmtPct: fmtPct, fmtDate: fmtDate, fmtDateTime: fmtDateTime, esc: esc, daysBetween: daysBetween,

    // structural helpers
    badge: badge, tierBadge: tierBadge, tierVisualColor: tierVisualColor, card: card, tableWrap: tableWrap,
    emptyState: emptyState, openDecisionCallout: openDecisionCallout,

    // toast / modal / confirm
    showToast: showToast, openModal: openModal, closeModal: closeModal, openConfirm: openConfirm, closeConfirm: closeConfirm,

    // appearance / nav
    applyAppearance: applyAppearance, initAppearanceForActiveUser: initAppearanceForActiveUser, setAppearanceForActiveUser: setAppearanceForActiveUser,
    setActiveNavLink: setActiveNavLink, closeMobileSidebar: closeMobileSidebar, openMobileSidebar: openMobileSidebar, setPageHeader: setPageHeader,

    // form helpers
    fieldText: fieldText, fieldTextarea: fieldTextarea, fieldSelect: fieldSelect, fieldCheckbox: fieldCheckbox, readForm: readForm,

    // views
    renderDashboard: renderDashboard,
    renderOpportunitiesList: renderOpportunitiesList,
    renderNewOpportunityForm: renderNewOpportunityForm,
    renderOpportunityEditForm: renderOpportunityEditForm,
    renderMarkLostForm: renderMarkLostForm,
    renderMarkHoldForm: renderMarkHoldForm,
    renderNewEstimateForm: renderNewEstimateForm,
    renderOpportunityDetail: renderOpportunityDetail,
    renderFilesSection: renderFilesSection,
    renderAddFileForm: renderAddFileForm,
    renderActivityList: renderActivityList,
    userName: userName,

    renderEstimatesList: renderEstimatesList,
    renderEstimateWorkspace: renderEstimateWorkspace,
    renderEditEstimateHeaderForm: renderEditEstimateHeaderForm,
    renderLineItemForm: renderLineItemForm,
    renderSegmentForm: renderSegmentForm,
    renderCostRowForm: renderCostRowForm,
    renderCompleteFollowUpForm: renderCompleteFollowUpForm,
    renderRevisionReasonForm: renderRevisionReasonForm,
    renderDeclineForm: renderDeclineForm,
    renderMarkWonForm: renderMarkWonForm,
    buildProposalHtml: buildProposalHtml,

    renderPriceCatalog: renderPriceCatalog,
    renderCostCategories: renderCostCategories,
    renderProfitGoals: renderProfitGoals,

    renderProjectsList: renderProjectsList,
    renderNewProjectForm: renderNewProjectForm,
    renderProjectDetail: renderProjectDetail,
    renderExpenseForm: renderExpenseForm,
    renderRejectExpenseForm: renderRejectExpenseForm,
    renderMarkExpensePaidForm: renderMarkExpensePaidForm,
    renderSubForm: renderSubForm,
    renderRejectSubForm: renderRejectSubForm,
    renderLaborForm: renderLaborForm,
    renderRejectLaborForm: renderRejectLaborForm,
    renderChangeOrderForm: renderChangeOrderForm,
    renderRejectCoForm: renderRejectCoForm,
    renderInvoiceForm: renderInvoiceForm,
    renderPaymentForm: renderPaymentForm,
    renderEditProjectForm: renderEditProjectForm,
    renderCloseProjectForm: renderCloseProjectForm,

    renderReports: renderReports,
    renderIntegrationReadiness: renderIntegrationReadiness,
    renderOpenDecisions: renderOpenDecisions,
    renderAddOpenDecisionForm: renderAddOpenDecisionForm,
    renderSettings: renderSettings
  };

})(window);
