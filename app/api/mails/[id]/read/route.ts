import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(_request: NextRequest, context: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  const state = (await db.getAllUserMails()).find((item) => item.userId === session.user.id && item.mailId === id)
  if (!state) return NextResponse.json({ error: 'Mail not found' }, { status: 404 })
  if (!state.isRead) {
    await db.updateUserMail(session.user.id, id, { isRead: true })
    await db.incrementUserVersion(session.user.id)
  }
  return NextResponse.json({ ok: true })
}
