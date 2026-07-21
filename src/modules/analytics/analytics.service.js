import Order from "../../models/Order.model.js";
import Product from "../../models/Product.model.js";
import Settings from "../../models/Settings.model.js";
import { getCache, setCache } from "../../utils/cache.js";

const analyticsTtlSeconds = 5 * 60;

const paidRevenueCondition = {
  $or: [
    { paymentMethod: "paymob", paymentStatus: "paid" },
    { paymentMethod: "cod", status: "delivered" }
  ]
};

const dateRangeMatch = (range) => ({
  createdAt: {
    $gte: range.from,
    $lte: range.to
  }
});

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const percentChange = (current, previous) => {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round((((current - previous) / previous) * 100 + Number.EPSILON) * 100) / 100;
};

const toDateRange = (query = {}) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const periodMs = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs);

  return { from, to, previousFrom, previousTo };
};

const bucketFormat = (granularity = "day") => {
  if (granularity === "month") return "%Y-%m";
  if (granularity === "week") return "%Y-W%U";
  return "%Y-%m-%d";
};

const withAnalyticsCache = async (key, producer, ttlSeconds = analyticsTtlSeconds) => {
  const cached = await getCache(key);
  if (cached) return cached;

  const value = await producer();
  await setCache(key, value, ttlSeconds);
  return value;
};

const revenueMatch = (range) => ({
  ...dateRangeMatch(range),
  ...paidRevenueCondition
});

const getRevenueMetrics = async (range) => {
  const [metrics] = await Order.aggregate([
    { $match: revenueMatch(range) },
    {
      $project: {
        total: 1,
        itemsSold: { $sum: "$items.qty" }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        revenueOrders: { $sum: 1 },
        itemsSold: { $sum: "$itemsSold" }
      }
    }
  ]);

  return {
    revenue: roundMoney(metrics?.revenue),
    revenueOrders: metrics?.revenueOrders || 0,
    itemsSold: metrics?.itemsSold || 0
  };
};

const getLowStockThreshold = async () => {
  const settings = await Settings.findOne({ key: "store" }).lean();
  return settings?.lowStockThreshold ?? 5;
};

export const getOverview = async (query) => {
  const range = toDateRange(query);
  const threshold = await getLowStockThreshold();
  const cacheKey = `analytics:overview:${range.from.toISOString()}:${range.to.toISOString()}:${threshold}`;

  return withAnalyticsCache(cacheKey, async () => {
    const previousRange = {
      from: range.previousFrom,
      to: range.previousTo
    };

    const [currentRevenue, previousRevenue, ordersCount, previousOrdersCount, pendingOrders, lowStock] =
      await Promise.all([
        getRevenueMetrics(range),
        getRevenueMetrics(previousRange),
        Order.countDocuments(dateRangeMatch(range)),
        Order.countDocuments(dateRangeMatch(previousRange)),
        Order.countDocuments({ status: "pending" }),
        Product.aggregate([
          { $unwind: "$variants" },
          { $match: { isActive: true, "variants.stock": { $lte: threshold } } },
          { $count: "count" }
        ])
      ]);

    const aov = currentRevenue.revenueOrders
      ? roundMoney(currentRevenue.revenue / currentRevenue.revenueOrders)
      : 0;
    const previousAov = previousRevenue.revenueOrders
      ? roundMoney(previousRevenue.revenue / previousRevenue.revenueOrders)
      : 0;

    return {
      range: {
        from: range.from,
        to: range.to
      },
      revenue: {
        value: currentRevenue.revenue,
        changePercent: percentChange(currentRevenue.revenue, previousRevenue.revenue)
      },
      orders: {
        value: ordersCount,
        changePercent: percentChange(ordersCount, previousOrdersCount)
      },
      averageOrderValue: {
        value: aov,
        changePercent: percentChange(aov, previousAov)
      },
      itemsSold: {
        value: currentRevenue.itemsSold,
        changePercent: percentChange(currentRevenue.itemsSold, previousRevenue.itemsSold)
      },
      pendingOrders: {
        value: pendingOrders
      },
      lowStock: {
        value: lowStock[0]?.count || 0,
        threshold
      }
    };
  });
};

export const getRevenueSeries = async (query) => {
  const range = toDateRange(query);
  const granularity = query.granularity || "day";
  const cacheKey = `analytics:revenue-series:${range.from.toISOString()}:${range.to.toISOString()}:${granularity}`;

  return withAnalyticsCache(cacheKey, async () =>
    Order.aggregate([
      { $match: revenueMatch(range) },
      {
        $group: {
          _id: {
            period: {
              $dateToString: {
                format: bucketFormat(granularity),
                date: "$createdAt"
              }
            },
            paymentMethod: "$paymentMethod"
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          totalRevenue: { $sum: "$revenue" },
          orders: { $sum: "$orders" },
          byPaymentMethod: {
            $push: {
              paymentMethod: "$_id.paymentMethod",
              revenue: { $round: ["$revenue", 2] },
              orders: "$orders"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          revenue: { $round: ["$totalRevenue", 2] },
          orders: 1,
          byPaymentMethod: 1
        }
      },
      { $sort: { period: 1 } }
    ])
  );
};

export const getOrdersByStatus = async (query) => {
  const range = toDateRange(query);
  const cacheKey = `analytics:orders-by-status:${range.from.toISOString()}:${range.to.toISOString()}`;

  return withAnalyticsCache(cacheKey, async () =>
    Order.aggregate([
      { $match: dateRangeMatch(range) },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ])
  );
};

export const getBestSellers = async (query) => {
  const range = toDateRange(query);
  const limit = Number(query.limit || 10);
  const cacheKey = `analytics:best-sellers:${range.from.toISOString()}:${range.to.toISOString()}:${limit}`;

  return withAnalyticsCache(cacheKey, async () =>
    Order.aggregate([
      { $match: revenueMatch(range) },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.nameSnapshot" },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.unitPrice"] } }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          product: "$_id",
          name: 1,
          slug: "$product.slug",
          image: { $arrayElemAt: ["$product.images", 0] },
          qty: 1,
          revenue: { $round: ["$revenue", 2] }
        }
      },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: limit }
    ])
  );
};

export const getLowStock = async (query) => {
  const threshold = await getLowStockThreshold();
  const limit = Number(query.limit || 50);
  const cacheKey = `analytics:low-stock:${threshold}:${limit}`;

  return withAnalyticsCache(cacheKey, async () =>
    Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lte: threshold } } },
      {
        $project: {
          _id: 0,
          product: "$_id",
          name: 1,
          slug: 1,
          sku: "$variants.sku",
          size: "$variants.size",
          color: "$variants.color",
          stock: "$variants.stock",
          threshold
        }
      },
      { $sort: { stock: 1, sku: 1 } },
      { $limit: limit }
    ])
  );
};

export const getCouponPerformance = async (query) => {
  const range = toDateRange(query);
  const cacheKey = `analytics:coupons:${range.from.toISOString()}:${range.to.toISOString()}`;

  return withAnalyticsCache(cacheKey, async () =>
    Order.aggregate([
      {
        $match: {
          ...dateRangeMatch(range),
          "discount.couponCode": { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$discount.couponCode",
          uses: { $sum: 1 },
          totalDiscountGiven: { $sum: "$discount.amount" },
          revenueGenerated: { $sum: "$total" }
        }
      },
      {
        $lookup: {
          from: "coupons",
          localField: "_id",
          foreignField: "code",
          as: "coupon"
        }
      },
      { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          code: "$_id",
          type: "$coupon.type",
          value: "$coupon.value",
          uses: 1,
          totalDiscountGiven: { $round: ["$totalDiscountGiven", 2] },
          revenueGenerated: { $round: ["$revenueGenerated", 2] }
        }
      },
      { $sort: { uses: -1, revenueGenerated: -1 } }
    ])
  );
};

export const getPaymentSplit = async (query) => {
  const range = toDateRange(query);
  const cacheKey = `analytics:payment-split:${range.from.toISOString()}:${range.to.toISOString()}`;

  return withAnalyticsCache(cacheKey, async () => {
    const [split, codStats] = await Promise.all([
      Order.aggregate([
        { $match: dateRangeMatch(range) },
        {
          $group: {
            _id: "$paymentMethod",
            orders: { $sum: 1 },
            revenue: { $sum: "$total" }
          }
        },
        {
          $project: {
            _id: 0,
            paymentMethod: "$_id",
            orders: 1,
            revenue: { $round: ["$revenue", 2] }
          }
        },
        { $sort: { orders: -1 } }
      ]),
      Order.aggregate([
        {
          $match: {
            ...dateRangeMatch(range),
            paymentMethod: "cod"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            failedOrReturned: {
              $sum: {
                $cond: [{ $in: ["$status", ["cancelled", "returned"]] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    const cod = codStats[0] || { total: 0, failedOrReturned: 0 };

    return {
      split,
      codFailureReturnRate: cod.total
        ? Math.round((cod.failedOrReturned / cod.total) * 10000) / 100
        : 0
    };
  });
};
