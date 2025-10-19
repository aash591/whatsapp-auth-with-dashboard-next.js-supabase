import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth-utils';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleValidationError,
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';
import { applyAPISecurityHeaders } from '@/lib/security-headers';

// PUT - Update admin user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { name, username, email, password, role } = await request.json();
    const { id } = await params;

    // Validate required fields
    if (!name || !username || !email) {
      return handleValidationError(['Name, username, and email are required'], {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if current user is super admin
    const { data: currentAdmin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', tokenData.adminId)
      .single();

    if (adminError || !currentAdmin) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (currentAdmin.role !== 'super_admin') {
      return createSecureErrorResponse('UNAUTHORIZED', 403, {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if username is already taken by another user
    const { data: existingUser } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .single();

    if (existingUser) {
      return handleValidationError(['Username is already taken'], {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if email is already taken by another user
    const { data: existingEmail } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (existingEmail) {
      return handleValidationError(['Email is already taken'], {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare update data
    const updateData: any = {
      name,
      username,
      email,
      role: role || 'admin',
      updated_at: new Date().toISOString()
    };

    // Hash new password if provided
    if (password && password.trim() !== '') {
      updateData.password_hash = await hashPassword(password);
    }

    // Update admin user
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, username, email, role, is_active, created_at, last_login')
      .single();

    if (updateError) {
      return handleDatabaseError(updateError, 'admin-users-update', {
        operation: 'admin-users-update',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Admin user updated successfully',
      data: updatedAdmin
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-users-update',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

// DELETE - Delete admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    // Check if current user is super admin
    const { data: currentAdmin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', tokenData.adminId)
      .single();

    if (adminError || !currentAdmin) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (currentAdmin.role !== 'super_admin') {
      return createSecureErrorResponse('UNAUTHORIZED', 403, {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Prevent deleting self
    if (id === tokenData.adminId) {
      return handleValidationError(['Cannot delete your own account'], {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Delete admin user
    const { error: deleteError } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return handleDatabaseError(deleteError, 'admin-users-delete', {
        operation: 'admin-users-delete',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Admin user deleted successfully'
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-users-delete',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
