import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import type { UserMail } from '@/lib/db/types';

const actions = ['read', 'unread', 'star', 'unstar', 'important', 'spam', 'not-spam', 'archive', 'trash', 'restore', 'category', 'snooze'] as const;
type Action = (typeof actions)[number];

function unauthorized(error: unknown): NextResponse {
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  let user;
  try { user = await requireUser(); } catch (error) { return unauthorized(error); }
  const { id, action: rawAction } = await context.params;
  if (!actions.includes(rawAction as Action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const action = rawAction as Action;
  const rows = await db.getAllUserMails();
  const row = rows.find((item) => item.userId === user.id && item.mailId === id);
  if (!row) return NextResponse.json({ error: 'Mail not found' }, { status: 404 });
  let updates: Partial<UserMail>;
  const body = action === 'category' || action === 'snooze' ? (await request.json().catch(() => ({}))) as { value?: unknown } : {};
  switch (action) {
    case 'read': updates = { isRead: true }; break;
    case 'unread': updates = { isRead: false }; break;
    case 'star': updates = { isStarred: true }; break;
    case 'unstar': updates = { isStarred: false }; break;
    case 'important': updates = { isImportant: true }; break;
    case 'spam': updates = { folder: 'spam', deletedAt: null, snoozedUntil: null }; break;
    case 'not-spam': updates = { folder: 'inbox' }; break;
    case 'archive': updates = { folder: 'archive', snoozedUntil: null }; break;
    case 'trash': updates = { folder: 'trash', deletedAt: new Date().toISOString(), snoozedUntil: null }; break;
    case 'restore': updates = { folder: 'inbox', deletedAt: null }; break;
    case 'category': updates = { categoryId: typeof body.value === 'string' ? body.value : null }; break;
    case 'snooze': {
      if (typeof body.value !== 'string' || Number.isNaN(Date.parse(body.value))) return NextResponse.json({ error: 'Invalid snooze time' }, { status: 400 });
      updates = { snoozedUntil: body.value, folder: row.folder === 'trash' || row.folder === 'spam' ? row.folder : 'inbox' };
      break;
    }
  }
  await db.updateUserMail(user.id, id, updates);
  await db.incrementUserVersion(user.id);
  return NextResponse.json({ ...row, ...updates });
}

export async function DELETE() { return NextResponse.json({ error: 'Use the mail delete endpoint' }, { status: 405 }); }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
