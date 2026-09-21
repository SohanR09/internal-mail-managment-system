'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result: { error?: string } = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to sign in')
      window.location.assign('/mail/inbox')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Northstar Mail</p>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your internal mailbox.</p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="email">
            Email
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="password">
            Password
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">New to Northstar? <Link className="font-medium text-foreground underline underline-offset-4" href="/signup">Create an account</Link></p>
      </section>
    </main>
  )
}
