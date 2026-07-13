import { Router } from "express";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import cartRoutes from "../modules/cart/cart.routes.js";
import categoryRoutes from "../modules/categories/categories.routes.js";
import couponRoutes from "../modules/coupons/coupons.routes.js";
import courierRoutes from "../modules/couriers/couriers.routes.js";
import healthRoutes from "../modules/health/health.routes.js";
import orderRoutes from "../modules/orders/orders.routes.js";
import paymentRoutes from "../modules/payments/payments.routes.js";
import productRoutes from "../modules/products/products.routes.js";
import reviewRoutes from "../modules/reviews/reviews.routes.js";
import settingsRoutes from "../modules/settings/settings.routes.js";
import shippingZoneRoutes from "../modules/shippingZones/shippingZones.routes.js";
import userRoutes from "../modules/users/users.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/coupons", couponRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/shipping-zones", shippingZoneRoutes);
router.use("/settings", settingsRoutes);
router.use("/payments", paymentRoutes);
router.use("/couriers", courierRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
