import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

const schema = z.object({ password: z.string().min(1), confirmation: z.literal('DELETE') });

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter your password and DELETE' }, { status: 400 });
    const target = await db.getUserById(user.id);
    if (!target || !await bcrypt.compare(parsed.data.password, target.passwordHash)) return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    const allUsers = await db.getAllUsers();
    const allRoles = await db.getAllRoles();
    const assignments = await db.getAllUserRoles();
    const adminRole = allRoles.find((role) => role.name === 'admin');
    const adminCount = adminRole ? assignments.filter((a) => a.roleId === adminRole.id && allUsers.find((u) => u.id === a.userId)?.isActive).length : 0;
    if (adminRole && assignments.some((a) => a.userId === user.id && a.roleId === adminRole.id) && adminCount <= 1) return NextResponse.json({ error: 'The last admin cannot delete their account' }, { status: 409 });
    await db.updateUser(user.id, { isActive: false, name: 'Deleted user' });
    await Promise.all([db.removeAllUserRoles(user.id), db.removeAllUserDashboardSettings(user.id), db.removeAllUserMails(user.id)]);
    const cookieStore = await cookies(); cookieStore.delete('session');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
