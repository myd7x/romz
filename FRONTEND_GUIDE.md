# Frontend Guide — Shipping, Checkout & Size Chart

All paths are prefixed with **`/api/v1`**. Every response is `{ success, message, data }`.

- **User (storefront)** endpoints are **public** — no token.
- **Admin (dashboard)** endpoints require an admin JWT header: `Authorization: Bearer <accessToken>`.

---

# 👤 USER — Storefront

## A. Checkout: pick Governorate + Zone, show live shipping fee

The customer selects their **governorate** and **zone** from Mylerz's list, and the shipping fee
is fetched live from Mylerz. The warehouse (pickup point) is handled by the backend — **the user
never sees or enters it**.

### Step 1 — Load the governorate/zone list

`GET /shipping/governorates`

Call once when the checkout page opens; cache it client-side.

**Response**

```json
{
  "success": true,
  "message": "Governorates fetched",
  "data": {
    "governorates": [
      {
        "code": "CA",
        "nameEn": "Cairo",
        "nameAr": "القاهرة",
        "zones": [
          { "code": "Nasr City", "nameEn": "Nasr City", "nameAr": "مدينة نصر" },
          { "code": "HEl",       "nameEn": "Heliopolis", "nameAr": "هيليوبلس" }
        ]
      }
    ]
  }
}
```

**UI:** two dependent dropdowns.
1. **Governorate** dropdown → options from `governorates[]` (show `nameEn`/`nameAr`, value = `code`).
2. **Zone** dropdown → options from the selected governorate's `zones[]` (value = zone `code`).

### Step 2 — Get the live shipping fee

`POST /shipping/quote` — call whenever the zone or cart changes.

**Request**

```json
{
  "zoneCode": "Nasr City",
  "governorate": "Cairo",
  "items": [
    { "product": "665f...", "variantId": "665f...", "qty": 2 }
  ],
  "couponCode": "",
  "paymentMethod": "cod"
}
```

| Field | Required | Notes |
|---|---|---|
| `zoneCode` | ✅ | selected zone `.code` |
| `governorate` | — | selected governorate `nameEn` (enables fallback pricing if Mylerz is down) |
| `items` | ✅ | same shape as `POST /orders` items (`product` + `variantId` or `sku`, `qty`) |
| `couponCode` | — | applied coupon |
| `paymentMethod` | — | `cod` (default) or `paymob` |

**Response**

```json
{
  "success": true,
  "message": "Shipping quote calculated",
  "data": {
    "quote": {
      "currency": "EGP",
      "subtotal": 900,
      "discount": 0,
      "cartTotal": 900,
      "shippingFee": 65,
      "shippingVat": 9.1,
      "freeShipping": false,
      "total": 974.1
    }
  }
}
```

**UI:** in the order summary show three lines — `shippingFee` (Shipping), `shippingVat` (Shipping
VAT 14%), and `total`. `total` already includes the cart, shipping fee **and** the VAT, so just
display it. If `freeShipping` is `true`, `shippingFee` and `shippingVat` are `0` — show "Free
shipping". Re-quote when the zone/cart/coupon changes.

### Step 3 — Place the order

`POST /orders` — add the two Mylerz **codes** to `shippingAddress`. The backend recomputes the
fee itself (never trust a client-sent fee).

**Request**

```json
{
  "customer": { "name": "Ali Hassan", "email": "ali@example.com", "phone": "01012345678" },
  "shippingAddress": {
    "governorate": "Cairo",
    "city": "Nasr City",
    "governorateCode": "CA",
    "zoneCode": "Nasr City",
    "street": "12 El-Nasr St, Building 4",
    "apartment": "5",
    "postal": ""
  },
  "items": [ { "product": "665f...", "variantId": "665f...", "qty": 2 } ],
  "couponCode": "",
  "paymentMethod": "cod"
}
```

> **New required fields:** `shippingAddress.governorateCode` and `shippingAddress.zoneCode`.
> Set `governorate`/`city` to the human-readable names (for display/receipts) and the two
> `*Code` fields to the Mylerz codes selected in Step 1. Orders will be **rejected** without the codes.

---

## B. Size chart on the product page

`GET /storefront-settings` (public) returns the whole store settings; use `settings.sizeChart`.

**Relevant part of the response**

```json
{
  "data": {
    "settings": {
      "sizeChart": {
        "isActive": true,
        "title": { "en": "Size Guide", "ar": "دليل المقاسات" },
        "note":  { "en": "", "ar": "" },
        "columns": [
          { "en": "Size", "ar": "المقاس" },
          { "en": "Chest (cm)", "ar": "الصدر (سم)" },
          { "en": "Length (cm)", "ar": "الطول (سم)" }
        ],
        "rows": [
          ["S", "39", "60"],
          ["M", "42.5", "63"],
          ["L", "45", "67"],
          ["XL", "49.5", "67.5"]
        ]
      }
    }
  }
}
```

**UI:** if `sizeChart.isActive` is `true`, render a "Size Guide" button/modal. Build an HTML
table: header cells from `columns` (pick `en`/`ar` by locale), body from `rows` (each inner array
is one row, cells aligned to the columns). If `isActive` is `false`, hide it.

---

# 🛠️ ADMIN — Dashboard

Base for courier actions: `/couriers`. All require the admin Bearer token.

## C. Order page: create & track the Mylerz shipment

### Create shipment (the main button)

`POST /couriers/mylerz/orders/:orderId/shipment`

Because the order now stores `governorateCode`/`zoneCode`, **just send an empty body** — the
warehouse and destination are filled automatically.

**Request:** `{}`

**Response (success)**

```json
{
  "data": {
    "order": { "courier": { "trackingNumber": "2100000123456", "status": "Created", "...": "" } },
    "mylerz": { "PickupOrderCode": "PU123456", "Packages": [ { "BarCode": "2100000123456" } ] }
  }
}
```

On success: order flips to `shipped`, customer is notified (email + WhatsApp). Store/show
`order.courier.trackingNumber`.

> **Old orders** (placed before this feature) have no codes. For those, send the destination
> explicitly: `{ "cityCode": "CA", "neighborhoodCode": "Nasr City" }` (values from
> `GET /couriers/mylerz/city-zones`).

### Sync the order status from Mylerz ⭐

`POST /couriers/mylerz/orders/:orderId/sync-status`  (body: none)

Pulls the **live** Mylerz status and writes it onto the order, so an order automatically becomes
`delivered` / `returned` once Mylerz reports it (instead of being stuck on `shipped`). Without this
the order keeps the status it had at shipment time.

**Response**

```json
{
  "data": {
    "changed": true,
    "mappedStatus": "delivered",
    "courierStatus": "Delivered",
    "order": { "status": "delivered", "courier": { "status": "Delivered" } },
    "mylerz": { "StatusName": "Delivered", "Status": "Delivered", "StatusDate": "2026-07-21T..." }
  }
}
```

Behavior:
- Advances the order along the delivery lifecycle only: `shipped → delivered / returned` (never
  downgrades a terminal status).
- Always refreshes `order.courier.status` with the live Mylerz text.
- On a real change, the customer gets the status email + WhatsApp automatically.
- **Cancellations** are recorded on `courier.status` (e.g. "Cancelled by Shipper") but do **not**
  auto-cancel the order — restock/refund stays a manual admin action.

**UI:** add a "Refresh status" button on the order page, and/or call it when the admin opens the
order. (For hands-off updates, schedule it — see note below.)

> To update automatically without a click, run this on a schedule (e.g. a Vercel Cron hitting an
> internal job) for every order still in `shipped`. Ask and I'll wire up the cron job.

### After shipping — raw status / tracking (all use the barcode as `:awb`)

| Purpose | Endpoint |
|---|---|
| Status badge (raw Mylerz) | `GET /couriers/mylerz/packages/:awb/status` |
| Full details | `GET /couriers/mylerz/packages/:awb/details` |
| Event timeline | `GET /couriers/mylerz/packages/:awb/tracking` |
| Public tracking link | `GET /couriers/mylerz/packages/:awb/tracking-url` |
| Cancel shipment | `POST /couriers/mylerz/packages/:awb/cancel` (body `{ "referenceNumber": "" }`) |

### Optional helpers (rarely needed — backend already defaults these)

- `GET /couriers/mylerz/warehouses` — list pickup warehouses.
- `GET /couriers/mylerz/city-zones` — raw Mylerz city/zone list.
- `POST /couriers/mylerz/expected-charges` — manual price check (all fields optional now;
  warehouse defaults server-side).

## D. Manage the size chart

`PATCH /admin/storefront-settings` with a `sizeChart` object. It's **shallow-merged**, so you can
send only what changed.

**Replace the whole table**

```json
{
  "sizeChart": {
    "isActive": true,
    "title": { "en": "Size Guide", "ar": "دليل المقاسات" },
    "columns": [ { "en": "Size" }, { "en": "Chest (cm)" }, { "en": "Length (cm)" } ],
    "rows": [ ["S","39","60"], ["M","42.5","63"], ["L","45","67"], ["XL","49.5","67.5"] ]
  }
}
```

**Just toggle visibility** (keeps existing columns/rows)

```json
{ "sizeChart": { "isActive": false } }
```

**UI:** an editable grid — add/remove columns (each with EN/AR header), add/remove rows, a text
input per cell, plus a "show on site" toggle. Limits: ≤12 columns, ≤50 rows, ≤120 chars/cell.

## E. Shipping settings (fees & fallback)

`PATCH /admin/storefront-settings`:

| Field | Meaning |
|---|---|
| `freeShippingThreshold` | cart total (after discount) at/above which shipping is free. `null` = never free. |
| `fallbackShippingFee` | flat fee used only if Mylerz can't quote **and** no matching ShippingZone. `null` = none. |

Example: `{ "freeShippingThreshold": 1500, "fallbackShippingFee": 70 }`

**Fallback order when Mylerz is unreachable:** matching `ShippingZone` fee (managed under
`/shipping-zones`) → `fallbackShippingFee` → else the request fails (customer retries). So keep at
least `fallbackShippingFee` set for safety.

---

## Summary of what the frontend must change

**Storefront (user):**
1. Checkout: add Governorate → Zone dropdowns from `GET /shipping/governorates`.
2. Checkout: call `POST /shipping/quote` to show the live fee/total.
3. Checkout: send `governorateCode` + `zoneCode` inside `shippingAddress` on `POST /orders`.
4. Product page: render `settings.sizeChart` from `GET /storefront-settings`.

**Dashboard (admin):**
1. Order page: "Create shipment" button → `POST /couriers/mylerz/orders/:id/shipment` with `{}`,
   then show tracking/status.
2. Settings: a size-chart editor → `PATCH /admin/storefront-settings`.
3. Settings: free-shipping threshold + fallback fee inputs → `PATCH /admin/storefront-settings`.
