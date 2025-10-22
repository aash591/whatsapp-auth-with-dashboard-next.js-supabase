import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { 
  createSecureErrorResponse, 
  handleDatabaseError,
  createGenericErrorResponse
} from '@/lib/security/error-handling';

export async function GET(request: NextRequest) {
  try {
    // Get phone number from cookie
    const verificationPhone = request.cookies.get('verification_phone')?.value;
    
    if (!verificationPhone) {
      return createSecureErrorResponse('SESSION_REQUIRED', 401, {
        operation: 'verification-status',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Look up latest verification code for this phone number
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .select('code, name, whatsapp_number, verified, expires_at')
      .eq('whatsapp_number', verificationPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return handleDatabaseError(error, 'verification-status', {
        operation: 'verification-status',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if code has expired
    const isExpired = new Date(data.expires_at) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        code: data.code,
        name: data.name,
        phone: data.whatsapp_number,
        verified: data.verified,
        expired: isExpired,
      }
    });
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'verification-status',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}



















