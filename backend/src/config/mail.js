module.exports = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  fromName: process.env.SMTP_FROM_NAME || 'Logidoo',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@example.com'
};

