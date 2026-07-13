# ROMZ Backend Collaboration Guide

This file is the working agreement for building the ROMZ backend together.

## Scope

- Backend only: Express.js, Mongoose, MongoDB, Redis, local Multer product uploads, Paymob, courier integrations, email, and admin analytics APIs.
- Frontend is out of scope for this workspace unless you explicitly ask for it later.
- The backend should serve both the storefront and dashboard through REST JSON APIs.

## JavaScript Version And Module Rules

- This backend uses modern JavaScript with ES6 module syntax.
- `package.json` must keep `"type": "module"`.
- Use `import` and `export` in all backend files.
- Do not use CommonJS module syntax.
- Local imports must include the `.js` extension, for example `import User from "../models/User.model.js";`.
- New modules should follow the existing ESM style used in `src/app.js`, `src/server.js`, routes, models, middleware, services, and scripts.

## How We Work

- You are included in every phase.
- I should pause at phase boundaries and ask before moving to the next phase.
- I can make small implementation decisions inside a phase when they follow the project plan or existing code style.
- I should ask you when a choice affects product behavior, money flow, customer experience, deployment, or admin workflow.
- I should keep changes backend-focused and avoid frontend files unless you request them.

## Current Backend Phases

### B0 - Foundation Hardening

Goal: create a safe, consistent API base.

Planned work:
- Express app structure.
- Environment config.
- MongoDB connection.
- CORS, Helmet, rate limiting, sanitization.
- Standard response shape: `{ success, message, data, meta }`.
- Global error handler.
- `asyncHandler`.
- API filter, sort, pagination utility.
- JWT access and refresh token helpers.
- Admin role guard.
- Multer memory upload and image compression middleware; product photos use `multipart/form-data` files in the `images` field and save locally under `/uploads`.
- Redis client/cache helpers.

Ask me before:
- Re-locking CORS to a production origin allowlist.
- Finalizing refresh-token cookie settings.
- Enabling Redis as required instead of optional.
- Choosing deployment platform.

### B1 - Auth & Users

Goal: user accounts, admin seed, OTP, profile, addresses, wishlist.

Planned work:
- Register, login, refresh, logout.
- Email OTP verification.
- Forgot/reset password.
- Profile CRUD.
- Address book CRUD.
- Wishlist add/remove.
- Seed single admin from `.env`.

Ask me before:
- Picking OTP delivery provider.
- Deciding whether phone is required at registration.
- Changing password policy.

### B2 - Catalog

Goal: categories, products, variants, images, reviews.

Planned work:
- Category CRUD and public category tree.
- Product CRUD with bilingual fields and variant stock.
- Public product list filters, search, sort, pagination.
- Product by slug.
- Related products.
- Reviews with admin approval.
- `GET /products/home`.

Ask me before:
- Finalizing size list.
- Finalizing color naming rules.
- Deciding product slug behavior when names change.
- Choosing review moderation defaults.

### B3 - Coupons And Cart Validation

Goal: server-side price and stock truth.

Planned work:
- Coupon CRUD.
- Coupon validation endpoint.
- Cart validation endpoint.

Ask me before:
- Coupon stacking rules.
- Free-shipping coupon behavior.
- Whether guest users can use all coupon types.

### B4 - Orders And Checkout

Goal: guest/logged-in checkout, stock transactions, tracking, admin order management.

Planned work:
- Create orders.
- COD stock decrement.
- Order tracking by order number plus phone or email.
- Pre-shipping cancel endpoint.
- Admin order filters/detail/status updates.
- Shipping zones.
- Order emails.

Ask me before:
- Order number prefix.
- Cancellation rules.
- Shipping fees and governorates list.
- Which statuses trigger emails.

### B5 - Paymob

Goal: Paymob payment creation and verified webhooks.

Planned work:
- Payment service abstraction.
- Paymob payment intent flow.
- HMAC webhook verification.
- Stock decrement after successful online payment.
- Store transaction IDs.

Ask me before:
- Using iframe vs redirect.
- Paymob integration IDs.
- Refund behavior.

### B6 - Courier

Goal: manual tracking first, optional Bosta/Mylerz automation later.

Planned work:
- Admin courier tracking fields.
- Optional delivery creation API.
- Optional courier webhook sync.

Ask me before:
- Bosta vs Mylerz priority.
- When to auto-create shipments.

### B7 - Analytics

Goal: dashboard analytics endpoints.

Planned work:
- Overview KPIs.
- Revenue series.
- Orders by status.
- Best sellers.
- Low stock.
- Coupon performance.
- Payment split.
- Redis caching.

Ask me before:
- Revenue definitions.
- Date range defaults.
- Whether COD counts as revenue before delivery.

### B8 - Hardening And Deploy

Goal: indexes, tests, rate limits, deployment readiness.

Planned work:
- MongoDB indexes.
- Full validation coverage.
- Rate limits on sensitive endpoints.
- Jest/Supertest tests for order and payment flows.
- Deployment checklist.

Ask me before:
- Production domain list.
- Database host.
- Redis provider.
- File/image storage account.
- Final environment variable values.

## Current Checkpoint

We have completed backend work through Phase B8.

Implemented so far:
- B0 scaffold and safety foundation.
- B1 auth routes for register, login, email OTP verification, resend OTP, refresh, logout, forgot password, and reset password.
- B1 user routes for profile, addresses, and wishlist.
- B2 category routes for admin CRUD and public active category tree/list.
- B2 product routes for admin CRUD, public listing/filter/search, product by slug, related products, and home products.
- B2 review routes for public submission/listing and admin approval/delete.
- B3 coupon routes for admin CRUD and single-coupon validation.
- B3 cart validation route for server-side repricing, stock checks, and one coupon per cart.
- B4 order routes for checkout, public tracking/cancel, and admin order management.
- B4 shipping zone routes for governorate fees and availability.
- B5 Paymob routes for iframe payment intent creation and HMAC-verified webhook handling.
- B6 courier routes for supported providers and manual tracking assignment.
- B7 analytics routes for overview KPIs, revenue series, order status, best sellers, low stock, coupon performance, and payment split.
- B8 hardening: route-specific rate limits, readiness check, focused Jest/Supertest flow tests, deployment checklist, and extra query indexes.

Current backend defaults:
- Keep API prefix as `/api/v1`.
- CORS is open: the API reflects any browser origin and allows credentials.
- Local MongoDB connection is `mongodb://localhost:27017/`.
- Use email OTP first.
- Phone is optional at registration.
- Refresh tokens use httpOnly cookies with `SameSite=None`, `Secure`, and `Partitioned` for cross-site HTTPS admin refresh flows.
- Product variant sizes are flexible strings for now, so admin can use `S`, `M`, `L`, `XL`, `XXL`, `3XL`, or future size labels without a code change.
- Product photo admin workflow is Multer-first: send new photos as `images` files, optional uploaded-photo colors as `imageColors`, and use `existingImages` only on update to keep/reorder/remove current local `/uploads` images before appending new uploads.
- One coupon per cart for launch. No coupon stacking.
- Order numbers use the `RZ-YYYY-00001` format.
- COD orders decrement stock at order creation. Paymob orders stay pending and stock is reserved in B5 after verified payment.
- Paymob checkout flow is order-first: create order with `paymentMethod: "paymob"`, then create a Paymob intent for that order, then webhook marks paid/failed.
- Paymob intent creation supports unified checkout when `PAYMOB_SECRET_KEY` and `PAYMOB_PUBLIC_KEY` are set; legacy iframe is still supported when integration and iframe ids are set.
- Paymob credentials are configured through `PAYMOB_API_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_CARD_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`, and `PAYMOB_BASE_URL`.
- Paymob sandbox intention creation has been verified with the configured test keys. Full sandbox card payment and real webhook confirmation are still tracked in `BACKLOG.md`.
- Courier automation is manual-first for launch. Bosta/Mylerz API automation is tracked in `BACKLOG.md`.
- Analytics revenue counts Paymob orders when `paymentStatus: paid` and COD orders when status is `delivered`.
- Deployment checklist lives in `DEPLOYMENT.md`.
- Skipped live Paymob and courier API automation items live in `BACKLOG.md`.

The first decision I need from you after the initial scaffold:
- Should phone become required for registration, or stay checkout-only?
