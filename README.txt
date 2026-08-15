ENTERPRISE CRM — TRUE MERGED BUILD

This package is a real additive merge, not a copy-only package.

FOUNDATION
----------
The original supplied Sales CRM app remains the operational foundation:
app.js + data.js + styles.css.

PRESERVED ORIGINAL FEATURES
---------------------------
Home, Today/Month, visits, visit timer, attendance, customers, customer
detail, orders, cart, FMS, Smart Buckets, Discount Rules, Credit Check,
quotations, PDF helpers, leads, notifications, profile, global search,
role-based navigation, reports, manager/regional/admin views and the
existing Business Insights + Geo/Pricing layers.

NEW MERGED ENTERPRISE BI
------------------------
enterprise_bi_merge.js adds:
- Enterprise BI Command Center
- Overview / Regions / Managers / DSRs / Customers / Products / Risk /
  Revenue / Collections tabs
- Sales, target, achievement, outstanding and pipeline KPIs
- Sales trend chart
- Region sales chart
- Manager sales/target chart
- DSR productivity chart
- Customer concentration chart
- Inventory capital chart
- Credit utilisation chart
- Revenue and collections charts

TRUE DRILL-THROUGH MERGE
------------------------
The new charts use the SAME IDs/data as the original CRM and route clicks
back into the original application:
Region -> showStateDrilldown
Manager -> showManagerDrilldown
DSR -> showDsrDrilldown
Customer -> customerDetail
Product -> showProductDrilldown
Risk -> customer Payments
Cross-sell -> existing Customer Gap drill-through
Pricing -> existing Pricing drill-through
Order -> existing Order Confirmation + Order 360 chart

CUSTOMER 360
------------
A new 360 tab is added without removing the existing:
Overview, Orders, Payments, Visits, Products, Feedback and Leads tabs.

Customer 360 includes:
- sales
- order value
- outstanding
- credit utilisation
- order history chart
- commercial/credit chart
- Order / Collect / Cross-sell / Visit actions

IMPORTANT
---------
This package intentionally does NOT replace the existing CRM app with the
new BI demo architecture. It merges the BI functionality over the original
operational application so the existing features remain usable.

The data is still the supplied demo/mock data. Production API/database
integration must be connected to the existing endpoints.
