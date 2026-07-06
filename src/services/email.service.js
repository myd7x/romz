import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

const hasSmtpConfig = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const getTransporter = () => {
  if (!hasSmtpConfig()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      },
      disableFileAccess: true,
      disableUrlAccess: true
    });
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`[email:dev] to=${to} subject=${subject} text=${text}`);
    return { skipped: true };
  }

  return mailer.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html
  });
};

export const sendOtpEmail = (user, otpCode) =>
  sendEmail({
    to: user.email,
    subject: "Verify your ROMZ account",
    text: `Your ROMZ verification code is ${otpCode}. It expires in 10 minutes.`,
    html: `<p>Your ROMZ verification code is <strong>${otpCode}</strong>.</p><p>It expires in 10 minutes.</p>`
  });

export const sendPasswordResetEmail = (user, resetToken) =>
  sendEmail({
    to: user.email,
    subject: "Reset your ROMZ password",
    text: `Use this token to reset your ROMZ password: ${resetToken}. It expires in 15 minutes.`,
    html: `<p>Use this token to reset your ROMZ password:</p><p><strong>${resetToken}</strong></p><p>It expires in 15 minutes.</p>`
  });

export const sendOrderConfirmationEmail = (order) => {
  if (!order.customer.email) return null;

  return sendEmail({
    to: order.customer.email,
    subject: `ROMZ order ${order.orderNumber} received`,
    text: `Your order ${order.orderNumber} was received. Total: EGP ${order.total}.`,
    html: `<p>Your order <strong>${order.orderNumber}</strong> was received.</p><p>Total: <strong>EGP ${order.total}</strong></p>`
  });
};

export const sendOrderStatusEmail = (order) => {
  if (!order.customer.email) return null;

  return sendEmail({
    to: order.customer.email,
    subject: `ROMZ order ${order.orderNumber} is ${order.status}`,
    text: `Your order ${order.orderNumber} status is now ${order.status}.`,
    html: `<p>Your order <strong>${order.orderNumber}</strong> status is now <strong>${order.status}</strong>.</p>`
  });
};
