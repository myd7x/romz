# Backend Implementation Prompt — Mylerz Shipping Integration

Paste this to a coding agent (or follow it yourself) to reproduce all backend changes on a
Node.js (ESM) + Express + Mongoose project. It is self-contained.

---

## Context

- REST API, ES modules, Joi validation, Mongoose. Route prefix `/api/v1`.
- Response envelope helper `ok(res, { message, data })` → `{ success, message, data }`.
- Single courier: **Mylerz** (`https://integration.mylerz.net`, Swagger at `/swagger/docs/v1`).
- Mylerz auth = OAuth password grant on `POST /token` (form-urlencoded), token cached and
  refreshed ~60s before expiry.

---

## 1. Mylerz client (`src/modules/couriers/mylerz.client.js`)

- Auth: `POST {BASE}/token` with `application/x-www-form-urlencoded` body
  `grant_type=password&username=...&password=...`. **Trim username and password** before
  sending (stray whitespace breaks auth). Cache `{ accessToken, expiresAt }`.
- On auth failure, include Mylerz's reason in the error message
  (`data.error_description || data.error`).
- Authenticated requests: `Authorization: Bearer <token>`, `Content-Type: application/json`.
- Treat a `200` response with `IsErrorState: true` as an error; throw with
  `ErrorDescription` as the message and `ErrorMetadata` as details.
- Env: `MYLERZ_BASE_URL`, `MYLERZ_USERNAME`, `MYLERZ_PASSWORD`, `MYLERZ_WAREHOUSE_NAME`,
  `MYLERZ_DEFAULT_SERVICE_TYPE=DTD`, `MYLERZ_DEFAULT_SERVICE=ND`,
  `MYLERZ_DEFAULT_SERVICE_CATEGORY=DELIVERY`, `MYLERZ_DEFAULT_ADDRESS_CATEGORY=H`,
  `MYLERZ_DEFAULT_PRODUCT_CATEGORY=Fashion`, `MYLERZ_DEFAULT_WEIGHT_KG=1`,
  `MYLERZ_CURRENCY=EGP`. **Do NOT add `MYLERZ_MERCHANT_ID`** — it is not used by any endpoint.
- `MYLERZ_WAREHOUSE_NAME` must match a real warehouse from `GET /api/Orders/GetWarehouses`
  (`.Name`). For this account the only warehouse is **`Alexandria`**.

## 2. Mylerz service (`src/modules/couriers/couriers.service.js`)

Wrap these Mylerz endpoints (all via the client):

| Function | Mylerz call |
|---|---|
| `getMylerzWarehouses()` | `GET /api/Orders/GetWarehouses` |
| `getMylerzCityZones()` | `GET /api/packages/GetCityZoneList` |
| `getMylerzExpectedCharges(payload)` | `POST /api/packages/GetExpectedCharges` |
| `createMylerzShipment(orderId, payload)` | `POST /api/Orders/AddOrders` |
| `getMylerzPackageStatus(awb)` | `GET /api/packages/GetPackageStatus?AWB=` |
| `getMylerzPackageDetails(awb)` | `GET /api/packages/GetPackageDetails?AWB=` |
| `trackMylerzPackage(awb)` | `POST /api/packages/TrackPackages` body `[{Barcode,ReferenceNumber}]` |
| `getMylerzTrackingUrl(awb)` | `GET /api/packages/GetTrackShipmentUrl?Barcode=&ReferenceNumber=` |
| `cancelMylerzPackage(awb, {referenceNumber})` | `POST /api/packages/CancelPackage` body `[{Barcode,ReferenceNumber}]` |

**`AddOrders` body** = an array with one `OrderDTO`. Required fields: `Description`,
`Service_Type`, `Service`, `Service_Category`, `Payment_Type`, `COD_Value` (**string**),
`Customer_Name`, `Mobile_No`, `Street`. Also send `WarehouseName`, `City`, `Neighborhood`,
`Reference`, `Pieces`, `Currency`, `Country: "Egypt"`.
- Payment derived from order: COD → `Payment_Type:"COD"`, `COD_Value:String(order.total)`;
  else `Payment_Type:"PP"`, `COD_Value:"0"`.
- `City` = order's Mylerz **governorateCode**; `Neighborhood` = order's **zoneCode** (see §5).
- `Pieces[]` field names: `pieceNo` (int), `Weight` (**string**), `ItemCategory`, `Dimensions`,
  `SpecialNotes`, `Quantity` (int).
- `CancelPackage` must NOT include a `MerchantId` field.
- After a successful `AddOrders`, read `Value.Packages[0].BarCode`; if absent, throw `502` with
  the package/Value error message. On success save `order.courier = { name:"mylerz",
  trackingNumber, pickupOrderCode, reference, status, lastSyncedAt, raw }`, set order status to
  `shipped` (+ history), send customer email + WhatsApp.

## 3. Couriers routes (`/api/v1/couriers`, **admin-only**) — Mylerz only

Mount `requireAuth, isAdmin` on the whole router. Routes:
`GET /mylerz/warehouses`, `GET /mylerz/city-zones`, `POST /mylerz/expected-charges`,
`POST /mylerz/orders/:orderId/shipment`, `GET /mylerz/packages/:awb/status`,
`GET /mylerz/packages/:awb/details`, `GET /mylerz/packages/:awb/tracking`,
`GET /mylerz/packages/:awb/tracking-url`, `POST /mylerz/packages/:awb/cancel`.

**Remove** any Bosta/manual courier concept: no `/providers` endpoint, no
`POST /orders/:orderId/tracking` manual-assign endpoint, no `courierProviders` list, no
`assignTracking`/`listCourierProviders`, no `assignTrackingSchema`.

## 4. Global size chart (store settings)

In the store `Settings` model add a `sizeChart` subdocument:
```
sizeChart: {
  isActive: Boolean (default true),
  title:   { ar, en } (localized),
  note:    { ar, en } (localized),
  columns: [ { ar, en } ],   // header cells
  rows:    [ [ String ] ]    // body rows, cells aligned to columns
}
```
Seed default = `{ columns:[Size, Chest (cm), Length (cm)], rows:[["S","39","60"],
["M","42.5","63"],["L","45","67"],["XL","49.5","67.5"]] }`.
- Public `GET /storefront-settings` returns it (whole settings doc).
- Admin `PATCH /admin/storefront-settings` accepts a `sizeChart` object; **shallow-merge** it
  onto the existing value (so a partial update like `{ isActive:false }` keeps columns/rows).
- Add `sizeChart` to the update Joi schema (columns ≤12, rows ≤50, cells ≤120 chars).

## 5. Shipping fees from Mylerz + customer zone selection

**Order model** — add to `shippingAddress`: `governorateCode` (string) and `zoneCode` (string).
These are Mylerz codes from `GetCityZoneList` (`City.Code` and `City.Zones[].Code`).

**New public module `src/modules/shipping/`** mounted at `/api/v1/shipping` (no auth):
- `GET /shipping/governorates` → maps `getMylerzCityZones()` to
  `[{ code, nameEn, nameAr, zones:[{ code, nameEn, nameAr }] }]`. Cache in memory ~6h.
- `POST /shipping/quote` → body `{ zoneCode (req), governorate?, items[] (req), couponCode?,
  paymentMethod? }`. Price the cart, then compute the fee (see below). Return
  `{ currency, subtotal, discount, cartTotal, shippingFee, freeShipping, total }`.

**Fee logic** `getShippingFeeForCart({ cartTotal, zoneCode, governorate, paymentMethod })`:
1. Require `zoneCode` (else 400).
2. If `freeShippingThreshold` set and `cartTotal >= threshold` → fee 0.
3. Else call `getMylerzExpectedCharges({ codValue: cod?cartTotal:0, warehouseName: env
   default, customerZoneCode: zoneCode, packageWeight: env default, isFulfillment:false,
   packageServiceTypeCode:DTD, packageServiceCode:ND, paymentTypeCode: cod?"COD":"PP",
   serviceCategoryCode:DELIVERY })`; use `response.ShippingFees`.
4. **Fallback (if the Mylerz call throws):** use an active `ShippingZone` matching
   `governorate` name; else the store-wide `Settings.fallbackShippingFee`; else rethrow (502).

**Order creation** (`POST /orders`):
- Validation: `shippingAddress.governorateCode` and `zoneCode` are **required**.
- Replace the old `ShippingZone`-by-governorate fee lookup with
  `getShippingFeeForCart({ cartTotal: cart.total, zoneCode, governorate, paymentMethod })`.
- Persist `governorateCode`/`zoneCode` on the order (fee is always recomputed server-side; never
  trust a client-sent fee).

**Settings** — add `fallbackShippingFee: Number|null` (default null) to the model and the admin
update Joi schema.

---

## 6. Environment / deployment

- Set on every environment (local `.env` **and** the hosting dashboard, then redeploy):
  `MYLERZ_BASE_URL=https://integration.mylerz.net`, `MYLERZ_USERNAME=romz` (no trailing
  spaces), `MYLERZ_PASSWORD=<secret>`, `MYLERZ_WAREHOUSE_NAME=Alexandria`.
- Remove `MYLERZ_MERCHANT_ID` from `.env`, `.env.example`, and the env config module.

## 7. Acceptance checks

- `POST /token` returns 200 with the configured creds.
- `GET /api/Orders/GetWarehouses` lists `Alexandria`; sending any other `WarehouseName` to
  `GetExpectedCharges`/`AddOrders` returns `INPUT_INVALID` (`ErrorMetadata: 4`).
- `GET /shipping/governorates` returns ~32 governorates each with zones.
- `POST /shipping/quote` with a valid `zoneCode` returns a numeric `shippingFee`.
- `POST /orders` rejects a body missing `governorateCode`/`zoneCode`, and otherwise stores them.
- Admin `POST /couriers/mylerz/orders/:id/shipment` with `{}` creates the shipment using the
  order's stored codes and returns a `BarCode`.
