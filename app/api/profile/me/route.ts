import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

const profileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  jobTitle: z.string().trim().max(100),
  department: z.string().trim().max(100),
  avatar: z.string().refine((value) => value === '' || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value), 'Avatar must be a PNG or JPEG data URL').refine((value) => { if (!value) return true; const encoded = value.split(',')[1] ?? ''; return Math.floor(encoded.length * 3 / 4) <= 1_048_576; }, 'Avatar must be at most 1 MB'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

function publicProfile(user: Awaited<ReturnType<typeof db.getUserById>>, role: string, memberSince?: string) {
  if (!user) return null;
  return { id: user.id, name: user.name, jobTitle: user.jobTitle, department: user.department, avatar: user.avatar, email: user.email, role, memberSince: memberSince ?? user.createdAt };
}

export async function GET() {
  try {
    const session = await requireUser();
    const user = await db.getUserById(session.id);
    const role = session.roles[0] ?? 'employee';
    return NextResponse.json(publicProfile(user, role));
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();
    const body = await request.json() as unknown;
    const profile = profileSchema.parse(body);
    const user = await db.getUserById(session.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    await db.updateUser(user.id, { name: profile.name, jobTitle: profile.jobTitle, department: profile.department, avatar: profile.avatar || null });
    return NextResponse.json(publicProfile({ ...user, ...profile, avatar: profile.avatar || null }, session.roles[0] ?? 'employee'));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid profile', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Unable to update profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireUser();
    const input = passwordSchema.parse(await request.json() as unknown);
    const user = await db.getUserById(session.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    await db.updateUser(user.id, { passwordHash: await bcrypt.hash(input.newPassword, 10) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid password', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Unable to change password' }, { status: 500 });
  }
}
