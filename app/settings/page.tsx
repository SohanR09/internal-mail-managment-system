import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SettingsForm } from '@/components/settings/settings-form';

export const metadata = { title: 'Settings | Northstar Mail', description: 'Manage your email preferences' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const userSettings = await db.getUserDashboardSettings(session.user.id);
  const globalSettings = await db.getDashboardSettings();
  const isAdmin = session.user.roles.includes('admin');

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your email preferences and account settings</p>
      </div>
      <SettingsForm
        userSettings={userSettings}
        globalSettings={globalSettings}
        isAdmin={isAdmin}
      />
    </main>
  );
}
