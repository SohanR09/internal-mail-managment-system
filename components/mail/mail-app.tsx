'use client'

import useSWR from 'swr'
import { memo, useMemo, useState } from 'react'
import type { Mail, MailCategory, UserMail } from '@/lib/db/types'

interface MailItem {
  mail: Mail
  state: UserMail
  sender: { id: string; name: string; initials: string; email: string } | null
  category: MailCategory | null
}
interface MailResponse { items: MailItem[]; total: number; page: number; pageSize: number }
interface CountsResponse { counts: Record<string, number> }

const folders = ['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'all', 'trash', 'spam'] as const
const labels: Record<string, string> = { inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', sent: 'Sent', drafts: 'Drafts', all: 'All mail', trash: 'Trash', spam: 'Spam' }
const cache = new Map<string, { etag: string | null; data: unknown }>()

async function fetchWithEtag<T>(url: string): Promise<T> {
  const previous = cache.get(url)
  const response = await fetch(url, { headers: previous?.etag ? { 'If-None-Match': previous.etag } : undefined })
  if (response.status === 304 && previous) return previous.data as T
  if (!response.ok) throw new Error('Unable to load mail')
  const data = (await response.json()) as T
  cache.set(url, { etag: response.headers.get('etag'), data })
  return data
}

function formatDate(value: string | null): string {
  if (!value) return 'Draft'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function MailApp() {
  const [folder, setFolder] = useState<(typeof folders)[number]>('inbox')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const mailKey = `/api/mails?folder=${folder}&page=1&pageSize=25&q=${encodeURIComponent(query)}`
  const { data, error, isLoading } = useSWR<MailResponse>(mailKey, fetchWithEtag, { keepPreviousData: true, refreshInterval: 15000, refreshWhenHidden: false, revalidateOnFocus: true })
  const { data: counts } = useSWR<CountsResponse>('/api/mails/counts', fetchWithEtag, { refreshInterval: 15000, refreshWhenHidden: false })
  const items = data?.items ?? []
  const itemIds = useMemo(() => items.map((item) => item.mail.id), [items])
  const allSelected = itemIds.length > 0 && itemIds.every((id) => selected.includes(id))

  function toggleAll() {
    setSelected(allSelected ? [] : itemIds)
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border p-4">
        <div className="mb-8 flex items-center gap-2 px-2"><span className="size-2 rounded-full bg-primary" /><span className="font-semibold tracking-tight">Northstar Mail</span></div>
        <button className="mb-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="button">Compose</button>
        <nav className="flex flex-col gap-1" aria-label="Mail folders">
          {folders.map((name) => <button key={name} type="button" onClick={() => { setFolder(name); setSelected([]) }} className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm ${folder === name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60'}`}><span>{labels[name]}</span>{counts?.counts[name] ? <span className="text-xs tabular-nums">{counts.counts[name]}</span> : null}</button>)}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border px-6 py-5"><div><h1 className="text-xl font-semibold">{labels[folder]}</h1><p className="text-sm text-muted-foreground">{data?.total ?? 0} messages</p></div><input aria-label="Search mail" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail" className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring" /></header>
        <div className="flex items-center gap-3 border-b border-border px-6 py-3"><input aria-label="Select all messages" type="checkbox" checked={allSelected} onChange={toggleAll} /><span className="text-xs text-muted-foreground">{selected.length ? `${selected.length} selected` : 'Select all'}</span><button type="button" aria-label="More actions" className="ml-auto rounded-md px-2 py-1 text-lg text-muted-foreground hover:bg-accent">...</button></div>
        {isLoading && !data ? <div className="flex flex-col gap-px p-6">{[1, 2, 3, 4, 5].map((row) => <div className="h-16 animate-pulse rounded-md bg-muted" key={row} />)}</div> : error ? <p className="p-6 text-sm text-destructive">Unable to load mail. Please try again.</p> : items.length === 0 ? <p className="p-12 text-center text-sm text-muted-foreground">No messages in {labels[folder].toLowerCase()}.</p> : <div className="flex flex-col">{items.map((item) => <MailRow key={item.mail.id} item={item} checked={selected.includes(item.mail.id)} onToggle={toggleSelected} />)}</div>}
      </section>
    </main>
  )
}

const MailRow = memo(function MailRow({ item, checked, onToggle }: { item: MailItem; checked: boolean; onToggle: (id: string) => void }) {
  return <article className={`flex items-center gap-4 border-b border-border px-6 py-4 ${item.state.isRead ? 'bg-background' : 'bg-accent/20'}`}><input aria-label={`Select ${item.mail.subject}`} type="checkbox" checked={checked} onChange={() => onToggle(item.mail.id)} /><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{item.sender?.initials ?? '?'}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className={`truncate text-sm ${item.state.isRead ? 'font-normal' : 'font-semibold'}`}>{item.mail.subject}</h2><time className="shrink-0 text-xs text-muted-foreground">{formatDate(item.mail.sentAt)}</time></div><p className="truncate text-xs text-muted-foreground">{item.sender?.name ?? 'Unknown sender'} · {item.mail.bodyText}</p></div></article>
})

