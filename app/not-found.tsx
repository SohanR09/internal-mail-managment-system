import Link from 'next/link'

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center p-6"><section className="text-center"><h1 className="text-2xl font-semibold">Page not found</h1><p className="mt-2 text-muted-foreground">The page you requested does not exist.</p><Link href="/dashboard" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">Go to dashboard</Link></section></main>
}
