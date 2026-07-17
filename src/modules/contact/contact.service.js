import ContactMessage from "../../models/ContactMessage.model.js";
import { sendContactMessageEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination, buildSort } from "../../utils/apiFeatures.js";

const applyStatusTimestamps = (message, nextStatus) => {
  if (nextStatus === "read" && !message.readAt) {
    message.readAt = new Date();
  }

  if (nextStatus === "replied" && !message.repliedAt) {
    message.repliedAt = new Date();
  }

  if (nextStatus === "new") {
    message.readAt = null;
    message.repliedAt = null;
  }
};

export const createContactMessage = async (payload, { user = null, req = null } = {}) => {
  const message = await ContactMessage.create({
    ...payload,
    source: payload.source || "storefront",
    user: user?._id || null,
    ipAddress: req?.ip || "",
    userAgent: req?.get?.("user-agent") || ""
  });

  try {
    await sendContactMessageEmail(message);
  } catch (error) {
    console.error("[contact] Notification email failed:", error);
  }

  return message;
};

export const listContactMessages = async (query) => {
  const pagination = buildPagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.email) {
    filter.email = String(query.email).trim().toLowerCase();
  }

  if (query.search) {
    const search = String(query.search).trim();
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } }
    ];
  }

  const sort = buildSort(query, "-createdAt");

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("user", "name email phone")
      .lean(),
    ContactMessage.countDocuments(filter)
  ]);

  return {
    messages,
    meta: buildMeta({ ...pagination, total })
  };
};

export const getContactMessageById = async (id) => {
  const message = await ContactMessage.findById(id).populate("user", "name email phone");

  if (!message) {
    throw new AppError("Contact message not found", 404);
  }

  return message;
};

export const updateContactMessage = async (id, payload) => {
  const message = await ContactMessage.findById(id);

  if (!message) {
    throw new AppError("Contact message not found", 404);
  }

  if (payload.status) {
    applyStatusTimestamps(message, payload.status);
    message.status = payload.status;
  }

  if (payload.adminNotes !== undefined) {
    message.adminNotes = payload.adminNotes;
  }

  await message.save();

  return message;
};

export const deleteContactMessage = async (id) => {
  const message = await ContactMessage.findByIdAndDelete(id);

  if (!message) {
    throw new AppError("Contact message not found", 404);
  }
};
