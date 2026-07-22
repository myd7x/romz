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

export const sendEmail = async ({ to, subject, text, html }) => {
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

export const sendOtpEmail = (user, otpCode) =>
  sendEmail({
    to: user.email,
    subject: "Verify your ROMZ account",
    text: `Your ROMZ verification code is ${otpCode}. It expires in 10 minutes.`,
    html: `
      <p>Your ROMZ verification code is:</p>
      <h2>${otpCode}</h2>
      <p>It expires in 10 minutes.</p>
    `,
  });

export const sendPasswordResetEmail = (user, resetToken) =>
  sendEmail({
    to: user.email,
    subject: "Reset your ROMZ password",
    text: `Use this token to reset your ROMZ password: ${resetToken}. It expires in 15 minutes.`,
    html: `
      <p>Use this token to reset your ROMZ password:</p>
      <p><strong>${resetToken}</strong></p>
      <p>It expires in 15 minutes.</p>
    `,
  });

export const sendOrderConfirmationEmail = (order) => {
  if (!order.customer?.email) {
    return null;
  }

  return sendEmail({
    to: order.customer.email,
    subject: `ROMZ order ${order.orderNumber} received`,
    text: `Your order ${order.orderNumber} was received. Total: EGP ${order.total}.`,
    html: `
      <p>Your order <strong>${order.orderNumber}</strong> was received.</p>
      <p>Total: <strong>EGP ${order.total}</strong></p>
    `,
  });
};

export const sendOrderStatusEmail = (order) => {
  // Customers are emailed only when the order ships — no confirmation/delivered/cancelled emails.
  if (order.status !== "shipped") {
    return null;
  }

  if (!order.customer?.email) {
    return null;
  }

  return sendEmail({
    to: order.customer.email,
    subject: `ROMZ order ${order.orderNumber} is ${order.status}`,
    text: `Your order ${order.orderNumber} status is now ${order.status}.`,
    html: `
      <p>
        Your order <strong>${order.orderNumber}</strong>
        status is now <strong>${order.status}</strong>.
      </p>
    `,
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
