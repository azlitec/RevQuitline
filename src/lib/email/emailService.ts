// Simple email service for development - in production, integrate with SendGrid, Mailgun, etc.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // In development, just log the email
  console.log('Email sent:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML:', html);
  
  // In production, you would integrate with a real email service
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to,
    from: 'noreply@quitline.com',
    subject,
    html,
  };
  
  await sgMail.send(msg);
  */
}