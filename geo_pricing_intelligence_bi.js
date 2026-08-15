/* ============================================================
   GEOGRAPHIC & PRICING INTELLIGENCE  (additive)
   ------------------------------------------------------------
   Load order: data.js -> app.js -> insights-drilldown.js -> THIS FILE.
   This file reuses helpers from insights-drilldown.js (pctOf,
   getProductByName) and app.js (fmtINR, openModal, go, toast, etc.)
   and does not redefine or modify anything in those files.

   IMPORTANT DATA CAVEAT:
   Your mock data has no per-customer product line-item history
   (ORDERS only stores totals, QUOTATIONS only cover 3 customers).
   hasCustomerPurchased() below derives a deterministic, seeded
   "did this customer ever buy this part" signal from customer size
   + product popularity, so the same customer always shows the same
   gaps on every render (not randomized). Replace it with a real
   query the moment you have order line-items — every function that
   calls it (fastMoverGapsForCustomer, geoAreaSummary, etc.) will
   keep working unchanged.

   New screen: "geoInsights" — Territory (area) drill-down and a
   State roll-up, each expandable, down to per-customer product
   gaps and per-product pricing suggestions.

   Router integration needed (see bottom of file) — 4 tiny edits.
   ============================================================ */

/* ---------- 1. Deterministic "has this customer bought this part" ---------- */

function seededHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // -> [0,1)
}

function hasCustomerPurchased(customer, product) {
  const seed = seededHash(customer.id + "::" + product.id);
  const popularityBoost = product.fms === "F" ? 0.35 : product.fms === "M" ? 0.15 : 0;
  const sizeBoost = Math.min(0.25, customer.salesThisMonth / 2000000);
  return seed < (0.25 + popularityBoost + sizeBoost);
}

/* Fast movers a specific customer has never bought — the actual
   cross-sell / "why isn't this moving here" list. */
function fastMoverGapsForCustomer(customer) {
  return PRODUCTS.filter(p => p.fms === "F" && !hasCustomerPurchased(customer, p));
}

/* ---------- 2. Geographic roll-up: Area -> Customers -> Gaps ---------- */

function geoAreaSummary() {
  const areas = {};
  CUSTOMERS.forEach(c => {
    if (!areas[c.area]) areas[c.area] = { area: c.area, city: c.city, customers: [], sales: 0, outstanding: 0 };
    areas[c.area].customers.push(c);
    areas[c.area].sales += c.salesThisMonth;
    areas[c.area].outstanding += c.outstanding;
  });
  return Object.values(areas).map(a => {
    const gapCustomers = a.customers.filter(c => fastMoverGapsForCustomer(c).length > 0);
    const totalGapUnits = a.customers.reduce((s, c) => s + fastMoverGapsForCustomer(c).length, 0);
    return { ...a, gapCustomers, totalGapUnits };
  }).sort((a, b) => b.sales - a.sales);
}

/* ---------- 3. Pricing opportunity engine ---------- */

function pricingOpportunities() {
  return PRODUCTS.map(p => {
    const marginPct = pctOf(p.mrp - p.dealerPrice, p.mrp);
    let signal = null, suggestedAction = null, potentialGain = 0;

    if (p.fms === "F" && p.discount >= 8 && p.stock < 300) {
      // High demand + tightening stock = low price sensitivity risk.
      const trim = Math.min(4, p.discount - 4);
      signal = "raise";
      suggestedAction = `Trim discount ${p.discount}% → ${p.discount - trim}% — fast mover, limited stock, demand can absorb it.`;
      potentialGain = Math.round(p.dealerPrice * (trim / 100) * p.stock);
    } else if (p.fms === "S" && p.discount < 10) {
      signal = "lower";
      suggestedAction = `Discount alone won't move this — bundle into a Smart Bucket or push visibility instead of cutting price further.`;
    }
    return { ...p, marginPct, signal, suggestedAction, potentialGain };
  }).filter(p => p.signal);
}

/* ---------- 4. Extend the existing insight feed (no file edits needed) ---------- */

function computeGeoAndPricingInsights() {
  const extra = [];
  const areas = geoAreaSummary();
  const worstGapArea = areas.slice().sort((a, b) => b.totalGapUnits - a.totalGapUnits)[0];
  if (worstGapArea && worstGapArea.totalGapUnits > 0) {
    extra.push({
      icon: "bi-geo-alt-fill", tone: "amber",
      title: `${worstGapArea.area} has the most fast-mover gaps`,
      text: `${worstGapArea.gapCustomers.length} of ${worstGapArea.customers.length} customers there are missing at least one fast-moving SKU — a ready-made cross-sell list.`,
      action: () => showGeoAreaDrilldown(worstGapArea.area)
    });
  }
  const raise = pricingOpportunities().filter(p => p.signal === "raise").sort((a, b) => b.potentialGain - a.potentialGain);
  if (raise.length) {
    const top = raise[0];
    extra.push({
      icon: "bi-currency-rupee", tone: "green",
      title: `Pricing headroom on ${top.name}`,
      text: `${top.suggestedAction} Est. upside ≈ ${fmtINR(top.potentialGain)}.`,
      action: () => showPricingDrilldown()
    });
  }
  return extra;
}

/* Wrap (don't replace) the insight generator from insights-drilldown.js
   so the top-of-Reports insight cards automatically include these too. */
if (typeof computeBusinessInsights === "function") {
  const _baseComputeBusinessInsights = computeBusinessInsights;
  computeBusinessInsights = function () {
    return [..._baseComputeBusinessInsights(), ...computeGeoAndPricingInsights()];
  };
}

/* ---------- 5. Hierarchical screen: Region -> Territory -> Customer -> Product ---------- */

function toggleGeoNode(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.style.display !== "none";
  el.style.display = open ? "none" : "block";
  const chev = document.getElementById(id + "-chevron");
  if (chev) { chev.classList.toggle("bi-chevron-right", open); chev.classList.toggle("bi-chevron-down", !open); }
}

function renderStateAccordion() {
  const states = REGIONAL_SUMMARY.states;
  return `
  <div class="d-flex align-items-center gap-2 mb-2">
    <i class="bi bi-globe2" style="color:var(--navy-950);"></i>
    <div class="section-title mb-0">State-level Rollup</div>
  </div>
  <div class="card-x mb-3" style="overflow:hidden;">
    ${states.map((s, i) => `
      <div class="more-row ${i > 0 ? 'border-top' : ''}" style="cursor:pointer;" onclick="showStateDrilldown('${s.name}')">
        <span class="more-row-icon"><i class="bi bi-map-fill"></i></span>
        <div class="flex-grow-1">
          <div class="fw-semibold" style="font-size:0.84rem;">${s.name}</div>
          <div class="text-faint" style="font-size:0.7rem;">${fmtINR(s.sales)} of ${fmtINR(s.target)} · ${s.achievement.toFixed(1)}%</div>
        </div>
        <i class="bi bi-chevron-right text-faint"></i>
      </div>`).join("")}
  </div>`;
}

function pricingRowHTML(p, tone) {
  return `
  <div class="list-card mb-2" style="cursor:pointer;" onclick="showProductDrilldown('${p.id}')">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-semibold" style="font-size:0.84rem;">${p.img} ${p.name}</div>
        <div class="text-faint" style="font-size:0.7rem;">${p.suggestedAction}</div>
      </div>
      ${p.potentialGain ? `<span class="badge-x tone-${tone}-bg">${fmtINR(p.potentialGain)}</span>` : ""}
    </div>
  </div>`;
}

function renderGeoInsights() {
  const areas = geoAreaSummary();
  const pricing = pricingOpportunities();
  const raiseOps = pricing.filter(p => p.signal === "raise");
  const repriceOps = pricing.filter(p => p.signal === "lower");
  const showStates = typeof isRole === "function" && (isRole(USER_ROLES.REGIONAL_MANAGER) || isRole(USER_ROLES.ADMIN));

  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,.65);">GEOGRAPHIC & PRICING INTELLIGENCE</div>
      <div class="font-display fw-bold fs-6 mt-1">Region → Territory → Customer → Product</div>
      <div style="font-size:.75rem;opacity:.75;">Find exactly who isn't buying what, and where price has room to move.</div>
    </div>

    ${showStates ? renderStateAccordion() : ""}

    <div class="d-flex align-items-center gap-2 mb-2 mt-1">
      <i class="bi bi-diagram-3-fill" style="color:var(--steel-600);"></i>
      <div class="section-title mb-0">Territory Breakdown</div>
    </div>
    ${areas.map((a, i) => `
      <div class="card-x mb-2" style="overflow:hidden;">
        <div class="more-row" onclick="toggleGeoNode('geo-area-${i}')" style="cursor:pointer;">
          <span class="more-row-icon"><i class="bi bi-geo-alt-fill"></i></span>
          <div class="flex-grow-1">
            <div class="fw-bold" style="font-size:0.85rem;">${a.area}<span class="text-faint" style="font-size:0.7rem;"> · ${a.city}</span></div>
            <div class="text-faint" style="font-size:0.7rem;">${a.customers.length} customers · ${fmtINR(a.sales)} sales this month</div>
          </div>
          ${a.totalGapUnits > 0 ? `<span class="badge-x tone-amber-bg me-2">${a.totalGapUnits} gaps</span>` : `<span class="badge-x tone-green-bg me-2">Full coverage</span>`}
          <i class="bi bi-chevron-right" id="geo-area-${i}-chevron"></i>
        </div>
        <div id="geo-area-${i}" style="display:none;" class="border-top">
          ${a.customers.map(c => {
            const gaps = fastMoverGapsForCustomer(c);
            return `
            <div class="more-row" style="padding-left:44px;cursor:pointer;" onclick="showCustomerGapDrilldown('${c.id}')">
              <div class="flex-grow-1">
                <div class="fw-semibold" style="font-size:0.8rem;">${c.name}</div>
                <span class="badge-x badge-type-${c.type}">${c.type}</span>
              </div>
              ${gaps.length ? `<span class="badge-x tone-red-bg">${gaps.length} missing</span>` : `<span class="badge-x tone-green-bg">All fast movers</span>`}
              <i class="bi bi-chevron-right text-faint ms-2"></i>
            </div>`;
          }).join("")}
        </div>
      </div>`).join("")}

    <div class="d-flex align-items-center gap-2 mb-2 mt-3">
      <i class="bi bi-currency-rupee" style="color:var(--green-600);"></i>
      <div class="section-title mb-0">Pricing Opportunities</div>
    </div>
    <div class="card-x p-3 mb-3">
      ${raiseOps.length ? `<div class="text-faint mb-2" style="font-size:0.7rem;">RAISE — fast movers with headroom</div>` : ""}
      ${raiseOps.map(p => pricingRowHTML(p, "green")).join("")}
      ${repriceOps.length ? `<div class="text-faint mb-2 mt-3" style="font-size:0.7rem;">REPRICE / PROMOTE — slow movers, discount isn't the fix</div>` : ""}
      ${repriceOps.map(p => pricingRowHTML(p, "amber")).join("")}
      ${(!raiseOps.length && !repriceOps.length) ? emptyTab("bi-emoji-smile", "No pricing anomalies detected") : ""}
    </div>
  </div>`;
}

/* ---------- 6. Drill-through modals ---------- */

function showGeoAreaDrilldown(areaName) {
  const a = geoAreaSummary().find(x => x.area === areaName);
  if (!a) return;
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-geo-alt-fill"></i> ${a.area}</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    ${a.customers.map(c => {
      const gaps = fastMoverGapsForCustomer(c);
      return `
      <div class="list-card mb-2" style="cursor:pointer;" onclick="closeOverlay(); showCustomerGapDrilldown('${c.id}')">
        <div class="d-flex justify-content-between">
          <div class="fw-semibold" style="font-size:0.84rem;">${c.name}</div>
          ${gaps.length ? `<span class="badge-x tone-red-bg">${gaps.length} missing</span>` : `<span class="badge-x tone-green-bg">Full coverage</span>`}
        </div>
      </div>`;
    }).join("")}
  `);
}

function showCustomerGapDrilldown(customerId) {
  const c = getCustomer(customerId);
  const gaps = fastMoverGapsForCustomer(c);
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-person-lines-fill"></i> ${c.name} — Fast-Mover Coverage</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="text-faint mb-3" style="font-size:0.78rem;">${c.area}, ${c.city} · ${c.type}</div>
    ${gaps.length ? gaps.map(p => `
      <div class="list-card mb-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold" style="font-size:0.84rem;">${p.img} ${p.name}</div>
            <div class="text-faint mono" style="font-size:0.68rem;">${p.partNo} · ${fmtINR(p.dealerPrice)}</div>
          </div>
          <button class="btn btn-crm-primary btn-sm" onclick="addGapProductToOrder('${c.id}','${p.id}')">Add</button>
        </div>
      </div>`).join("") : `<div class="empty-state"><i class="bi bi-check2-circle"></i>Buys every fast-moving SKU in ${c.area}</div>`}
  `);
}

function addGapProductToOrder(customerId, productId) {
  orderCustomerId = customerId;
  cartQty[productId] = (cartQty[productId] || 0) + 1;
  toast("Added to order draft");
  closeOverlay();
  go('newOrder', { customerId });
}

function showPricingDrilldown() {
  const pricing = pricingOpportunities();
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-currency-rupee"></i> Pricing Opportunities</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    ${pricing.map(p => pricingRowHTML(p, p.signal === 'raise' ? 'green' : 'amber')).join("") || emptyTab("bi-emoji-smile", "No anomalies detected")}
  `);
}

/* ============================================================
   INTEGRATION — 4 small edits to wire the new screen into the router
   ============================================================

   1) In canAccessScreen(), add "geoInsights" to the `common` array
      so every role can open it:

         const common = [
           "home", "more", "notifications", "profile", "globalSearch",
           "reports", "monthlyReport", "managerLeaderboard",
           "geoInsights"                                    // <-- add
         ];

   2) In render()'s switch statement, add a case (put it near the
      other "reports" cases):

         case "geoInsights":
             html = renderGeoInsights();
             break;

   3) In renderSubHeader()'s titleMap, add a title so the back-header
      shows correctly:

         geoInsights: "Geographic & Pricing Insights",

   4) Add an entry point — easiest is inside renderMore()'s
      "Insights" menu group, alongside "Reports & Analytics":

         ["bi-geo-alt-fill", "Geo & Pricing Insights", "go('geoInsights')"],

      (Optional) also add a quick-access button at the top of
      renderReportsHome()'s role-specific renderers, e.g. in
      renderDSRReports():

         <button class="btn btn-crm-outline w-100 mb-3" onclick="go('geoInsights')">
           <i class="bi bi-geo-alt-fill me-1"></i> Geographic & Pricing Insights
         </button>
   ============================================================ */