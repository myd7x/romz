import Category from "../../models/Category.model.js";
import Settings, {
  defaultSizeChart,
  defaultFaqs,
  defaultShippingReturns,
  defaultContactInfo
} from "../../models/Settings.model.js";
import { AppError } from "../../utils/AppError.js";
import { deleteCache } from "../../utils/cache.js";

const storeSettingsQuery = { key: "store" };

const settingsPopulate = [{ path: "featuredCollections", select: "name slug image parent order" }];

const ensureSettingsDefaults = async (settings) => {
  let dirty = false;

  if (!settings.sizeChart) {
    settings.sizeChart = defaultSizeChart();
    dirty = true;
  }

  if (!settings.faqs || settings.faqs.length === 0) {
    settings.faqs = defaultFaqs();
    dirty = true;
  }

  if (!settings.shippingReturns) {
    settings.shippingReturns = defaultShippingReturns();
    dirty = true;
  }

  if (!settings.contactInfo) {
    settings.contactInfo = defaultContactInfo();
    dirty = true;
  }

  if (dirty) {
    await settings.save();
  }

  if (settings.payments?.paymob?.active === undefined) {
    settings.payments = {
      ...(settings.payments?.toObject ? settings.payments.toObject() : settings.payments),
      paymob: {
        ...(settings.payments?.paymob?.toObject
          ? settings.payments.paymob.toObject()
          : settings.payments?.paymob),
        active: true
      }
    };
    await settings.save();
  }

  return settings;
};

export const getStoreSettings = async () => {
  const settings = await Settings.findOneAndUpdate(
    storeSettingsQuery,
    { $setOnInsert: { key: "store" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate(settingsPopulate);

  return ensureSettingsDefaults(settings);
};

const assertFeaturedCollectionsExist = async (ids = []) => {
  if (!ids.length) return;

  const uniqueIds = [...new Set(ids.map(String))];
  const count = await Category.countDocuments({ _id: { $in: uniqueIds } });

  if (count !== uniqueIds.length) {
    throw new AppError("One or more featured collections were not found", 404);
  }
};

const normalizeSettingsPayload = (payload) => {
  if (payload.promoBar?.active !== undefined) {
    payload.promoBarActive = payload.promoBar.active;
    delete payload.promoBar.active;
  }

  return payload;
};

export const updateStoreSettings = async (payload) => {
  normalizeSettingsPayload(payload);
  await assertFeaturedCollectionsExist(payload.featuredCollections);

  const settings = await getStoreSettings();

  if (payload.promoBar) {
    settings.promoBar = {
      ...(settings.promoBar?.toObject ? settings.promoBar.toObject() : settings.promoBar),
      ...payload.promoBar
    };
    delete payload.promoBar;
  }

  if (payload.announcement) {
    settings.announcement = {
      ...(settings.announcement?.toObject ? settings.announcement.toObject() : settings.announcement),
      ...payload.announcement
    };
    delete payload.announcement;
  }

  if (payload.socialLinks) {
    settings.socialLinks = {
      ...(settings.socialLinks?.toObject ? settings.socialLinks.toObject() : settings.socialLinks),
      ...payload.socialLinks
    };
    delete payload.socialLinks;
  }

  if (payload.sizeChart) {
    settings.sizeChart = {
      ...(settings.sizeChart?.toObject ? settings.sizeChart.toObject() : settings.sizeChart),
      ...payload.sizeChart
    };
    delete payload.sizeChart;
  }

  if (payload.shippingReturns) {
    settings.shippingReturns = {
      ...(settings.shippingReturns?.toObject ? settings.shippingReturns.toObject() : settings.shippingReturns),
      ...payload.shippingReturns
    };
    delete payload.shippingReturns;
  }

  if (payload.contactInfo) {
    settings.contactInfo = {
      ...(settings.contactInfo?.toObject ? settings.contactInfo.toObject() : settings.contactInfo),
      ...payload.contactInfo
    };
    delete payload.contactInfo;
  }

  if (payload.payments) {
    settings.payments = {
      ...(settings.payments?.toObject ? settings.payments.toObject() : settings.payments),
      paymob: {
        ...(settings.payments?.paymob?.toObject
          ? settings.payments.paymob.toObject()
          : settings.payments?.paymob),
        ...payload.payments.paymob
      }
    };
    delete payload.payments;
  }

  settings.set(payload);
  await settings.save();

  await deleteCache("analytics:*");

  return settings.populate(settingsPopulate);
};
