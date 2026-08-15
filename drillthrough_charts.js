/* ============================================================
   ENTERPRISE BI — DRILL-THROUGH CHART EXTENSION
   ------------------------------------------------------------
   This layer sits on top of the original Sales CRM + BI code.
   It keeps every original feature and adds charts to drill-through
   screens instead of replacing the workflow.

   Theme:
   Navy #0B1F3A
   Steel #1E5F8C
   Orange #F2762E
   Green #1E9E5A
   Amber #E8A23D
   Red #D6483F
   ============================================================ */

const BI_THEME = {
  navy: "#0B1F3A",
  steel: "#1E5F8C",
  orange: "#F2762E",
  green: "#1E9E5A",
  amber: "#E8A23D",
  red: "#D6483F",
  grid: "#EEF1F6"
};

function biChartCard(title, id, height = 210) {
  return `
    <div class="card-x p-3 mb-3 bi-drill-chart-card">
      <div class="section-title mb-2">${title}</div>
      <div style="height:${height}px;position:relative;">
        <canvas id="${id}"></canvas>
      </div>
    </div>`;
}

function biAppendToWideModal(html) {
  const panel = document.querySelector("#overlay-slot .modal-panel-x.wide");
  if (!panel) return null;
  panel.insertAdjacentHTML("beforeend", html);
  return panel;
}

function biDestroy(id) {
  try { if (typeof destroyChart === "function") destroyChart(id); } catch(e) {}
}

function biBar(id, labels, data, colors, onClick = null) {
  if (!document.getElementById(id)) return;
  biDestroy(id);
  drawBarChart(id, labels, data, colors, onClick);
}

function biLine(id, labels, data, onClick = null) {
  if (!document.getElementById(id)) return;
  biDestroy(id);
  drawLineChart(id, labels, data, onClick);
}

function biMoney(n) {
  return typeof fmtINR === "function" ? fmtINR(n) : `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function biPct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}

/* ------------------------------------------------------------
   CREDIT RISK
   ------------------------------------------------------------ */
const __originalCreditRiskDrilldown = window.showCreditRiskDrilldown;
window.showCreditRiskDrilldown = function() {
  const risky = creditRiskCustomers(75);

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0">
          <i class="bi bi-exclamation-triangle-fill" style="color:var(--red-500);"></i>
          Credit Risk Intelligence
        </h6>
        <div class="text-faint" style="font-size:.72rem;">Accounts above 75% credit utilisation</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Risk Accounts", risky.length, "Above 75%")}</div>
      <div class="col-6">${biMetric("Exposure", biMoney(risky.reduce((s,c)=>s+c.outstanding,0)), "Outstanding")}</div>
    </div>

    ${biChartCard("Credit utilisation by account", "ddCreditRiskChart", 220)}

    ${risky.map(c => `
      <div class="list-card mb-2" style="cursor:pointer;"
           onclick="closeOverlay(); go('customerDetail',{id:'${c.id}',tab:'Payments'})">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold" style="font-size:.86rem;">${c.name}</div>
            <span class="badge-x badge-type-${c.type}">${c.type}</span>
          </div>
          <span class="badge-x tone-red-bg">${c.utilization.toFixed(0)}% used</span>
        </div>
        <div class="progress-track mt-2" style="height:6px;">
          <div class="progress-fill" style="width:${Math.min(c.utilization,100)}%;background:var(--red-500);"></div>
        </div>
        <div class="d-flex justify-content-between text-faint mt-1" style="font-size:.7rem;">
          <span>Outstanding ${biMoney(c.outstanding)}</span>
          <span>Limit ${biMoney(c.creditLimit)}</span>
        </div>
      </div>`).join("") || emptyTab("bi-check-circle","No accounts over threshold")}
  `);

  setTimeout(() => {
    biBar(
      "ddCreditRiskChart",
      risky.map(c => c.name.split(" ")[0]),
      risky.map(c => Math.round(c.utilization)),
      risky.map(() => BI_THEME.red),
      (label) => {
        const c = risky.find(x => x.name.startsWith(label));
        if (c) { closeOverlay(); go("customerDetail",{id:c.id,tab:"Payments"}); }
      }
    );
  }, 0);
};

/* ------------------------------------------------------------
   SLOW / DEAD STOCK
   ------------------------------------------------------------ */
const __originalDeadStockDrilldown = window.showDeadStockDrilldown;
window.showDeadStockDrilldown = function() {
  const dead = deadStockRisk();
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-box-seam-fill" style="color:#9C6B12;"></i> Inventory Intelligence</h6>
        <div class="text-faint" style="font-size:.72rem;">Slow-moving stock and tied-up capital</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Slow SKUs", dead.length, "FMS = S")}</div>
      <div class="col-6">${biMetric("Tied-up Value", biMoney(dead.reduce((s,p)=>s+p.tiedUpValue,0)), "At dealer price")}</div>
    </div>

    ${biChartCard("Capital tied up by SKU", "ddDeadStockChart", 220)}

    ${dead.map(p => `
      <div class="list-card mb-2" style="cursor:pointer;"
           onclick="closeOverlay(); showProductDrilldown('${p.id}')">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold" style="font-size:.85rem;">${p.img} ${p.name}</div>
            <div class="text-faint mono" style="font-size:.68rem;">${p.partNo} · ${p.stock} units</div>
          </div>
          <span class="fw-bold">${biMoney(p.tiedUpValue)}</span>
        </div>
      </div>`).join("")}
    <button class="btn btn-crm-primary w-100 mt-2"
            onclick="closeOverlay(); go('smartBucket')">
      Bundle into Smart Bucket
    </button>
  `);

  setTimeout(() => {
    biBar(
      "ddDeadStockChart",
      dead.map(p => p.name.split(" ").slice(0,2).join(" ")),
      dead.map(p => p.tiedUpValue),
      dead.map(() => BI_THEME.amber),
      (label) => {
        const p = dead.find(x => x.name.startsWith(label.split(" ")[0]));
        if (p) { closeOverlay(); showProductDrilldown(p.id); }
      }
    );
  }, 0);
};

/* ------------------------------------------------------------
   ACCOUNT TYPE
   ------------------------------------------------------------ */
const __originalAccountTypeDrilldown = window.showAccountTypeDrilldown;
window.showAccountTypeDrilldown = function(type) {
  const segment = ACCOUNT_TYPE_SALES.find(a => a.type === type);
  const custs = CUSTOMERS.filter(c => c.type === type)
    .sort((a,b) => b.salesThisMonth - a.salesThisMonth);

  if (!segment) return;

  const totalSales = custs.reduce((s,c)=>s+c.salesThisMonth,0);
  const totalOutstanding = custs.reduce((s,c)=>s+c.outstanding,0);
  const avgOrder = custs.length
    ? custs.reduce((s,c)=>s+c.avgOrderValue,0)/custs.length
    : 0;

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-pie-chart-fill"></i> ${type} Segment 360°</h6>
        <div class="text-faint" style="font-size:.7rem;">Commercial, financial and customer concentration</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales",biMoney(segment.sales || totalSales),`${segment.pct}% mix`)}</div>
      <div class="col-6">${biMetric("Outstanding",biMoney(segment.outstanding || totalOutstanding),"Exposure")}</div>
      <div class="col-6">${biMetric("Customers",custs.length,"Accounts")}</div>
      <div class="col-6">${biMetric("Avg Order",biMoney(avgOrder),"Customer average")}</div>
    </div>

    ${biChartCard("Customer sales ranking", "ddSegmentSalesChart", 220)}

    ${custs.map(c=>`
      <div class="list-card mb-2" style="cursor:pointer;"
           onclick="closeOverlay(); go('customerDetail',{id:'${c.id}',tab:'Overview'})">
        <div class="d-flex justify-content-between">
          <strong>${c.name}</strong>
          <strong>${biMoney(c.salesThisMonth)}</strong>
        </div>
        <div class="text-faint" style="font-size:.7rem;">
          ${c.area} · Outstanding ${biMoney(c.outstanding)}
        </div>
      </div>`).join("") || emptyTab("bi-people","No customers in segment")}
  `);

  setTimeout(() => {
    biBar(
      "ddSegmentSalesChart",
      custs.map(c=>c.name.split(" ")[0]),
      custs.map(c=>c.salesThisMonth),
      custs.map(() => type==="Distributor" ? BI_THEME.navy : type==="Retailer" ? BI_THEME.steel : BI_THEME.orange),
      (label) => {
        const c = custs.find(x => x.name.startsWith(label));
        if (c) { closeOverlay(); go("customerDetail",{id:c.id,tab:"Overview"}); }
      }
    );
  }, 0);
};

/* ------------------------------------------------------------
   DSR — preserve the existing scorecard and add a second chart
   ------------------------------------------------------------ */
const __originalDsrDrilldown = window.showDsrDrilldown;
window.showDsrDrilldown = function(name) {
  __originalDsrDrilldown(name);
  const eff = dsrEfficiencyMatrix();
  const d = eff.find(x => x.name === name);
  if (!d) return;

  const panel = biAppendToWideModal(
    biChartCard("Sales vs target by DSR", "ddDsrTargetChart", 210)
  );

  if (!panel) return;

  setTimeout(() => {
    biBar(
      "ddDsrTargetChart",
      [d.name.split(" ")[0]],
      [d.sales, d.target],
      [BI_THEME.orange, BI_THEME.navy]
    );
  }, 0);
};

/* ------------------------------------------------------------
   MANAGER — true management 360° with charts
   ------------------------------------------------------------ */
window.showManagerDrilldown = function(name) {
  const managers = [
    { name:"Anita Kulkarni", territory:"Pune Region", sales:4200000, target:5000000, dsr:9 },
    { name:"Rahul Sharma", territory:"Mumbai Region", sales:3820000, target:4500000, dsr:8 },
    { name:"Neha Patil", territory:"Nagpur Region", sales:3410000, target:4100000, dsr:7 },
    { name:"Vikas More", territory:"Nashik Region", sales:2950000, target:3600000, dsr:6 }
  ];
  const m = managers.find(x=>x.name===name);
  if (!m) return;

  const achievement = pctOf(m.sales,m.target);

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-person-badge-fill"></i> ${m.name} — Manager 360°</h6>
        <div class="text-faint" style="font-size:.72rem;">${m.territory}</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales",biMoney(m.sales),`${biPct(achievement)} achievement`)}</div>
      <div class="col-6">${biMetric("Target Gap",biMoney(Math.max(0,m.target-m.sales)),"Remaining")}</div>
      <div class="col-6">${biMetric("DSRs",m.dsr,"Field force","go('managerLeaderboard')")}</div>
      <div class="col-6">${biMetric("Sales / DSR",biMoney(m.sales/Math.max(m.dsr,1)),"Productivity")}</div>
    </div>

    ${biChartCard("Sales vs target", "ddManagerTargetChart", 200)}
    ${biChartCard("Regional context", "ddManagerRegionChart", 220)}

    <div class="card-x p-3">
      <div class="section-title mb-2">Next drill</div>
      <div class="list-card mb-2" onclick="closeOverlay();go('managerLeaderboard')" style="cursor:pointer;">
        DSR scorecard <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card mb-2" onclick="closeOverlay();go('reports')" style="cursor:pointer;">
        Business insights <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card" onclick="closeOverlay();go('geoInsights')" style="cursor:pointer;">
        Territory intelligence <i class="bi bi-chevron-right float-end"></i>
      </div>
    </div>
  `);

  setTimeout(() => {
    biBar("ddManagerTargetChart",["Sales","Target"],[m.sales,m.target],[BI_THEME.orange,BI_THEME.navy]);

    biBar(
      "ddManagerRegionChart",
      REGIONAL_SUMMARY.states.map(s=>s.name),
      REGIONAL_SUMMARY.states.map(s=>s.sales),
      REGIONAL_SUMMARY.states.map((s,i)=>i===0?BI_THEME.orange:BI_THEME.steel),
      label => showStateDrilldown(label)
    );
  },0);
};

/* ------------------------------------------------------------
   STATE / REGION — comparison chart + drill continuation
   ------------------------------------------------------------ */
window.showStateDrilldown = function(stateName) {
  const s = REGIONAL_SUMMARY.states.find(x=>x.name===stateName);
  if (!s) return;

  const gap = Math.max(0,s.target-s.sales);
  const salesShare = pctOf(s.sales,REGIONAL_SUMMARY.sales);
  const targetShare = pctOf(s.target,REGIONAL_SUMMARY.target);

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-map-fill"></i> ${s.name} — Region 360°</h6>
        <div class="text-faint" style="font-size:.72rem;">Sales, target and gap analysis</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Sales",biMoney(s.sales),`${biPct(s.achievement)} achievement`)}</div>
      <div class="col-6">${biMetric("Target Gap",biMoney(gap),"Revenue to recover")}</div>
      <div class="col-6">${biMetric("Sales Share",biPct(salesShare),"Regional sales")}</div>
      <div class="col-6">${biMetric("Target Share",biPct(targetShare),"Regional target")}</div>
    </div>

    ${biChartCard("State sales vs target", "ddStateTargetChart", 220)}

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Management continuation</div>
      <div class="list-card mb-2" onclick="closeOverlay();go('geoInsights')" style="cursor:pointer;">
        Territory & customer coverage <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card mb-2" onclick="closeOverlay();go('managerLeaderboard')" style="cursor:pointer;">
        DSR productivity <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card" onclick="closeOverlay();go('reports')" style="cursor:pointer;">
        Business risks <i class="bi bi-chevron-right float-end"></i>
      </div>
    </div>
  `);

  setTimeout(() => {
    biBar(
      "ddStateTargetChart",
      ["Sales","Target"],
      [s.sales,s.target],
      [BI_THEME.orange,BI_THEME.navy]
    );
  },0);
};

/* ------------------------------------------------------------
   PRODUCT — product 360° with commercial + stock chart
   ------------------------------------------------------------ */
window.showProductDrilldown = function(productId) {
  const p = getProduct(productId);
  if (!p) return;

  const top = (TOP_PRODUCTS || []).find(x=>x.name===p.name);
  const margin = Math.max(0,Number(p.mrp||0)-Number(p.dealerPrice||0));
  const marginPct = p.mrp ? pctOf(margin,p.mrp) : 0;
  const stockValue = Number(p.stock||0)*Number(p.dealerPrice||0);
  const buckets = SMART_BUCKETS.filter(b=>b.items.includes(productId));

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0">${p.img||""} ${p.name} — Product 360°</h6>
        <div class="text-faint mono" style="font-size:.7rem;">${p.partNo} · ${p.brand} · ${p.category}</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("MRP",biMoney(p.mrp))}</div>
      <div class="col-6">${biMetric("Dealer Price",biMoney(p.dealerPrice))}</div>
      <div class="col-6">${biMetric("Margin",biMoney(margin),`${marginPct.toFixed(1)}%`)}</div>
      <div class="col-6">${biMetric("Stock",`${p.stock} units`,`Value ${biMoney(stockValue)}`)}</div>
      <div class="col-6">${biMetric("Movement",p.fms==="F"?"Fast":p.fms==="M"?"Medium":"Slow","FMS")}</div>
      <div class="col-6">${biMetric("Sales",top?biMoney(top.sales):"—",top?`${top.units} units`:"No sales detail")}</div>
    </div>

    ${biChartCard("Price and inventory position", "ddProductPositionChart", 220)}

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Product intelligence</div>
      <div class="list-card mb-2" onclick="closeOverlay();go('geoInsights')" style="cursor:pointer;">
        Customer / territory gaps <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card mb-2" onclick="closeOverlay();showPricingDrilldown()" style="cursor:pointer;">
        Pricing opportunities <i class="bi bi-chevron-right float-end"></i>
      </div>
      <div class="list-card" onclick="closeOverlay();go('smartBucket')" style="cursor:pointer;">
        Smart Bucket placement ${buckets.length?`(${buckets.length} buckets)`:""}
        <i class="bi bi-chevron-right float-end"></i>
      </div>
    </div>

    <button class="btn btn-crm-primary w-100" onclick="closeOverlay();go('newOrderPickCustomer')">
      Order This Product
    </button>
  `);

  setTimeout(() => {
    biBar(
      "ddProductPositionChart",
      ["MRP","Dealer Price","Stock Value / 100"],
      [p.mrp,p.dealerPrice,Math.round(stockValue/100)],
      [BI_THEME.navy,BI_THEME.orange,BI_THEME.steel]
    );
  },0);
};

/* ------------------------------------------------------------
   CUSTOMER SEGMENT / PRICING / GEO
   ------------------------------------------------------------ */
window.showCustomerGapDrilldown = function(customerId) {
  const c = getCustomer(customerId);
  if (!c) return;
  const gaps = fastMoverGapsForCustomer(c);

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-person-lines-fill"></i> ${c.name} — Product Gap 360°</h6>
        <div class="text-faint" style="font-size:.72rem;">Fast-moving products not currently covered</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Fast Movers Missing",gaps.length,"Cross-sell candidates")}</div>
      <div class="col-6">${biMetric("Customer Sales",biMoney(c.salesThisMonth),"Current month")}</div>
    </div>

    ${biChartCard("Potential cross-sell price pool", "ddCustomerGapChart", 220)}

    ${gaps.map(p=>`
      <div class="list-card mb-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold" style="font-size:.84rem;">${p.img} ${p.name}</div>
            <div class="text-faint mono" style="font-size:.68rem;">${p.partNo} · ${biMoney(p.dealerPrice)}</div>
          </div>
          <button class="btn btn-crm-primary btn-sm" onclick="addGapProductToOrder('${c.id}','${p.id}')">Add</button>
        </div>
      </div>`).join("") || emptyTab("bi-check2-circle","Full fast-mover coverage")}
  `);

  setTimeout(() => {
    biBar(
      "ddCustomerGapChart",
      gaps.slice(0,8).map(p=>p.name.split(" ")[0]),
      gaps.slice(0,8).map(p=>p.dealerPrice),
      gaps.slice(0,8).map(()=>BI_THEME.orange),
      label => {
        const p = gaps.find(x=>x.name.startsWith(label));
        if (p) addGapProductToOrder(c.id,p.id);
      }
    );
  },0);
};

window.showPricingDrilldown = function() {
  const pricing = pricingOpportunities();

  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-currency-rupee"></i> Pricing Intelligence 360°</h6>
        <div class="text-faint" style="font-size:.72rem;">Price signals, margin and potential gain</div>
      </div>
      <button class="btn btn-sm p-0" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>

    ${biChartCard("Potential pricing gain", "ddPricingChart", 220)}

    ${pricing.map(p=>pricingRowHTML(p,p.signal==="raise"?"green":"amber")).join("") || emptyTab("bi-emoji-smile","No anomalies detected")}
  `);

  setTimeout(() => {
    const top = pricing.slice(0,8);
    biBar(
      "ddPricingChart",
      top.map(p=>p.product.name.split(" ")[0]),
      top.map(p=>p.potentialGain),
      top.map(p=>p.signal==="raise"?BI_THEME.green:BI_THEME.amber)
    );
  },0);
};

/* ------------------------------------------------------------
   CUSTOMER 360° — add a dedicated analytics tab while retaining
   Overview / Orders / Payments / Visits / Products / Feedback / Leads
   ------------------------------------------------------------ */
const __originalRenderCustomerDetail = window.renderCustomerDetail;

window.renderCustomerDetail = function(id, tab) {
  const c = getCustomer(id);
  if (!c) return __originalRenderCustomerDetail(id,tab);

  if (tab !== "360") return __originalRenderCustomerDetail(id,tab);

  const customerOrders = ORDERS.filter(o=>o.customerId===c.id);
  const orderTotal = customerOrders.reduce((s,o)=>s+Number(o.amount||0),0);
  const creditUtil = c.creditLimit ? c.outstanding/c.creditLimit*100 : 0;

  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold fs-6">${c.name}</div>
          <div class="text-faint" style="font-size:.76rem;">${c.owner} · ${c.phone} · ${c.area}, ${c.city}</div>
          <span class="badge-x badge-type-${c.type} mt-2 d-inline-block">${c.type}</span>
        </div>
        <div class="avatar-circle" style="background:var(--navy-950);">${c.name.substring(0,2).toUpperCase()}</div>
      </div>
    </div>

    <div class="tab-scroll mb-3">
      ${["Overview","360","Orders","Payments","Visits","Products","Feedback","Leads"].map(t=>
        `<span class="tab-chip ${t===tab?"active":""}" onclick="go('customerDetail',{id:'${id}',tab:'${t}'})">${t}</span>`
      ).join("")}
    </div>

    <div class="row g-2 mb-3">
      <div class="col-6">${biMetric("Monthly Sales",biMoney(c.salesThisMonth),"Current period")}</div>
      <div class="col-6">${biMetric("Order Value",biMoney(orderTotal),"Recorded orders")}</div>
      <div class="col-6">${biMetric("Outstanding",biMoney(c.outstanding),"Receivable")}</div>
      <div class="col-6">${biMetric("Credit Util.",biPct(creditUtil),"Approved limit")}</div>
      <div class="col-6">${biMetric("AOV",biMoney(c.avgOrderValue),"Average order")}</div>
      <div class="col-6">${biMetric("Status",c.status,"Account health")}</div>
    </div>

    ${biChartCard("Customer order history", "ddCustomerOrderChart", 220)}
    ${biChartCard("Commercial vs credit position", "ddCustomerCommercialChart", 220)}

    <div class="card-x p-3">
      <div class="section-title mb-2">Next actions</div>
      <div class="row g-2">
        ${actionTile("bi-bag-plus-fill","Take Order",`orderCustomerId='${c.id}';go('newOrder',{customerId:'${c.id}'})`)}
        ${actionTile("bi-cash-coin","Collect Payment","toast('Payment collection recorded')")}
        ${actionTile("bi-stars","Cross-sell",`showCustomerGapDrilldown('${c.id}')`)}
        ${actionTile("bi-signpost-split-fill","Plan Visit",`go('planVisit',{customerId:'${c.id}'})`)}
      </div>
    </div>
  </div>`;
};

/* Add the 360 tab to the normal customer detail navigation. */
const __originalCustomerTabContent = window.renderCustomerTabContent;
window.renderCustomerTabContent = function(c,tab) {
  if (tab === "360") {
    return ""; // handled by renderCustomerDetail override
  }
  return __originalCustomerTabContent(c,tab);
};

function renderCustomer360Charts(c) {
  const orders = ORDERS.filter(o=>o.customerId===c.id).slice().reverse();

  biLine(
    "ddCustomerOrderChart",
    orders.length ? orders.map(o=>o.date) : ["No orders"],
    orders.length ? orders.map(o=>o.amount) : [0]
  );

  biBar(
    "ddCustomerCommercialChart",
    ["Monthly Sales","Outstanding","Credit Limit"],
    [c.salesThisMonth,c.outstanding,c.creditLimit],
    [BI_THEME.orange,BI_THEME.red,BI_THEME.navy]
  );
}

/* render() calls the function above and inserts it into body-slot.
   Use a small observer-like hook after each render to draw the customer
   360 charts only when that screen is visible. */
const __originalAfterRenderHooks = window.afterRenderHooks;
window.afterRenderHooks = function() {
  if (typeof __originalAfterRenderHooks === "function") {
    try { __originalAfterRenderHooks(); } catch(e) {}
  }

  try {
    const s = getCurrentScreen();
    if (s && s.screen === "customerDetail" && s.params && s.params.tab === "360") {
      const c = getCustomer(s.params.id);
      if (c) setTimeout(()=>renderCustomer360Charts(c),0);
    }
  } catch(e) {}
};

/* ------------------------------------------------------------
   ORDER 360 — enrich the existing order confirmation screen with
   a visual comparison and a direct customer drill-through.
   ------------------------------------------------------------ */
const __originalRenderOrderConfirm = window.renderOrderConfirm;
window.renderOrderConfirm = function(orderId) {
  const html = __originalRenderOrderConfirm(orderId);
  const o = ORDERS.find(x=>x.id===orderId);
  if (!o) return html;

  const c = getCustomer(o.customerId);
  if (!c) return html;

  return html.replace(
    '</div>\n    <div class="d-flex gap-2 mt-3">',
    `${biChartCard("Order vs customer commercial position", "ddOrder360Chart", 190)}
    <button class="btn btn-crm-outline w-100 mb-2" onclick="go('customerDetail',{id:'${c.id}',tab:'360'})">
      <i class="bi bi-person-lines-fill me-1"></i> Open Customer 360°
    </button>
    </div>
    <div class="d-flex gap-2 mt-3">`
  );
};

const __originalRender = window.render;
window.render = function() {
  __originalRender();
  try {
    const s = getCurrentScreen();
    if (s && s.screen === "orderConfirm" && s.params && s.params.orderId) {
      const o = ORDERS.find(x=>x.id===s.params.orderId);
      const c = o ? getCustomer(o.customerId) : null;
      if (o && c) {
        setTimeout(() => {
          biBar("ddOrder360Chart",
            ["Order","Customer AOV","Credit Headroom"],
            [o.amount,c.avgOrderValue,Math.max(0,c.creditLimit-c.outstanding)],
            [BI_THEME.orange,BI_THEME.steel,BI_THEME.green]
          );
        },0);
      }
    }
  } catch(e) {}
};

/* ------------------------------------------------------------
   Fix: avoid any stale chart object from a closed modal.
   ------------------------------------------------------------ */
document.addEventListener("click", function(e) {
  const close = e.target.closest && e.target.closest('[onclick*="closeOverlay"]');
  if (close) {
    setTimeout(() => {
      Object.keys(chartInstances || {}).forEach(id => {
        if (!document.getElementById(id)) {
          try { destroyChart(id); } catch(err) {}
        }
      });
    }, 50);
  }
});
