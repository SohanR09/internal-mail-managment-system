import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  density: z.enum(['compact', 'comfortable']).optional(),
  defaultFolder: z.enum(['inbox', 'sent', 'draft', 'archive', 'trash']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  rowsPerPage: z.number().min(10).max(100).optional(),
  refreshIntervalSeconds: z.number().min(5).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  signature: z.string().max(500).optional(),
  widgets: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await db.getUserDashboardSettings(user.id);
    return NextResponse.json(settings ?? {
      userId: user.id,
      theme: 'dark',
      density: 'comfortable',
      defaultFolder: 'inbox',
      sidebarCollapsed: false,
      rowsPerPage: 25,
      refreshIntervalSeconds: 15,
      notificationsEnabled: true,
      signature: '',
      widgets: ['unread_count', 'starred_messages', 'recent_conversations'],
    });
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
    const updated = await db.getUserDashboardSettings(user.id);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
