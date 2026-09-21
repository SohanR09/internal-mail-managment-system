import Link from 'next/link'

export default function SignupPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold">Accounts are created by your administrator.</h1><p className="mt-3 text-muted-foreground">If you&apos;re a Northstar employee and don&apos;t have an account, contact your admin.</p><Link href="/login" className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Back to login</Link></section></main>
} 
