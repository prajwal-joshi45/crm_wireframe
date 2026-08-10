/* ============================================================
   MOBILE VIEWPORT FIX
   ------------------------------------------------------------
   100vh on mobile browsers resizes every time the address bar
   shows/hides, which makes fixed elements (header, bottom nav)
   appear to "jump" as you scroll. We measure the real visible
   height in JS and expose it as --app-vh; app.css uses it as a
   fallback for browsers that don't support 100dvh yet.
   ============================================================ */
function setAppVH() {
  document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
}
setAppVH();
window.addEventListener('resize', setAppVH);
window.addEventListener('orientationchange', () => setTimeout(setAppVH, 60));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppVH);
}

/* ============================================================
   ROUTER + APP SHELL
   ============================================================ */
let stack = [{ screen: "home", tab: "home" }];
let cartQty = {}; // productId -> qty
let orderCustomerId = null;
let searchState = { q: "" };

/* ============================================================
   ROLE / HIERARCHY SYSTEM
   DSR -> SALES MANAGER -> REGIONAL MANAGER -> ADMIN
   ============================================================ */
const USER_ROLES = {
  DSR: "DSR",
  SALES_MANAGER: "SALES_MANAGER",
  REGIONAL_MANAGER: "REGIONAL_MANAGER",
  ADMIN: "ADMIN"
};

const CRM_USERS = [
  {
    username: "prajwal.deshmukh", password: "123456",
    name: "Prajwal Deshmukh", role: USER_ROLES.DSR,
    employeeId: "EMP-2291", territory: "Pune West",
    managerId: "MGR-1042", regionId: "WEST", avatar: "PD"
  },
  {
    username: "anita.kulkarni", password: "123456",
    name: "Anita Kulkarni", role: USER_ROLES.SALES_MANAGER,
    employeeId: "MGR-1042", territory: "Pune Region",
    regionId: "WEST", avatar: "AK"
  },
  {
    username: "amit.verma", password: "123456",
    name: "Amit Verma", role: USER_ROLES.REGIONAL_MANAGER,
    employeeId: "RM-1001", territory: "West Region",
    regionId: "WEST", avatar: "AV"
  },
  {
    username: "admin", password: "123456",
    name: "System Administrator", role: USER_ROLES.ADMIN,
    employeeId: "ADM-001", territory: "All India",
    regionId: "ALL", avatar: "SA"
  }
];

let currentUser = null;
try {
  const savedUser = localStorage.getItem("crm_current_user");
  if (savedUser) currentUser = JSON.parse(savedUser);
} catch (e) {
  currentUser = null;
}

function isRole(role) {
  return !!currentUser && currentUser.role === role;
}

function getRoleLabel() {
  if (!currentUser) return "";
  return currentUser.role === USER_ROLES.SALES_MANAGER ? "Sales Manager"
    : currentUser.role === USER_ROLES.REGIONAL_MANAGER ? "Regional Manager"
    : currentUser.role === USER_ROLES.ADMIN ? "Administrator"
    : "DSR";
}

function getRoleHomeGreeting() {
  if (!currentUser) return "Sales CRM";
  return currentUser.name.split(" ")[0];
}

function fmtPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function roleSalesSummary() {
  const total = DSR_LEADERBOARD.reduce((sum, d) => sum + d.sales, 0);
  const target = DSR_LEADERBOARD.reduce((sum, d) => sum + d.target, 0);
  const orders = DSR_LEADERBOARD.reduce((sum, d) => sum + d.orders, 0);
  const visits = DSR_LEADERBOARD.reduce((sum, d) => sum + d.visits, 0);
  const collection = DSR_LEADERBOARD.reduce((sum, d) => sum + d.collection, 0);
  return { total, target, orders, visits, collection, achievement: target ? total / target * 100 : 0 };
}

const REGIONAL_SUMMARY = {
  region: "West Region",
  target: 21200000,
  sales: 18400000,
  orders: 3482,
  collections: 14600000,
  activeManagers: 7,
  activeDSR: 42,
  visitCompliance: 89,
  states: [
    { name: "Maharashtra", sales: 8240000, target: 9250000, achievement: 89.1 },
    { name: "Gujarat", sales: 4120000, target: 4800000, achievement: 85.8 },
    { name: "Madhya Pradesh", sales: 4080000, target: 4920000, achievement: 82.9 },
    { name: "Goa", sales: 1760000, target: 1930000, achievement: 91.2 }
  ]
};

const ADMIN_SUMMARY = {
  target: 98600000,
  sales: 84600000,
  orders: 16420,
  collections: 70200000,
  regions: 5,
  managers: 34,
  dsr: 218,
  visitCompliance: 91
};

function getCurrentScreen () { return stack[stack.length - 1]; }

function pushHistory() {
  try { history.pushState({ depth: stack.length }, ""); } catch (e) {}
}

function go(screen, params = {}, tab = null) {
  if (!canAccessScreen(screen)) {
    toast("This section is not available for your role", "danger");
    return;
  }
  stack.push({ screen, params, tab: tab || getCurrentScreen().tab });
  pushHistory();
  render();
  scrollTop();
}

function canAccessScreen(screen) {
  if (!currentUser) return screen === "home";

  const common = [
    "home", "more", "notifications", "profile", "globalSearch",
    "reports", "monthlyReport", "managerLeaderboard"
  ];

  if (common.includes(screen)) return true;

  if (isRole(USER_ROLES.DSR)) return true;

  if (isRole(USER_ROLES.SALES_MANAGER)) {
    return [
      "team", "ordersHome", "customersList", "customerDetail",
      "ordersHome", "orderHistory", "quotations", "performance"
    ].includes(screen);
  }

  if (isRole(USER_ROLES.REGIONAL_MANAGER)) {
    return ["managers", "performance", "customersList", "customerDetail", "ordersHome"].includes(screen);
  }

  if (isRole(USER_ROLES.ADMIN)) return true;

  return false;
}
function replaceTop(screen, params = {}, tab = null) {
  stack[stack.length - 1] = { screen, params, tab: tab || getCurrentScreen().tab };
  render();
  scrollTop();
}
/* Previously this both popped the app-stack AND called history.back(),
   guarded by a suppressPopstate flag + setTimeout race. On slower taps
   (or a fast double-tap) the flag could reset before popstate fired,
   causing a double-pop that skipped a screen and briefly left the
   header/bottom-nav out of sync with the visible content. Now back()
   only asks the browser to go back; the single popstate listener below
   is the only place that ever pops the stack, so there's one source
   of truth and no race. */
function back() {
  if (stack.length > 1) {
    history.back();
  } else {
    goTab("home");
  }
}

function goTab(tab) {

    const navMap = {
        home: { screen: "home" },
        visits: { screen: "visitsList" },
        orders: { screen: "ordersHome" },
        customers: { screen: "customersList", params: { type: "All" } },
        more: { screen: "more" },
        team: { screen: "team" },
        reports: { screen: "reports" },
        performance: { screen: "performance" },
        managers: { screen: "managers" },
        users: { screen: "team" },
        masters: { screen: "more" }
    };

    const map = navMap[tab];

    if (!map) {
        console.warn("Unknown navigation tab:", tab);
        return;
    }

    if (!canAccessScreen(map.screen)) {
        toast("This section is not available for your role", "danger");
        return;
    }

    const current = getCurrentScreen();

    if (current && current.tab === tab && TOPLEVEL.includes(current.screen)) {
        scrollTop(true);
        return;
    }

    stack = [{ ...map, tab }];

    try {
        history.pushState({ depth: stack.length, tab }, "", window.location.href);
    } catch (e) {}

    render();
    requestAnimationFrame(() => scrollTop(true));
}
function scrollTop(smooth = false) {

    const b = document.getElementById("body-slot");

    if (!b) return;

    requestAnimationFrame(() => {

        b.scrollTo({
            top: 0,
            left: 0,
            behavior: smooth ? "smooth" : "auto"
        });

    });
}

window.addEventListener("popstate", () => {
  if (stack.length > 1) {
    stack.pop();
    render();
    scrollTop();
  } else {
    // At root of a tab — treat hardware/browser back as "go home"
    if (getCurrentScreen().tab !== "home") {
      goTab("home");
    }
  }
});

const TOPLEVEL = [
    "home",
    "visitsList",
    "ordersHome",
    "customersList",
    "more",

    // Sales Manager
    "team",

    // Regional Manager
    "managers",
    "performance",

    // Shared management screens
    "reports",

    // Admin
    "users"
];
function render() {

    stopVisitTimer();

    const s = getCurrentScreen();

    const bottomNav = document.getElementById("bottomnav-slot");

    if (bottomNav) {
        bottomNav.innerHTML = renderBottomNav(s.tab);
    }

    const isTop = TOPLEVEL.includes(s.screen);

    const header = document.getElementById("header-slot");

    if (header) {
        header.innerHTML =
            isTop
                ? renderTopHeader(s)
                : renderSubHeader(s);
    }

    let html = "";

    switch (s.screen) {

        case "home":
            html = renderHome();
            break;

        case "team":
            html = renderTeamHome();
            break;

        case "performance":
            html = renderPerformanceScreen();
            break;

        case "managers":
            html = renderManagersScreen();
            break;

        case "visitsList":
            html = renderVisitsList();
            break;

        case "planVisit":
            html = renderPlanVisit();
            break;

        case "visitDetail":
            html = renderVisitDetail(s.params.id);
            break;

        case "ordersHome":
            html = renderOrdersHome();
            break;

        case "newOrderPickCustomer":
            html = renderPickCustomerForOrder();
            break;

        case "newOrder":
            html = renderNewOrder(s.params.customerId);
            break;

        case "cart":
            html = renderCart();
            break;

        case "creditCheck":
            html = renderCreditCheck();
            break;

        case "orderConfirm":
            html = renderOrderConfirm(s.params.orderId);
            break;

        case "orderHistory":
            html = renderOrderHistory();
            break;

        case "quotations":
            html = renderQuotations();
            break;

        case "customersList":
            html = renderCustomersList(
                s.params.type || "All"
            );
            break;

        case "customerDetail":
            html = renderCustomerDetail(
                s.params.id,
                s.params.tab || "Overview"
            );
            break;

        case "addRetailer":
            html = renderAddRetailer();
            break;

        case "addMechanic":
            html = renderAddMechanic();
            break;

        case "more":
            html = renderMore();
            break;

        case "attendance":
            html = renderAttendance();
            break;

        case "feedback":
            html = renderFeedback(
                s.params.customerId
            );
            break;

        case "leads":
            html = renderLeads();
            break;

        case "newLead":
            html = renderNewLead();
            break;

        case "fms":
            html = renderFMS();
            break;

        case "smartBucket":
            html = renderSmartBucketScreen();
            break;

        case "discountRules":
            html = renderDiscountRules();
            break;

        case "reports":
            html = renderReportsHome();
            break;

        case "monthlyReport":
            html = renderMonthlyReport();
            break;

        case "notifications":
            html = renderNotifications();
            break;

        case "profile":
            html = renderProfile();
            break;

        case "globalSearch":
            html = renderGlobalSearch();
            break;

        case "managerLeaderboard":
            html = renderManagerLeaderboard();
            break;

        default:
            html = `
                <div class="empty-state">
                    <i class="bi bi-tools"></i>
                    Screen coming soon
                </div>
            `;
    }

    const body = document.getElementById("body-slot");

    if (body) {
        body.innerHTML = html;
    }

    const fab = document.getElementById("fab-slot");

    if (fab) {
        fab.style.display =
            s.screen === "visitsList"
                ? "flex"
                : "none";
    }

    const appScreen =
        document.querySelector(".app-screen");

    if (appScreen) {

        appScreen.classList.toggle(
            "has-sticky-footer",
            !!document.getElementById("cartFooter")
        );

    }

    afterRenderHooks(
        s.screen,
        s.params
    );
}

function renderBottomNav(activeTab) {

    let items;

    if (isRole(USER_ROLES.SALES_MANAGER)) {
        items = [
            { tab: "home", icon: "bi-house-door-fill", label: "Home" },
            { tab: "team", icon: "bi-people-fill", label: "Team" },
            { tab: "orders", icon: "bi-bag-check-fill", label: "Orders" },
            { tab: "reports", icon: "bi-bar-chart-fill", label: "Reports" },
            { tab: "more", icon: "bi-grid-3x3-gap-fill", label: "More" }
        ];
    } else if (isRole(USER_ROLES.REGIONAL_MANAGER)) {
        items = [
            { tab: "home", icon: "bi-house-door-fill", label: "Home" },
            { tab: "managers", icon: "bi-diagram-3-fill", label: "Managers" },
            { tab: "reports", icon: "bi-bar-chart-fill", label: "Reports" },
            { tab: "performance", icon: "bi-graph-up-arrow", label: "Performance" },
            { tab: "more", icon: "bi-grid-3x3-gap-fill", label: "More" }
        ];
    } else if (isRole(USER_ROLES.ADMIN)) {
        items = [
            { tab: "home", icon: "bi-house-door-fill", label: "Home" },
            { tab: "users", icon: "bi-people-fill", label: "Users" },
            { tab: "reports", icon: "bi-bar-chart-fill", label: "Reports" },
            { tab: "performance", icon: "bi-speedometer2", label: "Performance" },
            { tab: "more", icon: "bi-grid-3x3-gap-fill", label: "More" }
        ];
    } else {
        items = [
            { tab: "home", icon: "bi-house-door-fill", label: "Home" },
            { tab: "visits", icon: "bi-signpost-split-fill", label: "Visits" },
            { tab: "orders", icon: "bi-bag-check-fill", label: "Orders" },
            { tab: "customers", icon: "bi-people-fill", label: "Customers" },
            { tab: "more", icon: "bi-grid-3x3-gap-fill", label: "More" }
        ];
    }

    return items.map(item => {
        const active = item.tab === activeTab;
        return `
            <button type="button" class="nav-item ${active ? "active" : ""}"
                data-tab="${item.tab}" onclick="goTab('${item.tab}')"
                aria-label="${item.label}" aria-current="${active ? "page" : "false"}">
                <span class="nav-ic-wrap"><i class="bi ${item.icon}"></i></span>
                <span>${item.label}</span>
            </button>`;
    }).join("");
}
function unreadNotifCount() {
  return (state.notifications || []).filter(n => !n.read).length;
}

function renderTopHeader(s) {
  if (s.screen === "home") {
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const unread = unreadNotifCount();
    const role = getRoleLabel();
    const territory = currentUser?.territory || DSR.territory;
    const avatar = currentUser?.avatar || DSR.avatar;
    return `
    <div class="topbar">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="route-status ${state.offline ? "offline" : ""}" onclick="toggleOffline()">
            <span class="dot"></span>${state.offline ? "Offline — syncing" : "Online"}
          </div>
          <h5 class="font-display fw-bold mb-0 mt-2">${greet}, ${getRoleHomeGreeting()}</h5>
          <div style="font-size:0.76rem; opacity:0.75;"><i class="bi bi-geo-alt-fill"></i> ${territory} · ${role}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn p-0 text-white position-relative" onclick="go('notifications')" style="width:36px;height:36px;">
            <i class="bi bi-bell-fill fs-5"></i>
            ${unread > 0 ? `<span class="position-absolute top-0 end-0 translate-middle badge rounded-pill" style="background:var(--orange-500);width:9px;height:9px;padding:0;"></span>` : ""}
          </button>
          <div class="avatar-circle" onclick="go('profile')" style="cursor:pointer;">${avatar}</div>
        </div>
      </div>
      <div class="mt-3" onclick="go('globalSearch')" style="cursor:pointer;">
        <div class="search-bar" style="background:rgba(255,255,255,0.12); border-color:transparent;">
          <i class="bi bi-search text-white-50"></i>
          <span style="color:rgba(255,255,255,0.55); font-size:0.85rem;">Search customers, products, orders…</span>
        </div>
      </div>
      ${isRole(USER_ROLES.DSR) ? `<div class="mt-3 pill-toggle">
        <button class="${state.homeView === 'today' ? 'active' : ''}" onclick="setHomeView('today')">TODAY</button>
        <button class="${state.homeView === 'month' ? 'active' : ''}" onclick="setHomeView('month')">MONTH</button>
      </div>` : ""}
    </div>`;
  }
  const titles = { visitsList: "Visits", ordersHome: "Orders", customersList: "Customers", more: "More", team: "Team", performance: "Performance", managers: "Managers", reports: "Reports" };
  return `
    <div class="topbar" style="padding-bottom:16px;">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="font-display fw-bold mb-0">${titles[s.screen] || getRoleLabel()}</h5>
        <div class="d-flex align-items-center gap-2">
          <button class="btn p-0 text-white" onclick="go('notifications')" style="width:34px;height:34px;"><i class="bi bi-bell-fill fs-5"></i></button>
          <div class="avatar-circle avatar-sm" onclick="go('profile')" style="cursor:pointer;">${currentUser?.avatar || DSR.avatar}</div>
        </div>
      </div>
    </div>`;
}

function renderSubHeader(s) {
  const titleMap = {
    planVisit: "Plan Visit", visitDetail: "Visit Details", newOrderPickCustomer: "Select Customer",
    newOrder: "New Order", cart: "Cart", creditCheck: "Credit Check", orderConfirm: "Order Confirmation",
    orderHistory: "Order History", quotations: "Quotations", customerDetail: "Customer Profile",
    addRetailer: "Add Retailer", addMechanic: "Add Mechanic", attendance: "Attendance",
    feedback: "Visit Feedback", leads: "Leads", newLead: "New Lead", fms: "FMS Products",
    smartBucket: "Smart Buckets", discountRules: "Discount Rules", reports: "Reports",
    monthlyReport: "Monthly Analytics", notifications: "Notifications", profile: "My Profile",
    globalSearch: "Search", managerLeaderboard: "Team Leaderboard", team: "Team Performance",
    performance: "Performance Analytics", managers: "Manager Performance"
  };
const params = s.params || {};

const sub = {
    newOrder: orderCustomerId
        ? (getCustomer(orderCustomerId)?.name || "")
        : "",

    customerDetail: params.id
        ? (getCustomer(params.id)?.type || "")
        : ""
};
  return `
    <div class="topbar-sub">
      <button class="back-btn" onclick="back()" aria-label="Go back"><i class="bi bi-arrow-left"></i></button>
      <div>
        <h6>${titleMap[s.screen] || ""}</h6>
        ${sub[s.screen] ? `<div class="sub-label">${sub[s.screen]}</div>` : ""}
      </div>
    </div>`;
}

function toggleOffline() {
  state.offline = !state.offline;
  state.pendingSync = state.offline ? 3 : 0;
  render();
  if (!state.offline) toast("Synced 3 items successfully", "success");
}
function setHomeView(v) { state.homeView = v; render(); }

/* ============================================================
   TOASTS / SHEETS / MODALS
   ============================================================ */
function toast(msg, tone = "success") {
  const el = document.getElementById("toast-slot");
  const icon = tone === "success" ? "bi-check-circle-fill" : tone === "danger" ? "bi-exclamation-triangle-fill" : "bi-info-circle-fill";
  el.innerHTML = `<div class="toast-x"><i class="bi ${icon}" style="color:${tone === 'success' ? '#4ADE80' : tone === 'danger' ? '#F87171' : '#93C5FD'}"></i>${msg}</div>`;
  setTimeout(() => { el.innerHTML = ""; }, 2400);
}
function openSheet(html) {
  document.getElementById("overlay-slot").innerHTML = `
    <div class="sheet-backdrop" onclick="if(event.target===this) closeOverlay()">
      <div class="sheet-panel"><div class="sheet-handle"></div>${html}</div>
    </div>`;
}
function openModal(html) {
  document.getElementById("overlay-slot").innerHTML = `
    <div class="modal-backdrop-x" onclick="if(event.target===this) closeOverlay()">
      <div class="modal-panel-x">${html}</div>
    </div>`;
}
function openWideModal(html) {
  document.getElementById("overlay-slot").innerHTML = `
    <div class="modal-backdrop-x" onclick="if(event.target===this) closeOverlay()">
      <div class="modal-panel-x wide">${html}</div>
    </div>`;
}
function closeOverlay() {
  document.getElementById("overlay-slot").innerHTML = "";
  if (window.__pdfBlobUrl) { URL.revokeObjectURL(window.__pdfBlobUrl); window.__pdfBlobUrl = null; }
  window.__currentPdfDoc = null;
}

/* ============================================================
   LOGIN
   ============================================================ */
function fillDemoLogin(username, password) {
  const u = document.getElementById("login-user");
  const p = document.getElementById("login-pass");
  if (u) u.value = username;
  if (p) p.value = password;
}

function renderLogin() {
  document.getElementById("app-root").innerHTML = `
  <div class="app-screen">
    <div class="screen-body" style="padding-bottom:0;">
      <div class="login-wrap">
        <div class="login-logo"><i class="bi bi-truck-front-fill"></i></div>
        <h3 class="font-display fw-bold mb-0">Sales CRM</h3>
        <div style="opacity:0.75; font-size:0.85rem; margin-bottom:26px;">Field Sales · Distribution · Automotive</div>
        <div class="login-card">
          <div class="form-row">
            <label class="form-label-x">Username / Mobile Number</label>
            <input class="form-control-x" id="login-user" value="prajwal.deshmukh" autocomplete="username" />
          </div>
          <div class="form-row">
            <label class="form-label-x">Password / PIN</label>
            <input class="form-control-x" id="login-pass" type="password" value="123456" autocomplete="current-password" />
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3" style="font-size:0.8rem;">
            <label class="d-flex align-items-center gap-2 text-muted-x"><input type="checkbox" checked/> Remember me</label>
            <a href="#" class="link-sm" onclick="return false;">Forgot password?</a>
          </div>
          <button class="btn btn-crm-primary w-100" onclick="doLogin()">Login</button>

          <div class="mt-3 pt-3 border-top">
            <div class="text-faint mb-2" style="font-size:0.68rem;">DEMO ROLE LOGINS</div>
            <div class="d-grid gap-2" style="grid-template-columns:1fr 1fr;">
              <button class="btn btn-crm-outline btn-sm" onclick="fillDemoLogin('prajwal.deshmukh','123456')">DSR</button>
              <button class="btn btn-crm-outline btn-sm" onclick="fillDemoLogin('anita.kulkarni','123456')">Sales Manager</button>
              <button class="btn btn-crm-outline btn-sm" onclick="fillDemoLogin('amit.verma','123456')">Regional Manager</button>
              <button class="btn btn-crm-outline btn-sm" onclick="fillDemoLogin('admin','123456')">Admin</button>
            </div>
          </div>
        </div>
        <div class="text-center mt-4" style="opacity:0.5; font-size:0.72rem;">Version 4.3.0 · Role Hierarchy Enabled</div>
      </div>
    </div>
  </div>`;
}

function doLogin() {
  const username = document.getElementById("login-user")?.value.trim();
  const password = document.getElementById("login-pass")?.value.trim();
  const user = CRM_USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    toast("Invalid username or password", "danger");
    return;
  }

  currentUser = { ...user };
  localStorage.setItem("crm_current_user", JSON.stringify(currentUser));

  initApp();
  setTimeout(() => toast(`Welcome ${currentUser.name}`, "success"), 100);
}

function doLogout() {
  closeOverlay();
  currentUser = null;
  localStorage.removeItem("crm_current_user");
  stack = [{ screen: "home", tab: "home" }];
  cartQty = {};
  orderCustomerId = null;
  renderLogin();
}

/* ============================================================
   APP SHELL INIT
   ============================================================ */
function initApp() {

    document.getElementById("app-root").innerHTML = `

        <div class="app-screen">

            <div id="header-slot"></div>

            <main
                class="screen-body"
                id="body-slot"
                role="main"
            ></main>

            <button
                class="fab"
                id="fab-slot"
                onclick="go('planVisit')"
                style="display:none;"
                aria-label="Plan a new visit"
            >
                <i class="bi bi-plus-lg"></i>
            </button>

            <nav
                class="bottom-nav"
                id="bottomnav-slot"
                aria-label="Main navigation"
            ></nav>

            <div id="overlay-slot"></div>

            <div
                id="toast-slot"
                aria-live="polite"
                aria-atomic="true"
            ></div>

        </div>
    `;

    stack = [
        {
            screen: "home",
            tab: "home"
        }
    ];

    try {
        history.replaceState(
            {
                depth: 1,
                tab: "home"
            },
            "",
            window.location.href
        );
    } catch (e) {}

    render();

    requestAnimationFrame(() => {
        scrollTop(false);
    });
}

/* ============================================================
   HOME DASHBOARD
   ============================================================ */
function renderHome() {
  if (isRole(USER_ROLES.SALES_MANAGER)) return renderSalesManagerHome();
  if (isRole(USER_ROLES.REGIONAL_MANAGER)) return renderRegionalManagerHome();
  if (isRole(USER_ROLES.ADMIN)) return renderAdminHome();
  return state.homeView === "today" ? renderHomeToday() : renderHomeMonth();
}

function metricCard(label, value, icon, note = "") {
  return `<div class="kpi-card"><div class="kpi-icon"><i class="bi ${icon}"></i></div><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${note ? `<div class="kpi-sub">${note}</div>` : ""}</div>`;
}

function renderSalesManagerHome() {
  const x = roleSalesSummary();
  const top = DSR_LEADERBOARD.slice(0, 5);
  return `<div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,.65);">TEAM DASHBOARD · ${MANAGER.territory}</div>
      <div class="font-display fw-bold fs-4 mt-1">${fmtINR(x.total)} <span style="font-size:.9rem;opacity:.7;">/ ${fmtINR(x.target)}</span></div>
      <div style="font-size:.75rem;opacity:.75;">${fmtPct(x.achievement)} team target achievement</div>
      <div class="progress-track mt-3" style="background:rgba(255,255,255,.15);"><div class="progress-fill" style="width:${Math.min(x.achievement,100)}%;background:var(--orange-500);"></div></div>
    </div>
    <div class="kpi-grid mb-3">
      ${metricCard("Team Sales", fmtINR(x.total), "bi-currency-rupee", "This month")}
      ${metricCard("Orders", x.orders, "bi-bag-check-fill", "Team total")}
      ${metricCard("Visits", x.visits, "bi-signpost-split-fill", "Planned + completed")}
      ${metricCard("Collections", fmtINR(x.collection), "bi-cash-coin", "Collected")}
    </div>
    <div class="card-x p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2"><div class="section-title">DSR Performance</div><button class="btn btn-crm-outline btn-sm" onclick="go('managerLeaderboard')">View All</button></div>
      ${top.map((d,i)=>`<div class="py-2 ${i?'border-top':''}"><div class="d-flex justify-content-between"><span class="fw-semibold" style="font-size:.82rem;">${d.name}</span><span class="fw-bold">${fmtINR(d.sales)}</span></div><div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(d.sales/d.target*100,100)}%;background:var(--orange-500);"></div></div><div class="d-flex justify-content-between text-faint mt-1" style="font-size:.68rem;"><span>${fmtPct(d.sales/d.target*100)} achievement</span><span>${d.orders} orders · ${d.visits} visits</span></div></div>`).join("")}
    </div>
    <div class="row g-2"><div class="col-6"><button class="btn btn-crm-primary w-100" onclick="go('reports')"><i class="bi bi-bar-chart-fill me-1"></i> Reports</button></div><div class="col-6"><button class="btn btn-crm-outline w-100" onclick="go('team')"><i class="bi bi-people-fill me-1"></i> My Team</button></div></div>
  </div>`;
}

function renderRegionalManagerHome() {
  const r = REGIONAL_SUMMARY;
  return `<div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,.65);">REGIONAL DASHBOARD · ${r.region}</div>
      <div class="font-display fw-bold fs-4 mt-1">${fmtINR(r.sales)} <span style="font-size:.9rem;opacity:.7;">/ ${fmtINR(r.target)}</span></div>
      <div style="font-size:.75rem;opacity:.75;">${fmtPct(r.sales/r.target*100)} regional target achievement</div>
      <div class="progress-track mt-3" style="background:rgba(255,255,255,.15);"><div class="progress-fill" style="width:${Math.min(r.sales/r.target*100,100)}%;background:var(--orange-500);"></div></div>
    </div>
    <div class="kpi-grid mb-3">
      ${metricCard("Regional Sales", fmtINR(r.sales), "bi-currency-rupee", "Current month")}
      ${metricCard("Managers", r.activeManagers, "bi-diagram-3-fill", "Active")}
      ${metricCard("DSRs", r.activeDSR, "bi-people-fill", "Active")}
      ${metricCard("Collections", fmtINR(r.collections), "bi-cash-coin", "Collected")}
    </div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">State Performance</div>${r.states.map((st,i)=>`<div class="py-2 ${i?'border-top':''}"><div class="d-flex justify-content-between"><span class="fw-semibold" style="font-size:.82rem;">${st.name}</span><span class="fw-bold">${fmtINR(st.sales)}</span></div><div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(st.achievement,100)}%;background:var(--steel-500);"></div></div><div class="text-faint mt-1" style="font-size:.68rem;">${fmtPct(st.achievement)} achievement · Target ${fmtINR(st.target)}</div></div>`).join("")}</div>
    <div class="row g-2"><div class="col-6"><button class="btn btn-crm-primary w-100" onclick="go('reports')">Regional Reports</button></div><div class="col-6"><button class="btn btn-crm-outline w-100" onclick="go('managers')">Managers</button></div></div>
  </div>`;
}

function renderAdminHome() {
  const a = ADMIN_SUMMARY;
  return `<div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,.65);">EXECUTIVE DASHBOARD · ALL INDIA</div>
      <div class="font-display fw-bold fs-4 mt-1">${fmtINR(a.sales)} <span style="font-size:.9rem;opacity:.7;">/ ${fmtINR(a.target)}</span></div>
      <div style="font-size:.75rem;opacity:.75;">${fmtPct(a.sales/a.target*100)} company target achievement</div>
      <div class="progress-track mt-3" style="background:rgba(255,255,255,.15);"><div class="progress-fill" style="width:${Math.min(a.sales/a.target*100,100)}%;background:var(--orange-500);"></div></div>
    </div>
    <div class="kpi-grid mb-3">
      ${metricCard("Company Sales", fmtINR(a.sales), "bi-currency-rupee", "All regions")}
      ${metricCard("Orders", a.orders, "bi-bag-check-fill", "Current month")}
      ${metricCard("Managers", a.managers, "bi-diagram-3-fill", `${a.regions} regions`)}
      ${metricCard("DSRs", a.dsr, "bi-people-fill", "Active field force")}
    </div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">Management Overview</div><div class="row g-2"><div class="col-6"><div class="tone-steel-bg p-2 rounded-3"><div class="text-faint" style="font-size:.68rem;">Collections</div><div class="fw-bold">${fmtINR(a.collections)}</div></div></div><div class="col-6"><div class="tone-green-bg p-2 rounded-3"><div class="text-faint" style="font-size:.68rem;">Visit Compliance</div><div class="fw-bold">${a.visitCompliance}%</div></div></div></div></div>
    <button class="btn btn-crm-primary w-100" onclick="go('reports')"><i class="bi bi-bar-chart-fill me-1"></i> Executive Reports</button>
  </div>`;
}

function renderHomeToday() {
  const completed = TODAY_VISITS.filter(v => v.status === "Completed").length;
  const pending = TODAY_VISITS.filter(v => v.status === "Planned" || v.status === "In Progress").length;
  const skipped = TODAY_VISITS.filter(v => v.status === "Skipped").length;
  const total = TODAY_VISITS.length;
  const pct = Math.round((completed / total) * 100);

  return `
  <div class="section-pad">
    ${state.offline ? `<div class="card-x tone-amber-bg p-2 px-3 mb-3 d-flex align-items-center gap-2" style="font-size:0.78rem; font-weight:600; cursor:pointer;" onclick="toggleOffline()">
        <i class="bi bi-cloud-slash-fill"></i> ${state.pendingSync} items waiting to sync — tap to sync now
      </div>` : ""}

    <div class="kpi-grid mb-3">
      <div class="kpi-card" style="cursor:pointer;" onclick="goTab('visits')">
        <div class="kpi-icon tone-steel-bg"><i class="bi bi-signpost-split-fill"></i></div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-label">Today's Visits · ${completed} done</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="goTab('orders')">
        <div class="kpi-icon tone-orange-bg"><i class="bi bi-bag-check-fill"></i></div>
        <div class="kpi-value">${fmtINR(124500)}</div>
        <div class="kpi-label">Today's Orders · 18 orders</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('reports')">
        <div class="kpi-icon tone-green-bg"><i class="bi bi-cash-coin"></i></div>
        <div class="kpi-value">${fmtINR(72500)}</div>
        <div class="kpi-label">Collections Today</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('attendance')">
        <div class="kpi-icon tone-navy"><i class="bi bi-check2-circle"></i></div>
        <div class="kpi-value">${state.attendanceMarked ? "Present" : "Not Marked"}</div>
        <div class="kpi-label">Attendance · ${state.attendanceMarked ? state.attendanceTime : "Tap to mark"}</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('customersList',{type:'Retailer'})">
        <div class="kpi-icon tone-steel-bg"><i class="bi bi-shop"></i></div>
        <div class="kpi-value">4</div>
        <div class="kpi-label">New Retailers</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('customersList',{type:'Mechanic'})">
        <div class="kpi-icon tone-orange-bg"><i class="bi bi-tools"></i></div>
        <div class="kpi-value">7</div>
        <div class="kpi-label">New Mechanics</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('leads')">
        <div class="kpi-icon tone-amber-bg"><i class="bi bi-hourglass-split"></i></div>
        <div class="kpi-value">6</div>
        <div class="kpi-label">Pending Follow-ups</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="go('reports')">
        <div class="kpi-icon tone-green-bg"><i class="bi bi-graph-up-arrow"></i></div>
        <div class="kpi-value">84%</div>
        <div class="kpi-label">Target Achieved</div>
      </div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <div class="section-title">Today's Visit Progress</div>
          <div style="font-size:0.8rem;" class="text-muted-x mt-1">${completed} / ${total} visits completed</div>
        </div>
        <div class="gauge-wrap">${gaugeSVG(pct, 58, "var(--orange-500)")}</div>
      </div>
      <div class="progress-track mt-3">
        <div class="progress-fill" style="width:${(completed/total)*100}%; background:var(--green-600);"></div>
        <div class="progress-fill" style="width:${(pending/total)*100}%; background:var(--amber-500);"></div>
        <div class="progress-fill" style="width:${(skipped/total)*100}%; background:var(--red-500);"></div>
      </div>
      <div class="d-flex gap-3 mt-2" style="font-size:0.68rem;">
        <span><span style="color:var(--green-600);">●</span> Completed ${completed}</span>
        <span><span style="color:var(--amber-500);">●</span> Pending ${pending}</span>
        <span><span style="color:var(--red-500);">●</span> Skipped ${skipped}</span>
      </div>
      <button class="btn btn-crm-ghost w-100 mt-3" onclick="goTab('visits')">View Today's Visits</button>
    </div>

    <div class="mb-2 section-title">Quick Actions</div>
    <div class="qa-scroll mb-3">
      ${quickAction("bi-bag-plus-fill", "New Order", "go('newOrderPickCustomer')")}
      ${quickAction("bi-calendar-plus-fill", "Plan Visit", "go('planVisit')")}
      ${quickAction("bi-shop", "Add Retailer", "go('addRetailer')")}
      ${quickAction("bi-tools", "Add Mechanic", "go('addMechanic')")}
      ${quickAction("bi-person-plus-fill", "New Lead", "go('newLead')")}
      ${quickAction("bi-star-fill", "Feedback", "go('feedback')")}
      ${quickAction("bi-fingerprint", "Attendance", "go('attendance')")}
      ${quickAction("bi-file-earmark-text-fill", "Quotation", "go('quotations')")}
    </div>

    <div class="card-x p-3">
      <div class="section-title mb-2">Today's Activity</div>
      <div class="route-timeline mt-3">
        ${ACTIVITY_TIMELINE.map(a => `
          <div class="route-item">
            <div class="route-dot tone-${a.tone === 'pending' ? 'amber-bg' : a.tone + '-bg'}"><i class="bi ${a.icon}"></i></div>
            <div class="route-time">${a.time}</div>
            <div class="route-text">${a.text}</div>
          </div>`).join("")}
      </div>
    </div>
  </div>`;
}

function quickAction(icon, label, onclick) {
  return `<button class="qa-item" onclick="${onclick}">
    <span class="qa-icon"><i class="bi ${icon}"></i></span>
    <span class="qa-label">${label}</span>
  </button>`;
}

function gaugeSVG(pct, size, color) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/>
  </svg>
  <div class="gauge-center"><span class="val">${pct}%</span></div>`;
}

function renderHomeMonth() {
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg, var(--navy-950), var(--navy-700)); color:#fff; border:none;">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="eyebrow" style="color:rgba(255,255,255,0.6);">Sales Target · August 2026</div>
          <div class="font-display fw-bold fs-4 mt-1">${fmtINR(DSR.achieved)}</div>
          <div style="font-size:0.75rem; opacity:0.7;">of ${fmtINR(DSR.target)} target</div>
        </div>
        <div class="gauge-wrap">${gaugeSVG(Math.round(DSR.achieved/DSR.target*100), 66, "var(--orange-500)")}</div>
      </div>
      <div class="progress-track mt-3" style="background:rgba(255,255,255,0.15);">
        <div class="progress-fill" style="width:${Math.round(DSR.achieved/DSR.target*100)}%; background:var(--orange-500);"></div>
      </div>
    </div>

    <div class="kpi-grid mb-3">
      <div class="kpi-card"><div class="kpi-icon tone-navy"><i class="bi bi-currency-rupee"></i></div><div class="kpi-value">₹42.0L</div><div class="kpi-label">Total Sales</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-orange-bg"><i class="bi bi-bag-check-fill"></i></div><div class="kpi-value">188</div><div class="kpi-label">Total Orders</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-steel-bg"><i class="bi bi-signpost-split-fill"></i></div><div class="kpi-value">212</div><div class="kpi-label">Total Visits</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-green-bg"><i class="bi bi-check2-all"></i></div><div class="kpi-value">196</div><div class="kpi-label">Completed Visits</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-orange-bg"><i class="bi bi-shop"></i></div><div class="kpi-value">21</div><div class="kpi-label">New Retailers</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-steel-bg"><i class="bi bi-tools"></i></div><div class="kpi-value">34</div><div class="kpi-label">New Mechanics</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-amber-bg"><i class="bi bi-person-lines-fill"></i></div><div class="kpi-value">28</div><div class="kpi-label">New Leads</div></div>
      <div class="kpi-card"><div class="kpi-icon tone-red-bg"><i class="bi bi-exclamation-circle-fill"></i></div><div class="kpi-value">₹18.1L</div><div class="kpi-label">Outstanding</div></div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Sales Trend <span class="link-sm" style="cursor:pointer;" onclick="go('monthlyReport')">Full Report</span></div>
      <div style="height:170px;"><canvas id="salesTrendChart"></canvas></div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Account Type Sales Segregation</div>
      <div class="d-flex align-items-center gap-3">
        <div style="width:130px;height:130px;"><canvas id="accountPieChart"></canvas></div>
        <div class="flex-grow-1">
          ${ACCOUNT_TYPE_SALES.map(a => `
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge-x badge-type-${a.type}">${a.type}</span>
              <span class="fw-bold" style="font-size:0.85rem;">${a.pct}%</span>
            </div>`).join("")}
        </div>
      </div>
      <hr class="hr-x"/>
      ${ACCOUNT_TYPE_SALES.map(a => `
        <div class="d-flex justify-content-between align-items-center mb-2" style="font-size:0.8rem;">
          <div class="fw-semibold">${a.type}</div>
          <div class="text-end">
            <div>${fmtINR(a.sales)} <span class="text-faint">· ${a.orders} ord</span></div>
            <div class="text-faint" style="font-size:0.7rem;">Outstanding ${fmtINR(a.outstanding)}</div>
          </div>
        </div>`).join("")}
    </div>

    <button class="btn btn-crm-outline w-100" onclick="go('reports')">View Full Reports</button>
  </div>`;
}

function afterRenderHooks(screen, params) {
  if (screen === "home" && state.homeView === "month") {
    setTimeout(() => {
      drawLineChart("salesTrendChart", WEEKLY_SALES.map(w => w.label), WEEKLY_SALES.map(w => w.value));
      drawPieChart("accountPieChart", ACCOUNT_TYPE_SALES.map(a => a.type), ACCOUNT_TYPE_SALES.map(a => a.pct));
    }, 0);
  }
  if (screen === "monthlyReport") {
    setTimeout(() => {
      drawLineChart("mrSalesChart", WEEKLY_SALES.map(w => w.label), WEEKLY_SALES.map(w => w.value));
      drawBarChart("mrVisitsChart", ["Planned","Completed","Skipped"], [212,196,16], ["#2C79AC","#1E9E5A","#D6483F"]);
      drawPieChart("mrAccountChart", ACCOUNT_TYPE_SALES.map(a=>a.type), ACCOUNT_TYPE_SALES.map(a=>a.pct));
      drawBarChart("mrFmsChart", ["Fast","Medium","Slow"], [62,28,10], ["#1E9E5A","#E8A23D","#D6483F"]);
    }, 0);
  }
  if (screen === "reports") {
    setTimeout(() => {
      drawBarChart("repAccountChart", ACCOUNT_TYPE_SALES.map(a=>a.type), ACCOUNT_TYPE_SALES.map(a=>a.sales), ["#0B1F3A","#1E5F8C","#F2762E"]);
    }, 0);
  }
  if (screen === "reports") {
    setTimeout(() => {
      if (document.getElementById("repManagerSalesChart")) drawBarChart("repManagerSalesChart", DSR_LEADERBOARD.map(d=>d.name.split(" ")[0]), DSR_LEADERBOARD.map(d=>d.sales), ["#0B1F3A","#1E5F8C","#F2762E"]);
      if (document.getElementById("repRegionalChart")) drawBarChart("repRegionalChart", REGIONAL_SUMMARY.states.map(s=>s.name), REGIONAL_SUMMARY.states.map(s=>s.sales), ["#0B1F3A","#1E5F8C","#F2762E"]);
      if (document.getElementById("repAdminChart")) drawBarChart("repAdminChart", ["West","North","South","East","Central"], [18400000,17600000,16200000,15100000,17300000], ["#0B1F3A","#1E5F8C","#F2762E"]);
    }, 0);
  }
  if (screen === "monthlyReport") {
    setTimeout(() => {
      if (document.getElementById("mrRegionalChart")) drawBarChart("mrRegionalChart", REGIONAL_SUMMARY.states.map(s=>s.name), REGIONAL_SUMMARY.states.map(s=>s.sales), ["#0B1F3A","#1E5F8C","#F2762E"]);
      if (document.getElementById("mrAdminChart")) drawBarChart("mrAdminChart", ["West","North","South","East","Central"], [18400000,17600000,16200000,15100000,17300000], ["#0B1F3A","#1E5F8C","#F2762E"]);
    }, 0);
  }
  if (screen === "globalSearch") {
    setTimeout(() => {
      const el = document.getElementById("gsInput");
      if (el) el.focus();
    }, 0);
  }
  if (screen === "visitDetail") {
    const v = TODAY_VISITS.find(x => x.id === params.id);
    if (v && v.status === "In Progress" && v.startedAt) {
      startVisitTimer(v.startedAt);
    }
  }
  window.scrollTo(0,0);
}

/* ============================================================
   CHART HELPERS
   ============================================================ */
let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }
function drawLineChart(id, labels, data) {
  const el = document.getElementById(id); if (!el) return;
  destroyChart(id);
  chartInstances[id] = new Chart(el, {
    type: "line",
    data: { labels, datasets: [{ data, borderColor: "#F2762E", backgroundColor: "rgba(242,118,46,0.12)", fill: true, tension: 0.4, pointBackgroundColor: "#F2762E", pointRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => "₹" + (v/100000).toFixed(1) + "L" }, grid: { color: "#EEF1F6" } }, x: { grid: { display: false } } } }
  });
}
function drawBarChart(id, labels, data, colors) {
  const el = document.getElementById(id); if (!el) return;
  destroyChart(id);
  chartInstances[id] = new Chart(el, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6, maxBarThickness: 34 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: "#EEF1F6" } }, x: { grid: { display: false } } } }
  });
}
function drawPieChart(id, labels, data) {
  const el = document.getElementById(id); if (!el) return;
  destroyChart(id);
  chartInstances[id] = new Chart(el, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#0B1F3A", "#1E5F8C", "#F2762E"], borderWidth: 3, borderColor: "#fff" }] },
    options: { cutout: "68%", plugins: { legend: { display: false } } }
  });
}

/* ============================================================
   VISITS
   ============================================================ */
function renderVisitsList() {
  const counts = {
    Completed: TODAY_VISITS.filter(v=>v.status==='Completed').length,
    'In Progress': TODAY_VISITS.filter(v=>v.status==='In Progress').length,
    Planned: TODAY_VISITS.filter(v=>v.status==='Planned').length,
    Skipped: TODAY_VISITS.filter(v=>v.status==='Skipped').length,
  };
  return `
  <div class="section-pad">
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-crm-navy flex-grow-1" onclick="go('planVisit')"><i class="bi bi-calendar-plus-fill me-1"></i> Plan Visit</button>
      <button class="btn btn-crm-ghost" onclick="toast('Showing visit history')"><i class="bi bi-clock-history"></i></button>
    </div>
    <div class="tab-scroll mb-1">
      <span class="tab-chip active" onclick="toast('Showing today\\'s visits')">Today</span>
      <span class="tab-chip" onclick="toast('Showing tomorrow\\'s visits')">Tomorrow</span>
      <span class="tab-chip" onclick="toast('Showing this week\\'s visits')">This Week</span>
    </div>
    <div class="d-flex gap-2 mb-3" style="font-size:0.68rem;">
      <span class="badge-x tone-green-bg">${counts.Completed} Completed</span>
      <span class="badge-x tone-amber-bg">${counts['In Progress']+counts.Planned} Pending</span>
      <span class="badge-x tone-red-bg">${counts.Skipped} Skipped</span>
    </div>
    ${TODAY_VISITS.map(visitCardHTML).join("")}
  </div>`;
}

function visitCardHTML(v) {
  const c = getCustomer(v.customerId);
  const statusClass = v.status.replace(" ", "");
  return `
  <div class="visit-card" onclick="go('visitDetail', {id:'${v.id}'})" style="cursor:pointer;">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-bold" style="font-size:0.92rem;">${c.name}</div>
        <div class="d-flex align-items-center gap-2 mt-1">
          <span class="badge-x badge-type-${c.type}">${c.type}</span>
          <span class="text-faint" style="font-size:0.72rem;"><i class="bi bi-geo-alt"></i> ${c.area} · ${c.distance}</span>
        </div>
      </div>
      <span class="badge-x badge-status-${statusClass}">${v.status}</span>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-2" style="font-size:0.78rem;">
      <span class="text-muted-x"><i class="bi bi-clock"></i> ${v.time} · ${v.purpose}</span>
    </div>
    ${v.status !== 'Completed' && v.status !== 'Skipped' ? `
    <div class="icon-btn-row d-flex gap-2 mt-2">
      <button class="btn btn-crm-primary btn-sm flex-grow-1" onclick="event.stopPropagation(); startVisit('${v.id}')">${v.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}</button>
      <button class="btn btn-crm-ghost btn-sm" onclick="event.stopPropagation(); toast('Opening navigation')"><i class="bi bi-signpost-2-fill"></i></button>
      <button class="btn btn-crm-ghost btn-sm" onclick="event.stopPropagation(); toast('Calling ${c.name}')"><i class="bi bi-telephone-fill"></i></button>
    </div>` : ""}
  </div>`;
}

function renderPlanVisit() {
  return `
  <div class="section-pad">
    <div class="card-x p-3">
      <div class="form-row">
        <label class="form-label-x">Customer Type</label>
        <div class="chip-select" id="pv-type">
          ${["Distributor","Retailer","Mechanic"].map((t,i)=>`<span class="chip-opt ${i===1?'active':''}" onclick="chipSelect(this)">${t}</span>`).join("")}
        </div>
      </div>
      <div class="form-row">
        <label class="form-label-x">Select Customer</label>
        <select class="form-select-x">${CUSTOMERS.map(c=>`<option>${c.name}</option>`).join("")}</select>
      </div>
      <div class="row form-row">
        <div class="col-6"><label class="form-label-x">Date</label><input type="date" class="form-control-x" value="2026-08-08"/></div>
        <div class="col-6"><label class="form-label-x">Time</label><input type="time" class="form-control-x" value="14:30"/></div>
      </div>
      <div class="form-row">
        <label class="form-label-x">Visit Purpose</label>
        <div class="chip-select">
          ${["Order Collection","Payment Collection","Product Promotion","New Product Introduction","Relationship Visit","Complaint Resolution","Follow-up","Other"].map((p,i)=>`<span class="chip-opt ${i===0?'active':''}" onclick="chipSelect(this)">${p}</span>`).join("")}
        </div>
      </div>
      <div class="form-row">
        <label class="form-label-x">Priority</label>
        <div class="chip-select">
          ${["High","Medium","Low"].map((p,i)=>`<span class="chip-opt ${i===1?'active':''}" onclick="chipSelect(this)">${p}</span>`).join("")}
        </div>
      </div>
      <div class="form-row">
        <label class="form-label-x">Notes</label>
        <textarea class="form-control-x" rows="3" placeholder="Add any notes for this visit…"></textarea>
      </div>
      <button class="btn btn-crm-primary w-100" onclick="saveVisit()">Save Visit</button>
    </div>
  </div>`;
}
function chipSelect(el) {
  Array.from(el.parentElement.children).forEach(c => c.classList.remove("active"));
  el.classList.add("active");
}
function saveVisit() {
  const id = "V-" + Math.floor(100 + Math.random()*800);
  TODAY_VISITS.push({ id, customerId: CUSTOMERS[0].id, time: "06:00 PM", purpose: "Relationship Visit", priority: "Medium", status: "Planned" });
  toast("Visit planned successfully");
  back();
}

/* ---- Visit start / live timer / completion ---- */
let visitTimerInterval = null;
function stopVisitTimer() {
  if (visitTimerInterval) { clearInterval(visitTimerInterval); visitTimerInterval = null; }
}
function startVisitTimer(startedAt) {
  stopVisitTimer();
  const tick = () => {
    const el = document.getElementById("visitTimerVal");
    if (!el) { stopVisitTimer(); return; }
    const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
    const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    el.textContent = `${hh}:${mm}:${ss}`;
  };
  tick();
  visitTimerInterval = setInterval(tick, 1000);
}
function startVisit(id) {
  const v = TODAY_VISITS.find(x => x.id === id);
  if (v && v.status === "Planned") {
    v.status = "In Progress";
    v.startedAt = Date.now();
    toast("Visit started · Location captured");
  }
  go('visitDetail', { id });
}

function renderVisitDetail(id) {
  const v = TODAY_VISITS.find(x => x.id === id) || TODAY_VISITS[0];
  const c = getCustomer(v.customerId);
  const statusClass = v.status.replace(" ", "");
  const isPlanned = v.status === "Planned";
  const isDone = v.status === "Completed" || v.status === "Skipped";

  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold fs-6">${c.name}</div>
          <span class="badge-x badge-type-${c.type} mt-1 d-inline-block">${c.type}</span>
        </div>
        <span class="badge-x badge-status-${statusClass}">${v.status}</span>
      </div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-crm-steel btn-sm flex-grow-1 text-white" onclick="toast('Calling ${c.name}')"><i class="bi bi-telephone-fill"></i> Call</button>
        <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="toast('Opening WhatsApp')"><i class="bi bi-whatsapp"></i> WhatsApp</button>
        <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="toast('Opening navigation')"><i class="bi bi-signpost-2-fill"></i> Navigate</button>
      </div>
      <div class="mt-3 p-2 rounded-3 tone-green-bg d-flex align-items-center gap-2" style="font-size:0.78rem; font-weight:600;">
        <i class="bi bi-geo-alt-fill"></i> ${c.distance} from ${c.name} · Location captured
      </div>
      <div class="d-flex align-items-center justify-content-between mt-3">
        ${isPlanned ? `
          <button class="btn btn-crm-primary btn-sm" onclick="startVisit('${v.id}')"><i class="bi bi-play-fill"></i> Start Visit</button>
          <span class="text-faint" style="font-size:0.72rem;">Scheduled for ${v.time}</span>
        ` : isDone ? `
          <span class="timer-chip" style="background:var(--green-600);"><i class="bi bi-check2"></i> ${v.status}</span>
          <span class="text-faint" style="font-size:0.72rem;">Started at ${v.time}</span>
        ` : `
          <span class="timer-chip"><span class="pulse-dot"></span> <span id="visitTimerVal">00:00:00</span></span>
          <span class="text-faint" style="font-size:0.72rem;">Started at ${v.time}</span>
        `}
      </div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Account Snapshot</div>
      <div class="row g-2" style="font-size:0.8rem;">
        ${infoRow("Outstanding", fmtINR(c.outstanding))}
        ${infoRow("Credit Limit", fmtINR(c.creditLimit))}
        ${infoRow("Last Visit", c.lastVisit)}
        ${infoRow("Last Order", c.lastOrder + " · " + fmtINR(c.lastOrderValue))}
        ${infoRow("Avg Order Value", fmtINR(c.avgOrderValue))}
        ${infoRow("Products Purchased", "18 SKUs")}
      </div>
    </div>

    <div class="row g-2 mb-3">
      ${actionTile("bi-bag-plus-fill", "Take Order", `orderCustomerId='${c.id}'; go('newOrder', {customerId:'${c.id}'});`)}
      ${actionTile("bi-cash-coin", "Collect Payment", "toast('Payment collection recorded')")}
      ${actionTile("bi-star-fill", "Add Feedback", `go('feedback', {customerId:'${c.id}'})`)}
      ${actionTile("bi-journal-plus", "Add Note", "toast('Note added')")}
      ${actionTile("bi-person-plus-fill", "Create Lead", "go('newLead')")}
      ${actionTile("bi-clock-history", "View History", `go('customerDetail',{id:'${c.id}',tab:'Orders'})`)}
    </div>

    <button class="btn btn-crm-navy w-100" ${isDone ? "disabled" : ""} onclick="completeVisit('${v.id}')"><i class="bi bi-check2-circle me-1"></i> ${isDone ? "Visit " + v.status : "Complete Visit"}</button>
  </div>`;
}
function infoRow(label, val) {
  return `<div class="col-6"><div class="text-faint" style="font-size:0.68rem;">${label}</div><div class="fw-semibold">${val}</div></div>`;
}
function actionTile(icon, label, onclick) {
  return `<div class="col-4">
    <button class="card-x w-100 p-2 text-center border-0" style="cursor:pointer;" onclick="${onclick}">
      <i class="bi ${icon} d-block mb-1" style="font-size:1.2rem; color:var(--steel-600);"></i>
      <span style="font-size:0.66rem; font-weight:600;">${label}</span>
    </button>
  </div>`;
}
function completeVisit(id) {
  const v = TODAY_VISITS.find(x => x.id === id);
  if (v) {
    if (v.status === "Planned") v.startedAt = Date.now();
    v.status = "Completed";
  }
  stopVisitTimer();
  toast("Visit completed successfully");
  setTimeout(() => goTab("visits"), 400);
}

/* ============================================================
   ORDERS HOME
   ============================================================ */
function renderOrdersHome() {
  return `
  <div class="section-pad">
    <button class="btn btn-crm-primary w-100 mb-3" onclick="go('newOrderPickCustomer')"><i class="bi bi-plus-lg me-1"></i> New Order</button>
    <div class="row g-2 mb-3">
      ${actionTile("bi-clock-history", "Order History", "go('orderHistory')")}
      ${actionTile("bi-file-earmark-text-fill", "Quotations", "go('quotations')")}
      ${actionTile("bi-box-seam-fill", "Smart Buckets", "go('smartBucket')")}
    </div>
    <div class="section-title mb-2">Recent Orders</div>
    ${ORDERS.slice(0,4).map(orderCardHTML).join("")}
  </div>`;
}
function orderCardHTML(o) {
  const c = getCustomer(o.customerId);
  const statusClass = o.status.replace(" ","");
  const payClass = o.payment.replace(" ","");
  return `
  <div class="list-card" onclick="go('orderConfirm', {orderId:'${o.id}'})" style="cursor:pointer;">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-bold mono" style="font-size:0.82rem;">${o.id}</div>
        <div style="font-size:0.82rem;" class="mt-1">${c.name} <span class="badge-x badge-type-${c.type}">${c.type}</span></div>
      </div>
      <span class="badge-x badge-status-${statusClass}">${o.status}</span>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-2" style="font-size:0.8rem;">
      <span class="text-faint">${o.date} · ${o.items} items</span>
      <span class="fw-bold">${fmtINR(o.amount)}</span>
    </div>
    <div class="mt-1"><span class="badge-x badge-status-${payClass}">Payment: ${o.payment}</span></div>
  </div>`;
}

function renderOrderHistory() {
  return `
  <div class="section-pad">
    <div class="tab-scroll mb-1">
      <span class="tab-chip active">Today</span><span class="tab-chip">This Week</span><span class="tab-chip">This Month</span><span class="tab-chip">Custom</span>
    </div>
    <div class="tab-scroll mb-3">
      <span class="tab-chip active" onclick="filterOrderHistory(this,'All')">All</span>
      <span class="tab-chip" onclick="filterOrderHistory(this,'Distributor')">Distributor</span>
      <span class="tab-chip" onclick="filterOrderHistory(this,'Retailer')">Retailer</span>
      <span class="tab-chip" onclick="filterOrderHistory(this,'Mechanic')">Mechanic</span>
    </div>
    <div id="orderHistList">${ORDERS.map(orderCardHTML).join("")}</div>
  </div>`;
}
function filterOrderHistory(el, type) {
  Array.from(el.parentElement.children).forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  const list = type === "All" ? ORDERS : ORDERS.filter(o => getCustomer(o.customerId).type === type);
  document.getElementById("orderHistList").innerHTML = list.map(orderCardHTML).join("") || emptyTab("bi-bag", "No orders in this segment");
}

/* ============================================================
   QUOTATIONS + IN-APP PDF GENERATION
   ============================================================ */
function quotationTotals(q) {
  const items = q.items.map(i => {
    const p = getProduct(i.productId);
    const unitFinal = Math.round(p.dealerPrice * (1 - p.discount / 100));
    return { p, qty: i.qty, unitFinal, lineTotal: unitFinal * i.qty, mrpTotal: p.mrp * i.qty };
  });
  const gross = items.reduce((s, i) => s + i.mrpTotal, 0);
  const net = items.reduce((s, i) => s + i.lineTotal, 0);
  const discount = gross - net;
  const tax = Math.round(net * 0.18);
  const grandTotal = net + tax;
  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  return { items, gross, net, discount, tax, grandTotal, itemCount };
}

function renderQuotations() {
  return `
  <div class="section-pad">
    <button class="btn btn-crm-primary w-100 mb-3" onclick="go('newOrderPickCustomer')"><i class="bi bi-plus-lg me-1"></i> New Quotation</button>
    ${QUOTATIONS.map(quotationCardHTML).join("")}
  </div>`;
}
function quotationCardHTML(q) {
  const c = getCustomer(q.customerId);
  const t = quotationTotals(q);
  return `
    <div class="list-card mb-2">
      <div class="d-flex justify-content-between">
        <div class="fw-bold mono" style="font-size:0.82rem;">${q.id}</div>
        <span class="badge-x tone-amber-bg">Valid till ${q.validity}</span>
      </div>
      <div style="font-size:0.85rem;" class="mt-1">${c.name}</div>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <span class="text-faint" style="font-size:0.78rem;">${t.itemCount} items</span>
        <span class="fw-bold">${fmtINR(t.grandTotal)}</span>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-crm-outline btn-sm flex-grow-1" onclick="previewQuotationPDF('${q.id}')"><i class="bi bi-file-earmark-pdf-fill"></i> Preview PDF</button>
        <button class="btn btn-crm-steel btn-sm flex-grow-1 text-white" onclick="convertQuotationToOrder('${q.id}')">Convert to Order</button>
      </div>
    </div>`;
}
function convertQuotationToOrder(id) {
  const q = QUOTATIONS.find(x => x.id === id);
  const t = quotationTotals(q);
  const orderId = "ORD-2026-" + Math.floor(1000 + Math.random() * 9000);
  ORDERS.unshift({
    id: orderId, customerId: q.customerId, date: "08 Aug 2026",
    items: t.itemCount, amount: t.grandTotal, status: "Confirmed", payment: "Pending"
  });
  toast("Converted to order successfully");
  setTimeout(() => go("orderConfirm", { orderId }), 300);
}

/* jsPDF is loaded from a CDN <script> tag in index.html and exposes
   window.jspdf.jsPDF. jsPDF-AutoTable attaches doc.autoTable(). */
function pdfDocHeader(doc, title, meta) {
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Sales CRM Distribution Pvt. Ltd.", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Field Sales · Distribution · Automotive Spares", 14, 19);
  doc.text("Pune, Maharashtra · GSTIN 27ABCDE1234F1Z5 · +91 1800 266 2026", 14, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 196, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  (meta || []).forEach((line, i) => doc.text(line, 196, 21 + i * 4.5, { align: "right" }));
  doc.setTextColor(20, 26, 38);
}
function pdfBillTo(doc, c, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("BILL TO", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(c.name, 14, y + 5.5);
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 120);
  doc.text(`${c.owner} · ${c.phone}`, 14, y + 10.5);
  doc.text(`${c.area}, ${c.city} - ${c.pincode}`, 14, y + 15);
  doc.setTextColor(20, 26, 38);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("SALES REPRESENTATIVE", 130, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(DSR.name, 130, y + 5.5);
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 120);
  doc.text(`${DSR.id} · ${DSR.territory}`, 130, y + 10.5);
  doc.setTextColor(20, 26, 38);
}
function pdfItemsTable(doc, items, startY) {
  const body = items.map((it, i) => [
    String(i + 1),
    it.p.name,
    it.p.partNo,
    String(it.qty),
    "Rs " + it.unitFinal.toLocaleString("en-IN"),
    "Rs " + it.lineTotal.toLocaleString("en-IN")
  ]);
  doc.autoTable({
    startY,
    head: [["#", "Product", "Part No.", "Qty", "Rate", "Amount"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [11, 31, 58], textColor: 255, fontSize: 8.5, halign: "left" },
    bodyStyles: { fontSize: 8.5, textColor: [20, 26, 38] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 30, halign: "right" }
    },
    margin: { left: 14, right: 14 }
  });
  return doc.lastAutoTable.finalY;
}
function pdfTotalsBlock(doc, t, startY) {
  const rows = [
    ["Gross Amount", "Rs " + t.gross.toLocaleString("en-IN")],
    ["Discount", "- Rs " + t.discount.toLocaleString("en-IN")],
    ["Taxable Amount", "Rs " + t.net.toLocaleString("en-IN")],
    ["Tax (GST 18%)", "Rs " + t.tax.toLocaleString("en-IN")]
  ];
  let y = startY + 8;
  doc.setFontSize(9);
  rows.forEach(([label, val]) => {
    doc.setTextColor(90, 100, 120);
    doc.text(label, 140, y);
    doc.setTextColor(20, 26, 38);
    doc.text(val, 196, y, { align: "right" });
    y += 6;
  });
  doc.setDrawColor(220, 224, 232);
  doc.line(140, y - 2, 196, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Grand Total", 140, y + 4);
  doc.text("Rs " + t.grandTotal.toLocaleString("en-IN"), 196, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  return y + 12;
}
function pdfFooter(doc, note) {
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 224, 232);
  doc.line(14, h - 22, 196, h - 22);
  doc.setFontSize(8);
  doc.setTextColor(140, 150, 165);
  doc.text(note, 14, h - 16);
  doc.text("This is a system-generated document from Sales CRM and does not require a signature.", 14, h - 11);
}

function buildQuotationPDF(q) {
  const c = getCustomer(q.customerId);
  const t = quotationTotals(q);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  pdfDocHeader(doc, "QUOTATION", [`Quotation No: ${q.id}`, `Date: 08 Aug 2026`, `Valid Till: ${q.validity}`]);
  pdfBillTo(doc, c, 42);
  const afterTable = pdfItemsTable(doc, t.items, 66);
  pdfTotalsBlock(doc, t, afterTable);
  pdfFooter(doc, "Prices are indicative and subject to change until converted to a confirmed order.");
  return { doc, t, c };
}
function previewQuotationPDF(id) {
  const q = QUOTATIONS.find(x => x.id === id);
  const { doc } = buildQuotationPDF(q);
  showPDFPreview(doc, q.id, `Quotation ${q.id}`);
}
function buildInvoicePDF(order) {
  const c = getCustomer(order.customerId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Reconstruct a plausible line-item breakdown from the order total so the
  // invoice always has a real itemised table, even for orders placed from the cart.
  const net = Math.round(order.amount / 1.18);
  const tax = order.amount - net;
  const gross = Math.round(net / 0.9);
  const discount = gross - net;
  const items = [{
    p: { name: `${order.items} mixed SKUs (see order for detail)`, partNo: "—" },
    qty: order.items, unitFinal: Math.round(net / (order.items || 1)), lineTotal: net
  }];
  pdfDocHeader(doc, "INVOICE", [`Invoice No: ${order.id}`, `Date: ${order.date}`, `Payment: ${order.payment}`]);
  pdfBillTo(doc, c, 42);
  const afterTable = pdfItemsTable(doc, items, 66);
  pdfTotalsBlock(doc, { gross, discount, net, tax, grandTotal: order.amount }, afterTable);
  pdfFooter(doc, "Payment due as per agreed credit terms.");
  return doc;
}
function previewOrderInvoicePDF(orderId) {
  const order = ORDERS.find(o => o.id === orderId);
  if (!order) { toast("Order not found", "danger"); return; }
  const doc = buildInvoicePDF(order);
  showPDFPreview(doc, order.id, `Invoice ${order.id}`);
}

function showPDFPreview(doc, filename, title) {
  if (window.__pdfBlobUrl) URL.revokeObjectURL(window.__pdfBlobUrl);
  const blobUrl = doc.output("bloburl");
  window.__pdfBlobUrl = blobUrl;
  window.__currentPdfDoc = doc;
  window.__currentPdfName = filename;
  openWideModal(`
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-file-earmark-pdf-fill" style="color:var(--red-500);"></i> ${title}</h6>
      <button class="btn btn-sm p-0" style="width:30px;height:30px;" onclick="closeOverlay()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="pdf-frame-wrap mb-3"><iframe src="${blobUrl}" title="${title}"></iframe></div>
    <div class="d-flex gap-2">
      <button class="btn btn-crm-outline flex-grow-1" onclick="downloadCurrentPDF()"><i class="bi bi-download"></i> Download</button>
      <button class="btn btn-crm-primary flex-grow-1" onclick="sharePDF()"><i class="bi bi-share-fill"></i> Share</button>
    </div>
  `);
}
function downloadCurrentPDF() {
  if (window.__currentPdfDoc) window.__currentPdfDoc.save(`${window.__currentPdfName}.pdf`);
  toast("PDF downloaded");
}
function sharePDF() {
  toast("Quotation shared via WhatsApp");
}

/* ============================================================
   NEW ORDER FLOW — pick customer
   ============================================================ */
function renderPickCustomerForOrder() {
  return `
  <div class="section-pad">
    <div class="search-bar mb-3"><i class="bi bi-search"></i><input placeholder="Search customer…" oninput="filterOrderCustomers(this.value)"/></div>
    <div id="orderCustList">${CUSTOMERS.map(customerPickCardHTML).join("")}</div>
  </div>`;
}
function customerPickCardHTML(c) {
  return `
  <div class="list-card" onclick="orderCustomerId='${c.id}'; go('newOrder', {customerId:'${c.id}'})" style="cursor:pointer;">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-bold" style="font-size:0.88rem;">${c.name}</div>
        <span class="badge-x badge-type-${c.type} mt-1 d-inline-block">${c.type}</span>
        <span class="text-faint" style="font-size:0.72rem;"> · ${c.area}</span>
      </div>
      <i class="bi bi-chevron-right text-faint"></i>
    </div>
    <div class="d-flex justify-content-between mt-2" style="font-size:0.76rem;">
      <span class="text-muted-x">Available Credit</span>
      <span class="fw-semibold">${fmtINR(c.creditLimit - c.outstanding)}</span>
    </div>
  </div>`;
}
function filterOrderCustomers(q) {
  const list = CUSTOMERS.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  document.getElementById("orderCustList").innerHTML = list.map(customerPickCardHTML).join("") || `<div class="empty-state"><i class="bi bi-search"></i>No customers found</div>`;
}

/* ============================================================
   NEW ORDER — PRODUCT SELECTION
   ============================================================ */
function renderNewOrder(customerId) {
  orderCustomerId = customerId || orderCustomerId || CUSTOMERS[0].id;
  const c = getCustomer(orderCustomerId);
  const avail = c.creditLimit - c.outstanding;
  return `
  <div class="section-pad" style="padding-bottom:24px;">
    <div class="card-x p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${c.name}</div>
          <span class="badge-x badge-type-${c.type}">${c.type}</span>
        </div>
        <div class="text-end">
          <div class="text-faint" style="font-size:0.68rem;">Available Credit</div>
          <div class="fw-bold ${avail < 0 ? 'text-danger' : ''}" style="color:${avail<0?'var(--red-500)':'var(--green-600)'}">${fmtINR(avail)}</div>
        </div>
      </div>
    </div>

    <div class="search-bar mb-2"><i class="bi bi-search"></i><input placeholder="Search products, part number…" oninput="filterProducts(this.value)"/></div>
    <div class="tab-scroll mb-2">
      <span class="tab-chip active" onclick="filterCategory(this,'All')">All</span>
      <span class="tab-chip" onclick="filterCategory(this,'Braking')">Braking</span>
      <span class="tab-chip" onclick="filterCategory(this,'Filters')">Filters</span>
      <span class="tab-chip" onclick="filterCategory(this,'Lubricants')">Lubricants</span>
      <span class="tab-chip" onclick="filterCategory(this,'Ignition')">Ignition</span>
      <span class="tab-chip" onclick="filterCategory(this,'Transmission')">Transmission</span>
    </div>
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="go('fms')"><i class="bi bi-speedometer2"></i> FMS Products</button>
      <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="go('smartBucket')"><i class="bi bi-box-seam-fill"></i> Smart Bucket</button>
      <button class="btn btn-crm-ghost btn-sm" onclick="toast('Showing active offers')"><i class="bi bi-tag-fill"></i></button>
    </div>

    <div id="prodList">${PRODUCTS.map(productCardHTML).join("")}</div>
  </div>
  ${renderCartFooter()}`;
}

function productCardHTML(p) {
  const qty = cartQty[p.id] || 0;
  const finalPrice = Math.round(p.dealerPrice * (1 - p.discount/100));
  return `
  <div class="prod-card mb-2" id="prod-${p.id}">
    <div class="d-flex gap-3">
      <div style="width:52px;height:52px;border-radius:12px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.5rem; flex-shrink:0;">${p.img}</div>
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between">
          <div class="fw-bold" style="font-size:0.84rem;">${p.name}</div>
          <span class="fms-badge fms-${p.fms}">${p.fms}</span>
        </div>
        <div class="text-faint mono" style="font-size:0.68rem;">${p.partNo} · ${p.brand}</div>
        <div class="d-flex align-items-baseline gap-2 mt-1">
          <span class="fw-bold" style="color:var(--green-600); font-size:0.86rem;">${fmtINR(finalPrice)}</span>
          <span class="text-decoration-line-through text-faint" style="font-size:0.72rem;">${fmtINR(p.mrp)}</span>
          <span class="badge-x tone-orange-bg">-${p.discount}%</span>
        </div>
        <div class="text-faint" style="font-size:0.68rem;">Stock: ${p.stock} units</div>
      </div>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-2">
      <span class="text-faint" style="font-size:0.7rem;">${p.category}</span>
      <div class="qty-stepper">
        <button onclick="changeQty('${p.id}', -1)" aria-label="Decrease quantity">−</button>
        <span id="qty-${p.id}">${qty}</span>
        <button onclick="changeQty('${p.id}', 1)" aria-label="Increase quantity">+</button>
      </div>
    </div>
  </div>`;
}
function changeQty(pid, delta) {
  const cur = cartQty[pid] || 0;
  const next = Math.max(0, cur + delta);
  cartQty[pid] = next;
  const qtyEl = document.getElementById(`qty-${pid}`);
  if (qtyEl) qtyEl.textContent = next;
  updateCartFooter();
}
function filterProducts(q) {
  const list = PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.partNo.toLowerCase().includes(q.toLowerCase()));
  document.getElementById("prodList").innerHTML = list.map(productCardHTML).join("") || `<div class="empty-state"><i class="bi bi-search"></i>No products found</div>`;
}
function filterCategory(el, cat) {
  Array.from(el.parentElement.children).forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  const list = cat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);
  document.getElementById("prodList").innerHTML = list.map(productCardHTML).join("");
}
function cartCount() { return Object.values(cartQty).reduce((a,b)=>a+b,0); }
function cartTotal() {
  return Object.entries(cartQty).reduce((sum, [pid, qty]) => {
    if (!qty) return sum;
    const p = getProduct(pid);
    return sum + Math.round(p.dealerPrice * (1 - p.discount/100)) * qty;
  }, 0);
}
function renderCartFooter() {
  const count = cartCount();
  if (!count) return "";
  return `
  <div class="sticky-footer d-flex align-items-center justify-content-between" id="cartFooter">
    <div>
      <div class="fw-bold" style="font-size:0.92rem;" id="cfCount">${count} Items | ${fmtINR(cartTotal())}</div>
      <div class="text-faint" style="font-size:0.68rem;">Tap to review order</div>
    </div>
    <button class="btn btn-crm-primary px-4" onclick="go('cart')">View Cart</button>
  </div>`;
}
function updateCartFooter() {
  const count = cartCount();
  const existing = document.getElementById("cartFooter");
  const appScreen = document.querySelector(".app-screen");
  if (count === 0 && existing) {
    existing.remove();
    if (appScreen) appScreen.classList.remove("has-sticky-footer");
    return;
  }
  if (count > 0 && !existing) {
    document.querySelector(".app-screen").insertAdjacentHTML("beforeend", renderCartFooter());
    if (appScreen) appScreen.classList.add("has-sticky-footer");
  } else if (existing) {
    document.getElementById("cfCount").textContent = `${count} Items | ${fmtINR(cartTotal())}`;
  }
}

/* ============================================================
   FMS SCREEN
   ============================================================ */
function renderFMS() {
  const groups = { F: PRODUCTS.filter(p=>p.fms==='F'), M: PRODUCTS.filter(p=>p.fms==='M'), S: PRODUCTS.filter(p=>p.fms==='S') };
  const labels = { F: "Fast Moving", M: "Medium Moving", S: "Slow Moving" };
  return `
  <div class="section-pad">
    <div class="tab-scroll mb-3">
      <span class="tab-chip active" onclick="filterFmsTab(this,'All')">All</span>
      <span class="tab-chip" onclick="filterFmsTab(this,'F')">Fast</span>
      <span class="tab-chip" onclick="filterFmsTab(this,'M')">Medium</span>
      <span class="tab-chip" onclick="filterFmsTab(this,'S')">Slow</span>
    </div>
    <div class="card-x p-3 mb-3 tone-orange-bg" style="border:none;">
      <div class="fw-bold" style="font-size:0.84rem;"><i class="bi bi-stars"></i> Recommended for this customer</div>
      <div class="text-muted-x" style="font-size:0.76rem;">Based on ${getCustomer(orderCustomerId||'CUST-1001').name}'s purchase history</div>
    </div>
    <div id="fmsList">
    ${Object.keys(groups).map(k => `
      <div class="d-flex align-items-center gap-2 mb-2 mt-3">
        <span class="fms-badge fms-${k}">${k}</span>
        <span class="fw-bold">${labels[k]}</span>
        <span class="text-faint" style="font-size:0.74rem;">(${groups[k].length})</span>
      </div>
      ${groups[k].map(productCardHTML).join("")}
    `).join("")}
    </div>
  </div>
  ${renderCartFooter()}`;
}
function filterFmsTab(el, key) {
  Array.from(el.parentElement.children).forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  const labels = { F: "Fast Moving", M: "Medium Moving", S: "Slow Moving" };
  const list = document.getElementById("fmsList");
  if (key === "All") {
    const groups = { F: PRODUCTS.filter(p=>p.fms==='F'), M: PRODUCTS.filter(p=>p.fms==='M'), S: PRODUCTS.filter(p=>p.fms==='S') };
    list.innerHTML = Object.keys(groups).map(k => `
      <div class="d-flex align-items-center gap-2 mb-2 mt-3">
        <span class="fms-badge fms-${k}">${k}</span><span class="fw-bold">${labels[k]}</span>
        <span class="text-faint" style="font-size:0.74rem;">(${groups[k].length})</span>
      </div>${groups[k].map(productCardHTML).join("")}`).join("");
  } else {
    const items = PRODUCTS.filter(p => p.fms === key);
    list.innerHTML = `<div class="d-flex align-items-center gap-2 mb-2 mt-1">
        <span class="fms-badge fms-${key}">${key}</span><span class="fw-bold">${labels[key]}</span>
        <span class="text-faint" style="font-size:0.74rem;">(${items.length})</span>
      </div>${items.map(productCardHTML).join("")}`;
  }
}

/* ============================================================
   SMART BUCKET SCREEN
   ============================================================ */
function renderSmartBucketScreen() {
  return `
  <div class="section-pad">
    <div class="text-muted-x mb-3" style="font-size:0.82rem;">Predefined product combinations with special bundle pricing.</div>
    ${SMART_BUCKETS.map(b => `
      <div class="card-x p-3 mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold">${b.name}</div>
            <div class="text-faint" style="font-size:0.74rem;">${b.items.length} products</div>
          </div>
          <span class="badge-x tone-orange-bg">-${b.discount}%</span>
        </div>
        <div class="d-flex gap-1 mt-2">
          ${b.items.slice(0,5).map(id => `<span style="font-size:1.2rem;">${getProduct(id).img}</span>`).join("")}
        </div>
        <div class="d-flex align-items-baseline gap-2 mt-2">
          <span class="fw-bold" style="color:var(--green-600); font-size:0.95rem;">${fmtINR(b.offer)}</span>
          <span class="text-decoration-line-through text-faint" style="font-size:0.78rem;">${fmtINR(b.mrp)}</span>
        </div>
        <button class="btn btn-crm-primary w-100 mt-2" onclick="addBucket('${b.id}')">Add Bucket</button>
      </div>`).join("")}
  </div>
  ${renderCartFooter()}`;
}
function addBucket(bucketId) {
  const b = SMART_BUCKETS.find(x => x.id === bucketId);
  b.items.forEach(pid => { cartQty[pid] = (cartQty[pid] || 0) + 1; });
  toast(`${b.name} added to cart`);
  updateCartFooter();
}

/* ============================================================
   CART / DISCOUNT / CREDIT CHECK / CONFIRMATION
   ============================================================ */
function cartItems() {
  return Object.entries(cartQty).filter(([,q]) => q > 0).map(([pid, qty]) => {
    const p = getProduct(pid);
    const unitFinal = Math.round(p.dealerPrice * (1 - p.discount/100));
    return { p, qty, unitFinal, lineTotal: unitFinal * qty };
  });
}
function renderCart() {
  const items = cartItems();
  const c = getCustomer(orderCustomerId);
  if (!items.length) {
    return `<div class="empty-state"><i class="bi bi-cart-x"></i>Your cart is empty<br><button class="btn btn-crm-primary mt-3" onclick="go('newOrderPickCustomer')">Add Products</button></div>`;
  }
  const gross = items.reduce((s,i) => s + i.p.mrp * i.qty, 0);
  const discount = gross - items.reduce((s,i)=>s+i.lineTotal,0);
  const netBeforeTax = gross - discount;
  const tax = Math.round(netBeforeTax * 0.18);
  const grandTotal = netBeforeTax + tax;
  const avail = c.creditLimit - c.outstanding;
  const withinCredit = grandTotal <= avail;

  return `
  <div class="section-pad" style="padding-bottom:24px;">
    <div class="card-x p-3 mb-3">
      <div class="fw-bold">${c.name}</div>
      <span class="badge-x badge-type-${c.type}">${c.type}</span>
    </div>
    ${items.map(i => `
      <div class="list-card mb-2">
        <div class="d-flex justify-content-between">
          <div>
            <div class="fw-semibold" style="font-size:0.84rem;">${i.p.name}</div>
            <div class="text-faint mono" style="font-size:0.68rem;">${i.p.partNo}</div>
          </div>
          <button class="btn btn-sm p-0" style="color:var(--red-500);" onclick="removeFromCart('${i.p.id}')"><i class="bi bi-trash3-fill"></i></button>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <div class="qty-stepper"><button onclick="changeQty('${i.p.id}',-1); renderCartRefresh();">−</button><span>${i.qty}</span><button onclick="changeQty('${i.p.id}',1); renderCartRefresh();">+</button></div>
          <div class="text-end" style="font-size:0.8rem;">
            <div class="text-faint text-decoration-line-through" style="font-size:0.68rem;">${fmtINR(i.p.mrp*i.qty)}</div>
            <div class="fw-bold">${fmtINR(i.lineTotal)}</div>
          </div>
        </div>
      </div>`).join("")}

    <div class="card-x p-3 mt-3">
      <div class="section-title mb-2">Discount Rules <span class="link-sm" style="cursor:pointer;" onclick="go('discountRules')">Details</span></div>
      ${summaryRow("Gross Amount", fmtINR(gross))}
      ${summaryRow("Discount", "− " + fmtINR(discount), "var(--green-600)")}
      ${summaryRow("Taxable Amount", fmtINR(netBeforeTax))}
      ${summaryRow("Tax (GST 18%)", fmtINR(tax))}
      <hr class="hr-x"/>
      ${summaryRow("Grand Total", fmtINR(grandTotal), null, true)}
    </div>

    <div class="card-x p-3 mt-3 ${withinCredit ? 'tone-green-bg' : 'tone-red-bg'}" style="border:none;">
      <div class="d-flex align-items-center gap-2 fw-bold" style="font-size:0.86rem;">
        <i class="bi ${withinCredit ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i>
        ${withinCredit ? "Credit Available" : "Approval Required"}
      </div>
    </div>

    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-crm-outline flex-grow-1" onclick="toast('Draft saved')">Save Draft</button>
      <button class="btn btn-crm-primary flex-grow-1" onclick="go('creditCheck')">Continue</button>
    </div>
  </div>`;
}
function renderCartRefresh() {
  document.getElementById("body-slot").innerHTML = renderCart();
  const appScreen = document.querySelector(".app-screen");
  if (appScreen) appScreen.classList.remove("has-sticky-footer");
}
function removeFromCart(pid) { cartQty[pid] = 0; renderCartRefresh(); toast("Item removed"); }
function summaryRow(label, val, color, bold) {
  return `<div class="d-flex justify-content-between align-items-center mb-1" style="font-size:${bold?'0.95rem':'0.82rem'};">
    <span class="${bold?'fw-bold':'text-muted-x'}">${label}</span>
    <span class="${bold?'fw-bold':''}" style="${color?`color:${color};`:''}">${val}</span>
  </div>`;
}

function renderDiscountRules() {
  return `
  <div class="section-pad">
    <div class="card-x p-3">
      ${discountRuleRow("Product Discount", "5%", "Applied per-item based on price list")}
      ${discountRuleRow("Quantity Discount", "3%", "Bulk quantity threshold reached")}
      ${discountRuleRow("Smart Bucket Discount", "7%", "Bundle pricing on selected buckets")}
      ${discountRuleRow("Scheme Discount", "₹2,500", "Monsoon scheme SCH-2026-08")}
    </div>
  </div>`;
}
function discountRuleRow(name, val, desc) {
  return `<div class="d-flex justify-content-between align-items-start py-2 border-bottom">
    <div><div class="fw-semibold" style="font-size:0.85rem;">${name}</div><div class="text-faint" style="font-size:0.7rem;">${desc}</div></div>
    <div class="fw-bold" style="color:var(--orange-600);">${val}</div>
  </div>`;
}

function renderCreditCheck() {
  const c = getCustomer(orderCustomerId);
  const items = cartItems();
  if (!items.length) {
    return `<div class="empty-state"><i class="bi bi-cart-x"></i>Your cart is empty<br><button class="btn btn-crm-primary mt-3" onclick="go('newOrderPickCustomer')">Add Products</button></div>`;
  }
  const gross = items.reduce((s,i) => s + i.p.mrp * i.qty, 0);
  const discount = gross - items.reduce((s,i)=>s+i.lineTotal,0);
  const tax = Math.round((gross-discount) * 0.18);
  const currentOrder = (gross - discount) + tax;
  const projectedOutstanding = c.outstanding + currentOrder;
  const withinLimit = projectedOutstanding <= c.creditLimit;
  const exceedBy = projectedOutstanding - c.creditLimit;

  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3 text-center">
      <div class="gauge-wrap mx-auto" style="width:120px;">
        ${gaugeSVG(Math.min(100, Math.round((c.outstanding/c.creditLimit)*100)), 120, withinLimit ? "var(--green-600)" : "var(--red-500)")}
      </div>
      <div class="fw-bold mt-2" style="font-size:0.85rem;">Credit Utilization</div>
    </div>

    <div class="card-x p-3 mb-3">
      ${summaryRow("Credit Limit", fmtINR(c.creditLimit))}
      ${summaryRow("Current Outstanding", fmtINR(c.outstanding))}
      ${summaryRow("Available Credit", fmtINR(c.creditLimit - c.outstanding), "var(--steel-600)")}
      <hr class="hr-x"/>
      ${summaryRow("Current Order", fmtINR(currentOrder))}
      ${summaryRow("Projected Outstanding", fmtINR(projectedOutstanding), null, true)}
    </div>

    <div class="card-x p-3 ${withinLimit ? 'tone-green-bg' : 'tone-red-bg'}" style="border:none;">
      <div class="d-flex align-items-center gap-2 fw-bold">
        <i class="bi ${withinLimit ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
        ${withinLimit ? "Within Credit Limit" : "Credit Limit Exceeded"}
      </div>
      ${!withinLimit ? `<div class="mt-1" style="font-size:0.82rem;">Order exceeds available credit by ${fmtINR(exceedBy)}</div>` : ""}
    </div>

    <div class="mt-3">
      ${withinLimit
        ? `<button class="btn btn-crm-primary w-100" onclick="placeOrder()">Place Order</button>`
        : `<div class="d-flex gap-2">
            <button class="btn btn-crm-outline flex-grow-1" onclick="toast('Approval requested from manager')">Request Approval</button>
            <button class="btn btn-crm-primary flex-grow-1" onclick="placeOrder(true)">Continue Anyway</button>
          </div>`}
    </div>
  </div>`;
}

function placeOrder(needsApproval) {
  const orderId = "ORD-2026-" + Math.floor(1000 + Math.random()*9000);
  const amount = cartTotal();
  const items = cartCount();
  ORDERS.unshift({
    id: orderId, customerId: orderCustomerId, date: "08 Aug 2026", items,
    amount: amount || 0, status: needsApproval ? "Confirmed" : "Confirmed", payment: "Pending"
  });
  cartQty = {};
  toast(needsApproval ? "Order submitted for approval" : "Order placed successfully");
  setTimeout(() => { replaceTop("orderConfirm", { orderId, fresh: true }); }, 300);
}

function renderOrderConfirm(orderId) {
  const existing = ORDERS.find(o => o.id === orderId);
  const c = existing ? getCustomer(existing.customerId) : getCustomer(orderCustomerId);
  const amount = existing ? existing.amount : cartTotal() || 48500;
  const items = existing ? existing.items : (cartCount() || 12);
  return `
  <div class="section-pad text-center">
    <div class="mt-3 mb-3">
      <div style="width:78px;height:78px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;margin:0 auto;">
        <i class="bi bi-check-lg" style="font-size:2.4rem;color:var(--green-600);"></i>
      </div>
    </div>
    <h5 class="font-display fw-bold">Order Successfully Created</h5>
    <div class="mono text-muted-x mb-3">${orderId}</div>
    <div class="card-x p-3 text-start">
      ${summaryRow("Customer", c.name)}
      ${summaryRow("Items", items)}
      ${summaryRow("Amount", fmtINR(amount), null, true)}
      ${summaryRow("Expected Delivery", "10 Aug 2026")}
      ${summaryRow("Payment Terms", "Net 30 Days")}
    </div>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-crm-outline flex-grow-1" onclick="previewOrderInvoicePDF('${orderId}')"><i class="bi bi-file-earmark-pdf-fill"></i> Invoice PDF</button>
      <button class="btn btn-crm-navy flex-grow-1" onclick="goTab('orders')">View Order</button>
    </div>
    <button class="btn btn-crm-primary w-100 mt-2" onclick="go('newOrderPickCustomer')">Create Another Order</button>
  </div>`;
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
function renderCustomersList(type) {
  const list = type === "All" ? CUSTOMERS : CUSTOMERS.filter(c => c.type === type);
  return `
  <div class="section-pad">
    <div class="search-bar mb-2"><i class="bi bi-search"></i><input placeholder="Search customers…" oninput="filterCustomers(this.value)"/></div>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="tab-scroll" style="padding-bottom:0;">
        ${["All","Distributor","Retailer","Mechanic"].map(t => `<span class="tab-chip ${t===type?'active':''}" onclick="go('customersList',{type:'${t}'})">${t}</span>`).join("")}
      </div>
      <button class="btn btn-crm-ghost btn-sm" onclick="openFilterSheet()"><i class="bi bi-sliders"></i></button>
    </div>
    <div id="custList">${list.map(customerListCardHTML).join("") || emptyCustomers()}</div>
  </div>`;
}
function emptyCustomers() { return `<div class="empty-state"><i class="bi bi-people"></i>No customers found</div>`; }
function customerListCardHTML(c) {
  const statusClass = c.status.replace(" ","");
  return `
  <div class="list-card" onclick="go('customerDetail', {id:'${c.id}', tab:'Overview'})" style="cursor:pointer;">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-bold" style="font-size:0.88rem;">${c.name}</div>
        <div class="d-flex align-items-center gap-2 mt-1">
          <span class="badge-x badge-type-${c.type}">${c.type}</span>
          <span class="text-faint" style="font-size:0.72rem;">${c.area}</span>
        </div>
      </div>
      <span class="badge-x badge-status-${statusClass}">${c.status}</span>
    </div>
    <div class="row g-2 mt-2" style="font-size:0.72rem;">
      <div class="col-4"><div class="text-faint">Outstanding</div><div class="fw-semibold">${fmtINR(c.outstanding)}</div></div>
      <div class="col-4"><div class="text-faint">Credit Limit</div><div class="fw-semibold">${fmtINR(c.creditLimit)}</div></div>
      <div class="col-4"><div class="text-faint">Sales (Mo.)</div><div class="fw-semibold">${fmtINR(c.salesThisMonth)}</div></div>
    </div>
  </div>`;
}
function filterCustomers(q) {
  const list = CUSTOMERS.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.area.toLowerCase().includes(q.toLowerCase()));
  document.getElementById("custList").innerHTML = list.map(customerListCardHTML).join("") || emptyCustomers();
}
function openFilterSheet() {
  openSheet(`
    <h6 class="fw-bold mb-3">Filter Customers</h6>
    <div class="form-row"><label class="form-label-x">Area</label><select class="form-select-x"><option>All Areas</option><option>Kothrud</option><option>Warje</option><option>Hinjewadi</option></select></div>
    <div class="form-row"><label class="form-label-x">Status</label><div class="chip-select"><span class="chip-opt active" onclick="chipSelect(this)">All</span><span class="chip-opt" onclick="chipSelect(this)">Active</span><span class="chip-opt" onclick="chipSelect(this)">Overdue</span></div></div>
    <div class="form-row"><label class="form-label-x">Outstanding</label><select class="form-select-x"><option>Any</option><option>Above ₹1,00,000</option><option>Above ₹5,00,000</option></select></div>
    <button class="btn btn-crm-primary w-100 mt-2" onclick="closeOverlay(); toast('Filters applied')">Apply Filters</button>
  `);
}

function renderCustomerDetail(id, tab) {
  const c = getCustomer(id);
  const tabs = ["Overview","Orders","Payments","Visits","Products","Feedback","Leads"];
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold fs-6">${c.name}</div>
          <div class="text-faint" style="font-size:0.76rem;">${c.owner} · ${c.phone}</div>
          <span class="badge-x badge-type-${c.type} mt-2 d-inline-block">${c.type}</span>
        </div>
        <div class="avatar-circle" style="background:var(--navy-950);">${c.name.substring(0,2).toUpperCase()}</div>
      </div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-crm-steel btn-sm flex-grow-1 text-white" onclick="toast('Calling ${c.name}')"><i class="bi bi-telephone-fill"></i> Call</button>
        <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="toast('Opening WhatsApp')"><i class="bi bi-whatsapp"></i> WhatsApp</button>
        <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="toast('Opening navigation')"><i class="bi bi-signpost-2-fill"></i> Navigate</button>
      </div>
    </div>

    <div class="tab-scroll mb-3">
      ${tabs.map(t => `<span class="tab-chip ${t===tab?'active':''}" onclick="go('customerDetail',{id:'${id}',tab:'${t}'})">${t}</span>`).join("")}
    </div>

    ${renderCustomerTabContent(c, tab)}
  </div>`;
}

function renderCustomerTabContent(c, tab) {
  if (tab === "Overview") {
    const avail = c.creditLimit - c.outstanding;
    return `
    <div class="card-x p-3 mb-3">
      <div class="d-flex align-items-center gap-3">
        <div class="gauge-wrap">${gaugeSVG(Math.min(100,Math.round((c.outstanding/c.creditLimit)*100)), 76, avail<0?"var(--red-500)":"var(--orange-500)")}</div>
        <div class="flex-grow-1">
          ${summaryRow("Outstanding", fmtINR(c.outstanding))}
          ${summaryRow("Credit Limit", fmtINR(c.creditLimit))}
          ${summaryRow("Available Credit", fmtINR(avail), avail<0?"var(--red-500)":"var(--green-600)")}
        </div>
      </div>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Monthly Sales</div><div class="kpi-value" style="font-size:1rem;">${fmtINR(c.salesThisMonth)}</div></div></div>
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Avg Order Value</div><div class="kpi-value" style="font-size:1rem;">${fmtINR(c.avgOrderValue)}</div></div></div>
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Last Order</div><div class="kpi-value" style="font-size:1rem;">${c.lastOrder}</div></div></div>
      <div class="col-6"><div class="kpi-card"><div class="kpi-label">Last Visit</div><div class="kpi-value" style="font-size:1rem;">${c.lastVisit}</div></div></div>
    </div>
    <button class="btn btn-crm-primary w-100" onclick="orderCustomerId='${c.id}'; go('newOrder', {customerId:'${c.id}'})">Start New Order</button>
    `;
  }
  if (tab === "Orders") {
    return ORDERS.filter(o => o.customerId === c.id).map(orderCardHTML).join("") || emptyTab("bi-bag", "No orders yet");
  }
  if (tab === "Payments") {
    return `<div class="card-x p-3">
      ${summaryRow("Total Paid (Mo.)", fmtINR(c.salesThisMonth - c.outstanding > 0 ? c.salesThisMonth - c.outstanding : c.salesThisMonth*0.6))}
      ${summaryRow("Outstanding", fmtINR(c.outstanding), "var(--red-500)")}
      ${summaryRow("Last Payment", c.lastOrder)}
    </div>
    <button class="btn btn-crm-primary w-100 mt-3" onclick="toast('Payment collection recorded')"><i class="bi bi-cash-coin me-1"></i> Collect Payment</button>`;
  }
  if (tab === "Visits") {
    return TODAY_VISITS.filter(v => v.customerId === c.id).map(visitCardHTML).join("") || emptyTab("bi-signpost-split", "No visits logged");
  }
  if (tab === "Products") {
    return PRODUCTS.slice(0,5).map(p => `
      <div class="list-card d-flex justify-content-between align-items-center" onclick="orderCustomerId='${c.id}'; go('newOrder',{customerId:'${c.id}'})" style="cursor:pointer;">
        <div><div class="fw-semibold" style="font-size:0.84rem;">${p.name}</div><div class="text-faint" style="font-size:0.7rem;">Last bought: 12 units</div></div>
        <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(p.dealerPrice)}</span>
      </div>`).join("");
  }
  if (tab === "Feedback") {
    return `<div class="list-card mb-2"><div class="star-row mb-1">${"★★★★☆".split("").map(s=>`<i class="bi ${s==='★'?'bi-star-fill filled':'bi-star'}"></i>`).join("")}</div><div style="font-size:0.82rem;">"Good product availability, delivery could be faster."</div><div class="text-faint mt-1" style="font-size:0.7rem;">05 Aug 2026</div></div>
    <button class="btn btn-crm-outline w-100" onclick="go('feedback',{customerId:'${c.id}'})"><i class="bi bi-star me-1"></i> Add Feedback</button>`;
  }
  if (tab === "Leads") {
    return emptyTab("bi-person-lines-fill", "No leads linked to this account");
  }
  return "";
}
function emptyTab(icon, text) { return `<div class="empty-state"><i class="bi ${icon}"></i>${text}</div>`; }

function renderAddRetailer() {
  return `
  <div class="section-pad">
    <div class="card-x p-3">
      ${formField("Retailer Name", "text", "e.g. ABC Auto Parts")}
      ${formField("Owner Name", "text", "e.g. Ramesh Bhosale")}
      <div class="row"><div class="col-6">${formField("Mobile Number", "tel", "+91 98xxxxxxxx")}</div><div class="col-6">${formField("Alternate Number", "tel", "Optional")}</div></div>
      ${formField("Address", "text", "Shop no, street, landmark")}
      <div class="row"><div class="col-6">${formField("Area", "text", "e.g. Kothrud")}</div><div class="col-6">${formField("City", "text", "Pune")}</div></div>
      ${formField("Pincode", "text", "411038")}
      ${formField("GST Number", "text", "Optional")}
      <div class="form-row"><label class="form-label-x">Shop Type</label><select class="form-select-x"><option>Auto Parts Shop</option><option>General Store</option><option>Multi-brand Outlet</option></select></div>
      ${formField("Potential Monthly Business", "text", "e.g. ₹40,000")}
      <div class="form-row"><label class="form-label-x">Preferred Brands</label><div class="chip-select">${["Bosch","NGK","Castrol","Mann","Luk"].map(b=>`<span class="chip-opt" onclick="this.classList.toggle('active')">${b}</span>`).join("")}</div></div>
      <div class="form-row"><label class="form-label-x">Notes</label><textarea class="form-control-x" rows="2"></textarea></div>
      <button class="btn btn-crm-outline w-100 mb-2" onclick="toast('GPS location captured')"><i class="bi bi-geo-alt-fill"></i> Capture GPS Location</button>
      <button class="btn btn-crm-primary w-100" onclick="submitCustomerForm('Retailer')">Submit</button>
    </div>
  </div>`;
}
function renderAddMechanic() {
  return `
  <div class="section-pad">
    <div class="card-x p-3">
      ${formField("Mechanic Name", "text", "e.g. Vikas Patil")}
      ${formField("Workshop Name", "text", "e.g. Patil Auto Garage")}
      ${formField("Mobile Number", "tel", "+91 98xxxxxxxx")}
      ${formField("Address", "text", "Shop no, street, landmark")}
      <div class="row"><div class="col-6">${formField("Area", "text", "e.g. Warje")}</div><div class="col-6">${formField("City", "text", "Pune")}</div></div>
      ${formField("Pincode", "text", "411058")}
      <div class="form-row"><label class="form-label-x">Vehicle Categories</label><div class="chip-select">${["2-Wheeler","3-Wheeler","4-Wheeler","Commercial"].map(b=>`<span class="chip-opt" onclick="this.classList.toggle('active')">${b}</span>`).join("")}</div></div>
      <div class="form-row"><label class="form-label-x">Brands Worked With</label><div class="chip-select">${["Bosch","NGK","Castrol","Mann","Rollon"].map(b=>`<span class="chip-opt" onclick="this.classList.toggle('active')">${b}</span>`).join("")}</div></div>
      ${formField("Estimated Monthly Business", "text", "e.g. ₹25,000")}
      ${formField("Number of Vehicles Serviced", "number", "e.g. 40 / month")}
      <div class="form-row"><label class="form-label-x">Notes</label><textarea class="form-control-x" rows="2"></textarea></div>
      <button class="btn btn-crm-outline w-100 mb-2" onclick="toast('GPS location captured')"><i class="bi bi-geo-alt-fill"></i> Capture GPS Location</button>
      <button class="btn btn-crm-primary w-100" onclick="submitCustomerForm('Mechanic')">Submit</button>
    </div>
  </div>`;
}
function formField(label, type, placeholder) {
  return `<div class="form-row"><label class="form-label-x">${label}</label><input type="${type}" class="form-control-x" placeholder="${placeholder}"/></div>`;
}
function submitCustomerForm(type) {
  toast(`${type} added successfully`);
  openModal(`
    <div style="width:56px;height:56px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
      <i class="bi bi-check-lg" style="font-size:1.6rem;color:var(--green-600);"></i>
    </div>
    <h6 class="fw-bold">${type} Created</h6>
    <div class="text-muted-x mb-3" style="font-size:0.82rem;">Would you like to plan the first visit now?</div>
    <div class="d-flex gap-2">
      <button class="btn btn-crm-ghost flex-grow-1" onclick="closeOverlay(); goTab('customers')">Later</button>
      <button class="btn btn-crm-primary flex-grow-1" onclick="closeOverlay(); go('planVisit')">Plan First Visit</button>
    </div>
  `);
}

/* ============================================================
   MORE HUB
   ============================================================ */
function renderMore() {
  const pct = Math.round(DSR.achieved / DSR.target * 100);
  const menuGroups = [
    { title: "Field Work", items: [
      ["bi-fingerprint", "Attendance", "go('attendance')"],
      ["bi-person-lines-fill", "Leads", "go('leads')"],
      ["bi-star-fill", "Visit Feedback", "go('feedback')"],
    ]},
    { title: "Catalog & Pricing", items: [
      ["bi-speedometer2", "FMS Products", "go('fms')"],
      ["bi-box-seam-fill", "Smart Buckets", "go('smartBucket')"],
      ["bi-percent", "Discount Rules", "go('discountRules')"],
      ["bi-file-earmark-text-fill", "Quotations", "go('quotations')"],
    ]},
    { title: "Insights", items: [
      ["bi-bar-chart-fill", "Reports & Analytics", "go('reports')"],
      ["bi-trophy-fill", "Team Leaderboard", "go('managerLeaderboard')"],
      ["bi-clock-history", "Order History", "go('orderHistory')"],
    ]},
    { title: "Account", items: [
      ["bi-bell-fill", "Notifications", "go('notifications')"],
      ["bi-person-circle", "My Profile", "go('profile')"],
      ["bi-gear-fill", "Settings", "toast('Settings coming soon','info')"],
      ["bi-question-circle-fill", "Help & Support", "toast('Support: 1800-266-2026','info')"],
    ]}
  ];
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3 d-flex align-items-center gap-3" style="cursor:pointer;" onclick="go('profile')">
      <div class="avatar-circle" style="width:54px;height:54px;font-size:1.1rem;">${DSR.avatar}</div>
      <div class="flex-grow-1">
        <div class="fw-bold">${DSR.name}</div>
        <div class="text-faint" style="font-size:0.74rem;">${DSR.role} · ${DSR.territory}</div>
      </div>
      <div class="gauge-wrap">${gaugeSVG(pct, 48, "var(--orange-500)")}</div>
    </div>
    ${menuGroups.map(g => `
      <div class="eyebrow mb-2 mt-1">${g.title}</div>
      <div class="card-x mb-3" style="overflow:hidden;">
        ${g.items.map(([icon,label,onclick],i) => `
          <div class="more-row ${i>0?'border-top':''}" onclick="${onclick}">
            <span class="more-row-icon"><i class="bi ${icon}"></i></span>
            <span class="flex-grow-1">${label}</span>
            <i class="bi bi-chevron-right text-faint"></i>
          </div>`).join("")}
      </div>
    `).join("")}
    <button class="btn btn-crm-outline w-100 mb-2" style="border-color:var(--red-500); color:var(--red-500);" onclick="confirmLogout()"><i class="bi bi-box-arrow-right me-1"></i> Logout</button>
    <div class="text-center text-faint" style="font-size:0.7rem;">Sales CRM · Version 4.3.0</div>
  </div>`;
}
function confirmLogout() {
  openModal(`
    <div style="width:56px;height:56px;border-radius:50%;background:var(--red-100);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
      <i class="bi bi-box-arrow-right" style="font-size:1.6rem;color:var(--red-500);"></i>
    </div>
    <h6 class="fw-bold">Log out?</h6>
    <div class="text-muted-x mb-3" style="font-size:0.82rem;">You'll need to sign in again to access your account.</div>
    <div class="d-flex gap-2">
      <button class="btn btn-crm-ghost flex-grow-1" onclick="closeOverlay()">Cancel</button>
      <button class="btn btn-crm-primary flex-grow-1" onclick="doLogout()">Logout</button>
    </div>
  `);
}

/* ============================================================
   ATTENDANCE
   ============================================================ */
function renderAttendance() {
  const present = ATTENDANCE_HISTORY.filter(a=>a.status==="Present").length;
  const leave = ATTENDANCE_HISTORY.filter(a=>a.status==="On Leave").length;
  const todayRecord = ATTENDANCE_HISTORY.find(a => a.date === "08 Aug 2026");
  const checkedOut = !!(todayRecord && todayRecord.checkOut && todayRecord.checkOut !== "—");
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3 text-center">
      ${state.attendanceMarked ? `
        <div style="width:64px;height:64px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <i class="bi bi-check-lg" style="font-size:1.8rem;color:var(--green-600);"></i>
        </div>
        <div class="fw-bold">You're marked Present today</div>
        <div class="text-faint" style="font-size:0.78rem;">Checked in at ${state.attendanceTime}${checkedOut ? ` · Checked out at ${todayRecord.checkOut}` : ""}</div>
        <button class="btn btn-crm-outline w-100 mt-3" ${checkedOut ? "disabled" : ""} onclick="markCheckout()"><i class="bi bi-door-open-fill me-1"></i> ${checkedOut ? "Checked Out" : "Mark Check-out"}</button>
      ` : `
        <div style="width:64px;height:64px;border-radius:50%;background:var(--amber-100);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <i class="bi bi-hourglass-split" style="font-size:1.8rem;color:#9C6B12;"></i>
        </div>
        <div class="fw-bold">Attendance not marked yet</div>
        <div class="text-faint" style="font-size:0.78rem;">Mark your attendance to start the day</div>
        <button class="btn btn-crm-primary w-100 mt-3" onclick="markAttendance()"><i class="bi bi-fingerprint me-1"></i> Mark Attendance</button>
      `}
    </div>

    <div class="row g-2 mb-3">
      <div class="col-4"><div class="kpi-card text-center"><div class="kpi-value" style="font-size:1.1rem;">${present}</div><div class="kpi-label">Present</div></div></div>
      <div class="col-4"><div class="kpi-card text-center"><div class="kpi-value" style="font-size:1.1rem;">${leave}</div><div class="kpi-label">On Leave</div></div></div>
      <div class="col-4"><div class="kpi-card text-center"><div class="kpi-value" style="font-size:1.1rem;">${ATTENDANCE_HISTORY.length}</div><div class="kpi-label">This Week</div></div></div>
    </div>

    <div class="section-title mb-2">Recent Attendance</div>
    ${ATTENDANCE_HISTORY.map(a => `
      <div class="list-card d-flex justify-content-between align-items-center mb-2">
        <div>
          <div class="fw-semibold" style="font-size:0.85rem;">${a.date} <span class="text-faint">· ${a.day}</span></div>
          <div class="text-faint" style="font-size:0.72rem;">${a.checkIn} – ${a.checkOut} ${a.hours!=='—' ? '· '+a.hours : ''}</div>
        </div>
        <span class="badge-x badge-status-${a.status.replace(' ','')}">${a.status}</span>
      </div>`).join("")}
  </div>`;
}
function markAttendance() {
  state.attendanceMarked = true;
  const now = new Date();
  let h = now.getHours(); const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  state.attendanceTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  const already = ATTENDANCE_HISTORY.find(a => a.date === "08 Aug 2026");
  if (!already) {
    ATTENDANCE_HISTORY.unshift({ date: "08 Aug 2026", day: "Sat", checkIn: state.attendanceTime, checkOut: "—", hours: "—", status: "Present" });
  } else {
    already.checkIn = state.attendanceTime;
    already.status = "Present";
  }
  toast("Attendance marked · Location captured");
  render();
}
function markCheckout() {
  const rec = ATTENDANCE_HISTORY.find(a => a.date === "08 Aug 2026");
  if (rec) {
    const now = new Date();
    let h = now.getHours(); const m = now.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    rec.checkOut = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
    rec.hours = "8h 10m";
  }
  toast("Checked out for the day", "info");
  render();
}

/* ============================================================
   FEEDBACK
   ============================================================ */
function renderFeedback(customerId) {
  if (!customerId) {
    return `
    <div class="section-pad">
      <div class="text-muted-x mb-3" style="font-size:0.85rem;">Select a customer to add visit feedback for.</div>
      ${CUSTOMERS.map(c => `
        <div class="list-card mb-2" onclick="go('feedback',{customerId:'${c.id}'})" style="cursor:pointer;">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold" style="font-size:0.86rem;">${c.name}</div>
              <span class="badge-x badge-type-${c.type}">${c.type}</span>
            </div>
            <i class="bi bi-chevron-right text-faint"></i>
          </div>
        </div>`).join("")}
    </div>`;
  }
  const c = getCustomer(customerId);
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3">
      <div class="fw-bold">${c.name}</div>
      <span class="badge-x badge-type-${c.type}">${c.type}</span>
    </div>
    <div class="card-x p-3">
      <label class="form-label-x">Overall Rating</label>
      <div class="star-row mb-3" id="fbStars">
        ${[1,2,3,4,5].map(n => `<i class="bi bi-star" data-n="${n}" onclick="setStars(${n})"></i>`).join("")}
      </div>
      <label class="form-label-x">Feedback Category</label>
      <div class="chip-select mb-3">
        ${["Product Availability","Delivery Time","Pricing","Service Quality","Support"].map((t,i)=>`<span class="chip-opt ${i===0?'active':''}" onclick="chipSelect(this)">${t}</span>`).join("")}
      </div>
      <label class="form-label-x">Comments</label>
      <textarea class="form-control-x mb-3" rows="4" placeholder="Share details about this visit…"></textarea>
      <button class="btn btn-crm-primary w-100" onclick="submitFeedback()">Submit Feedback</button>
    </div>
  </div>`;
}
let fbRating = 0;
function setStars(n) {
  fbRating = n;
  document.querySelectorAll("#fbStars i").forEach(i => {
    const val = parseInt(i.dataset.n, 10);
    i.className = val <= n ? "bi bi-star-fill filled" : "bi bi-star";
  });
}
function submitFeedback() {
  toast("Feedback submitted — thank you!");
  fbRating = 0;
  back();
}

/* ============================================================
   LEADS
   ============================================================ */
function renderLeads() {
  return `
  <div class="section-pad">
    <button class="btn btn-crm-primary w-100 mb-3" onclick="go('newLead')"><i class="bi bi-person-plus-fill me-1"></i> New Lead</button>
    <div class="tab-scroll mb-3">
      ${["All","New","Contacted","Interested","Quotation Sent","Negotiation"].map((t,i)=>`<span class="tab-chip ${i===0?'active':''}" onclick="filterLeads(this,'${t}')">${t}</span>`).join("")}
    </div>
    <div id="leadsList">${LEADS.map(leadCardHTML).join("")}</div>
  </div>`;
}
function leadCardHTML(l) {
  const priorityTone = l.priority === "High" ? "tone-red-bg" : l.priority === "Medium" ? "tone-amber-bg" : "tone-steel-bg";
  return `
  <div class="lead-card mb-2">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-bold" style="font-size:0.88rem;">${l.name}</div>
        <div class="text-faint" style="font-size:0.72rem;">${l.business} · ${l.area}</div>
      </div>
      <span class="badge-x badge-status-${l.status.replace(/ /g,'')}">${l.status}</span>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-2">
      <span class="badge-x ${priorityTone}">${l.priority} Priority</span>
      <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(l.potential)}</span>
    </div>
    <div class="d-flex gap-2 mt-2">
      <button class="btn btn-crm-steel btn-sm flex-grow-1 text-white" onclick="toast('Calling ${l.name}')"><i class="bi bi-telephone-fill"></i> Call</button>
      <button class="btn btn-crm-ghost btn-sm flex-grow-1" onclick="toast('Opening WhatsApp')"><i class="bi bi-whatsapp"></i> WhatsApp</button>
      <button class="btn btn-crm-primary btn-sm flex-grow-1" onclick="convertLead('${l.id}')">Convert</button>
    </div>
  </div>`;
}
function filterLeads(el, status) {
  Array.from(el.parentElement.children).forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  const list = status === "All" ? LEADS : LEADS.filter(l => l.status === status);
  document.getElementById("leadsList").innerHTML = list.map(leadCardHTML).join("") || emptyTab("bi-person-lines-fill", "No leads in this status");
}
function convertLead(id) {
  toast("Lead marked as converted — create a retailer/mechanic record next", "success");
  setTimeout(() => go("addRetailer"), 500);
}

function renderNewLead() {
  return `
  <div class="section-pad">
    <div class="card-x p-3">
      ${formField("Lead / Business Name", "text", "e.g. Ganesh Auto Center")}
      <div class="form-row"><label class="form-label-x">Business Type</label>
        <div class="chip-select">${["Retail Shop","Mechanic","Distributor","New Prospect"].map((t,i)=>`<span class="chip-opt ${i===0?'active':''}" onclick="chipSelect(this)">${t}</span>`).join("")}</div>
      </div>
      ${formField("Contact Person", "text", "Owner / manager name")}
      ${formField("Mobile Number", "tel", "+91 98xxxxxxxx")}
      ${formField("Area", "text", "e.g. Bavdhan")}
      ${formField("Estimated Monthly Potential", "text", "e.g. ₹50,000")}
      <div class="form-row"><label class="form-label-x">Priority</label>
        <div class="chip-select">${["High","Medium","Low"].map((p,i)=>`<span class="chip-opt ${i===1?'active':''}" onclick="chipSelect(this)">${p}</span>`).join("")}</div>
      </div>
      <div class="form-row"><label class="form-label-x">Notes</label><textarea class="form-control-x" rows="3" placeholder="Anything worth remembering…"></textarea></div>
      <button class="btn btn-crm-outline w-100 mb-2" onclick="toast('GPS location captured')"><i class="bi bi-geo-alt-fill"></i> Capture GPS Location</button>
      <button class="btn btn-crm-primary w-100" onclick="submitNewLead()">Save Lead</button>
    </div>
  </div>`;
}
function submitNewLead() {
  const id = "L-" + Math.floor(100 + Math.random()*800);
  LEADS.unshift({ id, name: "New Lead Entry", business: "Retail Shop", area: "Pune", mobile: "+91 90000 00000", potential: 30000, status: "New", priority: "Medium" });
  toast("Lead saved successfully");
  setTimeout(() => go("leads"), 300);
}

/* ============================================================
   REPORTS
   ============================================================ */
function renderReportsHome() {
  if (isRole(USER_ROLES.SALES_MANAGER)) return renderSalesManagerReports();
  if (isRole(USER_ROLES.REGIONAL_MANAGER)) return renderRegionalManagerReports();
  if (isRole(USER_ROLES.ADMIN)) return renderAdminReports();
  return renderDSRReports();
}

function reportKpi(label, value, note, icon) {
  return `<div class="card-x p-3"><div class="d-flex justify-content-between"><div><div class="text-faint" style="font-size:.68rem;">${label}</div><div class="fw-bold fs-5 mt-1">${value}</div><div class="text-faint" style="font-size:.65rem;">${note}</div></div><span class="nav-ic-wrap" style="background:var(--orange-100);color:var(--orange-600);"><i class="bi ${icon}"></i></span></div></div>`;
}

function renderTeamHome() {
  const rows = DSR_LEADERBOARD;
  return `<div class="section-pad">
    <div class="card-x p-3 mb-3"><div class="section-title">My Team</div><div class="text-faint mt-1">DSRs reporting to ${currentUser?.name || MANAGER.name}</div></div>
    ${rows.map((d,i)=>`<div class="list-card mb-2"><div class="d-flex align-items-center gap-3"><span class="rank-badge ${i===0?'top':''}">${i+1}</span><div class="flex-grow-1"><div class="d-flex justify-content-between"><span class="fw-bold" style="font-size:.84rem;">${d.name}</span><span class="fw-bold">${fmtINR(d.sales)}</span></div><div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(d.sales/d.target*100,100)}%;background:var(--orange-500);"></div></div><div class="d-flex justify-content-between text-faint mt-1" style="font-size:.68rem;"><span>${fmtPct(d.sales/d.target*100)} target</span><span>${d.orders} orders · ${d.visits} visits</span></div></div></div></div>`).join("")}
  </div>`;
}

function renderManagersScreen() {
  const managers = [
    { name: "Anita Kulkarni", territory: "Pune Region", sales: 4200000, target: 5000000, dsr: 9 },
    { name: "Rahul Sharma", territory: "Mumbai Region", sales: 3820000, target: 4500000, dsr: 8 },
    { name: "Neha Patil", territory: "Nagpur Region", sales: 3410000, target: 4100000, dsr: 7 },
    { name: "Vikas More", territory: "Nashik Region", sales: 2950000, target: 3600000, dsr: 6 }
  ];
  return `<div class="section-pad">
    <div class="card-x p-3 mb-3"><div class="section-title">Regional Manager View</div><div class="text-faint mt-1">Manager-wise performance across the region</div></div>
    ${managers.map((m,i)=>`<div class="list-card mb-2"><div class="d-flex justify-content-between"><div><div class="fw-bold">${m.name}</div><div class="text-faint" style="font-size:.7rem;">${m.territory} · ${m.dsr} DSRs</div></div><div class="text-end"><div class="fw-bold">${fmtINR(m.sales)}</div><div class="text-faint" style="font-size:.68rem;">${fmtPct(m.sales/m.target*100)}</div></div></div><div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(m.sales/m.target*100,100)}%;background:var(--orange-500);"></div></div></div>`).join("")}
  </div>`;
}

function renderPerformanceScreen() {
  if (isRole(USER_ROLES.REGIONAL_MANAGER)) return renderRegionalManagerReports();
  if (isRole(USER_ROLES.ADMIN)) return renderAdminReports();
  return renderSalesManagerReports();
}

function renderSalesManagerReports() {
  const x = roleSalesSummary();
  return `<div class="section-pad">
    <div class="row g-2 mb-3">
      <div class="col-6">${reportKpi("Team Sales", fmtINR(x.total), `${fmtPct(x.achievement)} of target`, "bi-currency-rupee")}</div>
      <div class="col-6">${reportKpi("Orders", x.orders, "Team total", "bi-bag-check-fill")}</div>
      <div class="col-6">${reportKpi("Visits", x.visits, "Field activity", "bi-signpost-split-fill")}</div>
      <div class="col-6">${reportKpi("Collections", fmtINR(x.collection), "Collected", "bi-cash-coin")}</div>
    </div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">DSR Sales Performance</div><div style="height:190px;"><canvas id="repManagerSalesChart"></canvas></div></div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">Top Products</div>${TOP_PRODUCTS.map((p,i)=>`<div class="d-flex justify-content-between align-items-center py-2 ${i?'border-top':''}"><div><span class="rank-badge ${i===0?'top':''} me-2">${i+1}</span><span class="fw-semibold" style="font-size:.82rem;">${p.name}</span></div><span class="fw-bold">${fmtINR(p.sales)}</span></div>`).join("")}</div>
    <div class="card-x p-3"><div class="section-title mb-2">Team Visit Compliance</div>${summaryRow("Planned Visits", "212")}${summaryRow("Completed", "196", "var(--green-600)")}${summaryRow("Skipped", "16", "var(--red-500)")}${summaryRow("Compliance Rate", "92%", null, true)}</div>
  </div>`;
}

function renderRegionalManagerReports() {
  const r = REGIONAL_SUMMARY;
  return `<div class="section-pad">
    <div class="row g-2 mb-3">
      <div class="col-6">${reportKpi("Regional Sales", fmtINR(r.sales), `${fmtPct(r.sales/r.target*100)} of target`, "bi-currency-rupee")}</div>
      <div class="col-6">${reportKpi("Managers", r.activeManagers, "Active managers", "bi-diagram-3-fill")}</div>
      <div class="col-6">${reportKpi("DSRs", r.activeDSR, "Active field force", "bi-people-fill")}</div>
      <div class="col-6">${reportKpi("Collections", fmtINR(r.collections), "Collected", "bi-cash-coin")}</div>
    </div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">State-wise Sales</div><div style="height:200px;"><canvas id="repRegionalChart"></canvas></div></div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">Manager Performance</div>${["Anita Kulkarni","Rahul Sharma","Neha Patil","Vikas More"].map((n,i)=>{const sales=[4200000,3820000,3410000,2950000][i],target=[5000000,4500000,4100000,3600000][i];return `<div class="py-2 ${i?'border-top':''}"><div class="d-flex justify-content-between"><span class="fw-semibold">${n}</span><span class="fw-bold">${fmtINR(sales)}</span></div><div class="progress-track mt-2" style="height:6px;"><div class="progress-fill" style="width:${Math.min(sales/target*100,100)}%;background:var(--steel-500);"></div></div><div class="text-faint mt-1" style="font-size:.68rem;">${fmtPct(sales/target*100)} achievement</div></div>`;}).join("")}</div>
    <div class="card-x p-3"><div class="section-title mb-2">Regional Compliance</div>${summaryRow("Visit Compliance", `${r.visitCompliance}%`, null, true)}${summaryRow("Orders", r.orders)}${summaryRow("Collections", fmtINR(r.collections))}</div>
  </div>`;
}

function renderAdminReports() {
  const a = ADMIN_SUMMARY;
  return `<div class="section-pad">
    <div class="row g-2 mb-3">
      <div class="col-6">${reportKpi("Company Sales", fmtINR(a.sales), `${fmtPct(a.sales/a.target*100)} of target`, "bi-currency-rupee")}</div>
      <div class="col-6">${reportKpi("Orders", a.orders, "All India", "bi-bag-check-fill")}</div>
      <div class="col-6">${reportKpi("Regions", a.regions, "Active regions", "bi-globe2")}</div>
      <div class="col-6">${reportKpi("DSRs", a.dsr, "Active field force", "bi-people-fill")}</div>
    </div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">Executive Sales Overview</div><div style="height:200px;"><canvas id="repAdminChart"></canvas></div></div>
    <div class="card-x p-3 mb-3"><div class="section-title mb-2">Company KPIs</div>${summaryRow("Target", fmtINR(a.target))}${summaryRow("Achieved", fmtINR(a.sales), "var(--green-600)")}${summaryRow("Collections", fmtINR(a.collections))}${summaryRow("Visit Compliance", `${a.visitCompliance}%`, null, true)}</div>
    <button class="btn btn-crm-primary w-100" onclick="toast('Executive report exported')"><i class="bi bi-download me-1"></i> Export Executive Report</button>
  </div>`;
}

function renderDSRReports() {
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg, var(--navy-950), var(--navy-700)); color:#fff; border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,0.6);">This Month · August 2026</div>
      <div class="font-display fw-bold fs-4 mt-1">${fmtINR(DSR.achieved)} <span style="font-size:0.9rem; opacity:0.7; font-weight:600;">/ ${fmtINR(DSR.target)}</span></div>
      <div class="progress-track mt-3" style="background:rgba(255,255,255,0.15);">
        <div class="progress-fill" style="width:${Math.round(DSR.achieved/DSR.target*100)}%; background:var(--orange-500);"></div>
      </div>
    </div>

    <div class="row g-2 mb-3">
      ${actionTile("bi-graph-up-arrow", "Monthly Report", "go('monthlyReport')")}
      ${actionTile("bi-trophy-fill", "Team Leaderboard", "go('managerLeaderboard')")}
      ${actionTile("bi-download", "Export PDF", "toast('Report exported to Downloads')")}
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Sales by Account Type</div>
      <div style="height:170px;"><canvas id="repAccountChart"></canvas></div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Top Products</div>
      ${TOP_PRODUCTS.map((p,i) => `
        <div class="d-flex justify-content-between align-items-center py-2 ${i>0?'border-top':''}">
          <div class="d-flex align-items-center gap-2">
            <span class="rank-badge ${i===0?'top':''}">${i+1}</span>
            <div>
              <div class="fw-semibold" style="font-size:0.82rem;">${p.name}</div>
              <div class="text-faint" style="font-size:0.68rem;">${p.units} units sold</div>
            </div>
          </div>
          <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(p.sales)}</span>
        </div>`).join("")}
    </div>

    <div class="card-x p-3">
      <div class="section-title mb-2">Visit Compliance</div>
      ${summaryRow("Planned Visits", "212")}
      ${summaryRow("Completed", "196", "var(--green-600)")}
      ${summaryRow("Skipped", "16", "var(--red-500)")}
      ${summaryRow("Compliance Rate", "92%", null, true)}
    </div>
  </div>`;
}

function renderSalesManagerMonthlyReport() {
  const x = roleSalesSummary();
  return `<div class="section-pad"><div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;"><div class="eyebrow" style="color:rgba(255,255,255,.65);">MONTHLY TEAM REPORT</div><div class="font-display fw-bold fs-4 mt-1">${fmtINR(x.total)}</div><div style="font-size:.75rem;opacity:.75;">${fmtPct(x.achievement)} target achievement</div></div><div class="card-x p-3 mb-3"><div class="section-title mb-2">DSR Sales Trend</div><div style="height:190px;"><canvas id="mrSalesChart"></canvas></div></div><div class="card-x p-3"><div class="section-title mb-2">Team Summary</div>${summaryRow("Orders", x.orders)}${summaryRow("Visits", x.visits)}${summaryRow("Collections", fmtINR(x.collection))}</div></div>`;
}

function renderRegionalManagerMonthlyReport() {
  const r = REGIONAL_SUMMARY;
  return `<div class="section-pad"><div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;"><div class="eyebrow" style="color:rgba(255,255,255,.65);">MONTHLY REGIONAL REPORT</div><div class="font-display fw-bold fs-4 mt-1">${fmtINR(r.sales)}</div><div style="font-size:.75rem;opacity:.75;">${fmtPct(r.sales/r.target*100)} target achievement</div></div><div class="card-x p-3 mb-3"><div class="section-title mb-2">State Sales</div><div style="height:190px;"><canvas id="mrRegionalChart"></canvas></div></div><div class="card-x p-3">${r.states.map((st,i)=>`<div class="py-2 ${i?'border-top':''}"><div class="d-flex justify-content-between"><span class="fw-semibold">${st.name}</span><span class="fw-bold">${fmtINR(st.sales)}</span></div><div class="text-faint" style="font-size:.68rem;">${fmtPct(st.achievement)} achievement</div></div>`).join("")}</div></div>`;
}

function renderAdminMonthlyReport() {
  const a = ADMIN_SUMMARY;
  return `<div class="section-pad"><div class="card-x p-3 mb-3" style="background:linear-gradient(160deg,var(--navy-950),var(--navy-700));color:#fff;border:none;"><div class="eyebrow" style="color:rgba(255,255,255,.65);">MONTHLY EXECUTIVE REPORT</div><div class="font-display fw-bold fs-4 mt-1">${fmtINR(a.sales)}</div><div style="font-size:.75rem;opacity:.75;">${fmtPct(a.sales/a.target*100)} company achievement</div></div><div class="card-x p-3 mb-3"><div class="section-title mb-2">Company Sales Trend</div><div style="height:190px;"><canvas id="mrAdminChart"></canvas></div></div><div class="card-x p-3">${summaryRow("Target", fmtINR(a.target))}${summaryRow("Sales", fmtINR(a.sales), "var(--green-600)")}${summaryRow("Orders", a.orders)}${summaryRow("Collections", fmtINR(a.collections))}</div></div>`;
}

function renderMonthlyReport() {
  if (isRole(USER_ROLES.SALES_MANAGER)) return renderSalesManagerMonthlyReport();
  if (isRole(USER_ROLES.REGIONAL_MANAGER)) return renderRegionalManagerMonthlyReport();
  if (isRole(USER_ROLES.ADMIN)) return renderAdminMonthlyReport();
  return `
  <div class="section-pad">
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-crm-outline flex-grow-1 btn-sm" onclick="toast('Report exported to Downloads')"><i class="bi bi-download me-1"></i> Export</button>
      <button class="btn btn-crm-outline flex-grow-1 btn-sm" onclick="toast('Report shared')"><i class="bi bi-share-fill me-1"></i> Share</button>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Sales Trend</div>
      <div style="height:180px;"><canvas id="mrSalesChart"></canvas></div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Visit Summary</div>
      <div style="height:180px;"><canvas id="mrVisitsChart"></canvas></div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Account Type Mix</div>
      <div class="d-flex align-items-center gap-3">
        <div style="width:130px;height:130px;"><canvas id="mrAccountChart"></canvas></div>
        <div class="flex-grow-1">
          ${ACCOUNT_TYPE_SALES.map(a => `
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge-x badge-type-${a.type}">${a.type}</span>
              <span class="fw-bold" style="font-size:0.85rem;">${a.pct}%</span>
            </div>`).join("")}
        </div>
      </div>
    </div>

    <div class="card-x p-3 mb-3">
      <div class="section-title mb-2">Product Movement (FMS)</div>
      <div style="height:180px;"><canvas id="mrFmsChart"></canvas></div>
    </div>

    <div class="card-x p-3">
      <div class="section-title mb-2">Top Performing Products</div>
      ${TOP_PRODUCTS.map((p,i) => `
        <div class="d-flex justify-content-between align-items-center py-2 ${i>0?'border-top':''}">
          <div class="d-flex align-items-center gap-2">
            <span class="rank-badge ${i===0?'top':''}">${i+1}</span>
            <div class="fw-semibold" style="font-size:0.82rem;">${p.name}</div>
          </div>
          <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(p.sales)}</span>
        </div>`).join("")}
    </div>
  </div>`;
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function renderNotifications() {
  return `
  <div class="section-pad">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="text-muted-x" style="font-size:0.82rem;">${unreadNotifCount()} unread</div>
      <button class="btn btn-crm-ghost btn-sm" onclick="markAllNotifsRead()">Mark all as read</button>
    </div>
    <div id="notifList">${(state.notifications||[]).map(notifCardHTML).join("") || emptyTab("bi-bell", "No notifications yet")}</div>
  </div>`;
}
function notifCardHTML(n, i) {
  const idx = state.notifications.indexOf(n);
  return `
  <div class="list-card mb-2" style="cursor:pointer; ${n.read?'':'border-left:3px solid var(--orange-500);'}" onclick="readNotif(${idx})">
    <div class="d-flex gap-3">
      <div class="tone-${n.tone}-bg" style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi ${n.icon}"></i></div>
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-start">
          <div class="fw-bold" style="font-size:0.85rem;">${n.title}</div>
          ${!n.read ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--orange-500);flex-shrink:0;margin-top:4px;"></span>` : ""}
        </div>
        <div class="text-muted-x" style="font-size:0.78rem;">${n.desc}</div>
        <div class="text-faint mt-1" style="font-size:0.68rem;">${n.time}</div>
      </div>
    </div>
  </div>`;
}
function readNotif(idx) {
  if (state.notifications[idx]) state.notifications[idx].read = true;
  render();
}
function markAllNotifsRead() {
  state.notifications.forEach(n => n.read = true);
  toast("All notifications marked as read");
  render();
}

/* ============================================================
   PROFILE
   ============================================================ */
 function renderProfile() {

    const user = currentUser || {
        name: DSR.name,
        role: DSR.role,
        employeeId: DSR.id,
        territory: DSR.territory,
        phone: DSR.phone,
        email: DSR.email,
        avatar: DSR.avatar
    };

    const roleLabel = {
        DSR: "DSR",
        SALES_MANAGER: "Sales Manager",
        REGIONAL_MANAGER: "Regional Manager",
        ADMIN: "Administrator"
    };

    const role = roleLabel[user.role] || user.role || "User";

    const hierarchy = {
        DSR: "Sales Manager → Regional Manager",
        SALES_MANAGER: "Regional Manager",
        REGIONAL_MANAGER: "National / Admin",
        ADMIN: "Full System Access"
    };

    return `
        <div class="section-pad">

            <!-- PROFILE HEADER -->
            <div class="profile-card">

                <div class="profile-avatar">
                    ${user.avatar || "U"}
                </div>

                <div class="profile-info">
                    <h4>
                        ${user.name || "User"}
                    </h4>

                    <div class="profile-role">
                        <i class="bi bi-person-badge-fill"></i>
                        ${role}
                    </div>

                    <div class="profile-territory">
                        <i class="bi bi-geo-alt-fill"></i>
                        ${user.territory || "All India"}
                    </div>
                </div>

            </div>


            <!-- USER INFORMATION -->
            <div class="card-x mt-3">

                <div class="card-x-title">
                    <i class="bi bi-person-vcard-fill"></i>
                    Personal Information
                </div>

                <div class="profile-row">
                    <span>Employee ID</span>
                    <strong>
                        ${user.employeeId || user.id || "-"}
                    </strong>
                </div>

                <div class="profile-row">
                    <span>Phone</span>
                    <strong>
                        ${user.phone || "-"}
                    </strong>
                </div>

                <div class="profile-row">
                    <span>Email</span>
                    <strong>
                        ${user.email || "-"}
                    </strong>
                </div>

                <div class="profile-row">
                    <span>Territory</span>
                    <strong>
                        ${user.territory || "-"}
                    </strong>
                </div>

            </div>


            <!-- ROLE INFORMATION -->
            <div class="card-x mt-3">

                <div class="card-x-title">
                    <i class="bi bi-diagram-3-fill"></i>
                    Organization
                </div>

                <div class="profile-row">
                    <span>Designation</span>
                    <strong>
                        ${role}
                    </strong>
                </div>

                <div class="profile-row">
                    <span>Reporting To</span>
                    <strong>
                        ${hierarchy[user.role] || "-"}
                    </strong>
                </div>

                ${
                    user.managerId
                    ? `
                    <div class="profile-row">
                        <span>Manager ID</span>
                        <strong>${user.managerId}</strong>
                    </div>
                    `
                    : ""
                }

                ${
                    user.regionId
                    ? `
                    <div class="profile-row">
                        <span>Region</span>
                        <strong>${user.regionId}</strong>
                    </div>
                    `
                    : ""
                }

            </div>


            <!-- ACCESS -->
            <div class="card-x mt-3">

                <div class="card-x-title">
                    <i class="bi bi-shield-lock-fill"></i>
                    Access Level
                </div>

                ${
                    user.role === USER_ROLES.DSR
                    ? `
                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            My Customers
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            My Visits
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            My Orders
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            My Reports
                        </div>
                    `
                    : user.role === USER_ROLES.SALES_MANAGER
                    ? `
                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Team Performance
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            DSR Performance
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Team Sales & Orders
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Team Reports
                        </div>
                    `
                    : user.role === USER_ROLES.REGIONAL_MANAGER
                    ? `
                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Regional Performance
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Sales Manager Performance
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Regional Sales & Orders
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            Regional Reports
                        </div>
                    `
                    : `
                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            All Regions
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            All Managers
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            All DSRs
                        </div>

                        <div class="profile-access-item">
                            <i class="bi bi-check-circle-fill"></i>
                            All Reports
                        </div>
                    `
                }

            </div>


            <!-- LOGOUT -->
            <button
                class="btn btn-outline-danger w-100 mt-4"
                onclick="doLogout()"
            >
                <i class="bi bi-box-arrow-right me-2"></i>
                Logout
            </button>

        </div>
    `;
}

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
function renderGlobalSearch() {
  return `
  <div class="section-pad">
    <div class="search-bar mb-3">
      <i class="bi bi-search"></i>
      <input id="gsInput" placeholder="Search customers, products, orders…" value="${searchState.q}" oninput="doGlobalSearch(this.value)"/>
    </div>
    <div id="gsResults">${globalSearchResultsHTML(searchState.q)}</div>
  </div>`;
}
function doGlobalSearch(q) {
  searchState.q = q;
  document.getElementById("gsResults").innerHTML = globalSearchResultsHTML(q);
}
function globalSearchResultsHTML(q) {
  const query = (q || "").trim().toLowerCase();
  if (!query) {
    return `<div class="empty-state"><i class="bi bi-search"></i>Start typing to search across customers,<br>products, orders and leads</div>`;
  }
  const custs = CUSTOMERS.filter(c => c.name.toLowerCase().includes(query) || c.area.toLowerCase().includes(query));
  const prods = PRODUCTS.filter(p => p.name.toLowerCase().includes(query) || p.partNo.toLowerCase().includes(query));
  const ords = ORDERS.filter(o => o.id.toLowerCase().includes(query));
  const leads = LEADS.filter(l => l.name.toLowerCase().includes(query));

  if (!custs.length && !prods.length && !ords.length && !leads.length) {
    return `<div class="empty-state"><i class="bi bi-emoji-frown"></i>No results for "${q}"</div>`;
  }
  let html = "";
  if (custs.length) {
    html += `<div class="eyebrow mb-2">Customers (${custs.length})</div>` + custs.slice(0,5).map(customerListCardHTML).join("") + `<div class="mb-3"></div>`;
  }
  if (prods.length) {
    html += `<div class="eyebrow mb-2">Products (${prods.length})</div>` + prods.slice(0,5).map(p => `
      <div class="list-card mb-2" onclick="go('newOrderPickCustomer')" style="cursor:pointer;">
        <div class="d-flex justify-content-between align-items-center">
          <div><div class="fw-semibold" style="font-size:0.84rem;">${p.name}</div><div class="text-faint mono" style="font-size:0.68rem;">${p.partNo}</div></div>
          <span class="fw-bold" style="font-size:0.82rem;">${fmtINR(p.dealerPrice)}</span>
        </div>
      </div>`).join("") + `<div class="mb-3"></div>`;
  }
  if (ords.length) {
    html += `<div class="eyebrow mb-2">Orders (${ords.length})</div>` + ords.slice(0,5).map(orderCardHTML).join("") + `<div class="mb-3"></div>`;
  }
  if (leads.length) {
    html += `<div class="eyebrow mb-2">Leads (${leads.length})</div>` + leads.slice(0,5).map(leadCardHTML).join("");
  }
  return html;
}

/* ============================================================
   MANAGER LEADERBOARD
   ============================================================ */
function renderManagerLeaderboard() {
  if (isRole(USER_ROLES.SALES_MANAGER)) return renderDSRManagerLeaderboard();
  if (isRole(USER_ROLES.REGIONAL_MANAGER)) return renderManagersScreen();
  if (isRole(USER_ROLES.ADMIN)) return renderAdminReports();
  return renderDSRManagerLeaderboard();
}

function renderDSRManagerLeaderboard() {
  const maxSales = Math.max(...DSR_LEADERBOARD.map(d => d.sales));
  return `
  <div class="section-pad">
    <div class="card-x p-3 mb-3" style="background:linear-gradient(160deg, var(--navy-950), var(--navy-700)); color:#fff; border:none;">
      <div class="eyebrow" style="color:rgba(255,255,255,0.6);">${MANAGER.territory} · August 2026</div>
      <div class="fw-bold fs-6 mt-1">Team Sales Leaderboard</div>
      <div style="font-size:0.76rem; opacity:0.75;">Ranked by sales achieved this month</div>
    </div>
    ${DSR_LEADERBOARD.map(d => `
      <div class="list-card mb-2 ${d.name===DSR.name?'':''}" style="${d.name===DSR.name?'border-color:var(--orange-500);':''}">
        <div class="d-flex align-items-center gap-3">
          <span class="rank-badge ${d.rank===1?'top':''}">${d.rank}</span>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <div class="fw-bold" style="font-size:0.86rem;">${d.name}${d.name===DSR.name?' <span class="badge-x tone-orange-bg">You</span>':''}</div>
              <div class="fw-bold" style="font-size:0.84rem;">${fmtINR(d.sales)}</div>
            </div>
            <div class="progress-track mt-2" style="height:6px;">
              <div class="progress-fill" style="width:${Math.round(d.sales/maxSales*100)}%; background:var(--orange-500);"></div>
            </div>
            <div class="d-flex gap-3 mt-2 text-faint" style="font-size:0.68rem;">
              <span>${d.orders} orders</span><span>${d.visits} visits</span><span>${fmtINR(d.collection)} collected</span>
            </div>
          </div>
        </div>
      </div>`).join("")}
  </div>`;
}

document.addEventListener("DOMContentLoaded", function () {
    if (currentUser && currentUser.role) {
        initApp();
    } else {
        renderLogin();
    }
});