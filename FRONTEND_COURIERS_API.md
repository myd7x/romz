# Couriers / Mylerz — Frontend API Reference

Shipping is handled by a single courier: **Mylerz**. The frontend never talks to Mylerz directly and never sees Mylerz credentials — it only calls the ROMZ backend, which authenticates to Mylerz server‑side.

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

## 1. Warehouses

`GET /couriers/mylerz/warehouses`

Use this to populate the **warehouse dropdown** on the "Create shipment" form. The `WarehouseName` you pick is what you send back in the shipment request (or leave blank to use the server default).

**Response** — `data.warehouses` is the array returned by Mylerz (`warehouseDTO[]`), each entry containing at least a warehouse name/code.

---

## 2. City / zone list

`GET /couriers/mylerz/city-zones`

Use this to map a customer's city/governorate to Mylerz **zone codes**. Needed to build the "expected charges" request and (optionally) the city/neighborhood codes on a shipment.

**Response** — `data.zones` is `CityDTO[]` from Mylerz.

---

## 3. Expected charges (shipping price quote)

`POST /couriers/mylerz/expected-charges`

Quote the delivery cost before creating the shipment. All fields are **required**.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `codValue` | number ≥ 0 | Cash‑to‑collect amount (0 for prepaid) |
| `warehouseName` | string | From endpoint #1 |
| `customerZoneCode` | string | From endpoint #2 |
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

## 4. Create a shipment for an order ⭐

`POST /couriers/mylerz/orders/:orderId/shipment`

Creates the shipment in Mylerz, saves the barcode/tracking on the order, flips the order to **`shipped`**, and notifies the customer (email + WhatsApp). This is the main action button.

- `:orderId` — 24‑char Mongo ObjectId.
- **All body fields are optional** — the backend fills everything from the order and from server defaults. Send `{}` for the simplest case. Send fields only to override.

> ⚠️ **Important — send Mylerz codes for the destination.** Mylerz rejects the shipment (`INPUT_INVALID`) if the warehouse or destination isn't a value it knows.
> - `warehouseName` must be one of the account's real warehouses from **`GET /couriers/mylerz/warehouses`** (`.Name`). For this account that is **`Alexandria`** (also the server default, so you can omit it).
> - `cityCode` must be a **city code** from **`GET /couriers/mylerz/city-zones`** (`.Code`, e.g. `CA` = Cairo).
> - `neighborhoodCode` must be a **zone code** inside that city (`.Zones[].Code`, e.g. `Nasr City`, `HEl`, `Zamalek`).
>
> **Do not pass the customer's free‑text city/governorate here.** Build a two‑step City → Zone dropdown from `#2` and send the selected codes. If you omit them, the backend falls back to the order's text address, which will usually fail Mylerz validation.

**Request body (all optional)**

| Field | Type | Default / source |
|---|---|---|
| `warehouseName` | string | `MYLERZ_WAREHOUSE_NAME` env (`Alexandria`); must exist in `#1` |
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
| `cityCode` | string | Mylerz city code from `#2` (`.Code`). Falls back to order text — **send the code** |
| `neighborhoodCode` | string | Mylerz zone code from `#2` (`.Zones[].Code`). Falls back to order text — **send the code** |
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

## 5. Package status

`GET /couriers/mylerz/packages/:awb/status`

`:awb` = the barcode / tracking number saved on the order (`order.courier.trackingNumber`).

**Response** — `data.status` = Mylerz `PackageStatusResponse` (`BarCode`, `Status`, `PhaseName`, `StatusName`, `StatusDate`, …). Good for a compact status badge.

---

## 6. Package details

`GET /couriers/mylerz/packages/:awb/details`

**Response** — `data.details` = Mylerz `PackageDetailsResponseDTO` (full package record). Use for a detail drawer/modal.

---

## 7. Tracking history

`GET /couriers/mylerz/packages/:awb/tracking`

**Response** — `data.tracking` = Mylerz `TrackPackagesResponseDTO[]` — the scan/event timeline. Render as a vertical stepper.

---

## 8. Public tracking URL

`GET /couriers/mylerz/packages/:awb/tracking-url`

**Response** — `data.trackingUrl` = a URL string you can show the customer / open in a new tab.

---

## 9. Cancel a package

`POST /couriers/mylerz/packages/:awb/cancel`

**Request body (optional)**

```json
{ "referenceNumber": "" }
```

**Response** — `data.result` = Mylerz cancellation result. (Note: this only cancels on Mylerz's side; it does not by itself change the ROMZ order status — do that with your order‑status endpoint if needed.)

---

## Suggested frontend flow

1. On the order page (COD/confirmed order), show a **"Create shipment"** button that opens a small form.
2. In the form, load `#2 city‑zones` and render a **City → Zone** two‑step dropdown; the admin picks the destination that matches the customer's address. (Optionally load `#1 warehouses` and call `#3 expected‑charges` to preview the fee.)
3. Submit → `POST #4` with `{ "cityCode": "<city .Code>", "neighborhoodCode": "<zone .Code>" }` (warehouse defaults to `Alexandria`). On success, store `order.courier.trackingNumber`.
4. Show status via `#5`, timeline via `#7`, and a **"Track"** link via `#8`.
5. **"Cancel shipment"** → `POST #9`, then update the order status through your orders module.
