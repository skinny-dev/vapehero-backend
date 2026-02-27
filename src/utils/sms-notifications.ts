/**
 * TODO: SMS Notifications Service
 * 
 * این فایل برای ارسال SMS notifications آماده شده است اما در این فاز اجرا نمی‌شود.
 * 
 * برای فعال‌سازی:
 * 1. یک سرویس SMS (مثل کاوه نگار، ملی‌پیامک، فراپیامک) انتخاب کنید
 * 2. API Key و credentials را در .env اضافه کنید
 * 3. این فایل را import کنید و در routes استفاده کنید
 * 
 * مثال استفاده:
 * 
 * import { sendSMSNotification } from '../utils/sms-notifications.js';
 * 
 * // در route ثبت‌نام کاربر
 * await sendSMSNotification('user_registration', {
 *   adminPhone: '09990000000',
 *   userName: user.name,
 *   userPhone: user.phone
 * });
 * 
 * // در route ایجاد سفارش
 * await sendSMSNotification('new_order', {
 *   adminPhone: '09990000000',
 *   orderId: order.id,
 *   amount: order.final_amount,
 *   customerPhone: user.phone
 * });
 */

interface SMSNotificationData {
  adminPhone?: string;
  userPhone?: string;
  userName?: string;
  orderId?: string;
  amount?: string;
  trackingCode?: string;
}

export const sendSMSNotification = async (
  type: 'user_registration' | 'new_order' | 'order_shipped' | 'payment_confirmed',
  data: SMSNotificationData
): Promise<void> => {
  // TODO: Implement SMS sending logic
  // This is a placeholder that will be implemented in a later phase
  
  console.log(`[SMS TODO] Would send ${type} notification:`, data);
  
  // Example implementation structure:
  /*
  const SMS_API_URL = process.env.SMS_API_URL;
  const SMS_API_KEY = process.env.SMS_API_KEY;
  
  let message = '';
  let recipient = '';
  
  switch (type) {
    case 'user_registration':
      recipient = data.adminPhone || '';
      message = `مدیر عزیز،\nدرخواست همکاری جدید از طرف ${data.userName} با شماره ${data.userPhone} ثبت شد.\nvapehero.ir`;
      break;
    case 'new_order':
      recipient = data.adminPhone || '';
      message = `مدیر عزیز،\nسفارش جدید #${data.orderId} به مبلغ ${data.amount} تومان ثبت شد.`;
      break;
    case 'order_shipped':
      recipient = data.userPhone || '';
      message = `سفارش #${data.orderId} ارسال شد.\nکد رهگیری: ${data.trackingCode}\nvapehero.ir/track`;
      break;
    case 'payment_confirmed':
      recipient = data.userPhone || '';
      message = `همکار گرامی،\nپرداخت سفارش #${data.orderId} تایید شد. کالاها در حال بسته‌بندی هستند.`;
      break;
  }
  
  // Call SMS API
  await fetch(SMS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SMS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: recipient,
      message: message
    })
  });
  */
};


