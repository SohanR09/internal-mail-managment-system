import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const currentUser = await requireUser();
    const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
    if (query.length < 1) return NextResponse.json({ users: [] });
    const users = (await db.getAllUsers())
      .filter((user) => user.isActive && user.id !== currentUser.id)
      .filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query))
      .slice(0, 8)
      .map(({ passwordHash: _passwordHash, ...user }) => user);
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }

function _unused(): void {}
void _unused;
