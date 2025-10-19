import axios from 'axios';
import { getServerEnv } from './server-env';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const PHONE_NUMBER_ID = getServerEnv('WHATSAPP_PHONE_NUMBER_ID');
    const ACCESS_TOKEN = getServerEnv('WHATSAPP_ACCESS_TOKEN');
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export function extractVerificationCode(message: string): string | null {
  // Extract 6-character code that contains BOTH letters AND numbers
  // This prevents matching plain words like "PLEASE" or "VERIFY"
  // Matches: AB1234, I92HO8, A1B2C3 etc.
  // Ignores: PLEASE, VERIFY, 123456, ABCDEF
  
  // Find all 6-character alphanumeric sequences (case insensitive)
  const matches = message.match(/\b([A-Z0-9]{6})\b/gi);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // Find the first match that has both letters and numbers
  for (const match of matches) {
    const hasLetter = /[A-Z]/i.test(match);
    const hasNumber = /[0-9]/.test(match);
    
    if (hasLetter && hasNumber) {
      return match.toUpperCase();
    }
  }
  
  return null;
}

