import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const usernameSchema = z.string().regex(/^[a-z0-9_-]{3,50}$/)

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('u') ?? ''
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) return NextResponse.json({ available: false, error: 'Invalid username' }, { status: 400 })
  const user = await db.getUserByEmail(`${parsed.data}@northstar.co`)
  return NextResponse.json({ available: !user })
}
