import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100), action: z.enum(['read', 'unread', 'star', 'unstar', 'important', 'spam', 'not-spam', 'archive', 'trash', 'restore', 'category', 'snooze']), value: z.unknown().optional() });

export async function PATCH(request: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 });
  const { ids, action, value } = parsed.data;
  const rows = (await db.getAllUserMails()).filter((row) => row.userId === user.id && ids.includes(row.mailId));
  if (rows.length !== ids.length) return NextResponse.json({ error: 'One or more mails were not found' }, { status: 404 });
  for (const row of rows) {
    const updates: Record<string, unknown> = action === 'read' ? { isRead: true } : action === 'unread' ? { isRead: false } : action === 'star' ? { isStarred: true } : action === 'unstar' ? { isStarred: false } : action === 'important' ? { isImportant: true } : action === 'spam' ? { folder: 'spam', snoozedUntil: null } : action === 'not-spam' ? { folder: 'inbox' } : action === 'archive' ? { folder: 'archive', snoozedUntil: null } : action === 'trash' ? { folder: 'trash', deletedAt: new Date().toISOString(), snoozedUntil: null } : action === 'restore' ? { folder: 'inbox', deletedAt: null } : action === 'category' ? { categoryId: typeof value === 'string' ? value : null } : { snoozedUntil: typeof value === 'string' ? value : null, folder: 'inbox' };
    await db.updateUserMail(user.id, row.mailId, updates);
  }
  await db.incrementUserVersion(user.id);
  return NextResponse.json({ updated: ids });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
