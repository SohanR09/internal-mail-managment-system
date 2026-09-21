import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { signToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { rateLimiters } from '@/lib/redis';

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    department: z.string().min(1, 'Department is required').max(100),
    jobTitle: z.string().min(1, 'Job title is required').max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, password, department, jobTitle } = signupSchema.parse(body);
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const identifier = forwardedFor || request.headers.get('x-real-ip') || 'unknown-ip';
    const limit = await rateLimiters.loginLimit(`signup:${identifier}`);
    const rateHeaders = { 'Retry-After': String(Math.max(1, limit.resetAfter)), 'RateLimit-Limit': '5', 'RateLimit-Remaining': String(Math.max(0, limit.remaining)), 'RateLimit-Reset': String(Math.max(1, limit.resetAfter)) };
    if (!limit.success) return NextResponse.json({ error: 'Too many signup attempts', retryAfter: limit.resetAfter }, { status: 429, headers: rateHeaders });

    const email = `${username}@northstar.co`;

    // Check if email already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${randomUUID()}`;
    const now = new Date().toISOString();

    await db.insertUser({
      id: userId,
      name,
      email,
      passwordHash,
      jobTitle,
      department,
      avatar: null,
      isActive: true,
      createdAt: now,
    });

    // Get employee role
    const roles = await db.getAllRoles();
    const employeeRole = roles.find((r) => r.name === 'employee');

    if (!employeeRole) {
      return NextResponse.json(
        { error: 'Employee role not found' },
        { status: 500 }
      );
    }

    // Assign employee role
    await db.insertUserRole({
      userId,
      roleId: employeeRole.id,
    });

    // Get dashboard defaults
    const dashboardDefaults = await db.getDashboardSettings();

    // Create user dashboard settings
    await db.insertUserDashboardSettings({
      userId,
      theme: 'light',
      density: 'comfortable',
      defaultFolder: dashboardDefaults?.defaultFolder || 'inbox',
      sidebarCollapsed: false,
      rowsPerPage: dashboardDefaults?.pageSize || 25,
      refreshIntervalSeconds: dashboardDefaults?.refreshIntervalSeconds || 15,
      notificationsEnabled: true,
      signature: '',
      widgets: dashboardDefaults?.enabledWidgets || [],
    });

    // Generate token
    const token = await signToken({
      userId,
      email,
    });

    // Set cookie
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: isProduction ? 'lax' : 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Auth signup error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
