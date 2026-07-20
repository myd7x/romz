# Storefront Checkout & Shipping — Frontend Guide

Shipping fees are now **live from Mylerz**. At checkout the customer picks a **governorate** and a **zone**, the frontend asks the backend for the fee, and the same codes are stored on the order so the admin can create the Mylerz shipment with one click.

- **Base path:** `/api/v1`
- **Auth:** all endpoints here are **public** (no token). `POST /orders` optionally accepts a logged-in customer token but doesn't require one.
- **Response envelope:** `{ "success": true, "message": "...", "data": { ... } }`.
- **Currency:** EGP.

---

## The checkout flow (3 steps)

```
1. Load governorates + zones   →  GET  /shipping/governorates
2. Customer picks zone,
   frontend asks for the fee    →  POST /shipping/quote
3. Customer confirms,
   frontend places the order    →  POST /orders   (includes governorateCode + zoneCode)
```

The backend **re-calculates** the shipping fee on `POST /orders` from Mylerz — it never trusts a fee sent by the browser. The quote in step 2 is only for display.

---

## 1. Get governorates and zones

`GET /shipping/governorates`

Populates the two dropdowns. The list comes from Mylerz and is cached server-side (~6h), so it's cheap to call on page load.

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
          { "code": "HEl", "nameEn": "Heliopolis", "nameAr": "هيليوبلس" },
          { "code": "Zamalek", "nameEn": "Zamalek", "nameAr": "الزمالك" }
        ]
      }
    ]
  }
}
```

**How to use it**
- First dropdown = governorates → show `nameEn`/`nameAr`, keep `code` as the value. This is the **`governorateCode`**.
- Second dropdown = the selected governorate's `zones` → show `nameEn`/`nameAr`, keep `code`. This is the **`zoneCode`**.
- Reset the zone dropdown whenever the governorate changes.

---

## 2. Get the shipping fee (quote)

`POST /shipping/quote`

Call this once the customer has selected a **zone** (and whenever the cart, coupon, zone, or payment method changes).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `zoneCode` | string | yes | the selected zone `.code` from step 1 |
| `governorate` | string | no | the selected governorate `nameEn` — lets the backend fall back to a per-governorate fee if Mylerz is down |
| `items` | array | yes | same cart items you'd send to `/orders` (see below) |
| `couponCode` | string | no | applied coupon, if any |
| `paymentMethod` | string | no | `cod` (default) or `paymob` |

`items[]`:

| Field | Type | Required |
|---|---|---|
| `product` | string (ObjectId) | yes |
| `variantId` | string (ObjectId) | one of `variantId` / `sku` |
| `sku` | string | one of `variantId` / `sku` |
| `qty` | integer ≥ 1 | yes |

**Example**

```json
{
  "zoneCode": "Nasr City",
  "paymentMethod": "cod",
  "couponCode": "",
  "items": [
    { "product": "6650a1...f2", "sku": "ROMZ-TS-BLK-M", "qty": 2 }
  ]
}
```

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
      "freeShipping": false,
      "total": 965
    }
  }
}
```

- `shippingFee` — the live Mylerz delivery fee to show the customer.
- `freeShipping: true` with `shippingFee: 0` when the cart total reaches the store's free-shipping threshold.
- `total` = `cartTotal + shippingFee` (what the customer pays).

**Errors**
- `400 "Please select a delivery zone"` — `zoneCode` missing.
- `400 "Cart has unavailable items"` — one or more items are out of stock (`data` lists them).
- `502` — Mylerz couldn't be reached / rejected the zone. Show a retry message.

---

## 3. Place the order

`POST /orders`

Same as before, **plus two new required fields** inside `shippingAddress`: `governorateCode` and `zoneCode`. The backend recomputes the shipping fee from Mylerz using `zoneCode`, so the total is authoritative.

**Request body**

```json
{
  "customer": {
    "name": "Ali Hassan",
    "email": "ali@example.com",
    "phone": "01012345678"
  },
  "shippingAddress": {
    "governorate": "Cairo",
    "city": "Nasr City",
    "governorateCode": "CA",
    "zoneCode": "Nasr City",
    "street": "12 Abbas El Akkad",
    "apartment": "Apt 5",
    "postal": ""
  },
  "items": [
    { "product": "6650a1...f2", "sku": "ROMZ-TS-BLK-M", "qty": 2 }
  ],
  "couponCode": "",
  "paymentMethod": "cod"
}
```

**`shippingAddress` fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `governorate` | string | yes | display name (e.g. `Cairo`) — use the picked governorate's `nameEn`/`nameAr` |
| `city` | string | yes | display name for the area (e.g. the zone's `nameEn`) |
| `governorateCode` | string | **yes (new)** | the picked governorate `.code` (e.g. `CA`) |
| `zoneCode` | string | **yes (new)** | the picked zone `.code` (e.g. `Nasr City`) |
| `street` | string | yes | street / building details |
| `apartment` | string | no | |
| `postal` | string | no | |

> `governorate`/`city` are the human-readable labels shown in the dashboard and emails. `governorateCode`/`zoneCode` are the machine codes Mylerz needs. **Send both** — the labels for display, the codes for shipping.

**Response** — `data.order` is the created order, including the server-computed `shippingFee` and `total`. For `paymob`, continue to your existing payment step.

**Errors**
- `400` validation — if `governorateCode`/`zoneCode` are missing (customer didn't pick a zone).
- `400 "Cart has unavailable items"` — stock changed since the quote.
- `502` — Mylerz fee lookup failed; ask the customer to retry.

---

## What changed vs. the old checkout

| Before | Now |
|---|---|
| Fee came from a fixed governorate→fee table (`/shipping-zones`) | Fee is live from Mylerz per selected **zone** |
| Customer typed governorate/city as free text | Customer **picks** governorate + zone from dropdowns |
| `shippingAddress` had no codes | `shippingAddress.governorateCode` + `zoneCode` are **required** |
| Admin had to map the address to Mylerz manually | Codes flow straight through; admin shipment is one click |

**Migration note:** orders placed before this change have no `governorateCode`/`zoneCode`. For those, the admin "Create shipment" call must pass `cityCode`/`neighborhoodCode` manually (see the couriers admin doc).

---

## Resilience — what happens if Mylerz is down

`/shipping/quote` and `POST /orders` try Mylerz first. If Mylerz is unreachable or rejects the quote, the backend falls back so checkout isn't blocked:

1. **Per-governorate fee** — an active `ShippingZone` matching the `governorate` name (managed by the admin under `/shipping-zones`).
2. **Flat fee** — the store-wide `fallbackShippingFee` (admin sets it via `PATCH /admin/storefront-settings`, e.g. `{ "fallbackShippingFee": 70 }`).
3. If neither is configured, the request returns `502` and the customer is asked to retry.

So the frontend should always send `governorate` in the quote body (and it's already in `shippingAddress` for orders) to make the fallback effective.
