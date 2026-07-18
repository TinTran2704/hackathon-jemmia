import nodemailer from "nodemailer";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

let transporter = null;

if (config.smtp.configured) {
  try {
    transporter = nodemailer.createTransport(config.smtp.url);
    logger.info("SMTP mail transporter initialized successfully");
  } catch (err) {
    logger.error("Failed to initialize SMTP transporter:", err);
  }
}

export async function sendMail({ to, subject, bodyText }) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"HireKit" <noreply@hirekit.dev>',
        to,
        subject,
        text: bodyText,
      });
      return "smtp";
    } catch (err) {
      logger.error(`SMTP send failed to ${to}: ${err.message}`);
      throw err; // bubble up so caller can handle failure status
    }
  }
  return "demo";
}
