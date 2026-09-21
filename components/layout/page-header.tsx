'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PageHeaderProps = {
  title: string
  backHref?: string
}

export function PageHeader({ title, backHref = '/mail/inbox' }: PageHeaderProps) {
  const router = useRouter()
  return (
    <header className="flex bg-card items-center gap-3 border-b border-border px-6 py-4">
      <Button className="cursor-pointer" variant="ghost" size="icon" aria-label={`Back to mail from ${title}`} onClick={() => router.push(backHref)}>
        <ArrowLeftIcon />
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </header>
  )
}
