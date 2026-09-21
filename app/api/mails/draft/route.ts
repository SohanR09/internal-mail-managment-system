import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import type { Mail, UserMail } from '@/lib/db/types';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { bodyTooLargeResponse, tooLarge } from '@/lib/http';

const draftSchema = z.object({
  id: z.string().optional(),
  to: z.array(z.string().email()).default([]),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().max(500).default(''),
  bodyHtml: z.string().max(200_000).default(''),
  bodyText: z.string().max(200_000).default(''),
});

function responseError(error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 }); }

export async function POST(request: Request) {
  if (tooLarge(request)) return bodyTooLargeResponse();
  try {
    const user = await requireUser();
    const input = draftSchema.parse(await request.json());
    const id = input.id ?? randomUUID();
    const existing = input.id ? await db.getMailById(id) : undefined;
    if (existing && existing.senderId !== user.id) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    const now = new Date().toISOString();
    const mail: Mail = { id, threadId: existing?.threadId ?? id, parentMailId: existing?.parentMailId ?? null, senderId: user.id, to: input.to, cc: input.cc, bcc: input.bcc, subject: input.subject, bodyHtml: sanitizeHtml(input.bodyHtml), bodyText: input.bodyText, isDraft: true, sentAt: null, createdAt: existing?.createdAt ?? now };
    if (existing) await db.updateMail(id, mail);
    else await db.insertMail(mail);
    const row: UserMail = { userId: user.id, mailId: id, folder: 'draft', isRead: true, isStarred: false, isImportant: false, categoryId: null, snoozedUntil: null, deletedAt: null };
    const existingRow = (await db.getAllUserMails()).find((item) => item.userId === user.id && item.mailId === id);
    if (!existingRow) await db.insertUserMail(row);
    await db.incrementUserVersion(user.id);
    return NextResponse.json({ mail, state: existingRow ?? row });
  } catch (error) { return responseError(error); }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
