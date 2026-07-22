import { env } from "../config/env.js";

const hasWhatsappConfig = () =>
  Boolean(
    env.WHATSAPP_BASE_URL &&
    env.WHATSAPP_API_VERSION &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_ACCESS_TOKEN
  );

const buildMessagesUrl = () =>
  `${env.WHATSAPP_BASE_URL.replace(/\/+$/, "")}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// WhatsApp Cloud API expects phone numbers in E.164 format WITHOUT the leading "+".
const normalizePhone = (phone) => {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("+")) {
    return digits.slice(1);
  }

  // Local number starting with a trunk "0" -> prefix the default country code.
  if (digits.startsWith("0") && env.WHATSAPP_DEFAULT_COUNTRY_CODE) {
    return `${env.WHATSAPP_DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return digits;
};

export const verifyWhatsappConnection = async () => {
  if (!hasWhatsappConfig()) {
    console.log("[whatsapp] WhatsApp configuration is missing");
    return false;
  }

  try {
    const url = `${env.WHATSAPP_BASE_URL.replace(/\/+$/, "")}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[whatsapp] Verification failed:", response.status, body);
      return false;
    }

    console.log("[whatsapp] WhatsApp connection is ready");
    return true;
  } catch (error) {
    console.error("[whatsapp] Verification failed:", error);
    return false;
  }
};

export const sendWhatsapp = async ({ to, text }) => {
  if (!hasWhatsappConfig()) {
    console.log(
      `[whatsapp:dev] Message skipped because WhatsApp configuration is missing. to=${to}`
    );

    return {
      skipped: true,
      reason: "WhatsApp configuration is missing",
    };
  }

  const recipient = normalizePhone(to);

  if (!recipient) {
    console.log(`[whatsapp] Message skipped because recipient phone is missing. to=${to}`);

    return {
      skipped: true,
      reason: "Recipient phone is missing",
    };
  }

  try {
    const response = await fetch(buildMessagesUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[whatsapp] Sending failed:", response.status, data);
      throw new Error(
        `WhatsApp send failed (${response.status}): ${data?.error?.message || "unknown error"}`
      );
    }

    const messageId = data?.messages?.[0]?.id;
    console.log("[whatsapp] Message sent:", messageId);

    return data;
  } catch (error) {
    console.error("[whatsapp] Sending failed:", error);
    throw error;
  }
};

export const sendOtpWhatsapp = (user, otpCode) => {
  if (!user?.phone) {
    return null;
  }

  return sendWhatsapp({
    to: user.phone,
    text: `Your ROMZ verification code is ${otpCode}. It expires in 10 minutes.`,
  });
};

export const sendPasswordResetWhatsapp = (user, resetToken) => {
  if (!user?.phone) {
    return null;
  }

  return sendWhatsapp({
    to: user.phone,
    text: `Use this token to reset your ROMZ password: ${resetToken}. It expires in 15 minutes.`,
  });
};

export const sendOrderConfirmationWhatsapp = (order) => {
  if (!order.customer?.phone) {
    return null;
  }

  return sendWhatsapp({
    to: order.customer.phone,
    text: `Your ROMZ order ${order.orderNumber} was received. Total: EGP ${order.total}.`,
  });
};

export const sendOrderStatusWhatsapp = (order) => {
  // Customers are notified only when the order ships — no confirmation/delivered/cancelled messages.
  if (order.status !== "shipped") {
    return null;
  }

  if (!order.customer?.phone) {
    return null;
  }

  return sendWhatsapp({
    to: order.customer.phone,
    text: `Your ROMZ order ${order.orderNumber} status is now ${order.status}.`,
  });
};

export const sendContactMessageWhatsapp = (message) => {
  const to = env.CONTACT_WHATSAPP || env.ADMIN_PHONE;

  if (!to) {
    return null;
  }

  return sendWhatsapp({
    to,
    text: [
      "New ROMZ contact message",
      `Name: ${message.name}`,
      `Email: ${message.email}`,
      `Phone: ${message.phone || "-"}`,
      `Subject: ${message.subject}`,
      "",
      message.message,
    ].join("\n"),
  });
};
