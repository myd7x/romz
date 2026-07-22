# Frontend Implementation Prompt — ROMZ (Shipping, Checkout, Size Chart, Order Status)

Implement the following in the ROMZ frontend. Two surfaces: the **storefront** (public, customer)
and the **admin panel** (requires admin JWT). All API paths are prefixed with `/api/v1`. Every
response is shaped `{ success, message, data }`. Send admin requests with header
`Authorization: Bearer <accessToken>`. Use the existing HTTP client / auth handling in the codebase.

===================================================================
STOREFRONT (customer) — public endpoints, no token
===================================================================

## 1. Checkout: Governorate + Zone selection (REQUIRED — checkout breaks without it)

The customer must pick a governorate and zone from Mylerz's list. `POST /orders` now REQUIRES
`shippingAddress.governorateCode` and `shippingAddress.zoneCode`; orders without them are rejected.

- On checkout load: `GET /shipping/governorates`
  Response: `data.governorates = [{ code, nameEn, nameAr, zones: [{ code, nameEn, nameAr }] }]`
  Render two dependent dropdowns:
    * Governorate → options from governorates[] (label nameEn/nameAr, value = code)
    * Zone → options from the selected governorate's zones[] (value = zone code)

## 2. Checkout: live shipping fee + VAT

Whenever the zone or cart changes: `POST /shipping/quote`
Request body:
```
{
  "zoneCode": "<selected zone code>",
  "governorate": "<selected governorate nameEn>",   // optional, enables fallback pricing
  "items": [ { "product": "<id>", "variantId": "<id>", "qty": 2 } ],  // same as /orders items
  "couponCode": "",                                   // optional
  "paymentMethod": "cod"                              // "cod" | "paymob"
}
```
Response `data.quote`:
```
{ "currency":"EGP", "subtotal":900, "discount":0, "cartTotal":900,
  "shippingFee":65, "shippingVat":9.1, "freeShipping":false, "total":974.1 }
```
Order summary UI: show three lines — Shipping (shippingFee), Shipping VAT 14% (shippingVat),
and Total (total — already includes cart + shipping + VAT, just display it). If freeShipping is
true, shippingFee and shippingVat are 0 → show "Free shipping".
IMPORTANT: always display the server `total`; do NOT recompute the total on the client.

## 3. Place the order

`POST /orders` — include the Mylerz codes inside shippingAddress:
```
{
  "customer": { "name":"...", "email":"...", "phone":"01012345678" },
  "shippingAddress": {
    "governorate":"Cairo", "city":"Nasr City",
    "governorateCode":"CA", "zoneCode":"Nasr City",   // <-- NEW, required
    "street":"...", "apartment":"", "postal":""
  },
  "items":[ { "product":"<id>", "variantId":"<id>", "qty":2 } ],
  "couponCode":"", "paymentMethod":"cod"
}
```
Set governorate/city to the human-readable names (for display), and governorateCode/zoneCode to
the codes chosen in step 1. The server recomputes the fee — never send a client-computed fee.

## 4. Product page: Size chart

`GET /storefront-settings` (public) → use `data.settings.sizeChart`:
```
{ "isActive":true, "title":{ "en":"Size Guide","ar":"دليل المقاسات" }, "note":{...},
  "columns":[ {"en":"Size","ar":"المقاس"}, {"en":"Chest (cm)"}, {"en":"Length (cm)"} ],
  "rows":[ ["S","39","60"], ["M","42.5","63"], ["L","45","67"], ["XL","49.5","67.5"] ] }
```
If sizeChart.isActive is true, show a "Size Guide" button/modal that renders a table: header cells
from columns (pick en/ar by locale), body rows from rows (each inner array is one row aligned to
columns). If isActive is false, hide it.

===================================================================
ADMIN PANEL — requires admin Bearer token
===================================================================

## 5. Order status auto-reflects Mylerz (delivered / returned / cancelled)

The backend keeps order.status in sync with Mylerz automatically (a server-side job). The admin
panel just needs to DISPLAY `order.status` and render a badge for every status:
  pending, confirmed, processing, shipped, delivered, cancelled, returned.
Suggested colors: pending/confirmed/processing = neutral/blue, shipped = amber, delivered = green,
returned = purple, cancelled = red.

Optional "Refresh status now" button (instant on-demand sync):
`POST /couriers/mylerz/orders/{orderId}/sync-status`  (empty body)
Response `data`: { changed, mappedStatus, courierStatus, order, mylerz }
- On success, update the row/detail from data.order (status badge + courier.status).
- Toast: data.changed ? "Status updated: {order.status}" : "No change".
- Show data.courierStatus as the courier status line, data.mylerz.StatusDate as "last update".
Guard: only offer it for orders that have order.courier.trackingNumber. A 400 = "no tracking".

## 6. Create shipment (main order action)

`POST /couriers/mylerz/orders/{orderId}/shipment`  — body: {}  (empty)
The backend fills warehouse + destination from the order. On success:
  data.order.courier.trackingNumber is the barcode; order flips to "shipped".
Show a "Create shipment" button on confirmed/COD orders; after success show tracking number +
status. Handle error: show data.message (e.g. Mylerz validation text).

(Remove any old Bosta/manual courier UI — those endpoints no longer exist.)

After shipping, these read endpoints exist (use order.courier.trackingNumber as {awb}):
  GET /couriers/mylerz/packages/{awb}/status        (raw Mylerz status)
  GET /couriers/mylerz/packages/{awb}/details
  GET /couriers/mylerz/packages/{awb}/tracking       (event timeline → render a stepper)
  GET /couriers/mylerz/packages/{awb}/tracking-url    (public tracking link)
  POST /couriers/mylerz/packages/{awb}/cancel         (body { "referenceNumber":"" })

## 7. Size chart editor (settings)

`PATCH /admin/storefront-settings` with a `sizeChart` object (shallow-merged, send only changes):
```
{ "sizeChart": {
    "isActive": true,
    "title": { "en":"Size Guide", "ar":"دليل المقاسات" },
    "columns": [ {"en":"Size"}, {"en":"Chest (cm)"}, {"en":"Length (cm)"} ],
    "rows": [ ["S","39","60"], ["M","42.5","63"], ["L","45","67"], ["XL","49.5","67.5"] ] } }
```
UI: editable grid — add/remove columns (EN/AR header each), add/remove rows, a text input per
cell, and a "show on site" toggle (isActive). Limits: ≤12 columns, ≤50 rows, ≤120 chars/cell.
To just toggle visibility, send `{ "sizeChart": { "isActive": false } }`.

## 8. Shipping settings

`PATCH /admin/storefront-settings`:
```
{ "freeShippingThreshold": 1500,   // cart total (after discount) at/above which shipping is free; null = never
  "fallbackShippingFee": 70 }       // flat fee used only if Mylerz can't quote; null = none
```
Add two inputs in the store settings page for these.

===================================================================
SUMMARY OF WHAT MUST CHANGE
===================================================================
Storefront (blocking): #1 governorate/zone dropdowns, #2 live quote (fee+VAT), #3 send codes in /orders.
Storefront (display):  #2 order-summary lines, #4 size chart on product page.
Admin (recommended):   #5 status badges for all 7 statuses (+ optional refresh button),
                       #6 create-shipment button + tracking, #7 size-chart editor, #8 shipping settings.
The VAT and auto status changes need NO extra frontend work beyond displaying order `total` and
`order.status` — the backend already includes VAT in `total` and keeps `order.status` current.
