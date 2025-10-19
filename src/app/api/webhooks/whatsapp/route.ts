import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { extractVerificationCode, sendWhatsAppMessage } from '@/lib/whatsapp';
import { validateVerificationCode, verifyWebhookSignature, verifyWebhookSignatureDetailed } from '@/lib/security';
import { getServerEnv } from '@/lib/server-env';
import { validateWebhookSecurity, logSecurityEvent } from '@/lib/webhook-security';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleConfigError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/secure-error-handling-enhanced';

// Simple in-memory deduplication (for production, use Redis)
const processedMessages = new Map<string, number>();

// Rate limiting for WhatsApp messages
const messageRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_MINUTE = 5; // Reduced from 10 for security

// Clean up old entries every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const messageEntries = Array.from(processedMessages.entries());
  for (const [messageId, timestamp] of messageEntries) {
    if (timestamp < fiveMinutesAgo) {
      processedMessages.delete(messageId);
    }
  }
  
  // Clean up rate limit entries
  const oneMinuteAgo = Date.now() - RATE_LIMIT_WINDOW;
  const rateLimitEntries = Array.from(messageRateLimit.entries());
  for (const [phone, timestamp] of rateLimitEntries) {
    if (timestamp < oneMinuteAgo) {
      messageRateLimit.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// Webhook verification (GET request from Meta)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  
  return new NextResponse('Forbidden', { status: 403 });
}

// Handle incoming messages (POST request)
export async function POST(request: NextRequest) {
  try {
    // Step 1: Comprehensive security validation
    const securityResult = validateWebhookSecurity(request);
    
    if (!securityResult.isValid) {
      logSecurityEvent('webhook_rejected', {
        error: securityResult.error,
        metadata: securityResult.metadata
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Get request body
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // Step 3: Get app secret from server-only environment
    let appSecret: string;
    try {
      appSecret = getServerEnv('WHATSAPP_APP_SECRET');
    } catch (error) {
      return handleConfigError(error, 'webhook-whatsapp', {
        operation: 'webhook-whatsapp',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Enhanced signature validation with additional checks
    const validationResult = verifyWebhookSignatureDetailed(rawBody, signature, appSecret);
    
    if (!validationResult.isValid) {
      logSecurityEvent('invalid_signature', {
        error: validationResult.error,
        metadata: validationResult.metadata,
        securityMetadata: securityResult.metadata
      });
      
      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logSecurityEvent('webhook_accepted', {
      signatureValid: true,
      securityMetadata: securityResult.metadata,
      validationMetadata: validationResult.metadata
    });

    const body = JSON.parse(rawBody);

    // Check if this is a message event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const messageId = message.id;
        const from = message.from;
        const messageText = message.text?.body || '';

        // Check if we've already processed this message
        if (processedMessages.has(messageId)) {
          return NextResponse.json({ success: true, message: 'Duplicate ignored' });
        }
        
        // Enhanced rate limiting check with stricter limits
        const now = Date.now();
        const phoneRateLimit = messageRateLimit.get(from) || 0;
        if (phoneRateLimit > 0 && (now - phoneRateLimit) < RATE_LIMIT_WINDOW) {
          const messageCount = messageRateLimit.get(`${from}_count`) || 0;
          if (messageCount >= MAX_MESSAGES_PER_MINUTE) {
            console.log(`Rate limit exceeded for phone ${from}`);
            // Add delay to prevent rapid retries
            await new Promise(resolve => setTimeout(resolve, 2000));
            return NextResponse.json({ success: true, message: 'Rate limited' });
          }
          messageRateLimit.set(`${from}_count`, messageCount + 1);
        } else {
          messageRateLimit.set(from, now);
          messageRateLimit.set(`${from}_count`, 1);
        }
        
        // Mark message as processed
        processedMessages.set(messageId, Date.now());

        // Process message silently

        // Extract verification code from message
        const extractedCode = extractVerificationCode(messageText);

        if (extractedCode) {
          // Validate the extracted code
          let code: string;
          try {
            code = validateVerificationCode(extractedCode);
          } catch (error: any) {
            console.log(`Invalid code format: ${extractedCode}`);
            await sendWhatsAppMessage(
              from,
              `❌ Invalid code format: ${extractedCode}\n\nPlease send a valid 6-character code with both letters and numbers.`
            );
            return NextResponse.json({ success: true });
          }

          // Look up code in database (only non-expired codes)
          const supabaseAdmin = getSupabaseAdmin();
          const { data: verificationData, error: lookupError } = await supabaseAdmin
            .from('verification_codes')
            .select('*')
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .single();

          // Database lookup completed

          if (lookupError || !verificationData) {
            await sendWhatsAppMessage(
              from,
              '❌ Invalid verification code. Please check and try again.'
            );
          } else if (verificationData.verified) {
            await sendWhatsAppMessage(
              from,
              '✅ You are already verified! You can access the protected page.'
            );
          } else {
            // Valid code - mark as verified
            const { error: updateError } = await supabaseAdmin
              .from('verification_codes')
              .update({ 
                verified: true,
                verified_at: new Date().toISOString()
              })
              .eq('code', code);

            if (updateError) {
              // Log error securely without exposing details
              console.error('Error updating verification status:', sanitizeUserInput(updateError));
              await sendWhatsAppMessage(
                from,
                '❌ Error verifying your code. Please try again.'
              );
            } else {
              await sendWhatsAppMessage(
                from,
                `✅ Verification successful!\n\nWelcome, ${sanitizeUserInput(verificationData.name)}! You can now access the protected page.`
              );
            }
          }
        } else {
          // Don't respond to messages that don't contain verification codes
          // This prevents spam and unnecessary responses
          console.log(`No verification code found in message from ${sanitizeUserInput(from)}: "${sanitizeUserInput(messageText)}"`);
          // Silently ignore the message
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'webhook-whatsapp',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

