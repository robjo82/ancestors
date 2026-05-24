import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: MailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || "Ancestors <no-reply@robin-joseph.fr>";

  if (!host || !user || !pass) {
    // Falls back to logging if SMTP is not configured
    console.log(`\n======================================================`);
    console.log(`[SIMULATED EMAIL SENDER] (No SMTP credentials configured)`);
    console.log(`De: ${from}`);
    console.log(`A: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log(`--------------------- CONTENU ------------------------`);
    // Simple regex strip for HTML tags to present a clean text version in terminal logs
    const textContent = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    console.log(textContent);
    console.log(`======================================================\n`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL DISPATCHED] Successfully sent email to ${to} via SMTP (${host})`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to} via SMTP:`, error);
    return false;
  }
}
