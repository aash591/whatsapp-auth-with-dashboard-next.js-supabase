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

// GET - Fetch all admin users
export async function GET(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-list',
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
        operation: 'admin-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (currentAdmin.role !== 'super_admin') {
      return createSecureErrorResponse('UNAUTHORIZED', 403, {
        operation: 'admin-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch all admin users
    const { data: adminUsers, error: usersError } = await supabaseAdmin
      .from('admin_users')
      .select('id, name, username, email, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });

    if (usersError) {
      return handleDatabaseError(usersError, 'admin-users-list', {
        operation: 'admin-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      data: adminUsers
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-users-list',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

// POST - Create new admin user
export async function POST(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { name, username, email, password, role } = await request.json();

    // Validate required fields
    if (!name || !username || !email || !password) {
      return handleValidationError(['Name, username, email, and password are required'], {
        operation: 'admin-users-create',
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
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (currentAdmin.role !== 'super_admin') {
      return createSecureErrorResponse('UNAUTHORIZED', 403, {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return handleValidationError(['Username already exists'], {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return handleValidationError(['Email already exists'], {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const { data: newAdmin, error: createError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        name,
        username,
        email,
        password_hash: passwordHash,
        role: role || 'admin',
        is_active: true
      })
      .select('id, name, username, email, role, is_active, created_at, last_login')
      .single();

    if (createError) {
      return handleDatabaseError(createError, 'admin-users-create', {
        operation: 'admin-users-create',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      data: newAdmin
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-users-create',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
