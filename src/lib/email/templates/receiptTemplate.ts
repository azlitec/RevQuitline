interface ReceiptTemplateProps {
  userName: string;
  receiptNumber: string;
  serviceType: string;
  serviceName: string;
  formattedDate: string;
  amount: number;
  gateway: string;
  paymentId: string;
}

/**
 * Generate HTML template for receipt emails
 */
export function getReceiptTemplate(props: ReceiptTemplateProps): string {
  const {
    userName,
    receiptNumber,
    serviceType,
    serviceName,
    formattedDate,
    amount,
    gateway,
    paymentId
  } = props;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quitline Receipt</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background: linear-gradient(to right, #38b6ff, #7e43f1);
          color: white;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0 0;
          opacity: 0.9;
        }
        .content {
          background-color: #fff;
          padding: 30px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .receipt-info {
          margin-bottom: 20px;
        }
        .receipt-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .receipt-info td {
          padding: 8px 0;
        }
        .receipt-info td:first-child {
          font-weight: bold;
          width: 40%;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .invoice-table th {
          background-color: #f8f9fa;
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .invoice-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .invoice-table .total-row td {
          border-top: 2px solid #ddd;
          font-weight: bold;
          background-color: #f0f9ff;
        }
        .discount-row {
          color: #0a84ff;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #777;
          font-size: 14px;
        }
        .contact {
          margin-top: 20px;
          text-align: center;
        }
        .contact a {
          color: #7e43f1;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Quitline Receipt</h1>
          <p>Thank you for your telehealth service</p>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for your payment. Here's your receipt for the Quitline telehealth service.</p>
          
          <div class="receipt-info">
            <table>
              <tr>
                <td>Receipt Number:</td>
                <td>${receiptNumber}</td>
              </tr>
              <tr>
                <td>Date:</td>
                <td>${formattedDate}</td>
              </tr>
              <tr>
                <td>Payment Method:</td>
                <td>${gateway}</td>
              </tr>
              <tr>
                <td>Transaction ID:</td>
                <td>${paymentId}</td>
              </tr>
            </table>
          </div>
          
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Details</th>
                <th style="text-align: right;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${serviceName}</td>
                <td>${serviceType} Consultation</td>
                <td style="text-align: right;">${amount.toFixed(2)}</td>
              </tr>
               
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td style="text-align: right;">RM ${amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <p>Your telehealth consultation details are available in your Quitline patient portal. You can access your appointment history by logging into your account.</p>
          
          <div class="contact">
            <p>If you have any questions about your consultation or payment, please contact us at <a href="mailto:support@quitline.com">support@quitline.com</a></p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Quitline Telehealth Services. All rights reserved.</p>
            <p>This is an automatically generated receipt. No signature is required.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}