/* ============================================================
   BUSINESS INSIGHTS & DRILL-THROUGH LAYER  (additive)
   ------------------------------------------------------------
   Load this AFTER data.js and app.js (new <script> tag, or paste
   at the bottom of app.js). It only defines new functions/uses
   existing globals (CUSTOMERS, PRODUCTS, DSR_LEADERBOARD, etc.)
   and existing UI helpers (openModal, fmtINR, summaryRow, ...).

   What you get:
   1. Pure data functions that derive insights from data you
      already have (credit risk, DSR efficiency, dead stock,
      account-type risk, lead funnel, regional gaps).
   2. computeBusinessInsights() — turns those into ranked,
      human-readable insight cards.
   3. renderInsightsSection() — HTML block to drop into any
      Reports screen.
   4. Drill-through modals: showCreditRiskDrilldown(),
      showDeadStockDrilldown(), showAccountTypeDrilldown(type),
      showDsrDrilldown(name), showStateDrilldown(stateName),
      showProductDrilldown(productId).

   Integration (small, one-line edits to existing markup — see
   bottom of this file for the exact spots):
   - Insert ${renderInsightsSection()} inside each report render fn
   - Add onclick="showDsrDrilldown('${d.name}')" to leaderboard rows
   - Add onclick="showAccountTypeDrilldown('${a.type}')" to segment rows
   - Add onclick="showStateDrilldown('${st.name}')" to state rows
   - Add onclick to Top Products rows via getProductByName()
   ============================================================ */

/* ---------- 1. Derived analytics (pure functions) ---------- */

function pctOf(a, b) { return b ? (a / b * 100) : 0; }

function getProductByName(name) {
  return PRODUCTS.find(p => p.name === name);
}

/* Accounts whose outstanding balance eats too much of their credit line. */
function creditRiskCustomers(threshold = 75) {
  return CUSTOMERS
    .map(c => ({ ...c, utilization: pctOf(c.outstanding, c.creditLimit) }))
    .filter(c => c.utilization >= threshold)
    .sort((a, b) => b.utilization - a.utilization);
}

/* Sales generated per visit / per order / collection rate — surfaces
   coaching opportunities that raw "visits done" numbers hide. */
function dsrEfficiencyMatrix() {
  return DSR_LEADERBOARD.map(d => ({
    ...d,
    achievement: pctOf(d.sales, d.target),
    salesPerVisit: d.visits ? Math.round(d.sales / d.visits) : 0,
    salesPerOrder: d.orders ? Math.round(d.sales / d.orders) : 0,
    collectionRate: pctOf(d.collection, d.sales)
  })).sort((a, b) => b.salesPerVisit - a.salesPerVisit);
}

/* Slow-moving products still sitting in meaningful stock = tied-up capital. */
function deadStockRisk() {
  return PRODUCTS.filter(p => p.fms === "S" && p.stock > 100)
    .map(p => ({ ...p, tiedUpValue: p.stock * p.dealerPrice }))
    .sort((a, b) => b.tiedUpValue - a.tiedUpValue);
}

/* Which account-type segment is most exposed if collections slow down. */
function accountTypeRiskProfile() {
  return ACCOUNT_TYPE_SALES
    .map(a => ({ ...a, outstandingRatio: pctOf(a.outstanding, a.sales) }))
    .sort((a, b) => b.outstandingRatio - a.outstandingRatio);
}

/* Where leads are piling up / dropping off in the pipeline. */
function leadFunnel() {
  const stages = ["New", "Contacted", "Interested", "Quotation Sent", "Negotiation"];
  return stages.map(s => ({
    stage: s,
    count: LEADS.filter(l => l.status === s).length,
    potential: LEADS.filter(l => l.status === s).reduce((sum, l) => sum + l.potential, 0)
  }));
}

/* States furthest from target, ranked by absolute gap. */
function regionalGapAnalysis() {
  return REGIONAL_SUMMARY.states
    .map(s => ({ ...s, gap: s.target - s.sales }))
    .sort((a, b) => b.gap - a.gap);
}

/* ---------- 2. Rule-based insight generator ---------- */

function computeBusinessInsights() {
  const insights = [];

  const risky = creditRiskCustomers(75);
  if (risky.length) {
    insights.push({
      icon: "bi-exclamation-triangle-fill", tone: "red",
      title: `${risky.length} accounts over 75% credit utilization`,
      text: `${risky[0].name} is at ${risky[0].utilization.toFixed(0)}% — highest exposure. Prioritize collection before extending fresh credit.`,
      action: () => showCreditRiskDrilldown()
    });
  }

  const eff = dsrEfficiencyMatrix();
  if (eff.length > 1) {
    const best = eff[0], worst = eff[eff.length - 1];
    insights.push({
      icon: "bi-graph-up-arrow", tone: "green",
      title: `${best.name} converts visits best`,
      text: `${fmtINR(best.salesPerVisit)} sales/visit vs ${fmtINR(worst.salesPerVisit)} for ${worst.name} — a coaching gap, not just an activity gap.`,
      action: () => showDsrDrilldown(best.name)
    });
  }

  const dead = deadStockRisk();
  if (dead.length) {
    const tied = dead.reduce((s, p) => s + p.tiedUpValue, 0);
    insights.push({
      icon: "bi-box-seam-fill", tone: "amber",
      title: `${fmtINR(tied)} tied up in slow-moving stock`,
      text: `${dead[0].name} alone holds ${dead[0].stock} units (${fmtINR(dead[0].tiedUpValue)}). Bundle it into a Smart Bucket to move it.`,
      action: () => showDeadStockDrilldown()
    });
  }

  const riskProfile = accountTypeRiskProfile();
  if (riskProfile.length) {
    const worst = riskProfile[0];
    insights.push({
      icon: "bi-pie-chart-fill", tone: "steel",
      title: `${worst.type} carries the highest outstanding ratio`,
      text: `Outstanding is ${worst.outstandingRatio.toFixed(0)}% of ${worst.type} sales — a concentration risk if this segment slows down.`,
      action: () => showAccountTypeDrilldown(worst.type)
    });
  }

  const funnel = leadFunnel();
  const quoted = funnel.find(f => f.stage === "Quotation Sent");
  const negotiating = funnel.find(f => f.stage === "Negotiation");
  if (quoted && negotiating && quoted.count > negotiating.count) {
    insights.push({
      icon: "bi-person-lines-fill", tone: "navy",
      title: "Leads stall after quotation",
      text: `${quoted.count} leads sit at 'Quotation Sent' worth ${fmtINR(quoted.potential)}, vs only ${negotiating.count} reaching negotiation. Worth a pricing follow-up push.`,
      action: () => go('leads')
    });
  }

  if (typeof isRole === "function" && (isRole(USER_ROLES.REGIONAL_MANAGER) || isRole(USER_ROLES.ADMIN))) {
    const gaps = regionalGapAnalysis();
    if (gaps.length) {
      insights.push({
        icon: "bi-geo-alt-fill", tone: "red",
        title: `${gaps[0].name} has the widest target gap`,
        text: `${fmtINR(gaps[0].gap)} short of target at ${gaps[0].achievement.toFixed(1)}% achievement — prioritize this state next review.`,
        action: () => showStateDrilldown(gaps[0].name)
      });
    }
  }

  return insights;
}

/* ---------- 3. Insights panel (drop into any Reports screen) ---------- */

function renderInsightsSection() {
  const insights = computeBusinessInsights();
  if (!insights.length) return "";
  window.__insightActions = insights.map(i => i.action);
  return `
  <div class="card-x p-3 mb-3">
    <div class="d-flex align-items-center gap-2 mb-2">
      <i class="bi bi-lightbulb-fill" style="color:var(--orange-500);"></i>
      <div class="section-title mb-0">Business Insights</div>
    </div>
    ${insights.map((ins, i) => `
      <div class="list-card mb-2" style="cursor:pointer;" onclick="window.__insightActions[${i}]()">
        <div class="d-flex gap-3">
          <div class="tone-${ins.tone}-bg" style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="bi ${ins.icon}"></i>
          </div>
          <div class="flex-grow-1">
            <div class="fw-bold" style="font-size:0.84rem;">${ins.title}</div>
            <div class="text-muted-x" style="font-size:0.78rem;">${ins.text}</div>
          </div>
          <i class="bi bi-chevron-right text-faint align-self-center"></i>
        </div>
      </div>`).join("")}
  </div>`;
}

/* ---------- 4. Drill-through modals ---------- */

function showCreditRiskDrilldown() {
  const risky = creditRiskCustomers(75);
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle-fill" style="color:var(--red-500);"></i> Credit Risk &gt; 75% Utilization</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    ${risky.map(c => `
      <div class="list-card mb-2" style="cursor:pointer;" onclick="closeOverlay(); go('customerDetail',{id:'${c.id}',tab:'Payments'})">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold" style="font-size:0.86rem;">${c.name}</div>
            <span class="badge-x badge-type-${c.type}">${c.type}</span>
          </div>
          <span class="badge-x tone-red-bg">${c.utilization.toFixed(0)}% used</span>
        </div>
        <div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(c.utilization, 100)}%;background:var(--red-500);"></div></div>
        <div class="d-flex justify-content-between text-faint mt-1" style="font-size:0.7rem;">
          <span>Outstanding ${fmtINR(c.outstanding)}</span><span>Limit ${fmtINR(c.creditLimit)}</span>
        </div>
      </div>`).join("") || `<div class="empty-state"><i class="bi bi-emoji-smile"></i>No accounts over threshold</div>`}
  `);
}

function showDeadStockDrilldown() {
  const dead = deadStockRisk();
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-box-seam-fill" style="color:#9C6B12;"></i> Slow-Moving Stock</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    ${dead.map(p => `
      <div class="list-card mb-2" style="cursor:pointer;" onclick="closeOverlay(); showProductDrilldown('${p.id}')">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold" style="font-size:0.85rem;">${p.img} ${p.name}</div>
            <div class="text-faint mono" style="font-size:0.68rem;">${p.partNo} · ${p.stock} units in stock</div>
          </div>
          <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(p.tiedUpValue)}</span>
        </div>
      </div>`).join("")}
    <button class="btn btn-crm-primary w-100 mt-2" onclick="closeOverlay(); go('smartBucket')">Bundle into Smart Bucket</button>
  `);
}

function showAccountTypeDrilldown(type) {
  const custs = CUSTOMERS.filter(c => c.type === type);
  const totalSales = custs.reduce((s, c) => s + c.salesThisMonth, 0);
  const totalOutstanding = custs.reduce((s, c) => s + c.outstanding, 0);
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-pie-chart-fill"></i> ${type} Segment</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Segment Sales</div><div class="kpi-value" style="font-size:1rem;">${fmtINR(totalSales)}</div></div></div>
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Outstanding</div><div class="kpi-value" style="font-size:1rem;">${fmtINR(totalOutstanding)}</div></div></div>
    </div>
    ${custs.sort((a, b) => b.salesThisMonth - a.salesThisMonth).map(c => `
      <div class="list-card mb-2" style="cursor:pointer;" onclick="closeOverlay(); go('customerDetail',{id:'${c.id}',tab:'Overview'})">
        <div class="d-flex justify-content-between">
          <div class="fw-semibold" style="font-size:0.84rem;">${c.name}</div>
          <div class="fw-bold" style="font-size:0.82rem;">${fmtINR(c.salesThisMonth)}</div>
        </div>
        <div class="text-faint" style="font-size:0.7rem;">${c.area} · Outstanding ${fmtINR(c.outstanding)}</div>
      </div>`).join("")}
  `);
}

function showDsrDrilldown(name) {
  const eff = dsrEfficiencyMatrix();
  const d = eff.find(x => x.name === name);
  if (!d) return;
  const avgSalesPerVisit = Math.round(eff.reduce((s, x) => s + x.salesPerVisit, 0) / eff.length);
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-person-badge-fill"></i> ${d.name} — Scorecard</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6">${reportKpi("Achievement", fmtPct(d.achievement), "of monthly target", "bi-bullseye")}</div>
      <div class="col-6">${reportKpi("Sales / Visit", fmtINR(d.salesPerVisit), d.salesPerVisit >= avgSalesPerVisit ? "Above team average" : "Below team average", "bi-signpost-split-fill")}</div>
      <div class="col-6">${reportKpi("Sales / Order", fmtINR(d.salesPerOrder), "avg order value", "bi-bag-check-fill")}</div>
      <div class="col-6">${reportKpi("Collection Rate", fmtPct(d.collectionRate), "of sales collected", "bi-cash-coin")}</div>
    </div>
    <div class="card-x p-3">
      <div class="section-title mb-2">Team Comparison — Sales per Visit</div>
      <div style="height:180px;"><canvas id="ddDsrChart"></canvas></div>
    </div>
  `);
  setTimeout(() => {
    drawBarChart(
      "ddDsrChart",
      eff.map(x => x.name.split(" ")[0]),
      eff.map(x => x.salesPerVisit),
      eff.map(x => x.name === name ? "#F2762E" : "#1E5F8C")
    );
  }, 0);
}

function showStateDrilldown(stateName) {
  const s = REGIONAL_SUMMARY.states.find(x => x.name === stateName);
  if (!s) return;
  openModal(`
    <h6 class="fw-bold">${s.name}</h6>
    <div class="gauge-wrap mx-auto my-3" style="width:110px;">
      ${gaugeSVG(Math.round(s.achievement), 110, s.achievement >= 90 ? "var(--green-600)" : s.achievement >= 80 ? "var(--orange-500)" : "var(--red-500)")}
    </div>
    ${summaryRow("Sales", fmtINR(s.sales))}
    ${summaryRow("Target", fmtINR(s.target))}
    ${summaryRow("Gap", fmtINR(s.target - s.sales), "var(--red-500)", true)}
    <button class="btn btn-crm-primary w-100 mt-3" onclick="closeOverlay()">Close</button>
  `);
}

function showProductDrilldown(productId) {
  const p = getProduct(productId);
  if (!p) return;
  const margin = p.mrp - p.dealerPrice;
  const buckets = SMART_BUCKETS.filter(b => b.items.includes(productId));
  openModal(`
    <div class="text-center mb-2" style="font-size:2rem;">${p.img}</div>
    <h6 class="fw-bold text-center mb-0">${p.name}</h6>
    <div class="text-faint text-center mono mb-3" style="font-size:0.72rem;">${p.partNo} · ${p.brand}</div>
    ${summaryRow("MRP", fmtINR(p.mrp))}
    ${summaryRow("Dealer Price", fmtINR(p.dealerPrice))}
    ${summaryRow("Margin", fmtINR(margin), "var(--green-600)")}
    ${summaryRow("Stock", p.stock + " units")}
    ${summaryRow("Movement", p.fms === "F" ? "Fast Moving" : p.fms === "M" ? "Medium Moving" : "Slow Moving", null, true)}
    ${buckets.length ? `<div class="text-faint mt-2" style="font-size:0.72rem;">Included in: ${buckets.map(b => b.name).join(", ")}</div>` : ""}
    <button class="btn btn-crm-primary w-100 mt-3" onclick="closeOverlay(); go('newOrderPickCustomer')">Order This Product</button>
  `);
}

/* ---------- 5. Clickable-chart variant (optional swap-in) ---------- */
/* Same signature as your existing drawPieChart, but fires a callback
   with the clicked segment's label — use it only where you want the
   pie itself to be clickable (e.g. Account Type Sales pie). */
function drawPieChartClickable(id, labels, data, onSliceClick) {
  const el = document.getElementById(id); if (!el) return;
  destroyChart(id);
  chartInstances[id] = new Chart(el, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#0B1F3A", "#1E5F8C", "#F2762E"], borderWidth: 3, borderColor: "#fff" }] },
    options: {
      cutout: "68%",
      plugins: { legend: { display: false } },
      onClick: (evt, elements) => {
        if (elements.length && onSliceClick) onSliceClick(labels[elements[0].index]);
      }
    }
  });
}

/* ============================================================
   INTEGRATION — small one-line additions to EXISTING code
   (nothing here is a full function rewrite, just insertion points)
   ============================================================

   1) Show the insights panel on Reports screens — inside
      renderDSRReports(), renderSalesManagerReports(),
      renderRegionalManagerReports(), renderAdminReports(),
      add this anywhere in the returned template string:

         ${renderInsightsSection()}

   2) Make leaderboard rows clickable — in
      renderDSRManagerLeaderboard(), on the `.list-card` div for
      each DSR, add:

         onclick="showDsrDrilldown('${d.name}')"

   3) Make account-type segment rows clickable — in
      renderHomeMonth()'s "Account Type Sales Segregation" card
      and in renderAdminReports/renderSalesManagerReports segment
      rows, wrap each row with:

         onclick="showAccountTypeDrilldown('${a.type}')"

   4) Make regional state rows clickable — in
      renderRegionalManagerHome() / renderRegionalManagerReports(),
      on each state's row, add:

         onclick="showStateDrilldown('${st.name}')"

   5) Make Top Products rows clickable — wherever TOP_PRODUCTS is
      rendered (renderDSRReports, renderMonthlyReport), add:

         onclick="const _p=getProductByName('${p.name}'); if(_p) showProductDrilldown(_p.id);"

   6) Optional — make the Account Type pie chart itself clickable.
      In afterRenderHooks(), replace the relevant drawPieChart(...)
      call with:

         drawPieChartClickable("accountPieChart",
           ACCOUNT_TYPE_SALES.map(a => a.type),
           ACCOUNT_TYPE_SALES.map(a => a.pct),
           (label) => showAccountTypeDrilldown(label));

   None of these touch existing logic — they only add an onclick
   attribute or one extra template-string interpolation.
   ============================================================ */

/* ============================================================
   BI DRILL-THROUGH 2.0
   ------------------------------------------------------------
   These definitions intentionally sit at the bottom so they
   override the lighter drill-downs above without changing the
   underlying data model.
   ============================================================ */
function biMetric(label, value, note = "", action = "") {
  return `<div class="kpi-card ${action ? 'bi-clickable' : ''}" ${action ? `onclick="${action}" style="cursor:pointer;"` : ''}>
    <div class="kpi-label">${label}</div>
    <div class="kpi-value" style="font-size:1rem;">${value}</div>
    ${note ? `<div class="kpi-sub">${note}</div>` : ''}
  </div>`;
}

function showManagerDrilldown(name) {
  const managers = [
    { name: "Anita Kulkarni", territory: "Pune Region", sales: 4200000, target: 5000000, dsr: 9 },
    { name: "Rahul Sharma", territory: "Mumbai Region", sales: 3820000, target: 4500000, dsr: 8 },
    { name: "Neha Patil", territory: "Nagpur Region", sales: 3410000, target: 4100000, dsr: 7 },
    { name: "Vikas More", territory: "Nashik Region", sales: 2950000, target: 3600000, dsr: 6 }
  ];
  const m = managers.find(x => x.name === name);
  if (!m) return;
  const achievement = pctOf(m.sales, m.target);
  const regionStates = REGIONAL_SUMMARY.states || [];
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h6 class="fw-bold mb-0"><i class="bi bi-person-badge-fill"></i> ${m.name}</h6><div class="text-faint" style="font-size:.72rem;">${m.territory}</div></div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales", fmtINR(m.sales), `${fmtPct(achievement)} achievement`)}</div>
      <div class="col-6">${biMetric("Target Gap", fmtINR(Math.max(0,m.target-m.sales)), "Remaining")}</div>
      <div class="col-6">${biMetric("DSRs", m.dsr, "Field force", "go('managerLeaderboard')")}</div>
      <div class="col-6">${biMetric("Sales / DSR", fmtINR(m.sales / Math.max(m.dsr,1)), "Productivity")}</div>
    </div>
    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Management Actions</div>
      <div class="list-card mb-2" onclick="closeOverlay(); go('managerLeaderboard')" style="cursor:pointer;">Review DSR performance <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card mb-2" onclick="closeOverlay(); go('reports')" style="cursor:pointer;">Review business insights <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card" onclick="closeOverlay(); go('geoInsights')" style="cursor:pointer;">Explore territory opportunities <i class="bi bi-chevron-right float-end"></i></div>
    </div>
    <div class="card-x p-3">
      <div class="section-title mb-2">Regional Context</div>
      ${regionStates.slice(0,4).map(s => `<div class="d-flex justify-content-between py-2 border-bottom bi-list-clickable" onclick="closeOverlay(); showStateDrilldown('${s.name}')" style="cursor:pointer;"><span>${s.name}</span><strong>${fmtPct(s.achievement)}</strong></div>`).join('')}
    </div>
  `);
}

function showStateDrilldown(stateName) {
  const s = REGIONAL_SUMMARY.states.find(x => x.name === stateName);
  if (!s) return;
  const gap = Math.max(0, s.target - s.sales);
  const salesShare = pctOf(s.sales, REGIONAL_SUMMARY.sales);
  const targetShare = pctOf(s.target, REGIONAL_SUMMARY.target);
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h6 class="fw-bold mb-0"><i class="bi bi-map-fill"></i> ${s.name}</h6><div class="text-faint" style="font-size:.72rem;">Regional sales drill-through</div></div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales", fmtINR(s.sales), `${fmtPct(s.achievement)} achievement`)}</div>
      <div class="col-6">${biMetric("Target Gap", fmtINR(gap), "Revenue to recover")}</div>
      <div class="col-6">${biMetric("Sales Share", fmtPct(salesShare), "of region sales")}</div>
      <div class="col-6">${biMetric("Target Share", fmtPct(targetShare), "of regional target")}</div>
    </div>
    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">What should management check?</div>
      <div class="list-card mb-2" onclick="closeOverlay(); go('geoInsights')" style="cursor:pointer;">Territory and customer coverage <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card mb-2" onclick="closeOverlay(); go('managerLeaderboard')" style="cursor:pointer;">DSR productivity <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card" onclick="closeOverlay(); go('reports')" style="cursor:pointer;">Business insights and risks <i class="bi bi-chevron-right float-end"></i></div>
    </div>
    <button class="btn btn-crm-primary w-100" onclick="closeOverlay(); go('geoInsights')">Explore Geographic Intelligence</button>
  `);
}

function showProductDrilldown(productId) {
  const p = getProduct(productId);
  if (!p) return;
  const top = (typeof TOP_PRODUCTS !== 'undefined' ? TOP_PRODUCTS : []).find(x => x.name === p.name);
  const margin = Math.max(0, Number(p.mrp || 0) - Number(p.dealerPrice || 0));
  const marginPct = p.mrp ? pctOf(margin, p.mrp) : 0;
  const stockValue = Number(p.stock || 0) * Number(p.dealerPrice || 0);
  const buckets = typeof SMART_BUCKETS !== 'undefined' ? SMART_BUCKETS.filter(b => b.items.includes(productId)) : [];
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div><h6 class="fw-bold mb-0">${p.img || ''} ${p.name}</h6><div class="text-faint mono" style="font-size:.7rem;">${p.partNo} · ${p.brand}</div></div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("MRP", fmtINR(p.mrp))}</div>
      <div class="col-6">${biMetric("Dealer Price", fmtINR(p.dealerPrice))}</div>
      <div class="col-6">${biMetric("Margin", fmtINR(margin), `${marginPct.toFixed(1)}%`)}</div>
      <div class="col-6">${biMetric("Stock", `${p.stock} units`, `Value ${fmtINR(stockValue)}`)}</div>
      <div class="col-6">${biMetric("Movement", p.fms === 'F' ? 'Fast' : p.fms === 'M' ? 'Medium' : 'Slow', "FMS")}</div>
      <div class="col-6">${biMetric("Sales", top ? fmtINR(top.sales) : "—", top ? `${top.units || 0} units` : "No sales detail")}</div>
    </div>
    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Product Intelligence</div>
      <div class="list-card mb-2" onclick="closeOverlay(); go('geoInsights')" style="cursor:pointer;">Customer / territory gaps <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card mb-2" onclick="closeOverlay(); showPricingDrilldown()" style="cursor:pointer;">Pricing opportunities <i class="bi bi-chevron-right float-end"></i></div>
      <div class="list-card" onclick="closeOverlay(); go('smartBucket')" style="cursor:pointer;">Smart Bucket placement ${buckets.length ? `(${buckets.length} buckets)` : ''}<i class="bi bi-chevron-right float-end"></i></div>
    </div>
    <button class="btn btn-crm-primary w-100" onclick="closeOverlay(); go('newOrderPickCustomer')">Order This Product</button>
  `);
}

function showAccountTypeDrilldown(type) {
  const segment = ACCOUNT_TYPE_SALES.find(a => a.type === type);
  const custs = CUSTOMERS.filter(c => c.type === type).sort((a,b) => b.salesThisMonth-a.salesThisMonth);
  if (!segment) return;
  const totalSales = custs.reduce((s,c)=>s+c.salesThisMonth,0);
  const totalOutstanding = custs.reduce((s,c)=>s+c.outstanding,0);
  const avgOrder = custs.length ? custs.reduce((s,c)=>s+c.avgOrderValue,0)/custs.length : 0;
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3"><div><h6 class="fw-bold mb-0"><i class="bi bi-pie-chart-fill"></i> ${type} Segment</h6><div class="text-faint" style="font-size:.7rem;">Segment drill-through</div></div><button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button></div>
    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales", fmtINR(segment.sales || totalSales), `${segment.pct}% of mix`)}</div>
      <div class="col-6">${biMetric("Outstanding", fmtINR(segment.outstanding || totalOutstanding), "Collection exposure")}</div>
      <div class="col-6">${biMetric("Customers", custs.length, "Active segment")}</div>
      <div class="col-6">${biMetric("Avg Order", fmtINR(avgOrder), "Customer average")}</div>
    </div>
    ${custs.map(c=>`<div class="list-card mb-2 bi-list-clickable" onclick="closeOverlay(); go('customerDetail',{id:'${c.id}',tab:'Overview'})" style="cursor:pointer;"><div class="d-flex justify-content-between"><strong>${c.name}</strong><strong>${fmtINR(c.salesThisMonth)}</strong></div><div class="text-faint" style="font-size:.7rem;">${c.area} · Outstanding ${fmtINR(c.outstanding)}</div></div>`).join('') || emptyTab('bi-people','No customers in segment')}
  `);
}
