/* ============================================================
   ENTERPRISE BI — TRUE MERGE LAYER
   ------------------------------------------------------------
   This file is intentionally ADDITIVE.

   The original CRM app.js remains the source of truth for:
   - navigation
   - orders/cart/quotations
   - visits
   - customers
   - leads
   - FMS / Smart Buckets / Discount Rules
   - attendance / feedback
   - notifications / profile
   - existing reports

   This layer adds the newer Enterprise BI experience on top of
   those same data structures and connects every BI click back into
   the original operational screens.
   ============================================================ */

const ENTERPRISE_BI = {
  tab: "Overview",
  chartIds: [
    "ebiSalesTrend", "ebiRegionChart", "ebiManagerChart", "ebiDsrChart",
    "ebiCustomerChart", "ebiProductChart", "ebiRiskChart",
    "ebiRevenueChart", "ebiCollectionChart"
  ]
};

const EBI_COLORS = {
  navy: "#0B1F3A",
  steel: "#1E5F8C",
  orange: "#F2762E",
  green: "#1E9E5A",
  amber: "#E8A23D",
  red: "#D6483F",
  grid: "#EEF1F6"
};

function ebiMoney(n) {
  return typeof fmtINR === "function" ? fmtINR(n) : "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

function ebiPct(n) {
  return Number(n || 0).toFixed(1) + "%";
}

function ebiMetric(label, value, note, action) {
  return `
    <div class="kpi-card ${action ? "bi-clickable" : ""}"
         ${action ? `onclick="${action}" style="cursor:pointer;"` : ""}>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      ${note ? `<div class="kpi-label mt-1">${note}</div>` : ""}
      ${action ? `<div class="bi-card-hint mt-2"><i class="bi bi-arrow-right"></i> Drill through</div>` : ""}
    </div>`;
}

function ebiChartCard(title, id, height=235) {
  return `
    <div class="card-x p-3 mb-3 ebi-chart-card">
      <div class="section-title mb-2">${title}</div>
      <div style="height:${height}px;position:relative;">
        <canvas id="${id}"></canvas>
      </div>
    </div>`;
}

function ebiTabs() {
  const tabs = [
    ["Overview","bi-grid-1x2-fill"],
    ["Regions","bi-map-fill"],
    ["Managers","bi-diagram-3-fill"],
    ["DSRs","bi-people-fill"],
    ["Customers","bi-person-lines-fill"],
    ["Products","bi-box-seam-fill"],
    ["Risk","bi-shield-exclamation"],
    ["Revenue","bi-graph-up-arrow"],
    ["Collections","bi-cash-coin"]
  ];
  return `<div class="tab-scroll ebi-tabs mb-3">
    ${tabs.map(([t,icon]) => `
      <button class="tab-chip ${ENTERPRISE_BI.tab===t ? "active" : ""}"
              onclick="setEnterpriseBITab('${t}')">
        <i class="bi ${icon} me-1"></i>${t}
      </button>`).join("")}
  </div>`;
}

function setEnterpriseBITab(tab) {
  ENTERPRISE_BI.tab = tab;
  renderEnterpriseBI();
}

function enterpriseBISummary() {
  const target = Number(REGIONAL_SUMMARY?.target || 0);
  const sales = Number(REGIONAL_SUMMARY?.sales || 0);
  const achievement = target ? sales / target * 100 : 0;
  const outstanding = CUSTOMERS.reduce((s,c)=>s+Number(c.outstanding||0),0);
  const pipeline = LEADS.reduce((s,l)=>s+Number(l.potential||0),0);
  const orders = ORDERS.reduce((s,o)=>s+Number(o.amount||0),0);

  return {target,sales,achievement,outstanding,pipeline,orders};
}

function renderEnterpriseBI() {
  const s = enterpriseBISummary();

  const html = `
    <div class="section-pad ebi-page">
      <div class="ebi-hero card-x p-3 mb-3">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div class="eyebrow">Enterprise Business Intelligence</div>
            <h5 class="fw-bold mb-1">Sales Command Center</h5>
            <div class="text-faint" style="font-size:.74rem;">
              Same CRM data · deeper analytics · operational drill-through
            </div>
          </div>
          <button class="btn btn-crm-outline btn-sm" onclick="go('reports')">
            <i class="bi bi-arrow-left me-1"></i> Back to Reports
          </button>
        </div>
      </div>

      <div class="row g-2 mb-3 ebi-kpis">
        <div class="col-6 col-xl-3">${ebiMetric("Sales",ebiMoney(s.sales),`${ebiPct(s.achievement)} achievement`,"setEnterpriseBITab('Revenue')")}</div>
        <div class="col-6 col-xl-3">${ebiMetric("Target",ebiMoney(s.target),"Organization target","setEnterpriseBITab('Regions')")}</div>
        <div class="col-6 col-xl-3">${ebiMetric("Outstanding",ebiMoney(s.outstanding),"Customer receivables","setEnterpriseBITab('Risk')")}</div>
        <div class="col-6 col-xl-3">${ebiMetric("Pipeline",ebiMoney(s.pipeline),"Lead potential","go('leads')")}</div>
      </div>

      ${ebiTabs()}
      <div id="enterpriseBiBody">${renderEnterpriseBITab()}</div>
    </div>`;

  const body = document.getElementById("body-slot");
  if (body) body.innerHTML = html;

  setTimeout(drawEnterpriseBICharts, 0);
}

function renderEnterpriseBITab() {
  const tab = ENTERPRISE_BI.tab;

  if (tab === "Overview") {
    const risky = creditRiskCustomers(75);
    const dead = deadStockRisk();
    const gaps = regionalGapAnalysis();
    return `
      <div class="row g-3">
        <div class="col-12 col-xl-7">
          ${ebiChartCard("Sales trend", "ebiSalesTrend", 250)}
        </div>
        <div class="col-12 col-xl-5">
          ${ebiChartCard("Regional sales", "ebiRegionChart", 250)}
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-6">
          <div class="card-x p-3 mb-3">
            <div class="section-title mb-2">Priority Insights</div>
            ${risky.length ? `
              <div class="list-card mb-2" onclick="showCreditRiskDrilldown()" style="cursor:pointer;">
                <div class="fw-bold"><i class="bi bi-exclamation-triangle-fill text-danger me-1"></i> Credit risk</div>
                <div class="text-faint">${risky.length} accounts above 75% utilisation</div>
                <i class="bi bi-chevron-right float-end"></i>
              </div>` : ""}
            ${dead.length ? `
              <div class="list-card mb-2" onclick="showDeadStockDrilldown()" style="cursor:pointer;">
                <div class="fw-bold"><i class="bi bi-box-seam-fill me-1" style="color:var(--amber-500);"></i> Dead stock</div>
                <div class="text-faint">${ebiMoney(dead.reduce((s,p)=>s+p.tiedUpValue,0))} capital tied up</div>
                <i class="bi bi-chevron-right float-end"></i>
              </div>` : ""}
            ${gaps.length ? `
              <div class="list-card" onclick="showStateDrilldown('${gaps[0].name}')" style="cursor:pointer;">
                <div class="fw-bold"><i class="bi bi-bullseye me-1"></i> Target gap</div>
                <div class="text-faint">${gaps[0].name} · ${ebiMoney(gaps[0].gap)} gap</div>
                <i class="bi bi-chevron-right float-end"></i>
              </div>` : ""}
          </div>
        </div>
        <div class="col-12 col-xl-6">
          ${ebiChartCard("DSR sales productivity", "ebiDsrChart", 240)}
        </div>
      </div>`;
  }

  if (tab === "Regions") {
    return `
      ${ebiChartCard("State / region sales vs target", "ebiRegionChart", 260)}
      <div class="card-x p-3">
        <div class="section-title mb-2">Region drill-through</div>
        ${REGIONAL_SUMMARY.states.map(s=>`
          <div class="list-card mb-2" onclick="showStateDrilldown('${s.name}')" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${s.name}</strong><strong>${ebiMoney(s.sales)}</strong>
            </div>
            <div class="progress-track mt-2" style="height:6px;">
              <div class="progress-fill" style="width:${Math.min(s.achievement,100)}%;background:var(--orange-500);"></div>
            </div>
            <div class="d-flex justify-content-between text-faint mt-1" style="font-size:.68rem;">
              <span>${ebiPct(s.achievement)} achievement</span>
              <span>Gap ${ebiMoney(Math.max(0,s.target-s.sales))}</span>
            </div>
          </div>`).join("")}
      </div>`;
  }

  if (tab === "Managers") {
    const managers = [
      {name:"Anita Kulkarni",sales:4200000,target:5000000,dsr:9},
      {name:"Rahul Sharma",sales:3820000,target:4500000,dsr:8},
      {name:"Neha Patil",sales:3410000,target:4100000,dsr:7},
      {name:"Vikas More",sales:2950000,target:3600000,dsr:6}
    ];
    return `
      ${ebiChartCard("Manager sales vs target", "ebiManagerChart", 260)}
      <div class="card-x p-3">
        <div class="section-title mb-2">Manager scorecards</div>
        ${managers.map(m=>`
          <div class="list-card mb-2" onclick="showManagerDrilldown('${m.name}')" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${m.name}</strong><strong>${ebiMoney(m.sales)}</strong>
            </div>
            <div class="text-faint mt-1">${m.dsr} DSRs · ${ebiPct(m.sales/m.target*100)} achievement</div>
          </div>`).join("")}
      </div>`;
  }

  if (tab === "DSRs") {
    return `
      ${ebiChartCard("DSR sales vs target", "ebiDsrChart", 260)}
      <div class="card-x p-3">
        <div class="section-title mb-2">DSR scorecards</div>
        ${DSR_LEADERBOARD.map(d=>`
          <div class="list-card mb-2" onclick="showDsrDrilldown('${d.name}')" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${d.name}</strong><strong>${ebiMoney(d.sales)}</strong>
            </div>
            <div class="progress-track mt-2" style="height:6px;">
              <div class="progress-fill" style="width:${Math.min(d.sales/d.target*100,100)}%;background:var(--steel-500);"></div>
            </div>
            <div class="d-flex justify-content-between text-faint mt-1" style="font-size:.68rem;">
              <span>${ebiPct(d.sales/d.target*100)} target</span>
              <span>${d.orders} orders · ${d.visits} visits</span>
            </div>
          </div>`).join("")}
      </div>`;
  }

  if (tab === "Customers") {
    const rows = CUSTOMERS.slice().sort((a,b)=>b.salesThisMonth-a.salesThisMonth);
    return `
      ${ebiChartCard("Customer sales concentration", "ebiCustomerChart", 260)}
      <div class="card-x p-3">
        <div class="section-title mb-2">Customer 360 drill-through</div>
        ${rows.map(c=>`
          <div class="list-card mb-2" onclick="go('customerDetail',{id:'${c.id}',tab:'360'})" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${c.name}</strong><strong>${ebiMoney(c.salesThisMonth)}</strong>
            </div>
            <div class="text-faint mt-1">${c.type} · ${c.area} · Outstanding ${ebiMoney(c.outstanding)}</div>
          </div>`).join("")}
      </div>`;
  }

  if (tab === "Products") {
    const rows = PRODUCTS.slice().sort((a,b)=>b.stock*b.dealerPrice-a.stock*b.dealerPrice);
    return `
      ${ebiChartCard("Inventory capital by SKU", "ebiProductChart", 260)}
      <div class="card-x p-3">
        <div class="section-title mb-2">Product 360 drill-through</div>
        ${rows.map(p=>`
          <div class="list-card mb-2" onclick="showProductDrilldown('${p.id}')" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${p.img} ${p.name}</strong>
              <strong>${ebiMoney(p.stock*p.dealerPrice)}</strong>
            </div>
            <div class="text-faint mt-1">${p.partNo} · ${p.fms} movement · ${p.stock} units</div>
          </div>`).join("")}
      </div>`;
  }

  if (tab === "Risk") {
    const risky = creditRiskCustomers(75);
    return `
      ${ebiChartCard("Credit utilisation", "ebiRiskChart", 260)}
      <div class="card-x p-3 mb-3">
        <div class="section-title mb-2">Credit risk</div>
        ${risky.map(c=>`
          <div class="list-card mb-2" onclick="go('customerDetail',{id:'${c.id}',tab:'Payments'})" style="cursor:pointer;">
            <div class="d-flex justify-content-between">
              <strong>${c.name}</strong>
              <span class="badge-x tone-red-bg">${c.utilization.toFixed(0)}%</span>
            </div>
            <div class="progress-track mt-2" style="height:6px;">
              <div class="progress-fill" style="width:${Math.min(c.utilization,100)}%;background:var(--red-500);"></div>
            </div>
            <div class="text-faint mt-1">${ebiMoney(c.outstanding)} outstanding / ${ebiMoney(c.creditLimit)} limit</div>
          </div>`).join("") || emptyTab("bi-check-circle","No accounts above 75%")}
      </div>
      <button class="btn btn-crm-outline w-100" onclick="showCreditRiskDrilldown()">Open full risk drill-through</button>`;
  }

  if (tab === "Revenue") {
    return `
      ${ebiChartCard("Weekly revenue", "ebiRevenueChart", 260)}
      <div class="row g-2">
        <div class="col-6">${ebiMetric("Recorded orders",ebiMoney(ORDERS.reduce((s,o)=>s+o.amount,0)),"Current mock order set","go('orderHistory')")}</div>
        <div class="col-6">${ebiMetric("Leads potential",ebiMoney(LEADS.reduce((s,l)=>s+l.potential,0)),"Unweighted pipeline","go('leads')")}</div>
      </div>
      <div class="card-x p-3 mt-3">
        <div class="section-title mb-2">Revenue actions</div>
        <div class="list-card mb-2" onclick="go('monthlyReport')" style="cursor:pointer;">Monthly analytics <i class="bi bi-chevron-right float-end"></i></div>
        <div class="list-card" onclick="go('orderHistory')" style="cursor:pointer;">Order history <i class="bi bi-chevron-right float-end"></i></div>
      </div>`;
  }

  if (tab === "Collections") {
    const total = CUSTOMERS.reduce((s,c)=>s+c.outstanding,0);
    const overdue = CUSTOMERS.filter(c=>c.outstanding>c.creditLimit).reduce((s,c)=>s+c.outstanding,0);
    return `
      ${ebiChartCard("Collections / receivables", "ebiCollectionChart", 260)}
      <div class="row g-2">
        <div class="col-6">${ebiMetric("Outstanding",ebiMoney(total),"All customers","setEnterpriseBITab('Risk')")}</div>
        <div class="col-6">${ebiMetric("Over-limit",ebiMoney(overdue),"Immediate collection focus","showCreditRiskDrilldown()")}</div>
      </div>
      <div class="card-x p-3 mt-3">
        <div class="section-title mb-2">Collection drill-through</div>
        ${CUSTOMERS.slice().sort((a,b)=>b.outstanding-a.outstanding).map(c=>`
          <div class="list-card mb-2" onclick="go('customerDetail',{id:'${c.id}',tab:'Payments'})" style="cursor:pointer;">
            <div class="d-flex justify-content-between"><strong>${c.name}</strong><strong>${ebiMoney(c.outstanding)}</strong></div>
            <div class="text-faint mt-1">${ebiPct(c.creditLimit ? c.outstanding/c.creditLimit*100 : 0)} credit utilised</div>
          </div>`).join("")}
      </div>`;
  }

  return "";
}

function drawEnterpriseBICharts() {
  const t = ENTERPRISE_BI.tab;

  if (t === "Overview") {
    if (typeof drawLineChart === "function") {
      drawLineChart("ebiSalesTrend",
        WEEKLY_SALES.map(x=>x.label),
        WEEKLY_SALES.map(x=>x.value));
    }
    if (typeof drawBarChart === "function") {
      drawBarChart("ebiRegionChart",
        REGIONAL_SUMMARY.states.map(x=>x.name),
        REGIONAL_SUMMARY.states.map(x=>x.sales),
        REGIONAL_SUMMARY.states.map(()=>EBI_COLORS.steel),
        label=>showStateDrilldown(label));
      drawBarChart("ebiDsrChart",
        DSR_LEADERBOARD.map(x=>x.name.split(" ")[0]),
        DSR_LEADERBOARD.map(x=>x.sales),
        DSR_LEADERBOARD.map(()=>EBI_COLORS.orange),
        label=> {
          const d=DSR_LEADERBOARD.find(x=>x.name.startsWith(label));
          if(d) showDsrDrilldown(d.name);
        });
    }
  }

  if (t === "Regions" && typeof drawBarChart === "function") {
    drawBarChart("ebiRegionChart",
      REGIONAL_SUMMARY.states.map(x=>x.name),
      REGIONAL_SUMMARY.states.map(x=>x.sales),
      REGIONAL_SUMMARY.states.map(()=>EBI_COLORS.steel),
      label=>showStateDrilldown(label));
  }

  if (t === "Managers" && typeof drawBarChart === "function") {
    const ms=[
      ["Anita Kulkarni",4200000,5000000],
      ["Rahul Sharma",3820000,4500000],
      ["Neha Patil",3410000,4100000],
      ["Vikas More",2950000,3600000]
    ];
    drawBarChart("ebiManagerChart",ms.map(x=>x[0].split(" ")[0]),ms.map(x=>x[1]),ms.map(()=>EBI_COLORS.orange),
      label=>{const m=ms.find(x=>x[0].startsWith(label));if(m)showManagerDrilldown(m[0]);});
  }

  if (t === "DSRs" && typeof drawBarChart === "function") {
    drawBarChart("ebiDsrChart",
      DSR_LEADERBOARD.map(x=>x.name.split(" ")[0]),
      DSR_LEADERBOARD.map(x=>x.sales),
      DSR_LEADERBOARD.map(()=>EBI_COLORS.orange),
      label=>{const d=DSR_LEADERBOARD.find(x=>x.name.startsWith(label));if(d)showDsrDrilldown(d.name);});
  }

  if (t === "Customers" && typeof drawBarChart === "function") {
    const rows=CUSTOMERS.slice().sort((a,b)=>b.salesThisMonth-a.salesThisMonth).slice(0,8);
    drawBarChart("ebiCustomerChart",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.salesThisMonth),rows.map(()=>EBI_COLORS.steel),
      label=>{const c=rows.find(x=>x.name.startsWith(label));if(c)go("customerDetail",{id:c.id,tab:"360"});});
  }

  if (t === "Products" && typeof drawBarChart === "function") {
    const rows=PRODUCTS.slice().sort((a,b)=>b.stock*b.dealerPrice-a.stock*a.dealerPrice).slice(0,10);
    drawBarChart("ebiProductChart",rows.map(x=>x.name.split(" ").slice(0,2).join(" ")),rows.map(x=>x.stock*x.dealerPrice),rows.map(()=>EBI_COLORS.amber),
      label=>{const p=rows.find(x=>x.name.startsWith(label.split(" ")[0]));if(p)showProductDrilldown(p.id);});
  }

  if (t === "Risk" && typeof drawBarChart === "function") {
    const rows=creditRiskCustomers(75);
    drawBarChart("ebiRiskChart",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.utilization),rows.map(()=>EBI_COLORS.red),
      label=>{const c=rows.find(x=>x.name.startsWith(label));if(c)go("customerDetail",{id:c.id,tab:"Payments"});});
  }

  if (t === "Revenue" && typeof drawLineChart === "function") {
    drawLineChart("ebiRevenueChart",WEEKLY_SALES.map(x=>x.label),WEEKLY_SALES.map(x=>x.value));
  }

  if (t === "Collections" && typeof drawBarChart === "function") {
    const rows=CUSTOMERS.slice().sort((a,b)=>b.outstanding-a.outstanding).slice(0,8);
    drawBarChart("ebiCollectionChart",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.outstanding),rows.map(()=>EBI_COLORS.red),
      label=>{const c=rows.find(x=>x.name.startsWith(label));if(c)go("customerDetail",{id:c.id,tab:"Payments"});});
  }
}

/* ------------------------------------------------------------
   Route + Reports integration
   ------------------------------------------------------------ */
const _ebiCanAccess = window.canAccessScreen;
window.canAccessScreen = function(screen) {
  if (screen === "enterpriseBI") return true;
  return _ebiCanAccess ? _ebiCanAccess(screen) : true;
};

const _ebiOriginalRender = window.render;
window.render = function() {
  const s = getCurrentScreen();
  if (s && s.screen === "enterpriseBI") {
    try { stopVisitTimer(); } catch(e) {}
    const bottomNav = document.getElementById("bottomnav-slot");
    if (bottomNav) bottomNav.innerHTML = renderBottomNav(s.tab || "reports");

    const header = document.getElementById("header-slot");
    if (header) {
      header.innerHTML = `
        <div class="topbar-sub">
          <button class="back-btn" onclick="back()"><i class="bi bi-arrow-left"></i></button>
          <div>
            <h6>Enterprise BI</h6>
            <div class="sub-label">Integrated CRM analytics</div>
          </div>
        </div>`;
    }
    renderEnterpriseBI();
    const fab=document.getElementById("fab-slot");
    if(fab) fab.style.display="none";
    return;
  }
  return _ebiOriginalRender();
};

function openEnterpriseBIDashboard() {
  ENTERPRISE_BI.tab = "Overview";
  go("enterpriseBI");
}

/* Put the new BI entry point into the existing Reports screen.
   The original Reports implementation remains untouched underneath. */
const _ebiReports = window.renderReportsHome;
window.renderReportsHome = function() {
  const original = _ebiReports();
  return `
    <div class="section-pad pb-0">
      <div class="card-x p-3 mb-3 ebi-entry">
        <div class="d-flex align-items-center gap-3">
          <div class="ebi-entry-icon"><i class="bi bi-bar-chart-line-fill"></i></div>
          <div class="flex-grow-1">
            <div class="fw-bold">Enterprise BI Command Center</div>
            <div class="text-faint" style="font-size:.72rem;">Charts, targets, risk, revenue and 360° drill-through</div>
          </div>
          <button class="btn btn-crm-primary btn-sm" onclick="openEnterpriseBIDashboard()">Open BI</button>
        </div>
      </div>
    </div>
  ` + original;
};

/* ------------------------------------------------------------
   Customer 360 — adds a new tab without removing existing tabs.
   ------------------------------------------------------------ */
const _ebiCustomerDetail = window.renderCustomerDetail;
window.renderCustomerDetail = function(id, tab) {
  const c = getCustomer(id);
  if (!c) return _ebiCustomerDetail(id, tab);

  if (tab === "360") return renderCustomerEnterprise360(c);

  const html = _ebiCustomerDetail(id, tab);
  return html.replace(
    `<span class="tab-chip ${tab==='Overview'?'active':''}"`,
    `<span class="tab-chip ${tab==='360'?'active':''}" onclick="go('customerDetail',{id:'${id}',tab:'360'})">360</span>
     <span class="tab-chip ${tab==='Overview'?'active':''}"`
  );
};

function renderCustomerEnterprise360(c) {
  const orders = ORDERS.filter(o=>o.customerId===c.id);
  const totalOrders = orders.reduce((s,o)=>s+Number(o.amount||0),0);
  const util = c.creditLimit ? c.outstanding/c.creditLimit*100 : 0;
  return `
    <div class="section-pad">
      <div class="card-x p-3 mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold fs-6">${c.name}</div>
            <div class="text-faint" style="font-size:.74rem;">${c.owner} · ${c.phone} · ${c.area}, ${c.city}</div>
            <span class="badge-x badge-type-${c.type} mt-2 d-inline-block">${c.type}</span>
          </div>
          <div class="avatar-circle" style="background:var(--navy-950);">${c.name.substring(0,2).toUpperCase()}</div>
        </div>
      </div>

      <div class="tab-scroll mb-3">
        ${["Overview","360","Orders","Payments","Visits","Products","Feedback","Leads"].map(t=>
          `<span class="tab-chip ${t==="360"?"active":""}" onclick="go('customerDetail',{id:'${c.id}',tab:'${t}'})">${t}</span>`
        ).join("")}
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">${ebiMetric("Monthly Sales",ebiMoney(c.salesThisMonth),"Current period")}</div>
        <div class="col-6">${ebiMetric("Order Value",ebiMoney(totalOrders),"Recorded orders")}</div>
        <div class="col-6">${ebiMetric("Outstanding",ebiMoney(c.outstanding),"Receivable")}</div>
        <div class="col-6">${ebiMetric("Credit Utilisation",ebiPct(util),"Approved limit")}</div>
      </div>

      ${ebiChartCard("Customer order history","ebiCustomer360Orders",230)}
      ${ebiChartCard("Commercial vs credit position","ebiCustomer360Commercial",230)}

      <div class="card-x p-3">
        <div class="section-title mb-2">Next Actions</div>
        <div class="row g-2">
          <div class="col-6"><button class="btn btn-crm-primary w-100" onclick="orderCustomerId='${c.id}';go('newOrder',{customerId:'${c.id}'})"><i class="bi bi-bag-plus-fill me-1"></i>Order</button></div>
          <div class="col-6"><button class="btn btn-crm-outline w-100" onclick="go('customerDetail',{id:'${c.id}',tab:'Payments'})"><i class="bi bi-cash-coin me-1"></i>Collect</button></div>
          <div class="col-6"><button class="btn btn-crm-outline w-100" onclick="showCustomerGapDrilldown('${c.id}')"><i class="bi bi-stars me-1"></i>Cross-sell</button></div>
          <div class="col-6"><button class="btn btn-crm-outline w-100" onclick="go('planVisit',{customerId:'${c.id}'})"><i class="bi bi-signpost-split-fill me-1"></i>Visit</button></div>
        </div>
      </div>
    </div>`;
}

const _ebiOriginalAfterRender = window.afterRenderHooks;
window.afterRenderHooks = function(screen, params) {
  if (typeof _ebiOriginalAfterRender === "function") {
    try { _ebiOriginalAfterRender(screen, params); } catch(e) {}
  }

  if (screen === "customerDetail" && params && params.tab === "360") {
    const c = getCustomer(params.id);
    if (c) setTimeout(() => {
      const orders=ORDERS.filter(o=>o.customerId===c.id).slice().reverse();
      if (typeof drawLineChart === "function")
        drawLineChart("ebiCustomer360Orders",orders.length?orders.map(o=>o.date):["No orders"],orders.length?orders.map(o=>o.amount):[0]);
      if (typeof drawBarChart === "function")
        drawBarChart("ebiCustomer360Commercial",
          ["Monthly Sales","Outstanding","Credit Limit"],
          [c.salesThisMonth,c.outstanding,c.creditLimit],
          [EBI_COLORS.orange,EBI_COLORS.red,EBI_COLORS.navy]);
    },0);
  }
};

/* ------------------------------------------------------------
   Existing drill-throughs — keep them, append charts to them.
   This is the critical part of the merge: the existing operational
   drill-through functions are not replaced with a separate app.
   ------------------------------------------------------------ */
function ebiAppendChartToOpenModal(title,id,height=210) {
  const panel = document.querySelector("#overlay-slot .modal-panel-x.wide");
  if (!panel) return false;
  panel.insertAdjacentHTML("beforeend",ebiChartCard(title,id,height));
  return true;
}

function ebiWrapDrill(name, addChart) {
  const fn = window[name];
  if (typeof fn !== "function" || fn.__ebiWrapped) return;
  const wrapped = function(...args) {
    const result = fn.apply(this,args);
    setTimeout(()=>addChart(...args),20);
    return result;
  };
  wrapped.__ebiWrapped = true;
  window[name] = wrapped;
}

ebiWrapDrill("showCreditRiskDrilldown",function(){
  const rows=creditRiskCustomers(75);
  if (!ebiAppendChartToOpenModal("Credit utilisation by account","ebiDDCreditRisk",220)) return;
  setTimeout(()=>drawBarChart("ebiDDCreditRisk",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.utilization),rows.map(()=>EBI_COLORS.red),
    label=>{const c=rows.find(x=>x.name.startsWith(label));if(c){closeOverlay();go("customerDetail",{id:c.id,tab:"Payments"});}}),0);
});

ebiWrapDrill("showDeadStockDrilldown",function(){
  const rows=deadStockRisk();
  if (!ebiAppendChartToOpenModal("Capital tied up by SKU","ebiDDDeadStock",220)) return;
  setTimeout(()=>drawBarChart("ebiDDDeadStock",rows.map(x=>x.name.split(" ").slice(0,2).join(" ")),rows.map(x=>x.tiedUpValue),rows.map(()=>EBI_COLORS.amber),
    label=>{const p=rows.find(x=>x.name.startsWith(label.split(" ")[0]));if(p){closeOverlay();showProductDrilldown(p.id);}}),0);
});

ebiWrapDrill("showAccountTypeDrilldown",function(type){
  const seg=ACCOUNT_TYPE_SALES.find(x=>x.type===type);
  if(!seg) return;
  const rows=CUSTOMERS.filter(c=>c.type===type).sort((a,b)=>b.salesThisMonth-a.salesThisMonth);
  if (!ebiAppendChartToOpenModal("Customer sales ranking","ebiDDAccountType",220)) return;
  setTimeout(()=>drawBarChart("ebiDDAccountType",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.salesThisMonth),rows.map(()=>EBI_COLORS.steel),
    label=>{const c=rows.find(x=>x.name.startsWith(label));if(c){closeOverlay();go("customerDetail",{id:c.id,tab:"360"});}}),0);
});

ebiWrapDrill("showDsrDrilldown",function(name){
  const rows=dsrEfficiencyMatrix();
  if (!ebiAppendChartToOpenModal("Sales per visit — team comparison","ebiDDSR",220)) return;
  setTimeout(()=>drawBarChart("ebiDDSR",rows.map(x=>x.name.split(" ")[0]),rows.map(x=>x.salesPerVisit),rows.map(x=>x.name===name?EBI_COLORS.orange:EBI_COLORS.steel),
    label=>{const d=rows.find(x=>x.name.startsWith(label));if(d)showDsrDrilldown(d.name);}),0);
});

ebiWrapDrill("showManagerDrilldown",function(name){
  const m={ "Anita Kulkarni":[4200000,5000000], "Rahul Sharma":[3820000,4500000], "Neha Patil":[3410000,4100000], "Vikas More":[2950000,3600000] }[name];
  if(!m) return;
  if (!ebiAppendChartToOpenModal("Sales vs target","ebiDDManager",220)) return;
  setTimeout(()=>drawBarChart("ebiDDManager",["Sales","Target"],m,[EBI_COLORS.orange,EBI_COLORS.navy]),0);
});

ebiWrapDrill("showStateDrilldown",function(stateName){
  const s=REGIONAL_SUMMARY.states.find(x=>x.name===stateName);
  if(!s) return;
  if (!ebiAppendChartToOpenModal("Sales vs target","ebiDDState",220)) return;
  setTimeout(()=>drawBarChart("ebiDDState",["Sales","Target"],[s.sales,s.target],[EBI_COLORS.orange,EBI_COLORS.navy]),0);
});

ebiWrapDrill("showProductDrilldown",function(productId){
  const p=getProduct(productId);
  if(!p) return;
  if (!ebiAppendChartToOpenModal("Product commercial position","ebiDDProduct",220)) return;
  setTimeout(()=>drawBarChart("ebiDDProduct",["MRP","Dealer Price","Stock Value / 100"],[p.mrp,p.dealerPrice,Math.round(p.stock*p.dealerPrice/100)],[EBI_COLORS.navy,EBI_COLORS.orange,EBI_COLORS.steel]),0);
});

ebiWrapDrill("showCustomerGapDrilldown",function(customerId){
  const c=getCustomer(customerId);
  if(!c) return;
  const rows=fastMoverGapsForCustomer(c);
  if (!ebiAppendChartToOpenModal("Cross-sell opportunity pool","ebiDDCustomerGap",220)) return;
  setTimeout(()=>drawBarChart("ebiDDCustomerGap",rows.slice(0,8).map(x=>x.name.split(" ")[0]),rows.slice(0,8).map(x=>x.dealerPrice),rows.slice(0,8).map(()=>EBI_COLORS.orange)),0);
});

ebiWrapDrill("showPricingDrilldown",function(){
  const rows=pricingOpportunities();
  if (!ebiAppendChartToOpenModal("Potential pricing gain","ebiDDPricing",220)) return;
  const top=rows.slice(0,8);
  setTimeout(()=>drawBarChart("ebiDDPricing",top.map(x=>x.name.split(" ")[0]),top.map(x=>x.potentialGain),top.map(x=>x.signal==="raise"?EBI_COLORS.green:EBI_COLORS.amber)),0);
});

/* Order drill-through chart: the original confirmation screen is preserved,
   and the chart is appended after it renders. */
const _ebiOrderConfirm = window.renderOrderConfirm;
window.renderOrderConfirm = function(orderId) {
  const html=_ebiOrderConfirm(orderId);
  return html + `
    <div class="section-pad">
      <div class="card-x p-3">
        <div class="section-title mb-2">Order 360°</div>
        <div style="height:210px;"><canvas id="ebiOrder360"></canvas></div>
      </div>
    </div>`;
};

const _ebiRenderAfterOrder = window.afterRenderHooks;
window.afterRenderHooks = function(screen, params) {
  if (typeof _ebiRenderAfterOrder === "function") {
    try { _ebiRenderAfterOrder(screen, params); } catch(e) {}
  }
  if (screen === "orderConfirm" && params && params.orderId) {
    const o=ORDERS.find(x=>x.id===params.orderId);
    if(o) {
      const c=getCustomer(o.customerId);
      if(c && typeof drawBarChart==="function") {
        setTimeout(()=>drawBarChart("ebiOrder360",["Order","Customer AOV","Credit Headroom"],
          [o.amount,c.avgOrderValue,Math.max(0,c.creditLimit-c.outstanding)],
          [EBI_COLORS.orange,EBI_COLORS.steel,EBI_COLORS.green]),0);
      }
    }
  }
};

/* ============================================================
   Small desktop enhancements
   ============================================================ */
(function addEnterpriseBICSS(){
  const style=document.createElement("style");
  style.textContent=`
    .ebi-page{max-width:1600px;margin:0 auto;}
    .ebi-hero{background:linear-gradient(135deg,#0B1F3A,#1A3A66);color:#fff;border:none;}
    .ebi-hero .text-faint,.ebi-hero .eyebrow{color:rgba(255,255,255,.68);}
    .ebi-hero .btn-crm-outline{background:#fff;color:#0B1F3A;border-color:#fff;}
    .ebi-entry{border:1px solid rgba(30,95,140,.18);}
    .ebi-entry-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--orange-100);color:var(--orange-600);font-size:1.1rem;flex-shrink:0;}
    .ebi-chart-card{min-height:280px;}
    .ebi-tabs .tab-chip{border-radius:10px;}
    @media(min-width:769px){
      .ebi-kpis .kpi-card{min-height:112px;}
      .ebi-page .card-x{box-shadow:0 4px 20px rgba(11,31,58,.06);}
    }
  `;
  document.head.appendChild(style);
})();
