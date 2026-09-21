import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SettingsForm } from '@/components/settings/settings-form';
import { PageHeader } from '@/components/layout/page-header';

export const metadata = { title: 'Settings | Northstar Mail', description: 'Manage your email preferences' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const userSettings = await db.getUserDashboardSettings(session.user.id);
  const globalSettings = await db.getDashboardSettings();
  const isAdmin = session.user.roles.includes('admin');

  const defaultFolder = userSettings?.defaultFolder === 'draft' ? 'drafts' : (userSettings?.defaultFolder || 'inbox');
  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <PageHeader title="Settings" backHref={`/mail/${defaultFolder}`} />
      <div className="px-8 py-4">
        <p className="text-sm text-muted-foreground">Manage your email preferences and account settings</p>
      </div>
      <SettingsForm
        userSettings={userSettings}
        globalSettings={globalSettings}
        isAdmin={isAdmin}
      />
    </main>
  );
}
