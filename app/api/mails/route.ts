import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { getSession } from '@/lib/auth/session';
import { etag, getMailData, matchesFolder, MAIL_FOLDERS, toMailItem, type MailFolder } from '@/lib/mail-api';
import type { Mail, UserMail } from '@/lib/db/types';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const rawFolder = params.get('folder') ?? 'inbox';
  const folder = MAIL_FOLDERS.includes(rawFolder as MailFolder) ? rawFolder as MailFolder : 'inbox';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') ?? '25') || 25));
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const { mails, states, users, categories } = await getMailData(session.user.id);
  const now = Date.now();
  const items = states.map((state) => { const mail = mails.find((item) => item.id === state.mailId); return mail ? toMailItem(mail, state, users, categories) : null; }).filter((item): item is ReturnType<typeof toMailItem> => item !== null).filter((item) => matchesFolder(item.state, folder, now)).filter((item) => !query || `${item.mail.subject} ${item.mail.bodyText} ${item.sender?.name ?? ''}`.toLowerCase().includes(query)).sort((a, b) => Date.parse(b.mail.sentAt ?? b.mail.createdAt) - Date.parse(a.mail.sentAt ?? a.mail.createdAt));
  const version = await db.getUserVersion(session.user.id); const tag = etag(session.user.id, version);
  if (request.headers.get('if-none-match') === tag) return new NextResponse(null, { status: 304, headers: { ETag: tag } });
  const response = NextResponse.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }); response.headers.set('ETag', tag); return response;
}

const sendSchema = z.object({ draftId: z.string().optional(), threadId: z.string().optional(), parentMailId: z.string().nullable().optional(), to: z.array(z.string().email()).default([]), cc: z.array(z.string().email()).default([]), bcc: z.array(z.string().email()).default([]), subject: z.string().max(500).default('(no subject)'), bodyHtml: z.string().max(200_000).default(''), bodyText: z.string().max(200_000).default('') });

function initials(name: string): string { return name.split(/\\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
function errorResponse(error: unknown, status = 400) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send mail' }, { status }); }

export async function POST(request: Request) {
  try {
    const sender = await requireUser();
    const input = sendSchema.parse(await request.json());
    const recipients = [...new Set([...input.to, ...input.cc, ...input.bcc])];
    if (!recipients.length) return errorResponse(new Error('At least one recipient is required'));
    const users = await db.getAllUsers();
    const recipientUsers = recipients.map((email) => users.find((user) => user.isActive && user.email.toLowerCase() === email.toLowerCase()));
    if (recipientUsers.some((user) => !user)) return errorResponse(new Error('Every recipient must be an active user'));
    const signature = (await db.getUserDashboardSettings(sender.id))?.signature?.trim() ?? '';
    const cleanBody = sanitizeHtml(input.bodyHtml);
    const bodyHtml = signature ? `${cleanBody}<p>${sanitizeHtml(signature).replace(/\\n/g, '<br>')}</p>` : cleanBody;
    const now = new Date().toISOString();
    const mail: Mail = { id: input.draftId ?? randomUUID(), threadId: input.threadId ?? (input.draftId ?? randomUUID()), parentMailId: input.parentMailId ?? null, senderId: sender.id, to: input.to, cc: input.cc, bcc: input.bcc, subject: input.subject.trim() || '(no subject)', bodyHtml, bodyText: `${input.bodyText}${signature ? `\\n\\n${signature}` : ''}`, isDraft: false, sentAt: now, createdAt: now };
    const previousDraft = input.draftId ? await db.getMailById(input.draftId) : undefined;
    if (previousDraft && previousDraft.senderId === sender.id) await db.updateMail(mail.id, mail);
    else await db.insertMail(mail);
    const allRows = await db.getAllUserMails();
    if (input.draftId) {
      const draftRow = allRows.find((row) => row.userId === sender.id && row.mailId === input.draftId && row.folder === 'draft');
      if (draftRow) await db.updateUserMail(sender.id, input.draftId, { folder: 'sent', isRead: true });
      else await db.insertUserMail({ userId: sender.id, mailId: mail.id, folder: 'sent', isRead: true, isStarred: false, isImportant: false, categoryId: null, snoozedUntil: null, deletedAt: null });
    } else await db.insertUserMail({ userId: sender.id, mailId: mail.id, folder: 'sent', isRead: true, isStarred: false, isImportant: false, categoryId: null, snoozedUntil: null, deletedAt: null });
    await db.incrementUserVersion(sender.id);
    for (const recipient of recipientUsers) {
      if (!recipient) continue;
      await db.insertUserMail({ userId: recipient.id, mailId: mail.id, folder: 'inbox', isRead: false, isStarred: false, isImportant: false, categoryId: null, snoozedUntil: null, deletedAt: null });
      await db.incrementUserVersion(recipient.id);
    }
    return NextResponse.json({ mail, sender: { name: sender.name, email: sender.email, initials: initials(sender.name) } }, { status: 201 });
  } catch (error) { return errorResponse(error, error instanceof z.ZodError ? 422 : 400); }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
