'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center p-6"><section className="max-w-md text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-2 text-muted-foreground">We could not load this page.</p><button type="button" onClick={reset} className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground">Try again</button></section></main>
}
