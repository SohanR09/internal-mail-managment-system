'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({ currentPassword: z.string().min(1, 'Enter your temporary password'), newPassword: z.string().min(8, 'Use at least 8 characters'), confirmPassword: z.string().min(1) }).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export function ChangePasswordForm({ required = false }: { required?: boolean }) {
  const router = useRouter(); const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); const parsed = schema.safeParse(form); if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Invalid password'); setSaving(true); setError(''); const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); setSaving(false); if (!response.ok) return setError(result.error ?? 'Unable to change password'); router.replace('/mail/inbox') }
  const strength = Math.min(100, form.newPassword.length * 10)
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8"><h1 className="text-2xl font-semibold">{required ? 'Change your temporary password' : 'Change password'}</h1><Input type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /><Input type="password" placeholder="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${strength}%` }} /></div><Input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</Button></form></main>
}
