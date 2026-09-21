'use client'

import { useState } from 'react'
import { CalendarIcon, FilterIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FilterState = { unread: boolean; starred: boolean; sender: string; category: string; from: string; to: string; sort: 'newest' | 'oldest' }
type Props = { value: FilterState; categories: { id: string; name: string }[]; senders: { id: string; name: string; email: string }[]; onApply: (value: FilterState) => void }

function dateValue(value: string) { return value ? new Date(`${value}T00:00:00`) : undefined }
function formatDate(value: Date | undefined) { return value ? value.toISOString().slice(0, 10) : '' }

export function FilterPopover({ value, categories, senders, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const count = [draft.unread, draft.starred, Boolean(draft.sender), Boolean(draft.category), Boolean(draft.from), Boolean(draft.to), draft.sort !== 'newest'].filter(Boolean).length
  const update = (patch: Partial<FilterState>) => setDraft((current) => ({ ...current, ...patch }))
  const clear = () => setDraft({ unread: false, starred: false, sender: '', category: '', from: '', to: '', sort: 'newest' })
  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setDraft(value) }}>
      <PopoverTrigger render={<Button variant="outline" size="sm" aria-label="Filters" className="cursor-pointer" />}>
        <FilterIcon data-icon="inline-start" />Filters{count ? <Badge variant="secondary" className="ml-1">{count}</Badge> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Filters</h2><p className="text-xs text-muted-foreground">Refine this folder without leaving the list.</p></div><Button variant="ghost" size="icon" aria-label="Clear all filters" onClick={clear}><XIcon /></Button></div>
          <div className="grid grid-cols-2 gap-2"><Button type="button" variant={draft.unread ? 'default' : 'outline'} onClick={() => update({ unread: !draft.unread })}>Unread</Button><Button type="button" variant={draft.starred ? 'default' : 'outline'} onClick={() => update({ starred: !draft.starred })}>Starred</Button></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={false} readOnly />Has attachment</label>
          <Select value={draft.category || 'all'} onValueChange={(category) => update({ category: category === 'all' || !category ? '' : category })}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select>
          <div className="flex flex-col gap-2"><label className="text-sm font-medium" htmlFor="sender-filter">Sender</label><Input id="sender-filter" list="sender-options" value={draft.sender} onChange={(event) => update({ sender: event.target.value })} placeholder="Search sender" /><datalist id="sender-options">{senders.map((sender) => <option key={sender.id} value={sender.email}>{sender.name}</option>)}</datalist></div>
          <div className="grid grid-cols-2 gap-2">
            <Popover><PopoverTrigger render={<Button variant="outline" className="justify-start font-normal" />}><CalendarIcon data-icon="inline-start" />{draft.from || 'From date'}</PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateValue(draft.from)} onSelect={(date) => update({ from: formatDate(date) })} /></PopoverContent></Popover>
            <Popover><PopoverTrigger render={<Button variant="outline" className="justify-start font-normal" />}><CalendarIcon data-icon="inline-start" />{draft.to || 'To date'}</PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateValue(draft.to)} onSelect={(date) => update({ to: formatDate(date) })} /></PopoverContent></Popover>
          </div>
          <Select value={draft.sort} onValueChange={(sort) => { if (sort) update({ sort }) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem></SelectContent></Select>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={clear}>Clear all</Button><Button onClick={() => { onApply(draft); setOpen(false) }}>Apply</Button></div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function FilterChips({ value, onChange, resultCount }: { value: FilterState; onChange: (value: FilterState) => void; resultCount: number }) {
  const chips = [{ key: 'unread', label: 'Unread', active: value.unread }, { key: 'starred', label: 'Starred', active: value.starred }, { key: 'sender', label: value.sender, active: Boolean(value.sender) }, { key: 'category', label: value.category, active: Boolean(value.category) }, { key: 'from', label: `From ${value.from}`, active: Boolean(value.from) }, { key: 'to', label: `To ${value.to}`, active: Boolean(value.to) }, { key: 'sort', label: value.sort === 'oldest' ? 'Oldest' : '', active: value.sort === 'oldest' }]
  return <div className="flex min-h-8 flex-wrap items-center gap-2 px-6 py-2"><span className="text-xs text-muted-foreground">{resultCount} results</span>{chips.filter((chip) => chip.active).map((chip) => <Badge key={chip.key} variant="secondary" className="gap-1">{chip.label}<button type="button" aria-label={`Remove ${chip.label} filter`} onClick={() => onChange({ ...value, [chip.key]: chip.key === 'sort' ? 'newest' : chip.key === 'unread' || chip.key === 'starred' ? false : '' } as FilterState)}><XIcon /></button></Badge>)}</div>
}
