// SMS Gateway integration - Kavenegar
// Documentation: https://kavenegar.com/rest.html

const DEV_OTP_CODE = '55555';

export const sendOTP = async (phone, code) => {
  try {
    // Development mode: bypass provider and print OTP for local testing.
    if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
      if (code === DEV_OTP_CODE) {
        console.log(`✅ Dev OTP code active for ${phone}: ${code}`);
        return true;
      }
      console.log(`📱 [DEV MODE] OTP for ${phone}: ${code}`);
      console.log(`💡 In development, you can use dev OTP code: ${DEV_OTP_CODE}`);
      return true;
    }

    // Production mode: Send real SMS via Kavenegar
    const apiKey = process.env.KAVENEGAR_API_KEY;
    const template = process.env.KAVENEGAR_OTP_TEMPLATE || 'vapehero-otp'; // Your template name in Kavenegar
    
    if (!apiKey) {
      console.error('❌ KAVENEGAR_API_KEY is not set');
      throw new Error('SMS API key is not configured');
    }

    // Kavenegar API endpoint
    const apiUrl = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
    
    // Remove leading 0 from phone number if present (Kavenegar format: 9123456789)
    const cleanPhone = phone.replace(/^0/, '');
    
    const params = new URLSearchParams({
      receptor: cleanPhone,
      token: code,
      template: template
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || data.return?.status !== 200) {
      console.error('Kavenegar API Error:', data);
      throw new Error(data.return?.message || 'SMS sending failed');
    }

    console.log(`✅ OTP sent successfully to ${phone} via Kavenegar`);
    return true;
  } catch (error) {
    console.error('SMS Error:', error);
    
    // In development, don't throw error, just log
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] OTP for ${phone}: ${code}`);
      return true;
    }
    
    throw error;
  }
};

export const sendNotification = async (phone, message) => {
  try {
    // Development mode: Skip sending
    if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
      console.log(`📱 [DEV MODE] Notification for ${phone}: ${message}`);
      return true;
    }

    // Production mode: Send via Kavenegar
    const apiKey = process.env.KAVENEGAR_API_KEY;
    
    if (!apiKey) {
      console.error('❌ KAVENEGAR_API_KEY is not set');
      return false;
    }

    // Remove leading 0 from phone number
    const cleanPhone = phone.replace(/^0/, '');
    
    // Kavenegar simple SMS endpoint
    const apiUrl = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
    
    const params = new URLSearchParams({
      receptor: cleanPhone,
      sender: process.env.KAVENEGAR_SENDER || '10004346', // Your Kavenegar sender number
      message: message
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || data.return?.status !== 200) {
      console.error('Kavenegar Notification Error:', data);
      return false;
    }

    console.log(`✅ Notification sent to ${phone} via Kavenegar`);
    return true;
  } catch (error) {
    console.error('SMS Notification Error:', error);
    return false;
  }
};


