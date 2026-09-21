import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import { db } from '@/lib/db';
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  roles: string[];
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    const user = await db.getUserById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    const userRoles = await db.getUserRoles(user.id);
    const roles = await Promise.all(
      userRoles.map(async (ur) => {
        const role = await db.getRoleById(ur.roleId);
        return role?.name || '';
      })
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        department: user.department,
        roles: roles.filter(Boolean),
      },
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

export async function requireRole(...allowedRoles: string[]) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const hasRole = session.user.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    throw new Error('Forbidden');
  }

  return session.user;
}
