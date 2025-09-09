const nodemailer = require('nodemailer');
const mailConfig = require('../config/mail');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.auth.user ? { user: mailConfig.auth.user, pass: mailConfig.auth.pass } : undefined
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();

  const from = `${mailConfig.fromName} <${mailConfig.fromEmail}>`;
  const info = await tx.sendMail({ from, to, subject, html, text });
  return info;
}

module.exports = { sendMail };

