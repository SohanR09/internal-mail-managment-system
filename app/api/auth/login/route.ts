import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { rateLimiters } from '@/lib/redis';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const identifier = forwardedFor || request.headers.get('x-real-ip') || 'unknown-ip';
    const limit = await rateLimiters.loginLimit(identifier);
    const rateHeaders = { 'Retry-After': String(Math.max(1, limit.resetAfter)), 'RateLimit-Limit': '5', 'RateLimit-Remaining': String(Math.max(0, limit.remaining)), 'RateLimit-Reset': String(Math.max(1, limit.resetAfter)) };
    if (!limit.success) return NextResponse.json({ error: 'Too many login attempts', retryAfter: limit.resetAfter }, { status: 429, headers: rateHeaders });

    const user = await db.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
    });

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: isProduction ? 'lax' : 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
