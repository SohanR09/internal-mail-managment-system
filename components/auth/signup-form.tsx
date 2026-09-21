'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

type FormValues = { name: string; username: string; password: string; confirmPassword: string; department: string; jobTitle: string }
type Errors = Partial<Record<keyof FormValues, string>>

function passwordScore(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
}

export function SignupForm() {
  const [values, setValues] = useState<FormValues>({ name: '', username: '', password: '', confirmPassword: '', department: '', jobTitle: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [availability, setAvailability] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [serverError, setServerError] = useState('')
  const score = useMemo(() => passwordScore(values.password), [values.password])

  useEffect(() => {
    if (!/^[a-z0-9_-]{3,50}$/.test(values.username)) { setAvailability(''); return }
    const controller = new AbortController()
    setChecking(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-username?u=${encodeURIComponent(values.username)}`, { signal: controller.signal })
        const result: { available?: boolean } = await response.json()
        setAvailability(result.available ? 'Username is available' : 'Username is already taken')
      } catch { if (!controller.signal.aborted) setAvailability('') } finally { if (!controller.signal.aborted) setChecking(false) }
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [values.username])

  function update(field: keyof FormValues, value: string) { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })) }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setServerError('')
    const nextErrors: Errors = {}
    if (!values.name.trim()) nextErrors.name = 'Full name is required'
    if (!/^[a-z0-9_-]{3,50}$/.test(values.username)) nextErrors.username = 'Use 3–50 lowercase letters, numbers, hyphens, or underscores'
    if (score < 3) nextErrors.password = 'Use at least 8 characters with uppercase, number, and symbol'
    if (values.password !== values.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match'
    if (!values.department) nextErrors.department = 'Department is required'
    if (!values.jobTitle.trim()) nextErrors.jobTitle = 'Job title is required'
    if (availability === 'Username is already taken') nextErrors.username = 'Username is already taken'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const result: { error?: string } = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to create account')
      window.location.assign('/mail/inbox')
    } catch (submissionError) { setServerError(submissionError instanceof Error ? submissionError.message : 'Unable to create account') } finally { setLoading(false) }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10"><section className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm"><div className="mb-7 flex flex-col gap-2"><p className="text-sm font-medium text-muted-foreground">Northstar Mail</p><h1 className="text-2xl font-semibold tracking-tight">Create your account</h1><p className="text-sm text-muted-foreground">Join the internal mailbox.</p></div><form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
    <Field label="Full name" id="name" value={values.name} error={errors.name} onChange={(value) => update('name', value)} />
    <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="username">Username<div className="flex"><input id="username" value={values.username} onChange={(event) => update('username', event.target.value.toLowerCase())} className="h-10 min-w-0 flex-1 rounded-l-md border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" /><span className="flex h-10 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground">@northstar.co</span></div>{checking && <span className="text-xs text-muted-foreground">Checking availability…</span>}{availability && <span className={`text-xs ${availability.includes('available') ? 'text-muted-foreground' : 'text-destructive'}`}>{availability}</span>}{errors.username && <span className="text-xs text-destructive">{errors.username}</span>}</label>
    <Field label="Password" id="password" type="password" value={values.password} error={errors.password} onChange={(value) => update('password', value)} /><div className="flex gap-1" aria-label={`Password strength ${score} of 4`}>{[0,1,2,3].map((item) => <span key={item} className={`h-1 flex-1 rounded-full ${item < score ? 'bg-primary' : 'bg-muted'}`} />)}</div>
    <Field label="Confirm password" id="confirmPassword" type="password" value={values.confirmPassword} error={errors.confirmPassword} onChange={(value) => update('confirmPassword', value)} />
    <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="department">Department<select id="department" value={values.department} onChange={(event) => update('department', event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select a department</option><option>Engineering</option><option>Product</option><option>Design</option><option>Marketing</option><option>People</option><option>Finance</option><option>Operations</option></select>{errors.department && <span className="text-xs text-destructive">{errors.department}</span>}</label>
    <Field label="Job title" id="jobTitle" value={values.jobTitle} error={errors.jobTitle} onChange={(value) => update('jobTitle', value)} />
    {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}<Button type="submit" disabled={loading || checking}>{loading ? 'Creating account…' : 'Create account'}</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-foreground underline underline-offset-4" href="/login">Sign in</Link></p></section></main>
}

function Field({ label, id, value, onChange, error, type = 'text' }: { label: string; id: keyof FormValues; value: string; onChange: (value: string) => void; error?: string; type?: string }) { return <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={id}><span>{label}</span><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />{error && <span className="text-xs text-destructive">{error}</span>}</label> }
