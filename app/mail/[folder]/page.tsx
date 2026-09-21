import { MailApp } from '@/components/mail/mail-app'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'

export default async function MailFolderPage() {
  const session = await getSession()
  const initialSettings = session ? await db.getUserDashboardSettings(session.user.id) : undefined
  return <MailApp initialSettings={initialSettings} />
}
