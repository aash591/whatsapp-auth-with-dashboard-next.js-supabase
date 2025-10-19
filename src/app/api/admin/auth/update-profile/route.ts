import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import { comparePassword, hashPassword } from '@/lib/auth-utils';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleValidationError,
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';
import { applyAPISecurityHeaders } from '@/lib/security-headers';

export async function POST(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-update-profile',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-update-profile',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { name, username, email, currentPassword, newPassword } = await request.json();

    // Validate required fields
    if (!name || !username || !email) {
      return handleValidationError(['Name, username, and email are required'], {
        operation: 'admin-update-profile',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get current admin user
    const { data: currentAdmin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, name, username, email, password_hash')
      .eq('id', tokenData.adminId)
      .single();

    if (adminError || !currentAdmin) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-update-profile',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // If password change is requested, verify current password
    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        return handleValidationError(['Current password is required to change password'], {
          operation: 'admin-update-profile',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      const isCurrentPasswordValid = await comparePassword(currentPassword, currentAdmin.password_hash);
      if (!isCurrentPasswordValid) {
        return createSecureErrorResponse('AUTH_INVALID', 401, {
          operation: 'admin-update-profile',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check if username is already taken by another user
    if (username !== currentAdmin.username) {
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .neq('id', tokenData.adminId)
        .single();

      if (existingUser) {
        return handleValidationError(['Username is already taken'], {
          operation: 'admin-update-profile',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check if email is already taken by another user
    if (email !== currentAdmin.email) {
      const { data: existingEmail, error: emailError } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .neq('id', tokenData.adminId)
        .single();

      if (existingEmail) {
        return handleValidationError(['Email is already taken'], {
          operation: 'admin-update-profile',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      username,
      email,
      updated_at: new Date().toISOString()
    };

    // Hash new password if provided
    if (newPassword && newPassword.trim() !== '') {
      updateData.password_hash = await hashPassword(newPassword);
    }

    // Update admin user
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update(updateData)
      .eq('id', tokenData.adminId)
      .select('id, name, username, email, role, is_active, last_login')
      .single();

    if (updateError) {
      return handleDatabaseError(updateError, 'admin-update-profile', {
        operation: 'admin-update-profile',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-update-profile',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
