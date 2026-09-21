import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { etag, getMailData, MAIL_FOLDERS, matchesFolder, toMailItem, type MailFolder } from '@/lib/mail-api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const rawFolder = params.get('folder') ?? 'inbox';
  const folder: MailFolder = MAIL_FOLDERS.includes(rawFolder as MailFolder) ? rawFolder as MailFolder : 'inbox';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get('pageSize') ?? '25', 10) || 25));
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const unread = params.get('unread') === 'true';
  const starred = params.get('starred') === 'true';
  const category = params.get('category');
  const sender = (params.get('sender') ?? '').toLowerCase();
  const from = params.get('from');
  const to = params.get('to');
  const { mails, states, users, categories } = await getMailData(session.user.id);
  const stateByMail = new Map(states.map((state) => [state.mailId, state]));
  const now = Date.now();

  const filtered = mails.filter((mail) => {
    const state = stateByMail.get(mail.id);
    if (!state || !matchesFolder(state, folder, now)) return false;
    const mailSender = users.find((user) => user.id === mail.senderId);
    const haystack = `${mail.subject} ${mail.bodyText} ${mailSender?.name ?? ''}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (unread && state.isRead) return false;
    if (starred && !state.isStarred) return false;
    if (category && state.categoryId !== category) return false;
    if (sender && mail.senderId !== sender && mailSender?.email.toLowerCase() !== sender && !mailSender?.name.toLowerCase().includes(sender)) return false;
    if (from && (!mail.sentAt || mail.sentAt < from)) return false;
    if (to && (!mail.sentAt || mail.sentAt > to)) return false;
    return true;
  }).sort((a, b) => {
    const aTime = Date.parse(a.sentAt ?? a.createdAt);
    const bTime = Date.parse(b.sentAt ?? b.createdAt);
    return sort === 'oldest' ? aTime - bTime : bTime - aTime;
  });

  const version = await db.getUserVersion(session.user.id);
  const response = NextResponse.json({
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map((mail) => toMailItem(mail, stateByMail.get(mail.id)!, users, categories)),
    total: filtered.length,
    page,
    pageSize,
  });
  response.headers.set('ETag', etag(session.user.id, version));
  if (request.headers.get('if-none-match') === etag(session.user.id, version)) return new NextResponse(null, { status: 304, headers: { ETag: etag(session.user.id, version) } });
  return response;
}
