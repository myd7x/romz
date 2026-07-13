import Category from "../../models/Category.model.js";
import Settings from "../../models/Settings.model.js";
import { AppError } from "../../utils/AppError.js";

const storeSettingsQuery = { key: "store" };

const settingsPopulate = [{ path: "featuredCollections", select: "name slug image parent order" }];

export const getStoreSettings = async () =>
  Settings.findOneAndUpdate(
    storeSettingsQuery,
    { $setOnInsert: { key: "store" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate(settingsPopulate);

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

  settings.set(payload);
  await settings.save();

  return settings.populate(settingsPopulate);
};
