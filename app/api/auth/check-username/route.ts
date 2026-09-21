import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Public registration is disabled. Contact your administrator.' }, { status: 403 })
}
