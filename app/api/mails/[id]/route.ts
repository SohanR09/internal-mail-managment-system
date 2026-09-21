import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { etag, getMailData, toMailItem } from '@/lib/mail-api';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const { mails, states, users, categories } = await getMailData(session.user.id);
  const state = states.find((item) => item.mailId === id);
  const mail = mails.find((item) => item.id === id);
  if (!mail || !state) return NextResponse.json({ error: 'Mail not found' }, { status: 404 });
  const thread = mails.filter((item) => item.threadId === mail.threadId && states.some((itemState) => itemState.mailId === item.id)).sort((a, b) => Date.parse(a.sentAt ?? a.createdAt) - Date.parse(b.sentAt ?? b.createdAt));
  const version = await db.getUserVersion(session.user.id);
  const tag = etag(session.user.id, version);
  if (request.headers.get('if-none-match') === tag) return new NextResponse(null, { status: 304, headers: { ETag: tag } });
  const response = NextResponse.json({ mail: toMailItem(mail, state, users, categories), thread: thread.map((item) => toMailItem(item, states.find((itemState) => itemState.mailId === item.id)!, users, categories)) });
  response.headers.set('ETag', tag);
  return response;
}
