'use client'

import { useEffect, useRef, useState } from 'react'
import type { DashboardSettings, UserDashboardSettings } from '@/lib/db/types'

type Props = {
  userSettings: UserDashboardSettings | undefined
  globalSettings: DashboardSettings | undefined
  isAdmin: boolean
}

export function SettingsForm({ userSettings, globalSettings, isAdmin }: Props) {
  const [settings, setSettings] = useState<Partial<UserDashboardSettings>>(
    userSettings || {
      theme: 'dark',
      density: 'comfortable',
      defaultFolder: 'inbox',
      sidebarCollapsed: false,
      rowsPerPage: 25,
      refreshIntervalSeconds: 15,
      notificationsEnabled: true,
      signature: '',
      widgets: ['unread_count', 'starred_messages', 'recent_conversations'],
    }
  )
  const [globalSettings_, setGlobalSettings_] = useState<Partial<DashboardSettings> | null>(globalSettings || null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    const timer = window.setTimeout(() => { void saveUserSettings() }, 250)
    return () => window.clearTimeout(timer)
  }, [settings])

  async function saveUserSettings() {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('Failed to save settings')
      setStatus('Settings saved successfully')
    } catch (error) {
      setStatus('Failed to save settings')
      setStatus('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    setSaving(true)
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to delete account')
      window.location.assign('/login')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to delete account') } finally { setSaving(false) }
  }

  async function saveGlobalSettings() {
    if (!isAdmin || !globalSettings_) return
    setSaving(true)
    try {
      const response = await fetch('/api/settings/global', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings_),
      })
      if (!response.ok) throw new Error('Failed to save global settings')
      setStatus('Global settings saved successfully')
    } catch (error) {
      setStatus('Failed to save global settings')
      setStatus('Failed to save global settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">{status ? <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{status}</p> : null}
      {/* User Settings */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Display & Preferences</h2>
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium">Theme</label>
            <p className="mb-3 text-xs text-muted-foreground">Choose how the interface appears</p>
            <div className="flex gap-3">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSettings({ ...settings, theme })}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    settings.theme === theme
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background hover:bg-accent'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <label className="block text-sm font-medium">Row Density</label>
            <p className="mb-3 text-xs text-muted-foreground">Adjust spacing in the mail list</p>
            <div className="flex gap-3">
              {(['comfortable', 'compact'] as const).map((density) => (
                <button
                  key={density}
                  onClick={() => setSettings({ ...settings, density })}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    settings.density === density
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background hover:bg-accent'
                  }`}
                >
                  {density.charAt(0).toUpperCase() + density.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Default Folder */}
          <div>
            <label htmlFor="defaultFolder" className="block text-sm font-medium">
              Default Folder
            </label>
            <p className="mb-3 text-xs text-muted-foreground">Where to open when you log in</p>
            <select
              id="defaultFolder"
              value={settings.defaultFolder || 'inbox'}
              onChange={(e) => setSettings({ ...settings, defaultFolder: e.target.value as any })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="inbox">Inbox</option>
              <option value="sent">Sent</option>
              <option value="draft">Drafts</option>
              <option value="archive">Archive</option>
              <option value="trash">Trash</option>
            </select>
          </div>

          {/* Sidebar State */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed || false}
                onChange={(e) => setSettings({ ...settings, sidebarCollapsed: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">Collapse sidebar by default</span>
            </label>
          </div>

          {/* Rows Per Page */}
          <div>
            <label htmlFor="rowsPerPage" className="block text-sm font-medium">
              Rows per page
            </label>
            <input
              id="rowsPerPage"
              type="number"
              min="10"
              max="100"
              value={settings.rowsPerPage || 25}
              onChange={(e) => setSettings({ ...settings, rowsPerPage: parseInt(e.target.value) })}
              className="mt-2 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Refresh Interval */}
          <div>
            <label htmlFor="refreshInterval" className="block text-sm font-medium">
              Refresh interval (seconds)
            </label>
            <p className="mb-3 text-xs text-muted-foreground">How often to check for new mail</p>
            <input
              id="refreshInterval"
              type="number"
              min="5"
              max="300"
              value={settings.refreshIntervalSeconds || 15}
              onChange={(e) => setSettings({ ...settings, refreshIntervalSeconds: parseInt(e.target.value) })}
              className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Notifications */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled !== false}
                onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">Enable notifications for new mail</span>
            </label>
          </div>

          {/* Signature */}
          <div>
            <label htmlFor="signature" className="block text-sm font-medium">
              Email Signature
            </label>
            <p className="mb-3 text-xs text-muted-foreground">Added to the end of sent emails</p>
            <textarea
              id="signature"
              value={settings.signature || ''}
              onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
              maxLength={500}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Your name and title..."
            />
            <p className="mt-1 text-xs text-muted-foreground">{(settings.signature || '').length}/500</p>
          </div>

          {/* Widgets */}
          <div>
            <label className="block text-sm font-medium">Dashboard Widgets</label>
            <p className="mb-3 text-xs text-muted-foreground">Choose which widgets to display</p>
            <div className="space-y-2">
              {['unread_count', 'starred_messages', 'recent_conversations'].map((widget) => (
                <label key={widget} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={(settings.widgets || []).includes(widget)}
                    onChange={(e) => {
                      const current = settings.widgets || []
                      if (e.target.checked) {
                        setSettings({ ...settings, widgets: [...current, widget] })
                      } else {
                        setSettings({ ...settings, widgets: current.filter((w) => w !== widget) })
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    {widget === 'unread_count'
                      ? 'Unread count'
                      : widget === 'starred_messages'
                        ? 'Starred messages'
                        : 'Recent conversations'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={saveUserSettings}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-card p-6"><h2 className="text-xl font-semibold text-destructive">Danger zone</h2><p className="mt-2 text-sm text-muted-foreground">Delete your account and remove your personal mail data. Messages other people received are retained.</p><button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">Delete account</button></section>
      {deleteOpen ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"><div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"><h2 className="text-lg font-semibold">Delete account?</h2><p className="mt-2 text-sm text-muted-foreground">This action cannot be undone. Enter your password and type DELETE to confirm.</p><div className="mt-4 flex flex-col gap-3"><input aria-label="Password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Password" className="rounded-md border border-border bg-background px-3 py-2 text-sm" /><input aria-label="Type DELETE" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" className="rounded-md border border-border bg-background px-3 py-2 text-sm" /></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={saving || deleteConfirmation !== 'DELETE' || !deletePassword} onClick={() => void deleteAccount()} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">Delete permanently</button></div></div></div> : null}

      {/* Admin Global Settings */}
      {isAdmin && globalSettings_ && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Global Defaults (Admin Only)</h2>
          <div className="space-y-6 rounded-lg border border-border bg-card p-6">
            <div>
              <label htmlFor="globalDefaultFolder" className="block text-sm font-medium">
                Default Folder for New Users
              </label>
              <select
                id="globalDefaultFolder"
                value={globalSettings_.defaultFolder || 'inbox'}
                onChange={(e) => setGlobalSettings_({ ...globalSettings_, defaultFolder: e.target.value as any })}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="inbox">Inbox</option>
                <option value="sent">Sent</option>
                <option value="draft">Drafts</option>
                <option value="archive">Archive</option>
                <option value="trash">Trash</option>
              </select>
            </div>

            <div>
              <label htmlFor="globalPageSize" className="block text-sm font-medium">
                Default Page Size
              </label>
              <input
                id="globalPageSize"
                type="number"
                min="10"
                max="100"
                value={globalSettings_.pageSize || 25}
                onChange={(e) => setGlobalSettings_({ ...globalSettings_, pageSize: parseInt(e.target.value) })}
                className="mt-2 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="globalRefreshInterval" className="block text-sm font-medium">
                Default Refresh Interval (seconds)
              </label>
              <input
                id="globalRefreshInterval"
                type="number"
                min="5"
                max="300"
                value={globalSettings_.refreshIntervalSeconds || 15}
                onChange={(e) => setGlobalSettings_({ ...globalSettings_, refreshIntervalSeconds: parseInt(e.target.value) })}
                className="mt-2 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={saveGlobalSettings}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Global Settings'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
