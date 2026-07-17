# ROMZ Project Agent Handoff

Last verified against the repositories: 2026-07-14.

This document is the starting point for any AI agent or engineer working on ROMZ. Read it before changing code. It describes the current implementation, not the original plan.

## 1. Source Of Truth

Use sources in this order when they disagree:

1. Running code and tests.
2. `API_DOCUMENTATION.md` for the detailed frontend/backend API contract.
3. This file for architecture, workflows, deployment context, and change history.
4. `DEPLOYMENT.md` for the deployment checklist.
5. `BACKLOG.md` for incomplete work.

When an API contract changes, update both `API_DOCUMENTATION.md` and this file in the same change.

Never put real credentials, tokens, customer data, or private URLs in documentation, examples, commits, logs, or frontend environment variables.

## 2. Repositories

### Backend

- Local path: `D:\romz`
- Git remote: `https://github.com/myd7x/romz.git`
- Runtime: Node.js 20+, Express 4, Mongoose 8, MongoDB.
- Module system: ESM. Keep `"type": "module"`, use `import`/`export`, and include `.js` on local imports.
- API prefix: `/api/v1` by default.
- Production target: Vercel Express function.

### Frontend

- Current local path: `C:\Users\maged\Downloads\romz-main 2\romz-main\frontend`
- Git remote: `https://github.com/myd7x/romz_frontend_maged_changes.git`
- Runtime: Next.js 16.2, React 19, TypeScript, next-intl, Tailwind CSS 4.
- Storefront locales: English and Arabic under `/{locale}`.
- Admin routes are not localized and live under `/admin`.
- Backend URL variable: `NEXT_PUBLIC_API_URL`, including `/api/v1`.

The frontend is a separate repository. Do not assume it is a subdirectory of the backend repository.

At this handoff, the frontend has uncommitted image integration work. Inspect `git status` before editing and preserve those changes. The active work includes:

- Cloudinary absolute URL mapping for products and categories.
- Product/category refetch after image mutations.
- Correct preservation of category `publicId`.

Relevant frontend files include `src/lib/api.ts`, `src/lib/adminApi.ts`, `src/lib/types.ts`, the category admin client, and the product editor.

## 3. Backend Layout

```text
src/
  app.js                         Express app exported for Vercel
  server.js                      Long-running local/server process entry
  config/                        env, MongoDB, Redis, Cloudinary
  middlewares/                   auth, validation, security, uploads, errors
  models/                        Mongoose models
  modules/<domain>/              routes, controller, service, validation
  routes/index.js                top-level route mounting
  services/                      email and image storage
  utils/                         responses, JWT, cookies, cache, slug, etc.
  scripts/seedAdmin.js           one-time admin seed
tests/                            Jest/Supertest integration and unit tests
```

The normal module pattern is:

```text
route -> middleware/Joi validation -> controller -> service -> model/external API
```

Keep controllers thin. Business rules belong in services. Validation belongs in Joi schemas and multipart normalizers. External provider details belong in provider clients/services.

## 4. Startup And Infrastructure

### Local startup

`src/server.js` connects MongoDB and optional Redis, then starts Express on `PORT`.

```powershell
npm install
npm run dev
```

Default local URLs:

```text
GET http://localhost:5000/api/v1/health
GET http://localhost:5000/api/v1/health/ready
```

### Vercel startup

Vercel detects the default Express export in `src/app.js`. It does not necessarily execute the local `src/server.js` startup path.

For that reason, `src/app.js` runs a lazy MongoDB connection middleware for every `/api/v1` request. `src/config/database.js` caches an in-flight connection so concurrent cold-start requests do not create duplicate connections. Do not remove this middleware unless the serverless entry strategy is replaced and tested.

`GET /api/v1/health/ready` returns 200 only when `mongoose.connection.readyState === 1`.

### Redis

Redis is optional. Local `server.js` calls `connectRedis()` only when `REDIS_URL` is present. Cache helpers degrade to no cache when no Redis client exists.

Important: the current Vercel `app.js` path initializes MongoDB but not Redis. Analytics still works without caching. If production Redis caching is required on Vercel, add a lazy cached Redis initializer suitable for serverless execution.

### Security middleware

The app uses Helmet, CORS, general rate limiting, Mongo sanitization, JSON parsing, URL encoding, cookie parsing, and route-specific rate limits.

Current CORS behavior is intentionally broad: `origin: true` with credentials. `CLIENT_ORIGINS` exists in environment config but is not enforced. Tightening CORS is production hardening work and must account for the storefront, admin, preview domains, and cross-site refresh cookies.

## 5. API Conventions

All normal JSON responses use:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": {}
}
```

- `meta` is optional and is used for pagination.
- Errors use the same envelope with `success: false`.
- Validation details are returned in `data`.
- `204 No Content` responses have no JSON body.
- Admin/protected routes use `Authorization: Bearer <accessToken>`.
- Never trust prices, totals, discounts, stock, payment status, or roles from the client.

Detailed request and response bodies live in `API_DOCUMENTATION.md`.

## 6. Endpoint Map

Every path below is under `/api/v1`.

### Health

```text
GET    /health
GET    /health/ready
```

### Authentication

```text
POST   /auth/register
POST   /auth/login
POST   /auth/verify-email
POST   /auth/resend-otp
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
```

### Current user, addresses, and wishlist

All require a bearer token.

```text
GET    /users/me
PATCH  /users/me
POST   /users/me/addresses
PATCH  /users/me/addresses/:addressId
DELETE /users/me/addresses/:addressId
GET    /users/me/wishlist
POST   /users/me/wishlist/:productId
DELETE /users/me/wishlist/:productId
```

### Categories

```text
GET    /categories
GET    /categories/tree
GET    /categories/:id
POST   /categories                  admin, multipart optional image
PATCH  /categories/:id              admin, multipart optional image
DELETE /categories/:id              admin
```

### Products

```text
GET    /products
GET    /products/home
GET    /products/admin/:id          admin
GET    /products/:slug/related
GET    /products/:slug
POST   /products                     admin, multipart images
PATCH  /products/:id                 admin, multipart images
DELETE /products/:id                 admin
```

Product list filters include category id/slug, size, color name, badge, search, min/max price, sorting, page, and limit. See the API documentation before changing query behavior.

### Reviews

```text
GET    /reviews/product/:productId
POST   /reviews/product/:productId   optional auth
GET    /reviews/admin                admin
PATCH  /reviews/:id/approve          admin
DELETE /reviews/:id                  admin
```

### Coupons and cart

```text
POST   /coupons/validate             optional auth
GET    /coupons                      admin
GET    /coupons/:id                  admin
POST   /coupons                      admin
PATCH  /coupons/:id                  admin
DELETE /coupons/:id                  admin
POST   /cart/validate                optional auth
```

### Orders

```text
POST   /orders                       optional auth, supports guests
GET    /orders/track                 public, orderNumber + contact
POST   /orders/:id/cancel            optional auth
GET    /orders                       admin
GET    /orders/:id                   admin
PATCH  /orders/:id/status            admin
PATCH  /orders/:id/courier           admin
```

### Shipping zones

```text
GET    /shipping-zones
GET    /shipping-zones/:id           admin
POST   /shipping-zones               admin
PATCH  /shipping-zones/:id           admin
DELETE /shipping-zones/:id           admin
```

### Settings

The legacy and newer storefront route names share the same service and data.

```text
GET    /settings/store
PATCH  /settings/store               admin
GET    /storefront-settings
PATCH  /admin/storefront-settings    admin
```

### Payments

```text
POST   /payments/paymob/intent        optional auth
POST   /payments/paymob/webhook       public, rate limited, HMAC verified
```

### Couriers and Mylerz

All courier routes require admin authentication.

```text
GET    /couriers/providers
GET    /couriers/mylerz/warehouses
GET    /couriers/mylerz/city-zones
POST   /couriers/mylerz/expected-charges
POST   /couriers/mylerz/orders/:orderId/shipment
GET    /couriers/mylerz/packages/:awb/status
GET    /couriers/mylerz/packages/:awb/details
GET    /couriers/mylerz/packages/:awb/tracking
GET    /couriers/mylerz/packages/:awb/tracking-url
POST   /couriers/mylerz/packages/:awb/cancel
POST   /couriers/orders/:orderId/tracking
```

### Analytics

All require admin authentication. Common query parameters include `from`, `to`, `granularity`, and `limit` where relevant.

```text
GET    /analytics/overview
GET    /analytics/revenue-series
GET    /analytics/orders-by-status
GET    /analytics/best-sellers
GET    /analytics/low-stock
GET    /analytics/coupons
GET    /analytics/payment-split
```

## 7. Data Model Summary

### User

- Name, unique lowercase email, hashed password, optional phone.
- Roles: `user` and `admin`.
- Email verification OTP with expiry.
- Addresses and wishlist.
- `refreshTokenVersion` invalidates old refresh tokens after logout/password reset.
- Password/reset/OTP internals are removed by `toSafeObject()`.

### Category

- Localized `{ en, ar }` name and unique slug.
- Optional Cloudinary image `{ url, publicId }`.
- Optional parent category.
- `order` controls storefront ordering.
- `isActive` is used for soft deletion.

### Product

- Localized name and description.
- `category` is the required primary category.
- `categories` is the complete multi-category list.
- `collections` references category documents used as collections.
- `basePrice`, nullable `salePrice`, image list, variants, badges, stock, sold, views, and ratings.
- Each variant has an `_id`, unique-intent SKU, size, color, stock, and nullable `priceOverride`.
- Each image stores `{ url, publicId, color }`; color normally contains a variant color hex.

### Coupon

- Uppercase unique code.
- Type: `percent` or `fixed`.
- Value, minimum order subtotal, optional maximum discount, expiry, usage limit, used count, used accounts, active state.

### Order

- Immutable customer/address/item snapshots.
- Order number format: `RZ-YYYY-00001`.
- Totals: subtotal, shipping fee, discount, final total.
- Payment method: `cod` or `paymob`.
- Payment status: `pending`, `paid`, `failed`, `refunded`.
- Order status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`.
- Paymob IDs, status history, cancellation reason, and courier/Mylerz data.

### Settings

- Singleton key: `store`, auto-created on first read.
- Store name, bilingual promo bar, `promoBarActive`, announcement, hero slides, featured collections, social links.
- `payments.paymob.active` controls whether the frontend offers Paymob.
- Free shipping and low-stock thresholds.

### Other models

- Review: optional user/guest, rating, comment, verified purchase flag, approval state.
- ShippingZone: unique governorate, fee, estimated days, active state.

There is no separate migration framework. Model changes must preserve existing MongoDB documents through defaults and normalization.

## 8. Authentication And Refresh Tokens

Register and login both return:

```json
{
  "user": {},
  "accessToken": "...",
  "refreshToken": "..."
}
```

They also set the refresh token in an httpOnly cookie.

`POST /auth/refresh` accepts the refresh token from the first available source:

1. Refresh cookie.
2. JSON body `refreshToken`.
3. JSON body `refresh_token`.
4. `x-refresh-token` header.

Refresh rotates both access and refresh tokens and returns both in the response. This body fallback is important when the frontend and backend are on different Vercel domains and browser cookie partitioning is inconsistent.

Production cookie defaults are `Secure`, `SameSite=None`, and `Partitioned`, unless overridden by environment variables. Local defaults are non-secure and `SameSite=Lax`.

The frontend stores its own admin access and refresh token cookies because Next middleware/proxy must protect `/admin`. Frontend refresh logic tries the body token first, then the backend cookie fallback.

## 9. Product Pricing Contract

The backend is the pricing source of truth. Unit price is calculated exactly as:

```js
variant.priceOverride ?? product.salePrice ?? product.basePrice
```

Consequences:

- A variant override has highest priority.
- If no variant override exists, a non-null sale price wins.
- If sale price is omitted or `null`, base price is used.
- `0` is a real numeric price, not "no sale". Do not convert zero to null implicitly.
- If the admin wants no sale, use `null`/empty input or the same value as base price according to the current UI workflow.
- All order calculations re-read products and variants from MongoDB. Client totals are ignored.

Product list min/max filtering uses sale price with base fallback, but does not account for per-variant overrides. Price sorting currently sorts by base price. Treat that as current behavior unless product requirements explicitly change.

## 10. Cart And Coupon Contract

Cart input must include product, quantity, and at least one of variant id or SKU. The service tries variant id first, then falls back to SKU. This fallback fixes persisted carts containing stale variant ObjectIds after a product variant edit.

The backend returns priced items plus `unavailableItems`. Checkout rejects a cart when any item is unavailable or understocked.

Coupon order of operations:

1. Reprice every item using the effective unit price.
2. Build subtotal before coupon and shipping.
3. Validate one coupon against that subtotal.
4. Calculate percent or fixed discount.
5. Apply optional `maxDiscount`.
6. Cap discount at subtotal.
7. Calculate cart total as subtotal minus discount.
8. Apply shipping/free-shipping logic to the discounted cart total.

The coupon minimum compares against the server-calculated pre-discount subtotal, not the final total and not subtotal plus shipping.

Only one coupon is supported. Logged-in accounts cannot reuse a coupon already present in `usedBy`. Guest uses increment `usedCount` but cannot be uniquely tracked in `usedBy`.

Coupon deletion is permanent with `findByIdAndDelete`. Pausing uses `PATCH isActive=false`. After deletion, lookup/validation return `Coupon not found`, and the code can be created again.

## 11. Order, Stock, And Cancellation Flow

### Shared checkout

- Checkout supports guests and authenticated users.
- Server validates cart, prices, coupon, stock, and active shipping zone.
- Free shipping applies when discounted cart total is greater than or equal to `settings.freeShippingThreshold`.
- Final total is `subtotal - discount + shippingFee`.

### COD

- Stock and `sold` are updated when the order is created.
- Coupon usage is incremented when the order is created.
- If order creation fails, stock and coupon usage are rolled back.
- Cancellation while pending/confirmed restores stock and coupon usage.

### Paymob

- Creating a Paymob order does not decrement stock.
- The client creates the order first, then calls `/payments/paymob/intent`.
- A verified successful webhook decrements stock once, increments coupon usage, marks payment paid, and confirms the order.
- Duplicate successful webhooks do not decrement stock again because `paymentStatus === paid` is checked.
- A final failed webhook marks payment failed and order cancelled.
- Stock is not reserved while a Paymob checkout is pending, so a late payment can fail if another order consumes the remaining stock. This is a known design tradeoff.

### Cancellation

- Only `pending` and `confirmed` orders are cancellable.
- Access is allowed to admin, owning user, or a guest presenting matching phone/email.
- COD or already-paid orders restore stock on cancellation.
- The code does not automatically issue a Paymob refund; payment refund behavior remains a separate feature.

## 12. Product Categories And Images

### Multiple categories

- `category` remains the required primary category for compatibility.
- `categories` contains all selected category ids and always includes the primary category.
- Read responses populate both and add a fallback `categories: [category]` for older documents.
- Public category filtering matches either `category` or `categories`.

### Product multipart contract

New files use field name `images`, maximum 8 files. Structured fields are JSON strings in multipart requests.

On update:

- `existingImages` is the exact retained/reordered image list.
- Omitting `existingImages` preserves current images.
- Sending `existingImages: []` removes all existing images.
- New files are uploaded and appended.
- `imageColors` maps colors to uploads; existing image colors can be updated.
- Removed assets are deleted from Cloudinary after the product saves.

Product deletion is soft: it sets `isActive=false`, clears the image array, deletes Cloudinary assets, and returns 204.

### Category multipart contract

The file field is `image`.

- No file and no `removeImage=true`: preserve the existing image.
- New file: upload, replace DB image, then delete the old Cloudinary asset.
- `removeImage=true`: clear DB image and delete the old Cloudinary asset.
- Empty parent string is normalized to `null`.
- Multipart `name` is parsed from JSON and `order` is converted to a number.

Category deletion is soft: `isActive=false`, image cleared, Cloudinary asset deleted, 204 response.

## 13. Cloudinary And Upload Limits

Backend uploads use Multer memory storage, then Cloudinary upload streams. Image compression is intentionally disabled; uploaded product/category images are sent to Cloudinary as selected by the admin.

Cloudinary folders/public ID prefixes:

```text
romz/products
romz/categories
```

Stored shape:

```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "romz/products/..."
}
```

Deletion uses `uploader.destroy(publicId, { invalidate: true })`.

Configuration supports either:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

or all three separate variables. `CLOUDINARY_URL` takes precedence. Do not set a malformed `CLOUDINARY_URL` alongside valid separate values.

The Cloudinary config trims accidental quotes/whitespace and validates that the cloud name is only the cloud name, not a dashboard URL or credential string. This fixes the Vercel-only 404 HTML/invalid JSON error caused when the SDK-parsed `CLOUDINARY_URL` was overwritten by empty variables.

Legacy `/uploads/...` deletion remains as a local compatibility fallback. New uploads are Cloudinary assets. Existing local database URLs are not automatically migrated and cannot be served reliably by Vercel.

Vercel Functions reject request bodies over 4.5 MB before Express can process them. Because compression is intentionally disabled, admins must upload images whose combined request size stays under Vercel's limit, or the hosting/upload architecture must change.

Never expose Cloudinary API secret in `NEXT_PUBLIC_*` variables. Upload/delete stays on the authenticated backend.

## 14. Storefront Settings

`getStoreSettings()` upserts the singleton `key: "store"` document.

Supported updates include:

- `storeName`
- `promoBar { en, ar }`
- `promoBarActive`
- legacy nested `promoBar.active`, normalized to `promoBarActive`
- `announcement { en, ar }`
- `heroSlides`
- `featuredCollections`
- `socialLinks`
- `payments.paymob.active`
- `freeShippingThreshold`
- `lowStockThreshold`

Settings updates are partial and merge nested promo, announcement, social link, and payment data instead of replacing unrelated fields.

The checkout must hide/disable Paymob when `settings.payments.paymob.active === false`. The backend settings flag is storefront configuration; it does not currently block a direct malicious call to the Paymob intent endpoint. Add server-side enforcement if that is required.

## 15. Paymob Integration

Supported modes:

- Unified checkout when secret/public keys are configured and flow is not forced to legacy.
- Legacy iframe when API key, card integration id, and iframe id are configured.
- `PAYMOB_CHECKOUT_FLOW=auto` prefers unified checkout.
- `PAYMOB_CHECKOUT_FLOW=legacy_iframe` forces legacy.

Unified intent accepts frontend `redirectionUrl` and backend `notificationUrl`. Legacy iframe primarily relies on Paymob dashboard callback configuration.

Correct production callbacks:

```text
Transaction processed callback:
https://<stable-backend-domain>/api/v1/payments/paymob/webhook

Transaction response callback:
https://<stable-frontend-domain>/en/payment/callback
```

Do not use Paymob's own `/api/acceptance/post_pay` URL as the ROMZ callback. Use stable production domains, not deployment-specific Vercel preview URLs. Production deployment protection must not block the webhook.

The webhook:

- Accepts Paymob payload as `payload.obj` or direct transaction object.
- Reads HMAC from query or body.
- Builds the documented SHA-512 HMAC source in a fixed field order.
- Uses timing-safe comparison.
- Finds orders by merchant order number or Paymob order id.
- Treats backend callback status as the source of truth, not redirect query parameters.

The frontend stores pending order number/contact locally and the callback page polls public order tracking. It must not mark an order paid from redirect parameters alone.

## 16. Mylerz Integration

Mylerz is implemented, not only planned.

- Password-grant authentication through `/token`.
- Access token cached in memory until one minute before expiry.
- Test and production base URLs are environment controlled.
- Warehouse lookup, city zones, expected charges, shipment creation, package status/details/tracking/tracking URL, and cancellation are supported.
- Shipment creation maps ROMZ order/customer/address/items to Mylerz fields.
- COD orders send `Payment_Type: COD` and `COD_Value: order.total`.
- Paymob orders send prepaid `Payment_Type: PP` and `COD_Value: 0`.
- Successful shipment creation stores barcode/tracking data in `order.courier`, marks the order shipped, and sends a status email.
- Existing tracking and cancelled/returned orders block duplicate/invalid shipment creation.

Mylerz request errors may return JSON or text. Provider error state is normalized to `AppError` with provider metadata.

Do not put Mylerz username/password in frontend code.

## 17. Analytics Rules

Revenue counts:

- Paymob orders only when `paymentStatus=paid`.
- COD orders only when `status=delivered`.

Default analytics range is the last 30 days. Overview compares with the previous equally sized period. Revenue series supports day/week/month buckets. Low stock uses `settings.lowStockThreshold`, default 5. Cache TTL is 5 minutes when Redis is available.

## 18. Environment Variables

### Core

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CLIENT_ORIGINS=
MONGODB_URI=mongodb://localhost:27017/romz
REDIS_URL=
```

### JWT and refresh cookie

```env
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_COOKIE_NAME=romz_refresh
JWT_REFRESH_COOKIE_SECURE=
JWT_REFRESH_COOKIE_SAME_SITE=
JWT_REFRESH_COOKIE_PARTITIONED=
```

### Cloudinary

```env
CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Use `CLOUDINARY_URL` or the three separate values.

### Email

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=ROMZ <no-reply@romz.local>
```

### Admin seed

```env
ADMIN_NAME=ROMZ Admin
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_PHONE=
```

### Paymob

```env
PAYMOB_API_KEY=
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_CARD_INTEGRATION_ID=
PAYMOB_IFRAME_ID=
PAYMOB_CHECKOUT_FLOW=auto
PAYMOB_BASE_URL=https://accept.paymob.com
```

### Mylerz

```env
MYLERZ_BASE_URL=https://mylerzintegrationtest.mylerz.com
MYLERZ_USERNAME=
MYLERZ_PASSWORD=
MYLERZ_MERCHANT_ID=
MYLERZ_WAREHOUSE_NAME=
MYLERZ_DEFAULT_SERVICE_TYPE=DTD
MYLERZ_DEFAULT_SERVICE=ND
MYLERZ_DEFAULT_SERVICE_CATEGORY=DELIVERY
MYLERZ_DEFAULT_ADDRESS_CATEGORY=H
MYLERZ_DEFAULT_PRODUCT_CATEGORY=Fashion
MYLERZ_DEFAULT_WEIGHT_KG=1
MYLERZ_CURRENCY=EGP
```

### Frontend

```env
NEXT_PUBLIC_API_URL=https://<backend-domain>/api/v1
```

Do not add backend secrets to the frontend.

## 19. Deployment

### Backend Vercel project

- Framework preset: Express.
- Root directory: repository root.
- Build command: no override.
- Output directory: no override.
- Install command: automatic.
- Node.js: 20+.
- `PORT` is not required on Vercel.
- MongoDB must be Atlas or another network-accessible MongoDB, never localhost.
- Environment changes apply only after redeployment.

Verify after deploy:

```text
GET https://<backend>/api/v1/health
GET https://<backend>/api/v1/health/ready
```

### Frontend Vercel project

- Separate project connected to the frontend repository.
- Framework preset: Next.js.
- Set `NEXT_PUBLIC_API_URL` to the stable backend production URL plus `/api/v1`.
- Redeploy after changing `NEXT_PUBLIC_API_URL` because it is included in the frontend build.

### Admin seed

Run once against the production MongoDB from a trusted environment:

```powershell
npm run seed:admin
```

The script does not overwrite an existing admin with the configured email.

## 20. Frontend Integration Notes

- `src/lib/api.ts` is the storefront API adapter and maps backend Mongo shapes to frontend types.
- `src/lib/adminApi.ts` owns browser-side admin mutations and bearer refresh/retry behavior.
- Absolute `http:`, `https:`, and `data:` media URLs are returned unchanged. Relative legacy URLs are prefixed with the backend origin.
- Preserve backend URL and `publicId` for image updates; do not send only a browser preview/object URL.
- Never manually set multipart `Content-Type`; the browser must add its boundary.
- Product `existingImages` must use original backend URLs, not transformed display URLs.
- Category edit without a new image must omit both `image` and `removeImage`.
- `removeImage=true` is sent only after explicit Remove Photo action.
- Checkout creates an order before creating a Paymob intent.
- Guest Paymob intent can use matching contact; the backend also has a narrow pending guest fallback for an unowned Paymob order.
- Checkout reads storefront settings and hides Paymob when disabled.
- Admin access cookies are frontend-readable by current design; treat XSS prevention as important.
- Next.js 16 behavior may differ from older model knowledge. Read the frontend `AGENTS.md` and relevant `node_modules/next/dist/docs/` guide before changing framework APIs.

## 21. Completed Update History

The following important changes are already implemented and should not be reimplemented from stale prompts:

- Products support multiple categories with a primary-category compatibility field.
- Category image create/replace/remove/preserve behavior is implemented.
- Product and category deletion remove stored images.
- Cloudinary replaced new local filesystem uploads.
- Cloudinary configuration works with Vercel `CLOUDINARY_URL` or separate credentials.
- Vercel serverless MongoDB cold-start connection is implemented and cached.
- Refresh tokens are returned in login/register/refresh responses and cookies.
- Refresh accepts body/header fallback for cross-domain deployments.
- Store settings and storefront settings aliases are implemented.
- Promo bar active state and Paymob active setting are implemented.
- Base/sale/variant pricing and coupon relationship are documented and server enforced.
- Stale variant ids fall back to SKU in cart validation.
- Guest Paymob order/intent flow is supported.
- Paymob unified checkout and legacy iframe are both supported.
- Paymob webhook is HMAC verified and idempotent for stock decrement.
- Coupon deletion is permanent and separate from pause/activation.
- Mylerz shipment and package APIs are implemented.
- Image color metadata is supported for product media.
- Frontend Cloudinary mapping work is in progress in its dirty worktree.

## 22. Known Constraints And Follow-ups

- End-to-end Paymob sandbox card payment and real callback should be reverified using stable deployed domains.
- Paymob refunds are not implemented.
- Paymob stock is not reserved before successful payment.
- Vercel Redis lazy initialization is not implemented.
- CORS allowlist is not enforced.
- Existing local `/uploads` assets require migration or replacement to work on Vercel.
- Settings hero slide images can store image objects, but there is no dedicated multipart hero image upload route.
- Product price sort/filter does not fully model variant overrides.
- Order number generation uses count/existence checks and can race at high concurrency.
- Category/product soft deletion does not provide restore endpoints.
- Product/category save can succeed before old Cloudinary deletion; a provider deletion failure may leave an orphan asset and return an error after DB mutation.
- Mylerz production field/code mappings require verification with the production merchant account.
- Frontend tests are not currently configured in `package.json`; use lint/build and manual browser verification.

## 23. Test Suite

Run backend verification:

```powershell
npm test
npm run lint
node --check src/server.js
```

Current focused tests cover:

- Cart stale variant fallback.
- COD stock decrement/cancel restoration and coupon usage.
- Paymob webhook success and duplicate idempotency.
- Admin analytics authorization.
- Permanent coupon deletion, missing coupon, validation after deletion, code recreation, pause/resume.
- Vercel lazy MongoDB bootstrap with concurrent requests.
- Cloudinary upload/delete behavior.
- Cloudinary `CLOUDINARY_URL` precedence on Vercel.

Tests use local `mongodb://localhost:27017/romz_test`. They create uniquely named records and clean them up. A local MongoDB service must be available.

Frontend verification:

```powershell
npm run lint
npm run build
```

For image and checkout changes, also verify the deployed browser flow because Vercel request limits, cross-site cookies, Paymob redirects, and Cloudinary networking are not reproduced fully by unit tests.

## 24. Agent Working Rules

Before editing:

1. Read `git status` in both repositories.
2. Preserve user changes and never reset unrelated files.
3. Read the owning route, validation, controller, service, model, frontend adapter, and relevant API documentation.
4. Confirm whether the change affects guests, authenticated users, admins, or all three.
5. For payment/order changes, trace stock, coupon usage, status, retries, duplicate callbacks, cancellation, and failure rollback.
6. For image changes, trace upload, DB save, replacement, explicit removal, entity deletion, Cloudinary deletion, and frontend URL mapping.

Implementation rules:

- Keep ESM and `.js` import suffixes.
- Follow existing response envelopes and status codes.
- Use Joi, not ad hoc controller validation.
- Keep secrets server-only.
- Keep monetary calculations server-side and round to two decimal places.
- Preserve guest checkout unless requirements explicitly remove it.
- Make provider callbacks idempotent.
- Do not trust redirect query parameters for payment truth.
- Keep multipart field names stable: product `images`, category `image`.
- Do not clear images when image-related fields are absent.
- Update tests and docs with behavior changes.

Before handing off:

1. Run targeted tests, then the full backend suite.
2. Run frontend lint/build for frontend changes.
3. Check `git diff --check`.
4. Report any test that could not run.
5. State required environment/deployment changes without printing secret values.

## 25. Fast Debugging Guide

### `health` works but `health/ready` says Mongo disconnected on Vercel

- Confirm the lazy Mongo middleware remains in `src/app.js`.
- Confirm `MONGODB_URI` exists in the Vercel Production environment.
- Redeploy after changing environment variables.
- Check Vercel logs for an outgoing Atlas connection/error.

### Cloudinary says invalid JSON with HTML 404 only on Vercel

- Check whether Vercel provides `CLOUDINARY_URL`.
- Do not overwrite it with empty separate variables.
- Use either one valid `CLOUDINARY_URL` or all three separate variables.
- Ensure the cloud name is not a URL.
- Redeploy after changes.

### Image upload returns 413 on Vercel

- The request exceeded Vercel's function body limit before Express can process it.
- Reduce total file bytes or number of images, or move uploads to a direct-to-Cloudinary/browser-signed upload flow.
- Do not solve this by only increasing Multer's limit.

### Category image disappears after editing text/order

- Frontend must omit `image` and `removeImage` when unchanged.
- Backend update must preserve `category.image` when there is no file and no explicit removal.

### Refresh returns 401

- Verify the request sends refresh token cookie or JSON `refreshToken`.
- Verify frontend retained the rotated refresh token from the previous response.
- Check `refreshTokenVersion`, JWT refresh secret, expiry, cookie domain policy, Secure/SameSite/Partitioned behavior, and Vercel environment scope.

### Coupon minimum looks wrong

- Inspect the server-returned cart subtotal, not the frontend display total.
- The coupon minimum applies before discount and shipping.
- Resolve unavailable/stale items before applying the coupon.

### Paymob order exists but is not paid

- Order creation alone is expected to leave payment pending.
- Verify intent redirect completed.
- Verify processed callback points to the backend webhook.
- Verify HMAC secret and webhook logs.
- Do not mark paid from the response redirect alone.
