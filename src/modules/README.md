# Backend Modules

Each feature module should live under `src/modules/<name>/` and use this shape:

- `<name>.routes.js`
- `<name>.controller.js`
- `<name>.service.js`
- `<name>.validation.js`

Mounted modules:

- `auth` - B1 auth, refresh tokens, OTP, password reset
- `users` - B1 profile, addresses, wishlist
- `health` - health check
- `categories` - B2 category CRUD and public tree
- `products` - B2 product CRUD, listing, filtering, home, related
- `reviews` - B2 review submission and moderation
- `coupons` - B3 coupon CRUD and single-coupon validation
- `cart` - B3 server-side cart repricing and stock validation
- `orders` - B4 checkout, public tracking/cancel, admin order management
- `shippingZones` - B4 shipping fees and governorate availability
- `payments` - B5 Paymob intent creation and HMAC webhook handling
- `couriers` - B6 courier providers and manual tracking assignment
- `analytics` - B7 admin dashboard analytics and low-stock reporting

Planned modules:

- `settings`

Feature modules should be mounted in `src/routes/index.js` as each phase starts.
