import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

const hasSmtpConfig = () =>
  Boolean(
    env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.SMTP_FROM
  );

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!transporter) {
    const port = Number(env.SMTP_PORT);

    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  return transporter;
};

export const verifyEmailConnection = async () => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log("[email] SMTP configuration is missing");
    return false;
  }

  try {
    await mailer.verify();
    console.log("[email] SMTP connection is ready");
    return true;
  } catch (error) {
    console.error("[email] SMTP verification failed:", error);
    return false;
  }
};

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(
      `[email:dev] Email skipped because SMTP configuration is missing. to=${to} subject=${subject}`
    );

    return {
      skipped: true,
      reason: "SMTP configuration is missing",
    };
  }

  try {
    const result = await mailer.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });

    console.log("[email] Message sent:", result.messageId);

    return result;
  } catch (error) {
    console.error("[email] Sending failed:", error);
    throw error;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// The logo is embedded in each email as an inline (CID) attachment so it renders
// even in clients that block remote images. We fetch the image from
// EMAIL_LOGO_URL once and cache the bytes for the process lifetime.
const LOGO_CID = "romz-logo";
// logoState.status: "idle" (not fetched) | "ready" (attachment cached) | "failed"
let logoState = { status: "idle", attachment: null };

const logoFilename = () => {
  try {
    const path = new URL(env.EMAIL_LOGO_URL).pathname;
    const base = path.split("/").pop();
    return base && /\.[a-z0-9]+$/i.test(base) ? base : "logo.png";
  } catch {
    return "logo.png";
  }
};

// Returns a nodemailer attachment for the logo (inline, referenced via cid),
// or null when no logo URL is configured or the image can't be fetched.
export const ensureLogoAttachment = async () => {
  if (!env.EMAIL_LOGO_URL) return null;
  if (logoState.status === "ready") return logoState.attachment;
  if (logoState.status === "failed") return null;

  try {
    const res = await fetch(env.EMAIL_LOGO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const content = Buffer.from(await res.arrayBuffer());
    const attachment = {
      filename: logoFilename(),
      content,
      cid: LOGO_CID,
      contentType: res.headers.get("content-type") || undefined,
    };
    logoState = { status: "ready", attachment };
    return attachment;
  } catch (error) {
    console.error(
      "[email] Logo fetch failed; falling back to remote URL/wordmark:",
      error.message
    );
    logoState = { status: "failed", attachment: null };
    return null;
  }
};

// Email header: inline (cid) logo when available, else the remote logo image on a
// light band, else the ROMZ text wordmark on a dark band.
const emailHeader = (logo) => {
  const src = logo ? `cid:${logo.cid}` : env.EMAIL_LOGO_URL;
  if (src) {
    return `<tr><td style="background:#f0ebf0;padding:20px 32px;text-align:center;border-bottom:1px solid #e6e2e6;">
        <img src="${src}" alt="ROMZ" height="44" style="height:44px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
      </td></tr>`;
  }
  return `<tr><td style="background:#111111;padding:24px 32px;text-align:center;">
        <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:6px;">ROMZ</div>
      </td></tr>`;
};

// Branded email for a one-time code or token (OTP, password reset).
export const renderCodeEmail = ({ heading, intro, code, expiry, accent = "#111111", logo = null }) => {
  const value = String(code ?? "");
  const short = value.length <= 8;
  const codeStyle = short
    ? "font-size:34px;letter-spacing:10px;"
    : "font-size:18px;letter-spacing:1px;word-break:break-all;";

  return `
  <div style="background:#f4f4f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" align="center" width="600" style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;">
      ${emailHeader(logo)}

      <tr><td style="padding:32px 32px 4px 32px;">
        <h1 style="margin:0;font-size:22px;color:#111111;">${escapeHtml(heading)}</h1>
        <p style="margin:12px 0 0 0;font-size:15px;color:#555555;line-height:1.6;">${escapeHtml(intro)}</p>
      </td></tr>

      <tr><td style="padding:24px 32px 0 32px;">
        <table role="presentation" width="100%" style="background:#f7f7f8;border:1px solid #ececec;border-radius:10px;">
          <tr><td align="center" style="padding:24px 16px;">
            <div style="${codeStyle}font-weight:800;color:#111111;font-family:'Courier New',Courier,monospace;">${escapeHtml(value)}</div>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:16px 32px 0 32px;">
        <p style="margin:0;font-size:13px;color:#999999;line-height:1.6;">${escapeHtml(expiry)}</p>
      </td></tr>

      <tr><td style="padding:28px 32px 32px 32px;">
        <div style="border-top:1px solid #eeeeee;padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#999999;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </td></tr>
    </table>
  </div>`;
};

export const sendOtpEmail = async (user, otpCode) => {
  if (!user?.email) {
    return null;
  }

  const logo = await ensureLogoAttachment();

  return sendEmail({
    to: user.email,
    subject: "Verify your ROMZ account",
    text: `Your ROMZ verification code is ${otpCode}. It expires in 10 minutes.`,
    html: renderCodeEmail({
      heading: "Verify your account",
      intro: `Hi${user.name ? " " + user.name : ""}, use the code below to finish verifying your ROMZ account.`,
      code: otpCode,
      expiry: "This code expires in 10 minutes.",
      logo
    }),
    attachments: logo ? [logo] : undefined
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  if (!user?.email) {
    return null;
  }

  const logo = await ensureLogoAttachment();

  return sendEmail({
    to: user.email,
    subject: "Reset your ROMZ password",
    text: `Use this token to reset your ROMZ password: ${resetToken}. It expires in 15 minutes.`,
    html: renderCodeEmail({
      heading: "Reset your password",
      intro: "Use the code below to reset your ROMZ password.",
      code: resetToken,
      expiry: "This code expires in 15 minutes.",
      logo
    }),
    attachments: logo ? [logo] : undefined
  });
};

const money = (value) => `EGP ${Number(value || 0).toFixed(2)}`;

const formatDate = (date) => {
  try {
    return new Date(date || Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return "";
  }
};

const STATUS_COLORS = {
  pending: "#6b7280",
  confirmed: "#2563eb",
  processing: "#2563eb",
  shipped: "#d97706",
  delivered: "#16a34a",
  cancelled: "#dc2626",
  returned: "#7c3aed"
};

const renderItemsRows = (items = []) =>
  items
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:#111111;">
          ${escapeHtml(it.nameSnapshot?.en || "Item")}
          <div style="color:#999999;font-size:12px;margin-top:3px;">
            ${escapeHtml(it.sku || "")}${it.size ? " &middot; " + escapeHtml(it.size) : ""}${it.color?.name ? " &middot; " + escapeHtml(it.color.name) : ""}
          </div>
        </td>
        <td align="center" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:#666666;">${it.qty}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:#111111;white-space:nowrap;">${money(it.unitPrice * it.qty)}</td>
      </tr>`
    )
    .join("");

const totalsRow = (label, value, opts = {}) => {
  const weight = opts.bold ? "700" : "400";
  const size = opts.bold ? "16px" : "14px";
  const labelColor = opts.bold ? "#111111" : "#666666";
  const valueColor = opts.color || (opts.bold ? "#111111" : "#333333");
  return `
    <tr>
      <td style="padding:5px 0;font-size:${size};color:${labelColor};font-weight:${weight};">${label}</td>
      <td align="right" style="padding:5px 0;font-size:${size};color:${valueColor};font-weight:${weight};white-space:nowrap;">${value}</td>
    </tr>`;
};

export const renderOrderEmail = (order, { heading, intro, accent = "#111111", showTracking = false, logo = null }) => {
  const addr = order.shippingAddress || {};
  const addressLine = [addr.street, addr.apartment, addr.city, addr.governorate]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");
  const statusColor = STATUS_COLORS[order.status] || "#6b7280";
  const discountAmount = order.discount?.amount || 0;
  const vat = order.shippingVat || 0;

  const trackingBlock =
    showTracking && order.courier?.trackingNumber
      ? `
      <tr><td style="padding:8px 32px 0 32px;">
        <table role="presentation" width="100%" style="background:#fff8ef;border:1px solid #f0d9b5;border-radius:8px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:11px;color:#9a6a12;text-transform:uppercase;letter-spacing:1px;">Tracking number</div>
            <div style="font-size:20px;color:#111111;font-weight:700;margin-top:4px;letter-spacing:1px;">${escapeHtml(order.courier.trackingNumber)}</div>
            <div style="font-size:12px;color:#999999;margin-top:6px;">Carrier: Mylerz</div>
          </td></tr>
        </table>
      </td></tr>`
      : "";

  return `
  <div style="background:#f4f4f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" align="center" width="600" style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;">
      ${emailHeader(logo)}

      <tr><td style="padding:32px 32px 4px 32px;">
        <h1 style="margin:0;font-size:22px;color:#111111;">${escapeHtml(heading)}</h1>
        <p style="margin:12px 0 0 0;font-size:15px;color:#555555;line-height:1.6;">${escapeHtml(intro)}</p>
      </td></tr>

      <tr><td style="padding:20px 32px 0 32px;">
        <table role="presentation" width="100%">
          <tr>
            <td style="font-size:13px;color:#999999;">Order</td>
            <td align="right" style="font-size:13px;color:#111111;font-weight:700;">${escapeHtml(order.orderNumber)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#999999;padding-top:5px;">Date</td>
            <td align="right" style="font-size:13px;color:#555555;padding-top:5px;">${formatDate(order.createdAt)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#999999;padding-top:5px;">Status</td>
            <td align="right" style="padding-top:5px;">
              <span style="display:inline-block;background:${statusColor};color:#ffffff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px;text-transform:capitalize;">${escapeHtml(order.status)}</span>
            </td>
          </tr>
        </table>
      </td></tr>

      ${trackingBlock}

      <tr><td style="padding:24px 32px 0 32px;">
        <table role="presentation" width="100%">
          <tr>
            <td style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;border-bottom:2px solid #111111;">Item</td>
            <td align="center" style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;border-bottom:2px solid #111111;">Qty</td>
            <td align="right" style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;border-bottom:2px solid #111111;">Total</td>
          </tr>
          ${renderItemsRows(order.items)}
        </table>
      </td></tr>

      <tr><td style="padding:16px 32px 0 32px;">
        <table role="presentation" width="100%">
          ${totalsRow("Subtotal", money(order.subtotal))}
          ${discountAmount > 0 ? totalsRow(`Discount${order.discount?.couponCode ? " (" + escapeHtml(order.discount.couponCode) + ")" : ""}`, "-" + money(discountAmount), { color: "#16a34a" }) : ""}
          ${totalsRow("Shipping", money(order.shippingFee))}
          ${vat > 0 ? totalsRow("Shipping VAT", money(vat)) : ""}
          <tr><td colspan="2" style="border-top:1px solid #eeeeee;padding-top:8px;"></td></tr>
          ${totalsRow("Total", money(order.total), { bold: true })}
        </table>
      </td></tr>

      ${
        addressLine
          ? `<tr><td style="padding:24px 32px 0 32px;">
        <div style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Shipping to</div>
        <div style="font-size:14px;color:#333333;margin-top:6px;line-height:1.5;">${escapeHtml(order.customer?.name || "")}<br>${addressLine}<br>${escapeHtml(order.customer?.phone || "")}</div>
      </td></tr>`
          : ""
      }

      <tr><td style="padding:32px;">
        <div style="border-top:1px solid #eeeeee;padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#999999;line-height:1.6;">Thank you for shopping with ROMZ.<br>Questions? Just reply to this email and we'll help.</p>
        </div>
      </td></tr>
    </table>
  </div>`;
};

export const sendOrderConfirmationEmail = async (order) => {
  if (!order.customer?.email) {
    return null;
  }

  const logo = await ensureLogoAttachment();

  return sendEmail({
    to: order.customer.email,
    subject: `ROMZ order ${order.orderNumber} received`,
    text: `Hi ${order.customer?.name || ""}, we've received your order ${order.orderNumber}. Total: ${money(order.total)}. We'll notify you when it ships.`,
    html: renderOrderEmail(order, {
      heading: `Thank you${order.customer?.name ? ", " + order.customer.name : ""}!`,
      intro:
        "We've received your order and it's now being prepared. We'll send you another message as soon as it ships.",
      logo
    }),
    attachments: logo ? [logo] : undefined
  });
};

export const sendOrderStatusEmail = async (order) => {
  // Customers are emailed only when the order ships — no confirmation/delivered/cancelled emails.
  if (order.status !== "shipped") {
    return null;
  }

  if (!order.customer?.email) {
    return null;
  }

  const logo = await ensureLogoAttachment();

  return sendEmail({
    to: order.customer.email,
    subject: `Your ROMZ order ${order.orderNumber} has shipped`,
    text: `Good news! Your order ${order.orderNumber} has shipped.${order.courier?.trackingNumber ? " Tracking number: " + order.courier.trackingNumber + "." : ""}`,
    html: renderOrderEmail(order, {
      heading: "Your order is on its way!",
      intro: "Great news — your order has been shipped and is on its way to you.",
      showTracking: true,
      logo
    }),
    attachments: logo ? [logo] : undefined
  });
};

export const sendContactMessageEmail = (message) =>
  sendEmail({
    to: env.CONTACT_EMAIL || env.ADMIN_EMAIL,
    subject: `ROMZ contact form: ${message.subject}`,
    text: [
      `Name: ${message.name}`,
      `Email: ${message.email}`,
      `Phone: ${message.phone || "-"}`,
      `Subject: ${message.subject}`,
      "",
      message.message
    ].join("\n"),
    html: `
      <p><strong>New ROMZ contact message</strong></p>
      <p><strong>Name:</strong> ${escapeHtml(message.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(message.phone || "-")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message.message).replaceAll("\n", "<br>")}</p>
    `,
  });
