import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { etag, getMailData, MAIL_FOLDERS, matchesFolder, type MailFolder } from '@/lib/mail-api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { states } = await getMailData(session.user.id);
  const now = Date.now();
  const counts: Record<string, number> = {};
  for (const folder of MAIL_FOLDERS) {
    counts[folder] = states.filter((state) => matchesFolder(state, folder as MailFolder, now)).length;
  }
  counts.inbox = states.filter((state) => matchesFolder(state, 'inbox', now) && !state.isRead).length;
  counts.drafts = states.filter((state) => state.folder === 'draft').length;
  const version = await db.getUserVersion(session.user.id);
  const tag = etag(session.user.id, version);
  if (request.headers.get('if-none-match') === tag) return new NextResponse(null, { status: 304, headers: { ETag: tag } });
  const response = NextResponse.json({ counts });
  response.headers.set('ETag', tag);
  return response;
}
