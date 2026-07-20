# Couriers / Mylerz — Frontend API Reference

All shipping is driven through the backend. **The frontend never talks to Mylerz directly** and never sees Mylerz credentials — it only calls the ROMZ backend, which authenticates to Mylerz server‑side.

---

## Conventions

- **Base path:** `/{API_PREFIX}/couriers` — with the default config this is **`/api/v1/couriers`**.
- **Auth:** every endpoint below requires an **admin** JWT.
  Send it as a header: `Authorization: Bearer <accessToken>`.
  A non‑admin token returns `403`; a missing/invalid token returns `401`.
- **Content type:** `application/json` for all bodies.
- **Response envelope** (every endpoint):

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { /* endpoint-specific payload */ }
}
```

- **Error envelope:**

```json
{
  "success": false,
  "message": "What went wrong",
  "data": null
}
```

Common status codes: `400` validation / business rule, `401` not logged in, `403` not admin, `404` order not found, `502` Mylerz returned no barcode / upstream error.

---

## 1. List courier providers

`GET /couriers/providers`

Returns the providers the UI can offer for manual assignment.

**Response**

```json
{
  "success": true,
  "message": "Courier providers fetched",
  "data": {
    "providers": [
      { "id": "bosta", "label": "Bosta" },
      { "id": "mylerz", "label": "Mylerz" },
      { "id": "manual", "label": "Manual" }
    ]
  }
}
```

---

## 2. Mylerz warehouses

`GET /couriers/mylerz/warehouses`

Use this to populate the **warehouse dropdown** on the "Create shipment" form. The `WarehouseName` you pick is what you send back in the shipment request (or leave blank to use the server default).

**Response** — `data.warehouses` is the array returned by Mylerz (`warehouseDTO[]`), each entry containing at least a warehouse name/code.

---

## 3. Mylerz city / zone list

`GET /couriers/mylerz/city-zones`

Use this to map a customer's city/governorate to Mylerz **zone codes**. Needed to build the "expected charges" request and (optionally) the city/neighborhood codes on a shipment.

**Response** — `data.zones` is `CityDTO[]` from Mylerz.

---

## 4. Expected charges (shipping price quote)

`POST /couriers/mylerz/expected-charges`

Quote the delivery cost before creating the shipment. All fields are **required**.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `codValue` | number ≥ 0 | Cash‑to‑collect amount (0 for prepaid) |
| `warehouseName` | string | From endpoint #2 |
| `customerZoneCode` | string | From endpoint #3 |
| `packageWeight` | number ≥ 0 | Kg |
| `isFulfillment` | boolean | Default `false` |
| `packageServiceTypeCode` | string | e.g. `DTD` |
| `packageServiceCode` | string | e.g. `ND` |
| `paymentTypeCode` | string | e.g. `COD` / `PP` |
| `serviceCategoryCode` | string | e.g. `DELIVERY` |

**Example**

```json
{
  "codValue": 850,
  "warehouseName": "romz1",
  "customerZoneCode": "CAI-01",
  "packageWeight": 1,
  "isFulfillment": false,
  "packageServiceTypeCode": "DTD",
  "packageServiceCode": "ND",
  "paymentTypeCode": "COD",
  "serviceCategoryCode": "DELIVERY"
}
```

**Response** — `data.charges` = Mylerz `PackageChargesResponseDTO` (fees breakdown).

---

## 5. Create a Mylerz shipment for an order ⭐

`POST /couriers/mylerz/orders/:orderId/shipment`

Creates the shipment in Mylerz, saves the barcode/tracking on the order, flips the order to **`shipped`**, and notifies the customer (email + WhatsApp). This is the main action button.

- `:orderId` — 24‑char Mongo ObjectId.
- **All body fields are optional** — the backend fills everything from the order and from server defaults. Send `{}` for the simplest case. Send fields only to override.

**Request body (all optional)**

| Field | Type | Default / source |
|---|---|---|
| `warehouseName` | string | `MYLERZ_WAREHOUSE_NAME` env |
| `pickupDueDate` | ISO date | tomorrow |
| `packageSerial` | int ≥ 1 | `1` |
| `reference` | string | `order.orderNumber` |
| `description` | string | auto from order items |
| `totalWeight` | number | default weight env |
| `serviceType` | string | `DTD` |
| `service` | string | `ND` |
| `serviceDate` | ISO date / null | `null` |
| `serviceCategory` | string | `DELIVERY` |
| `specialNotes` | string | `""` |
| `cityCode` | string | `order.shippingAddress.city` |
| `neighborhoodCode` | string | `order.shippingAddress.governorate` |
| `districtCode` | string | `""` |
| `geolocation` | string | `""` |
| `addressCategory` | string | `H` |
| `buildingNo` | string | `""` |
| `floorNo` | string | `""` |
| `apartmentNo` | string | `order.shippingAddress.apartment` |
| `productCategory` | string | `Fashion` |
| `dimensions` | string | `""` |
| `pieces` | array | one piece per order item (see below) |

**`pieces[]`** (optional — override the auto‑generated pieces):

| Field | Type | Required |
|---|---|---|
| `pieceNo` | int ≥ 1 | yes |
| `weight` | number | no |
| `itemCategory` | string | no |
| `dimensions` | string | no |
| `specialNotes` | string | no |

> Payment is derived automatically from the order: `paymentMethod === "cod"` → `Payment_Type: COD` with `COD_Value = order.total`; otherwise `PP` with `COD_Value = 0`. The frontend does **not** send payment fields.

**Business rules (return `400`)**

- Order is `cancelled` or `returned` → cannot ship.
- Order already has `courier.trackingNumber` → already shipped.

**Success response**

```json
{
  "success": true,
  "message": "Mylerz shipment created",
  "data": {
    "order": { /* full updated order, see courier shape below */ },
    "mylerz": {
      "PickupOrderCode": "PU123456",
      "PickupDateTime": "2026-07-21T10:00:00",
      "Packages": [
        { "BarCode": "2100000123456", "Reference": "ROMZ-1024", "Status": "Created" }
      ]
    }
  }
}
```

The saved `order.courier` object looks like:

```json
{
  "name": "mylerz",
  "trackingNumber": "2100000123456",
  "trackingUrl": "",
  "pickupOrderCode": "PU123456",
  "reference": "ROMZ-1024",
  "status": "Created",
  "lastSyncedAt": "2026-07-20T18:30:00.000Z",
  "raw": { /* full Mylerz Value */ }
}
```

**Failure** — if Mylerz returns no barcode, you get `502` and the message is the Mylerz package‑level error (e.g. invalid zone, missing field).

---

## 6. Package status

`GET /couriers/mylerz/packages/:awb/status`

`:awb` = the barcode / tracking number saved on the order.

**Response** — `data.status` = Mylerz `PackageStatusResponse` (`BarCode`, `Status`, `PhaseName`, `StatusName`, `StatusDate`, …). Good for a compact status badge.

---

## 7. Package details

`GET /couriers/mylerz/packages/:awb/details`

**Response** — `data.details` = Mylerz `PackageDetailsResponseDTO` (full package record). Use for a detail drawer/modal.

---

## 8. Tracking history

`GET /couriers/mylerz/packages/:awb/tracking`

**Response** — `data.tracking` = Mylerz `TrackPackagesResponseDTO[]` — the scan/event timeline. Render as a vertical stepper.

---

## 9. Public tracking URL

`GET /couriers/mylerz/packages/:awb/tracking-url`

**Response** — `data.trackingUrl` = a URL string you can show the customer / open in a new tab.

---

## 10. Cancel a package

`POST /couriers/mylerz/packages/:awb/cancel`

**Request body (optional)**

```json
{ "referenceNumber": "" }
```

**Response** — `data.result` = Mylerz cancellation result. (Note: this only cancels on Mylerz's side; it does not by itself change the ROMZ order status — do that with your order‑status endpoint if needed.)

---

## 11. Manual tracking assignment (non‑Mylerz couriers)

`POST /couriers/orders/:orderId/tracking`

For Bosta / manual couriers where you already have a tracking number.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | one of `bosta` \| `mylerz` \| `manual` |
| `trackingNumber` | string (≤120) | yes | |
| `trackingUrl` | string (uri) | no | |
| `markAsShipped` | boolean | no | default `false`; if `true`, sets status → `shipped` and sends notifications |
| `note` | string (≤500) | no | |

**Response**

```json
{
  "success": true,
  "message": "Courier tracking assigned",
  "data": { "order": { /* updated order */ } }
}
```

---

## Suggested frontend flow

1. On the order page (COD/confirmed order), show a **"Create Mylerz shipment"** button.
2. (Optional) Load `#2 warehouses` + `#3 city‑zones` to let the admin pick a warehouse and confirm the zone, and call `#4 expected‑charges` to preview the fee.
3. Click → `POST #5` with `{}` (or overrides). On success, store `order.courier.trackingNumber`.
4. Show status via `#6`, timeline via `#8`, and a **"Track"** link via `#9`.
5. **"Cancel shipment"** → `POST #10`, then update the order status through your orders module.
6. For non‑Mylerz couriers, use `#11` instead of `#5`.
