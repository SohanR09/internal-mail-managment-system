import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { db } from '@/lib/db';

const globalSettingsSchema = z.object({
  defaultFolder: z.enum(['inbox', 'sent', 'draft', 'archive', 'trash']).optional(),
  pageSize: z.number().min(10).max(100).optional(),
  refreshIntervalSeconds: z.number().min(5).max(300).optional(),
  enabledWidgets: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireRole('admin');
    const parsed = globalSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    await db.updateDashboardSettings(parsed.data);
    const updated = await db.getDashboardSettings();
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
