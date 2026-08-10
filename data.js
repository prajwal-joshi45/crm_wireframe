/* ============================================================
   MOCK DATA — Sales CRM (Automotive Distribution)
   ============================================================ */

const DSR = {
  id: "EMP-2291",
  name: "Prajwal Deshmukh",
  role: "DSR",
  territory: "Pune West",
  phone: "+91 98221 34567",
  email: "prajwal.deshmukh@salescrm.in",
  target: 5000000,
  achieved: 4200000,
  avatar: "PD"
};

const MANAGER = {
  id: "MGR-1042",
  name: "Anita Kulkarni",
  role: "Sales Manager",
  territory: "Pune Region",
  phone: "+91 98220 11223",
  email: "anita.kulkarni@salescrm.in",
  avatar: "AK"
};

const CUSTOMERS = [
  {
    id: "CUST-1001", name: "ABC Auto Parts", type: "Retailer", owner: "Ramesh Bhosale",
    phone: "+91 98901 22334", area: "Kothrud", city: "Pune", pincode: "411038",
    creditLimit: 500000, outstanding: 320000, lastOrder: "02 Aug 2026", lastOrderValue: 45000,
    lastVisit: "05 Aug 2026", avgOrderValue: 38500, salesThisMonth: 186000, status: "Active",
    distance: "1.2 km", lat: 18.5074, lng: 73.8077
  },
  {
    id: "CUST-1002", name: "Shree Motors", type: "Retailer", owner: "Suresh Patwardhan",
    phone: "+91 98902 44556", area: "Karve Nagar", city: "Pune", pincode: "411052",
    creditLimit: 350000, outstanding: 96000, lastOrder: "28 Jul 2026", lastOrderValue: 22000,
    lastVisit: "06 Aug 2026", avgOrderValue: 27800, salesThisMonth: 142000, status: "Active",
    distance: "2.8 km", lat: 18.4914, lng: 73.8079
  },
  {
    id: "CUST-1003", name: "Patil Auto Garage", type: "Mechanic", owner: "Vikas Patil",
    phone: "+91 98903 66778", area: "Warje", city: "Pune", pincode: "411058",
    creditLimit: 100000, outstanding: 34000, lastOrder: "04 Aug 2026", lastOrderValue: 8200,
    lastVisit: "07 Aug 2026", avgOrderValue: 6400, salesThisMonth: 41200, status: "Active",
    distance: "3.5 km", lat: 18.4801, lng: 73.8079
  },
  {
    id: "CUST-1004", name: "Raj Distributors", type: "Distributor", owner: "Rajendra Shah",
    phone: "+91 98904 88990", area: "Hinjewadi", city: "Pune", pincode: "411057",
    creditLimit: 2500000, outstanding: 1450000, lastOrder: "01 Aug 2026", lastOrderValue: 320000,
    lastVisit: "03 Aug 2026", avgOrderValue: 285000, salesThisMonth: 1120000, status: "Active",
    distance: "8.1 km", lat: 18.5912, lng: 73.7389
  },
  {
    id: "CUST-1005", name: "Om Sai Auto", type: "Retailer", owner: "Mahesh Jadhav",
    phone: "+91 98905 11223", area: "Kothrud", city: "Pune", pincode: "411038",
    creditLimit: 400000, outstanding: 415000, lastOrder: "30 Jul 2026", lastOrderValue: 51000,
    lastVisit: "04 Aug 2026", avgOrderValue: 33200, salesThisMonth: 98000, status: "Overdue",
    distance: "1.8 km", lat: 18.5033, lng: 73.8046
  },
  {
    id: "CUST-1006", name: "Deccan Spares", type: "Retailer", owner: "Nitin Kale",
    phone: "+91 98906 33445", area: "Deccan", city: "Pune", pincode: "411004",
    creditLimit: 300000, outstanding: 54000, lastOrder: "06 Aug 2026", lastOrderValue: 19000,
    lastVisit: "07 Aug 2026", avgOrderValue: 21400, salesThisMonth: 87000, status: "Active",
    distance: "5.4 km", lat: 18.5158, lng: 73.8412
  },
  {
    id: "CUST-1007", name: "Highway Motor Works", type: "Mechanic", owner: "Sanjay More",
    phone: "+91 98907 55667", area: "Warje", city: "Pune", pincode: "411058",
    creditLimit: 80000, outstanding: 12000, lastOrder: "07 Aug 2026", lastOrderValue: 5400,
    lastVisit: "07 Aug 2026", avgOrderValue: 4800, salesThisMonth: 26000, status: "Active",
    distance: "3.9 km", lat: 18.4788, lng: 73.8125
  }
];

const PRODUCTS = [
  { id: "P-001", name: "Brake Pad Set — Front", partNo: "BP-4410-F", category: "Braking", brand: "Bosch", mrp: 1450, dealerPrice: 1120, stock: 240, discount: 8, fms: "F", img: "🛞" },
  { id: "P-002", name: "Clutch Plate — Heavy Duty", partNo: "CP-2210-HD", category: "Transmission", brand: "Luk", mrp: 2800, dealerPrice: 2190, stock: 86, discount: 5, fms: "M", img: "⚙️" },
  { id: "P-003", name: "Air Filter — Standard", partNo: "AF-1188", category: "Filters", brand: "Mann", mrp: 480, dealerPrice: 365, stock: 512, discount: 10, fms: "F", img: "🌬️" },
  { id: "P-004", name: "Oil Filter — Spin-On", partNo: "OF-3021", category: "Filters", brand: "Mann", mrp: 320, dealerPrice: 245, stock: 640, discount: 10, fms: "F", img: "🛢️" },
  { id: "P-005", name: "Spark Plug — Iridium", partNo: "SP-9012-IR", category: "Ignition", brand: "NGK", mrp: 690, dealerPrice: 540, stock: 320, discount: 6, fms: "F", img: "✨" },
  { id: "P-006", name: "Chain Kit — Complete", partNo: "CK-5540", category: "Drivetrain", brand: "Rollon", mrp: 3200, dealerPrice: 2560, stock: 44, discount: 4, fms: "S", img: "🔗" },
  { id: "P-007", name: "Brake Shoe Set — Rear", partNo: "BS-1187-R", category: "Braking", brand: "Bosch", mrp: 780, dealerPrice: 610, stock: 190, discount: 8, fms: "M", img: "🛑" },
  { id: "P-008", name: "Engine Oil 20W-40 (1L)", partNo: "EO-4420-1L", category: "Lubricants", brand: "Castrol", mrp: 420, dealerPrice: 330, stock: 900, discount: 12, fms: "F", img: "🧴" },
  { id: "P-009", name: "Headlight Bulb — Halogen", partNo: "HB-2201", category: "Electrical", brand: "Philips", mrp: 250, dealerPrice: 190, stock: 380, discount: 5, fms: "M", img: "💡" },
  { id: "P-010", name: "Radiator Coolant (1L)", partNo: "RC-7712", category: "Lubricants", brand: "Castrol", mrp: 380, dealerPrice: 295, stock: 260, discount: 7, fms: "S", img: "❄️" },
  { id: "P-011", name: "Fuel Filter — Diesel", partNo: "FF-6630", category: "Filters", brand: "Mann", mrp: 560, dealerPrice: 430, stock: 150, discount: 6, fms: "M", img: "⛽" },
  { id: "P-012", name: "Wiper Blade Set", partNo: "WB-1100", category: "Accessories", brand: "Bosch", mrp: 620, dealerPrice: 480, stock: 210, discount: 9, fms: "S", img: "🧹" }
];

const SMART_BUCKETS = [
  { id: "SB-01", name: "Engine Service Bucket", items: ["P-004", "P-008", "P-011", "P-003"], mrp: 1780, offer: 1520, discount: 15 },
  { id: "SB-02", name: "Brake Bucket", items: ["P-001", "P-007"], mrp: 2230, offer: 1980, discount: 11 },
  { id: "SB-03", name: "Premium Bucket", items: ["P-002", "P-005", "P-009", "P-012"], mrp: 4360, offer: 3760, discount: 14 },
  { id: "SB-04", name: "Fast Moving Bucket", items: ["P-001", "P-003", "P-004", "P-005", "P-008"], mrp: 3360, offer: 2860, discount: 15 },
  { id: "SB-05", name: "Festival Offer Bucket", items: ["P-001", "P-002", "P-006", "P-009"], mrp: 6930, offer: 5890, discount: 15 }
];

const TODAY_VISITS = [
  { id: "V-001", customerId: "CUST-1001", time: "09:30 AM", purpose: "Order Collection", priority: "High", status: "Completed" },
  { id: "V-002", customerId: "CUST-1002", time: "10:15 AM", purpose: "Payment Collection", priority: "High", status: "Completed" },
  { id: "V-003", customerId: "CUST-1003", time: "11:00 AM", purpose: "Relationship Visit", priority: "Medium", status: "Completed" },
  { id: "V-004", customerId: "CUST-1007", time: "11:45 AM", purpose: "New Product Introduction", priority: "Medium", status: "Completed" },
  { id: "V-005", customerId: "CUST-1005", time: "01:30 PM", purpose: "Payment Collection", priority: "High", status: "In Progress" },
  { id: "V-006", customerId: "CUST-1006", time: "02:30 PM", purpose: "Order Collection", priority: "Medium", status: "Planned" },
  { id: "V-007", customerId: "CUST-1004", time: "04:00 PM", purpose: "Product Promotion", priority: "High", status: "Planned" },
  { id: "V-008", customerId: "CUST-1002", time: "05:00 PM", purpose: "Follow-up", priority: "Low", status: "Skipped" }
];

const ACTIVITY_TIMELINE = [
  { time: "09:10 AM", text: "Attendance Marked", icon: "bi-check-circle-fill", tone: "success" },
  { time: "09:35 AM", text: "Visited ABC Auto Parts", icon: "bi-geo-alt-fill", tone: "steel" },
  { time: "10:20 AM", text: "Order Created — ₹18,500", icon: "bi-bag-check-fill", tone: "success" },
  { time: "11:15 AM", text: "Visited XYZ Motors", icon: "bi-geo-alt-fill", tone: "steel" },
  { time: "12:10 PM", text: "Feedback Submitted", icon: "bi-star-fill", tone: "amber" },
  { time: "01:30 PM", text: "Follow-up Pending", icon: "bi-hourglass-split", tone: "pending" }
];

const ORDERS = [
  { id: "ORD-2026-001245", customerId: "CUST-1001", date: "07 Aug 2026", items: 12, amount: 48500, status: "Confirmed", payment: "Pending" },
  { id: "ORD-2026-001244", customerId: "CUST-1002", date: "06 Aug 2026", items: 6, amount: 22000, status: "Delivered", payment: "Paid" },
  { id: "ORD-2026-001243", customerId: "CUST-1004", date: "05 Aug 2026", items: 34, amount: 320000, status: "Confirmed", payment: "Partial" },
  { id: "ORD-2026-001242", customerId: "CUST-1003", date: "04 Aug 2026", items: 4, amount: 8200, status: "Delivered", payment: "Paid" },
  { id: "ORD-2026-001241", customerId: "CUST-1005", date: "30 Jul 2026", items: 9, amount: 51000, status: "Delivered", payment: "Overdue" }
];

const LEADS = [
  { id: "L-101", name: "Ganesh Auto Center", business: "Retail Shop", area: "Bavdhan", mobile: "+91 99001 22110", potential: 65000, status: "Interested", priority: "High" },
  { id: "L-102", name: "Speedway Garage", business: "Mechanic", area: "Warje", mobile: "+91 99002 33221", potential: 28000, status: "Contacted", priority: "Medium" },
  { id: "L-103", name: "Modern Spares Co.", business: "New Prospect", area: "Kothrud", mobile: "+91 99003 44332", potential: 120000, status: "Quotation Sent", priority: "High" },
  { id: "L-104", name: "City Auto Care", business: "Retail Shop", area: "Deccan", mobile: "+91 99004 55443", potential: 42000, status: "New", priority: "Medium" },
  { id: "L-105", name: "Reliable Motors", business: "Mechanic", area: "Karve Nagar", mobile: "+91 99005 66554", potential: 18000, status: "Negotiation", priority: "Low" }
];

const NOTIFICATIONS = [
  { icon: "bi-exclamation-triangle-fill", tone: "danger", title: "Credit Limit Exceeded", desc: "Om Sai Auto has crossed available credit limit.", time: "10 min ago" },
  { icon: "bi-check-circle-fill", tone: "success", title: "Order Approved", desc: "ORD-2026-001243 approved by manager.", time: "45 min ago" },
  { icon: "bi-person-plus-fill", tone: "steel", title: "New Lead Assigned", desc: "Modern Spares Co. assigned to you.", time: "1 hr ago" },
  { icon: "bi-alarm-fill", tone: "amber", title: "Visit Reminder", desc: "Raj Distributors visit scheduled at 4:00 PM.", time: "2 hr ago" },
  { icon: "bi-file-earmark-text-fill", tone: "amber", title: "Quotation Expiring", desc: "QTN-2026-0089 expires tomorrow.", time: "3 hr ago" },
  { icon: "bi-cash-coin", tone: "danger", title: "Payment Due", desc: "₹51,000 overdue from Om Sai Auto.", time: "5 hr ago" },
  { icon: "bi-trophy-fill", tone: "success", title: "Target Achievement", desc: "You've crossed 80% of monthly target!", time: "Yesterday" },
  { icon: "bi-chat-dots-fill", tone: "steel", title: "Manager Message", desc: "\"Great work on Hinjewadi region this week.\"", time: "Yesterday" }
];

const WEEKLY_SALES = [
  { label: "Week 1", value: 820000 },
  { label: "Week 2", value: 1040000 },
  { label: "Week 3", value: 1210000 },
  { label: "Week 4", value: 1130000 }
];

const ACCOUNT_TYPE_SALES = [
  { type: "Distributor", pct: 45, orders: 28, sales: 1890000, outstanding: 1450000 },
  { type: "Retailer", pct: 40, orders: 96, sales: 1680000, outstanding: 885000 },
  { type: "Mechanic", pct: 15, orders: 64, sales: 630000, outstanding: 46000 }
];

const DSR_LEADERBOARD = [
  { rank: 1, name: "Prajwal Deshmukh", sales: 4200000, target: 5000000, orders: 138, visits: 212, collection: 3120000 },
  { rank: 2, name: "Aditya Rane", sales: 3950000, target: 4500000, orders: 121, visits: 198, collection: 2860000 },
  { rank: 3, name: "Snehal Joshi", sales: 3720000, target: 4200000, orders: 115, visits: 190, collection: 2640000 },
  { rank: 4, name: "Kiran Sawant", sales: 3180000, target: 4000000, orders: 98, visits: 165, collection: 2210000 },
  { rank: 5, name: "Rohan Gaikwad", sales: 2760000, target: 3800000, orders: 84, visits: 150, collection: 1890000 }
];

const TOP_PRODUCTS = [
  { name: "Brake Pad Set — Front", units: 1240, sales: 1388800 },
  { name: "Engine Oil 20W-40 (1L)", units: 3400, sales: 1122000 },
  { name: "Clutch Plate — HD", units: 410, sales: 897900 },
  { name: "Air Filter — Standard", units: 2890, sales: 1054850 },
  { name: "Spark Plug — Iridium", units: 1980, sales: 1069200 }
];

/* Attendance history — was referenced by app.js but never defined, which
   threw a ReferenceError and silently broke the Attendance screen. */
const ATTENDANCE_HISTORY = [
  { date: "07 Aug 2026", day: "Fri", checkIn: "09:12 AM", checkOut: "06:40 PM", hours: "9h 28m", status: "Present" },
  { date: "06 Aug 2026", day: "Thu", checkIn: "09:05 AM", checkOut: "06:15 PM", hours: "9h 10m", status: "Present" },
  { date: "05 Aug 2026", day: "Wed", checkIn: "09:20 AM", checkOut: "06:30 PM", hours: "9h 10m", status: "Present" },
  { date: "04 Aug 2026", day: "Tue", checkIn: "—", checkOut: "—", hours: "—", status: "On Leave" },
  { date: "03 Aug 2026", day: "Mon", checkIn: "09:08 AM", checkOut: "06:20 PM", hours: "9h 12m", status: "Present" }
];

/* Quotations — line items reference real PRODUCTS so totals & the
   generated PDF are computed, not hard-coded strings. */
const QUOTATIONS = [
  {
    id: "QTN-2026-0089", customerId: "CUST-1004", validity: "10 Aug 2026",
    items: [
      { productId: "P-001", qty: 40 },
      { productId: "P-003", qty: 60 },
      { productId: "P-008", qty: 100 },
      { productId: "P-005", qty: 30 }
    ]
  },
  {
    id: "QTN-2026-0088", customerId: "CUST-1001", validity: "12 Aug 2026",
    items: [
      { productId: "P-005", qty: 20 },
      { productId: "P-009", qty: 15 }
    ]
  },
  {
    id: "QTN-2026-0087", customerId: "CUST-1006", validity: "09 Aug 2026",
    items: [
      { productId: "P-004", qty: 10 },
      { productId: "P-011", qty: 8 }
    ]
  }
];

const state = {
  role: "DSR", // or "Manager"
  activeTab: "home",
  homeView: "today",
  stack: [],
  cart: [],
  currentCustomerId: null,
  offline: false,
  pendingSync: 0,
  attendanceMarked: false,
  attendanceTime: null,
  // NOTIFICATIONS existed as a data array but was never wired into state,
  // so the Notifications screen always rendered empty. Fixed here.
  notifications: NOTIFICATIONS.map((n, i) => ({ ...n, read: i > 2 }))
};

function fmtINR(n) {
  const num = Math.round(n);
  const s = Math.abs(num).toString();
  let last3 = s.substring(s.length - 3);
  const other = s.substring(0, s.length - 3);
  if (other !== '') last3 = ',' + last3;
  const formatted = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3;
  return (num < 0 ? "-₹" : "₹") + formatted;
}

function fmtLakh(n) {
  return "₹" + (n / 100000).toFixed(1) + "L";
}

function getCustomer(id) {
  return CUSTOMERS.find(c => c.id === id);
}
function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

 