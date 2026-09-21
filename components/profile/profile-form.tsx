'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const profileSchema = z.object({ name: z.string().trim().min(1, 'Full name is required').max(255), jobTitle: z.string().trim().max(100), department: z.string().trim().max(100), avatar: z.string() });
const passwordSchema = z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: z.string().min(8, 'Use at least 8 characters').max(200), confirmPassword: z.string() }).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Profile = { id: string; name: string; jobTitle: string; department: string; avatar: string | null; email: string; role: string; memberSince: string };

function passwordStrength(value: string) { return value.length < 8 ? 0 : value.length < 12 ? 1 : /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value) ? 3 : 2; }

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState({ name: profile.name, jobTitle: profile.jobTitle, department: profile.department, avatar: profile.avatar ?? '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function saveProfile() {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your profile');
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/profile/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const data = await response.json() as Profile & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to save profile');
      setProfile(data); setForm({ name: data.name, jobTitle: data.jobTitle, department: data.department, avatar: data.avatar ?? '' }); setStatus('Saved');
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: data }));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save profile'); } finally { setSaving(false); }
  }

  async function changePassword() {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your password');
    setPasswordSaving(true); setError('');
    try {
      const response = await fetch('/api/profile/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to change password');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' }); setStatus('Password changed');
    } catch (passwordError) { setError(passwordError instanceof Error ? passwordError.message : 'Unable to change password'); } finally { setPasswordSaving(false); }
  }

  function chooseAvatar(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 1_048_576) return setError('Avatar must be a PNG or JPEG under 1 MB');
    const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result) })); reader.readAsDataURL(file);
  }

  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">{status ? <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{status}</p> : null}{error ? <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">{error}</p> : null}<section className="rounded-lg border border-border bg-card p-6"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold">{form.avatar ? <img src={form.avatar} alt="Avatar preview" className="size-full object-cover" /> : form.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><label className="flex flex-col gap-1 text-sm font-medium">Avatar<input type="file" accept="image/png,image/jpeg" onChange={(event) => chooseAvatar(event.target.files?.[0])} className="text-sm font-normal" /><span className="text-xs text-muted-foreground">PNG or JPEG, max 1 MB</span></label></div><div className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Full name<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="grid gap-2 text-sm font-medium">Job title<Input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></label><label className="grid gap-2 text-sm font-medium">Department<Input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label><div className="grid gap-2 text-sm font-medium">Email<div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{profile.email}</div></div><div className="grid gap-2 text-sm font-medium">Role<div><Badge variant="secondary" className="capitalize">{profile.role}</Badge></div></div><div className="grid gap-2 text-sm font-medium">Member since<div className="text-sm text-muted-foreground">{profile.memberSince ? new Date(profile.memberSince).toLocaleDateString() : '—'}</div></div></div><Button type="button" className="mt-6" disabled={saving} onClick={() => void saveProfile()}>{saving ? 'Saving…' : 'Save changes'}</Button></section><section className="rounded-lg border border-border bg-card p-6"><h2 className="text-lg font-semibold">Change password</h2><div className="mt-4 grid gap-4"><label className="grid gap-2 text-sm font-medium">Current password<Input type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label><label className="grid gap-2 text-sm font-medium">New password<Input type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /><span className="text-xs text-muted-foreground">Strength: {['Too short', 'Fair', 'Good', 'Strong'][passwordStrength(password.newPassword)]}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${passwordStrength(password.newPassword) * 33.333}%` }} /></div></label><label className="grid gap-2 text-sm font-medium">Confirm new password<Input type="password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></label></div><Button type="button" variant="outline" className="mt-6" disabled={passwordSaving} onClick={() => void changePassword()}>{passwordSaving ? 'Changing…' : 'Change password'}</Button></section></div>;
}
