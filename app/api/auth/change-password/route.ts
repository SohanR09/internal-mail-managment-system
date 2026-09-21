import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8), confirmPassword: z.string().min(1) }).refine((data) => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = schema.parse(await request.json())
    const record = await db.getUserById(user.id)
    if (!record || !(await bcrypt.compare(input.currentPassword, record.passwordHash))) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    await db.updateUser(user.id, { passwordHash: await bcrypt.hash(input.newPassword, 10), mustChangePassword: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid password details', details: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to change password' }, { status: 401 })
  }
}
