import crypto from "node:crypto";
import { env } from "../../config/env.js";
import Coupon from "../../models/Coupon.model.js";
import Order from "../../models/Order.model.js";
import Product from "../../models/Product.model.js";
import { sendOrderStatusEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";

const hmacFields = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success"
];

const requiredPaymobConfig = () => [
  env.PAYMOB_API_KEY,
  env.PAYMOB_CARD_INTEGRATION_ID,
  env.PAYMOB_IFRAME_ID
];

const hasUnifiedCheckoutConfig = () => Boolean(env.PAYMOB_SECRET_KEY && env.PAYMOB_PUBLIC_KEY);

const hasLegacyIframeConfig = () =>
  Boolean(env.PAYMOB_API_KEY && env.PAYMOB_CARD_INTEGRATION_ID && env.PAYMOB_IFRAME_ID);

const ensurePaymobConfig = () => {
  if (!hasUnifiedCheckoutConfig() && requiredPaymobConfig().some((value) => !value)) {
    throw new AppError("Paymob credentials are not configured", 500);
  }
};

const amountToCents = (amount) => Math.round(Number(amount) * 100);

const normalizePaymobBaseUrl = () => env.PAYMOB_BASE_URL.replace(/\/+$/, "");

const paymobFetch = async (path, body) => {
  const response = await fetch(`${normalizePaymobBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError("Paymob request failed", response.status, data);
  }

  return data;
};

const paymobSecretFetch = async (path, body) => {
  const response = await fetch(`${normalizePaymobBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${env.PAYMOB_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError("Paymob request failed", response.status, data);
  }

  return data;
};

const getNestedValue = (source, path) =>
  path.split(".").reduce((value, key) => (value === undefined || value === null ? "" : value[key]), source);

const normalizeHmacValue = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const getWebhookTransaction = (payload) => payload.obj || payload;

const getWebhookHmac = (payload, query = {}) => query.hmac || payload.hmac || "";

const buildHmacSource = (transaction) =>
  hmacFields.map((field) => normalizeHmacValue(getNestedValue(transaction, field))).join("");

export const calculatePaymobHmac = (transaction, secret = env.PAYMOB_HMAC_SECRET) =>
  crypto.createHmac("sha512", secret).update(buildHmacSource(transaction)).digest("hex");

export const verifyPaymobWebhook = (payload, query = {}) => {
  if (!env.PAYMOB_HMAC_SECRET) {
    throw new AppError("Paymob HMAC secret is not configured", 500);
  }

  const transaction = getWebhookTransaction(payload);
  const receivedHmac = getWebhookHmac(payload, query);

  if (!receivedHmac) {
    throw new AppError("Paymob webhook HMAC is missing", 400);
  }

  const expectedHmac = calculatePaymobHmac(transaction);
  const expected = Buffer.from(expectedHmac, "hex");
  const received = Buffer.from(String(receivedHmac), "hex");

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new AppError("Invalid Paymob webhook HMAC", 401);
  }

  return transaction;
};

const canAccessOrder = (order, user, contact = "") => {
  if (user?.role === "admin") return true;
  if (user && order.user && String(order.user) === String(user._id)) return true;

  const normalizedContact = String(contact).trim().toLowerCase();
  return (
    normalizedContact &&
    [order.customer.phone, order.customer.email]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
      .includes(normalizedContact)
  );
};

const authenticate = async () =>
  paymobFetch("/api/auth/tokens", {
    api_key: env.PAYMOB_API_KEY
  });

const registerOrder = async (authToken, order) =>
  paymobFetch("/api/ecommerce/orders", {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountToCents(order.total),
    currency: "EGP",
    merchant_order_id: order.orderNumber,
    items: order.items.map((item) => ({
      name: item.nameSnapshot.en,
      amount_cents: amountToCents(item.unitPrice),
      description: `${item.sku} / ${item.size} / ${item.color.name}`,
      quantity: item.qty
    }))
  });

const createPaymentKey = async (authToken, order, paymobOrderId) =>
  paymobFetch("/api/acceptance/payment_keys", {
    auth_token: authToken,
    amount_cents: amountToCents(order.total),
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: {
      apartment: order.shippingAddress.apartment || "NA",
      email: order.customer.email || "customer@romz.local",
      floor: "NA",
      first_name: order.customer.name.split(" ")[0] || order.customer.name,
      street: order.shippingAddress.street,
      building: "NA",
      phone_number: order.customer.phone,
      shipping_method: "NA",
      postal_code: order.shippingAddress.postal || "NA",
      city: order.shippingAddress.city,
      country: "EG",
      last_name: order.customer.name.split(" ").slice(1).join(" ") || order.customer.name,
      state: order.shippingAddress.governorate
    },
    currency: "EGP",
    integration_id: Number(env.PAYMOB_CARD_INTEGRATION_ID)
  });

const buildBillingData = (order) => ({
  apartment: order.shippingAddress.apartment || "NA",
  email: order.customer.email || "customer@romz.local",
  floor: "NA",
  first_name: order.customer.name.split(" ")[0] || order.customer.name,
  street: order.shippingAddress.street,
  building: "NA",
  phone_number: order.customer.phone,
  shipping_method: "NA",
  postal_code: order.shippingAddress.postal || "NA",
  city: order.shippingAddress.city,
  country: "EG",
  last_name: order.customer.name.split(" ").slice(1).join(" ") || order.customer.name,
  state: order.shippingAddress.governorate
});

const buildUnifiedCheckoutUrl = (clientSecret) =>
  `${normalizePaymobBaseUrl()}/unifiedcheckout/?publicKey=${encodeURIComponent(
    env.PAYMOB_PUBLIC_KEY
  )}&clientSecret=${encodeURIComponent(clientSecret)}`;

const createUnifiedIntention = async (order, { redirectionUrl = "", notificationUrl = "" } = {}) => {
  const body = {
    amount: amountToCents(order.total),
    currency: "EGP",
    billing_data: buildBillingData(order),
    customer: {
      first_name: order.customer.name.split(" ")[0] || order.customer.name,
      last_name: order.customer.name.split(" ").slice(1).join(" ") || order.customer.name,
      email: order.customer.email || "customer@romz.local",
      phone_number: order.customer.phone
    },
    items: [
      {
        name: `ROMZ Order ${order.orderNumber}`,
        amount: amountToCents(order.total),
        description: `Order total including shipping and discounts`,
        quantity: 1
      }
    ],
    extras: {
      merchant_order_id: order.orderNumber,
      order_id: String(order._id)
    }
  };

  if (env.PAYMOB_CARD_INTEGRATION_ID) {
    body.payment_methods = [Number(env.PAYMOB_CARD_INTEGRATION_ID)];
  }

  if (redirectionUrl) {
    body.redirection_url = redirectionUrl;
  }

  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  return paymobSecretFetch("/v1/intention/", body);
};

export const createPaymentIntent = async (
  { orderId, contact = "", redirectionUrl = "", notificationUrl = "" },
  user = null
) => {
  ensurePaymobConfig();

  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (!canAccessOrder(order, user, contact)) {
    throw new AppError("You cannot access this order", 403);
  }

  if (order.paymentMethod !== "paymob") {
    throw new AppError("Order payment method is not Paymob", 400);
  }

  if (order.paymentStatus !== "pending") {
    throw new AppError("Order payment is not pending", 400);
  }

  if (order.status === "cancelled") {
    throw new AppError("Cancelled orders cannot be paid", 400);
  }

  if (hasUnifiedCheckoutConfig()) {
    const intention = await createUnifiedIntention(order, {
      redirectionUrl,
      notificationUrl
    });
    const clientSecret = intention.client_secret || intention.clientSecret || "";
    const paymobOrderId =
      intention.intention_order_id || intention.order_id || intention.id || intention.order?.id || "";

    if (paymobOrderId) {
      order.paymobOrderId = String(paymobOrderId);
      await order.save();
    }

    return {
      provider: "paymob",
      flow: "unified_checkout",
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymobOrderId: paymobOrderId ? String(paymobOrderId) : "",
      clientSecret,
      publicKey: env.PAYMOB_PUBLIC_KEY,
      checkoutUrl: clientSecret ? buildUnifiedCheckoutUrl(clientSecret) : ""
    };
  }

  if (!hasLegacyIframeConfig()) {
    throw new AppError("Paymob legacy iframe credentials are not configured", 500);
  }

  const auth = await authenticate();
  const paymobOrder = await registerOrder(auth.token, order);
  const paymentKey = await createPaymentKey(auth.token, order, paymobOrder.id);

  order.paymobOrderId = String(paymobOrder.id);
  await order.save();

  const iframeUrl = `${normalizePaymobBaseUrl()}/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey.token}`;

  return {
    provider: "paymob",
    flow: "legacy_iframe",
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymobOrderId: String(paymobOrder.id),
    paymentKey: paymentKey.token,
    iframeUrl
  };
};

const decrementOrderStock = async (order) => {
  const decremented = [];

  try {
    for (const item of order.items) {
      const result = await Product.updateOne(
        {
          _id: item.product,
          variants: {
            $elemMatch: {
              sku: item.sku,
              stock: { $gte: item.qty }
            }
          }
        },
        {
          $inc: {
            "variants.$.stock": -item.qty,
            sold: item.qty
          }
        }
      );

      if (result.modifiedCount !== 1) {
        throw new AppError(`Insufficient stock for ${item.sku}`, 400);
      }

      decremented.push(item);
    }
  } catch (error) {
    await Promise.all(
      decremented.map((item) =>
        Product.updateOne(
          { _id: item.product, "variants.sku": item.sku },
          {
            $inc: {
              "variants.$.stock": item.qty,
              sold: -item.qty
            }
          }
        )
      )
    );
    throw error;
  }
};

const incrementCouponUsage = async (order) => {
  if (!order.discount?.couponCode) return;

  await Coupon.updateOne(
    { code: order.discount.couponCode },
    {
      $inc: { usedCount: 1 },
      ...(order.user ? { $addToSet: { usedBy: order.user } } : {})
    }
  );
};

const extractMerchantOrderId = (transaction) =>
  transaction?.order?.merchant_order_id ||
  transaction?.merchant_order_id ||
  transaction?.merchant_order_number ||
  "";

const extractPaymobOrderId = (transaction) =>
  transaction?.order?.id === undefined || transaction?.order?.id === null
    ? ""
    : String(transaction.order.id);

const findOrderForWebhook = async (transaction) => {
  const merchantOrderId = extractMerchantOrderId(transaction);
  const paymobOrderId = extractPaymobOrderId(transaction);

  const order = await Order.findOne({
    $or: [
      ...(merchantOrderId ? [{ orderNumber: merchantOrderId }] : []),
      ...(paymobOrderId ? [{ paymobOrderId }] : [])
    ]
  });

  if (!order) {
    throw new AppError("Order not found for Paymob webhook", 404);
  }

  return order;
};

export const handlePaymobWebhook = async (payload, query = {}) => {
  const transaction = verifyPaymobWebhook(payload, query);
  const order = await findOrderForWebhook(transaction);
  const transactionId = transaction.id === undefined || transaction.id === null ? "" : String(transaction.id);
  const paymobOrderId = extractPaymobOrderId(transaction);

  if (paymobOrderId && !order.paymobOrderId) {
    order.paymobOrderId = paymobOrderId;
  }

  if (transactionId) {
    order.paymobTransactionId = transactionId;
  }

  if (transaction.success === true) {
    if (order.paymentStatus !== "paid") {
      await decrementOrderStock(order);
      await incrementCouponUsage(order);
      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.statusHistory.push({
        status: "confirmed",
        at: new Date(),
        note: "Paymob payment confirmed"
      });
      await sendOrderStatusEmail(order);
    }
  } else if (transaction.pending !== true && order.paymentStatus !== "paid") {
    order.paymentStatus = "failed";
    order.status = "cancelled";
    order.cancelledReason = "Paymob payment failed";
    order.statusHistory.push({
      status: "cancelled",
      at: new Date(),
      note: "Paymob payment failed"
    });
  }

  await order.save();

  return {
    order,
    transactionId,
    success: transaction.success === true
  };
};
