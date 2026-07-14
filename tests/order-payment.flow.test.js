import request from "supertest";
import { jest } from "@jest/globals";

jest.setTimeout(30000);

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/romz_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.PAYMOB_HMAC_SECRET = "test-hmac-secret";

let app;
let mongoose;
let connectDatabase;
let User;
let Category;
let Product;
let Coupon;
let Order;
let ShippingZone;
let calculatePaymobHmac;

const state = {
  token: "",
  stamp: "",
  ids: {
    users: [],
    categories: [],
    products: [],
    coupons: [],
    orders: [],
    zones: []
  }
};

const authHeader = () => ({ Authorization: `Bearer ${state.token}` });

const createAdmin = async () => {
  const email = `admin-${state.stamp}@romz.test`;
  const admin = await User.create({
    name: "Test Admin",
    email,
    password: "password123",
    role: "admin",
    isVerified: true
  });
  state.ids.users.push(admin._id);

  const login = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "password123"
  });

  expect(login.status).toBe(200);
  state.token = login.body.data.accessToken;
};

const createCatalogFixture = async (prefix, stock = 5) => {
  const zone = await request(app)
    .post("/api/v1/shipping-zones")
    .set(authHeader())
    .send({
      governorate: `${prefix} Cairo ${state.stamp}`,
      fee: 50
    });
  expect(zone.status).toBe(201);
  state.ids.zones.push(zone.body.data.zone._id);

  const category = await request(app)
    .post("/api/v1/categories")
    .set(authHeader())
    .send({
      name: {
        en: `${prefix} Category ${state.stamp}`,
        ar: `${prefix} Category AR ${state.stamp}`
      },
      slug: `${prefix.toLowerCase()}-${state.stamp}`,
      order: 99
    });
  expect(category.status).toBe(201);
  state.ids.categories.push(category.body.data.category._id);

  const product = await request(app)
    .post("/api/v1/products")
    .set(authHeader())
    .send({
      name: {
        en: `${prefix} Product ${state.stamp}`,
        ar: `${prefix} Product AR ${state.stamp}`
      },
      description: {
        en: "Temporary test product",
        ar: "Temporary test product AR"
      },
      category: category.body.data.category._id,
      basePrice: 500,
      salePrice: 450,
      variants: [
        {
          sku: `${prefix}-${state.stamp}-M-BLK`,
          size: "M",
          color: { name: "Black", hex: "#000000" },
          stock
        }
      ]
    });
  expect(product.status).toBe(201);
  state.ids.products.push(product.body.data.product._id);

  return {
    governorate: zone.body.data.zone.governorate,
    productId: product.body.data.product._id,
    variantId: product.body.data.product.variants[0]._id,
    sku: product.body.data.product.variants[0].sku
  };
};

const createCoupon = async (code, value = 50) => {
  const coupon = await request(app)
    .post("/api/v1/coupons")
    .set(authHeader())
    .send({
      code,
      type: "fixed",
      value,
      minOrderTotal: 100,
      usageLimit: 10
    });

  expect(coupon.status).toBe(201);
  state.ids.coupons.push(coupon.body.data.coupon._id);
  return coupon.body.data.coupon;
};

beforeAll(async () => {
  state.stamp = String(Date.now());

  ({ default: app } = await import("../src/app.js"));
  ({ default: mongoose } = await import("mongoose"));
  ({ connectDatabase } = await import("../src/config/database.js"));
  ({ default: User } = await import("../src/models/User.model.js"));
  ({ default: Category } = await import("../src/models/Category.model.js"));
  ({ default: Product } = await import("../src/models/Product.model.js"));
  ({ default: Coupon } = await import("../src/models/Coupon.model.js"));
  ({ default: Order } = await import("../src/models/Order.model.js"));
  ({ default: ShippingZone } = await import("../src/models/ShippingZone.model.js"));
  ({ calculatePaymobHmac } = await import("../src/modules/payments/paymob.service.js"));

  await connectDatabase();
  await createAdmin();
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ _id: { $in: state.ids.users } }),
    Order.deleteMany({ _id: { $in: state.ids.orders } }),
    Coupon.deleteMany({ _id: { $in: state.ids.coupons } }),
    Product.deleteMany({ _id: { $in: state.ids.products } }),
    Category.deleteMany({ _id: { $in: state.ids.categories } }),
    ShippingZone.deleteMany({ _id: { $in: state.ids.zones } })
  ]);
  await mongoose.disconnect();
});

test("cart validation falls back to SKU when a persisted variant ID is stale", async () => {
  const fixture = await createCatalogFixture("STALE", 5);
  const staleVariantId = new mongoose.Types.ObjectId().toString();

  const cart = await request(app)
    .post("/api/v1/cart/validate")
    .send({
      items: [
        {
          product: fixture.productId,
          variantId: staleVariantId,
          sku: fixture.sku,
          qty: 1
        }
      ]
    });

  expect(cart.status).toBe(200);
  expect(cart.body.data.cart.isValid).toBe(true);
  expect(cart.body.data.cart.unavailableItems).toHaveLength(0);
  expect(cart.body.data.cart.items[0].variantId).toBe(String(fixture.variantId));
  expect(cart.body.data.cart.items[0].sku).toBe(fixture.sku);
});

test("COD checkout decrements stock and cancel restores stock and coupon usage", async () => {
  const fixture = await createCatalogFixture("COD", 5);
  const coupon = await createCoupon(`COD${state.stamp}`);

  const order = await request(app)
    .post("/api/v1/orders")
    .send({
      customer: {
        name: "COD Customer",
        email: "cod@example.com",
        phone: "01000000001"
      },
      shippingAddress: {
        governorate: fixture.governorate,
        city: "Nasr City",
        street: "Main Street",
        apartment: "12A"
      },
      paymentMethod: "cod",
      couponCode: coupon.code,
      items: [{ product: fixture.productId, variantId: fixture.variantId, qty: 2 }]
    });

  expect(order.status).toBe(201);
  expect(order.body.data.order.total).toBe(900);
  state.ids.orders.push(order.body.data.order._id);

  const afterCreate = await Product.findById(fixture.productId).lean();
  expect(afterCreate.variants[0].stock).toBe(3);
  expect(afterCreate.sold).toBe(2);

  const tracked = await request(app).get("/api/v1/orders/track").query({
    orderNumber: order.body.data.order.orderNumber,
    contact: "01000000001"
  });
  expect(tracked.status).toBe(200);

  const cancel = await request(app)
    .post(`/api/v1/orders/${order.body.data.order._id}/cancel`)
    .send({
      contact: "01000000001",
      reason: "Test cleanup"
    });
  expect(cancel.status).toBe(200);
  expect(cancel.body.data.order.status).toBe("cancelled");

  const afterCancel = await Product.findById(fixture.productId).lean();
  const couponAfterCancel = await Coupon.findById(coupon._id).lean();
  expect(afterCancel.variants[0].stock).toBe(5);
  expect(afterCancel.sold).toBe(0);
  expect(couponAfterCancel.usedCount).toBe(0);
});

test("Paymob success webhook marks order paid and is idempotent for stock", async () => {
  const fixture = await createCatalogFixture("PAYMOB", 5);

  const order = await request(app)
    .post("/api/v1/orders")
    .send({
      customer: {
        name: "Paymob Customer",
        email: "paymob@example.com",
        phone: "01000000002"
      },
      shippingAddress: {
        governorate: fixture.governorate,
        city: "Nasr City",
        street: "Main Street",
        apartment: "12A"
      },
      paymentMethod: "paymob",
      items: [{ product: fixture.productId, variantId: fixture.variantId, qty: 2 }]
    });

  expect(order.status).toBe(201);
  expect(order.body.data.order.paymentStatus).toBe("pending");
  state.ids.orders.push(order.body.data.order._id);

  const paymobOrderId = `90${state.stamp}`;
  await Order.findByIdAndUpdate(order.body.data.order._id, { paymobOrderId });

  const transaction = {
    amount_cents: 95000,
    created_at: "2026-07-06T00:00:00.000000",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: `70${state.stamp}`,
    integration_id: 123,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: {
      id: paymobOrderId,
      merchant_order_id: order.body.data.order.orderNumber
    },
    owner: 1,
    pending: false,
    source_data: {
      pan: "2346",
      sub_type: "MasterCard",
      type: "card"
    },
    success: true
  };

  const hmac = calculatePaymobHmac(transaction, "test-hmac-secret");

  const webhook = await request(app)
    .post(`/api/v1/payments/paymob/webhook?hmac=${hmac}`)
    .send({ obj: transaction });
  expect(webhook.status).toBe(200);

  const duplicate = await request(app)
    .post(`/api/v1/payments/paymob/webhook?hmac=${hmac}`)
    .send({ obj: transaction });
  expect(duplicate.status).toBe(200);

  const paidOrder = await Order.findById(order.body.data.order._id).lean();
  const paidProduct = await Product.findById(fixture.productId).lean();

  expect(paidOrder.paymentStatus).toBe("paid");
  expect(paidOrder.status).toBe("confirmed");
  expect(paidProduct.variants[0].stock).toBe(3);
  expect(paidProduct.sold).toBe(2);
});

test("analytics endpoints are admin-only", async () => {
  const unauthorized = await request(app).get("/api/v1/analytics/overview");
  expect(unauthorized.status).toBe(401);

  const authorized = await request(app)
    .get("/api/v1/analytics/overview")
    .set(authHeader());
  expect(authorized.status).toBe(200);
});
