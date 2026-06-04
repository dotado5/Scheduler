import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const hostName = process.env.HOST_NAME || "Scheduler";
  const hostEmail = process.env.HOST_EMAIL || process.env.SMTP_USER;

  if (!hostEmail) {
    throw new Error("Missing HOST_EMAIL or SMTP_USER in environment variables.");
  }

  await transporter.sendMail({
    from: `"${hostName}" <${hostEmail}>`,
    to,
    subject,
    html,
  });
}
