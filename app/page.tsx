import { Suspense } from 'react'
import { MailApp } from '@/components/mail/mail-app'

export default function Home() {
  return <Suspense fallback={null}><MailApp /></Suspense>
}
