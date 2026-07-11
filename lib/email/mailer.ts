import nodemailer from "nodemailer";

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  const host = process.env.EMAIL_HOST;
  const service = process.env.EMAIL_SERVICE;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if ((!host && !service) || !user || !pass || !process.env.EMAIL_FROM) {
    throw new Error("Email delivery is not configured.");
  }
  const transporter = nodemailer.createTransport(service ? { service, auth: { user, pass } } : { host, port: Number(process.env.EMAIL_PORT ?? 587), secure: process.env.EMAIL_SECURE === "true", auth: { user, pass } });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, ...input });
}
