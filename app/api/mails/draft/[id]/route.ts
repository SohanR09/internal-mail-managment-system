import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { z } from 'zod';
import { bodyTooLargeResponse, tooLarge } from '@/lib/http';
import sanitizeHtml from 'sanitize-html';

const draftSchema = z.object({ to: z.array(z.string().email()).default([]), cc: z.array(z.string().email()).default([]), bcc: z.array(z.string().email()).default([]), subject: z.string().max(500).default(''), bodyHtml: z.string().max(200_000).default(''), bodyText: z.string().max(200_000).default('') });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const mail = await db.getMailById(id);
    const row = (await db.getAllUserMails()).find((item) => item.userId === user.id && item.mailId === id && item.folder === 'draft');
    if (!mail || mail.senderId !== user.id || !row) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    const input = draftSchema.parse(await request.json());
    await db.updateMail(id, { ...input, bodyHtml: sanitizeHtml(input.bodyHtml) });
    await db.incrementUserVersion(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save draft' }, { status: 400 }); }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
