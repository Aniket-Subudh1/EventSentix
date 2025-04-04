const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async (options) => {
  try {
    let transporter;
    
    if (!process.env.SMTP_HOST && !process.env.SMTP_USER && process.env.NODE_ENV === 'development') {
      logger.info('No SMTP configuration found. Using fake transporter in development.');
      transporter = {
        sendMail: async (msg) => {
          logger.info(`[DEV MODE] Would send email: ${JSON.stringify(msg)}`);
          return { messageId: 'dev-fake-id' };
        }
      };
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }

    const message = {
      from: `${process.env.FROM_NAME || 'Event Sentiment Monitor'} <${process.env.FROM_EMAIL || 'noreply@event-sentiment.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    const info = await transporter.sendMail(message);
    logger.info(`Email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`, { error });

    return { error: error.message, success: false };
  }
};

module.exports = sendEmail;