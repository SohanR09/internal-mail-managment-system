import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

const settingsSchema = z.object({
  sidebarCollapsed: z.boolean(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await db.getUserDashboardSettings(user.id);
    return NextResponse.json(settings ?? { userId: user.id, sidebarCollapsed: false });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    await db.updateUserDashboardSettings(user.id, parsed.data);
    return NextResponse.json(await db.getUserDashboardSettings(user.id));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
