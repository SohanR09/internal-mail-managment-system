import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/profile/profile-form';

export const metadata = { title: 'Profile | Northstar Mail', description: 'Manage your Northstar Mail profile' };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const settings = await db.getUserDashboardSettings(session.user.id);
  const profile = await db.getUserById(session.user.id);
  const defaultFolder = settings?.defaultFolder === 'draft' ? 'drafts' : (settings?.defaultFolder || 'inbox');
  const role = session.user.roles[0] ?? 'employee';
  return <main className="min-h-screen bg-background text-foreground"><PageHeader title="Profile" backHref={`/mail/${defaultFolder}`} /><ProfileForm initialProfile={{ id: profile?.id ?? session.user.id, name: profile?.name ?? session.user.name, jobTitle: profile?.jobTitle ?? '', department: profile?.department ?? '', avatar: profile?.avatar ?? null, email: profile?.email ?? session.user.email, role, memberSince: profile?.createdAt ?? '' }} /></main>;
}
