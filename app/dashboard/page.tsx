import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import dynamic from 'next/dynamic';
const DashboardClient = dynamic(() => import('@/components/dashboard/dashboard-client').then((module) => module.DashboardClient), { loading: () => <p className="p-8 text-sm text-muted-foreground">Loading dashboard...</p> });

export const metadata = {
  title: 'Dashboard | Northstar Mail',
  description: 'View your mail dashboard',
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const userRoles = await db.getUserRoles(user.id);

  // Check if admin
  let isAdmin = false;
  for (const ur of userRoles) {
    const role = await db.getRoleById(ur.roleId);
    if (role?.name === 'admin') {
      isAdmin = true;
      break;
    }
  }

  // Get user settings
  const userSettings = await db.getUserDashboardSettings(user.id);
  const enabledWidgets = userSettings?.widgets || ['unread_count', 'starred_messages', 'recent_conversations'];

  // Fetch dashboard data
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
  const response = await fetch(`${protocol}://${host}/api/dashboard`, {
    headers: { Cookie: `session=${(await cookies()).get('session')?.value ?? ''}` },
    cache: 'no-store',
  });

  const data = (await response.json()) as Record<string, unknown>;

  return <DashboardClient data={data} enabledWidgets={enabledWidgets} isAdmin={isAdmin} />;
}
