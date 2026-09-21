'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'

type Recipient = { email: string; name: string }
type UserResult = { id: string; name: string; email: string; jobTitle: string; department: string; avatar: string | null; isActive: boolean; createdAt: string }
type Draft = { id?: string; to: string[]; cc: string[]; bcc: string[]; subject: string; bodyHtml: string; bodyText: string }

type ComposeWindowProps = { onClose: () => void; draftId?: string }

export function ComposeWindow({ onClose, draftId }: ComposeWindowProps) {
  const [to, setTo] = useState<Recipient[]>([])
  const [cc, setCc] = useState<Recipient[]>([])
  const [bcc, setBcc] = useState<Recipient[]>([])
  const [subject, setSubject] = useState('')
  const [activeField, setActiveField] = useState<'to' | 'cc' | 'bcc'>('to')
  const [recipientInput, setRecipientInput] = useState('')
  const [suggestions, setSuggestions] = useState<UserResult[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [draftKey, setDraftKey] = useState(draftId)
  const editor = useEditor({ extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })], content: '', immediatelyRender: false, editorProps: { attributes: { class: 'min-h-48 p-3 outline-none prose prose-invert max-w-none' } } })

  useEffect(() => {
    if (!recipientInput.trim()) { setSuggestions([]); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(recipientInput)}`, { signal: controller.signal })
      if (response.ok) { const result = (await response.json()) as { users: UserResult[] }; setSuggestions(result.users) }
    }, 180)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [recipientInput])

  const activeRecipients = useMemo(() => ({ to, cc, bcc }), [to, cc, bcc])
  async function saveDraft(): Promise<string | undefined> {
    if (!editor) return draftKey
    setSaving(true)
    const bodyHtml = editor.getHTML(); const bodyText = editor.getText()
    const response = await fetch(draftKey ? `/api/mails/draft/${draftKey}` : '/api/mails/draft', { method: draftKey ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftKey, ...activeRecipients, subject, bodyHtml, bodyText }) })
    setSaving(false)
    if (!response.ok) { setError('Unable to save draft'); return draftKey }
    if (!draftKey) { const result = (await response.json()) as { mail: { id: string } }; setDraftKey(result.mail.id); return result.mail.id }
    return draftKey
  }
  useEffect(() => { const timer = window.setInterval(() => { void saveDraft() }, 5000); return () => window.clearInterval(timer) })

  async function send() {
    setError('')
    const recipients = [...to, ...cc, ...bcc]
    if (!recipients.length) { setError('Add at least one recipient'); return }
    if (!editor) return
    const response = await fetch('/api/mails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId: draftKey, to: to.map((item) => item.email), cc: cc.map((item) => item.email), bcc: bcc.map((item) => item.email), subject: subject || '(no subject)', bodyHtml: editor.getHTML(), bodyText: editor.getText() }) })
    if (!response.ok) { const result = (await response.json().catch(() => ({}))) as { error?: string }; setError(result.error ?? 'Unable to send mail'); return }
    onClose()
  }

  function addRecipient(user: Recipient) { const setter = activeField === 'to' ? setTo : activeField === 'cc' ? setCc : setBcc; setter((current) => current.some((item) => item.email === user.email) ? current : [...current, user]); setRecipientInput(''); setSuggestions([]) }
  function removeRecipient(email: string) { const setter = activeField === 'to' ? setTo : activeField === 'cc' ? setCc : setBcc; setter((current) => current.filter((item) => item.email !== email)) }
  const current = activeRecipients[activeField]
  return <div className="fixed bottom-4 right-4 z-20 w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background shadow-2xl"><header className="flex items-center justify-between border-b border-border px-4 py-3"><span className="font-medium">New message</span><button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button></header><div className="flex flex-col gap-2 p-4"><RecipientField label="To" recipients={to} onFocus={() => setActiveField('to')} onRemove={removeRecipient} input={activeField === 'to' ? recipientInput : ''} onInput={setRecipientInput} /><div className="flex gap-2 text-xs"><button type="button" onClick={() => setActiveField('cc')} className="text-muted-foreground hover:text-foreground">Cc</button><button type="button" onClick={() => setActiveField('bcc')} className="text-muted-foreground hover:text-foreground">Bcc</button></div>{activeField !== 'to' ? <RecipientField label={activeField === 'cc' ? 'Cc' : 'Bcc'} recipients={current} onFocus={() => undefined} onRemove={removeRecipient} input={recipientInput} onInput={setRecipientInput} /> : null}{suggestions.length ? <div className="rounded-md border border-border bg-popover p-1">{suggestions.map((user) => <button type="button" key={user.id} onClick={() => addRecipient(user)} className="flex w-full flex-col items-start rounded px-2 py-1 text-left text-sm hover:bg-accent"><span>{user.name}</span><span className="text-xs text-muted-foreground">{user.email}</span></button>)}</div> : null}<input aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="border-b border-border bg-transparent px-1 py-2 text-sm outline-none" /><div className="flex flex-wrap gap-1 border-b border-border pb-2"><button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded px-2 py-1 text-xs hover:bg-accent">B</button><button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded px-2 py-1 text-xs italic hover:bg-accent">I</button><button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="rounded px-2 py-1 text-xs underline hover:bg-accent">U</button><button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded px-2 py-1 text-xs hover:bg-accent">List</button><button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="rounded px-2 py-1 text-xs hover:bg-accent">Quote</button></div><div className="rounded-md border border-input"><EditorContent editor={editor} /></div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<footer className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{saving ? 'Saving draft…' : draftKey ? 'Draft saved' : 'Auto-saves every 5 seconds'}</span><div className="flex gap-2"><button type="button" onClick={() => { void saveDraft(); onClose() }} className="rounded-md px-3 py-2 text-sm hover:bg-accent">Discard</button><button type="button" onClick={() => void send()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Send</button></div></footer></div></div>
}

function RecipientField({ label, recipients, onFocus, onRemove, input, onInput }: { label: string; recipients: Recipient[]; onFocus: () => void; onRemove: (email: string) => void; input: string; onInput: (value: string) => void }) { return <div className="flex min-h-10 flex-wrap items-center gap-1 border-b border-border"><span className="mr-1 text-xs text-muted-foreground">{label}</span>{recipients.map((item) => <span key={item.email} className="rounded-full bg-muted px-2 py-1 text-xs">{item.name}<button type="button" aria-label={`Remove ${item.email}`} onClick={() => onRemove(item.email)} className="ml-1">×</button></span>)}<input aria-label={`${label} recipient`} value={input} onFocus={onFocus} onChange={(event) => onInput(event.target.value)} placeholder={recipients.length ? '' : 'Search people'} className="min-w-24 flex-1 bg-transparent px-1 py-2 text-sm outline-none" /></div> }
