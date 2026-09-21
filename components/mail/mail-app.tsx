"use client";

import useSWR, { mutate as mutateCache } from "swr";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Recipient } from "@/components/mail/compose-window";
const ComposeWindow = dynamic(
  () =>
    import("@/components/mail/compose-window").then(
      (module) => module.ComposeWindow,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-sm text-muted-foreground">Loading editor...</div>
    ),
  },
);
import type { Mail, MailCategory, UserMail } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPopover, FilterChips } from "@/components/mail/filter-popover";
import {
  RefreshCwIcon,
  LogOutIcon,
  UserCircleIcon,
  LayoutDashboardIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MailSidebar } from "@/components/mail/mail-sidebar";

type MailItem = {
  mail: Mail;
  state: UserMail;
  sender: { id: string; name: string; initials: string; email: string } | null;
  category: MailCategory | null;
};
type MailResponse = {
  items: MailItem[];
  total: number;
  page: number;
  pageSize: number;
};
type CountsResponse = { counts: Record<string, number>; version?: number };
type ThreadResponse = { mail: MailItem; thread: MailItem[] };
type DashboardSettingsResponse = {
  sidebarCollapsed?: boolean;
  defaultFolder?: string;
  theme?: "light" | "dark" | "system";
  density?: "compact" | "comfortable";
  rowsPerPage?: number;
  refreshIntervalSeconds?: number;
  notificationsEnabled?: boolean;
};
type Folder =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "all"
  | "trash"
  | "spam";
const folders: Folder[] = [
  "inbox",
  "starred",
  "snoozed",
  "sent",
  "drafts",
  "all",
  "trash",
  "spam",
];
const labels: Record<Folder, string> = {
  inbox: "Inbox",
  starred: "Starred",
  snoozed: "Snoozed",
  sent: "Sent",
  drafts: "Drafts",
  all: "All mail",
  trash: "Trash",
  spam: "Spam",
};
const cache = new Map<string, { etag: string | null; data: unknown }>();
async function fetchWithEtag<T>(url: string): Promise<T> {
  const previous = cache.get(url);
  const response = await fetch(url, {
    headers: previous?.etag ? { "If-None-Match": previous.etag } : undefined,
  });
  if (response.status === 304 && previous) return previous.data as T;
  if (!response.ok) throw new Error("Unable to load mail");
  const data = (await response.json()) as T;
  cache.set(url, { etag: response.headers.get("etag"), data });
  return data;
}
function dateLabel(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "Draft";
}

export function MailApp({
  initialSettings,
}: {
  initialSettings?: DashboardSettingsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ folder?: string }>();
  const folder = (
    folders.includes(params.folder as Folder) ? params.folder : "inbox"
  ) as Folder;
  const [selectedMailId, setSelectedMailId] = useState<string>(() => searchParams.get("m-id") ?? "");

  const updateSelectedMailUrl = useCallback(
    (mailId?: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (mailId) next.set("m-id", mailId);
      else next.delete("m-id");
      const query = next.toString();
      router.replace(`/mail/${folder}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [folder, router, searchParams],
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialSettings?.sidebarCollapsed ?? false,
  );
  const [session, setSession] = useState<{
    name: string;
    email: string;
    roles: string[];
    avatar?: string | null;
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraftId, setComposeDraftId] = useState<string>();
  const [composeOptions, setComposeOptions] = useState<{
    to?: Recipient[];
    cc?: Recipient[];
    subject?: string;
    bodyHtml?: string;
    threadId?: string;
    parentMailId?: string;
  }>({});
  const [settings, setSettings] = useState<DashboardSettingsResponse>(
    initialSettings ?? {},
  );
  const [rowHeight, setRowHeight] = useState("py-4");
  const [filters, setFilters] = useState({
    unread: searchParams.get("unread") === "true",
    starred: searchParams.get("starred") === "true",
    sender: searchParams.get("sender") ?? "",
    category: searchParams.get("category") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    sort: searchParams.get("sort") === "oldest" ? "oldest" : "newest",
    page: Number(searchParams.get("page") ?? "1") || 1,
  });
  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const next = (
        event as CustomEvent<{ name: string; avatar?: string | null }>
      ).detail;
      setSession((current) =>
        current
          ? { ...current, name: next.name, avatar: next.avatar }
          : current,
      );
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () =>
      window.removeEventListener("profile-updated", onProfileUpdated);
  }, []);
  useEffect(() => {
    const onSettingsChanged = (event: Event) => {
      const next = (event as CustomEvent<DashboardSettingsResponse>).detail;
      setSettings((current) => ({ ...current, ...next }));
      if (next.sidebarCollapsed !== undefined)
        setSidebarCollapsed(next.sidebarCollapsed);
      if (next.density)
        setRowHeight(next.density === "compact" ? "py-2" : "py-4");
      if (next.defaultFolder) {
        const nextFolder =
          next.defaultFolder === "draft" ? "drafts" : next.defaultFolder;
        if (folders.includes(nextFolder as Folder) && nextFolder !== folder)
          router.push(`/mail/${nextFolder}`);
      }
    };
    window.addEventListener("dashboard-settings-changed", onSettingsChanged);
    return () =>
      window.removeEventListener(
        "dashboard-settings-changed",
        onSettingsChanged,
      );
  }, []);
  useEffect(() => {
    void fetch("/api/users/search?q=")
      .then((response) =>
        response.ok ? (response.json() as Promise<{ users: unknown[] }>) : null,
      )
      .then((result) => {
        if (result) setActiveUserCount(result.users.length);
      })
      .catch(() => undefined);
    void fetch("/api/settings/me")
      .then((response) =>
        response.ok
          ? (response.json() as Promise<DashboardSettingsResponse>)
          : null,
      )
      .then((settingsData) => {
        if (settingsData) {
          setSettings(settingsData);
          if (settingsData.density === "compact") setRowHeight("py-2");
          else setRowHeight("py-4");
        }
      })
      .catch(() => undefined);
    void fetch("/api/auth/me")
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              user: { name: string; email: string; roles: string[] };
            }>)
          : null,
      )
      .then((result) => {
        if (result?.user) setSession(result.user);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (query) next.set("q", query);
      if (filters.unread) next.set("unread", "true");
      if (filters.starred) next.set("starred", "true");
      if (filters.sender) next.set("sender", filters.sender);
      if (filters.category) next.set("category", filters.category);
      if (filters.from) next.set("from", filters.from);
      if (filters.to) next.set("to", filters.to);
      if (filters.sort !== "newest") next.set("sort", filters.sort);
      if (filters.page > 1) next.set("page", String(filters.page));
      router.replace(
        `/mail/${folder}${next.toString() ? `?${next.toString()}` : ""}`,
        { scroll: false },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, filters, folder, router]);
  useEffect(() => {
    if (!selectedMailId) return;
    void fetch(`/api/mails/${selectedMailId}`, { method: "PATCH" })
      .then(() => {
        void fetch("/api/mails/counts", { cache: "no-store" });
      })
      .catch(() => undefined);
  }, [selectedMailId]);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedMailId) {
      setSelectedMailId("");
      updateSelectedMailUrl();
    }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [selectedMailId]);
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('[aria-label="Search mail"]')
          ?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, []);
  const filterQuery = new URLSearchParams({
    folder,
    page: String(filters.page),
    pageSize: String(settings.rowsPerPage ?? 25),
    q: query,
    sort: filters.sort,
    unread: String(filters.unread),
    starred: String(filters.starred),
    sender: filters.sender,
    category: filters.category,
    from: filters.from,
    to: filters.to,
  });
  const mailKey = `/api/mails?${filterQuery.toString()}`;
  const refreshInterval = (settings.refreshIntervalSeconds ?? 15) * 1000;
  const { data, error, isLoading, mutate } = useSWR<MailResponse>(
    mailKey,
    fetchWithEtag,
    {
      keepPreviousData: true,
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
    },
  );
  const { data: counts, mutate: mutateCounts } = useSWR<CountsResponse>(
    "/api/mails/counts",
    fetchWithEtag,
    { refreshInterval: 0, refreshWhenHidden: false, revalidateOnFocus: false },
  );
  const { data: threadData, mutate: mutateThread } = useSWR<ThreadResponse>(
    selectedMailId ? `/api/mails/${selectedMailId}` : null,
    fetchWithEtag,
    { revalidateOnFocus: false },
  );
  const mailVersion = useRef(counts?.version ?? 0);
  const previousInboxCount = useRef<number | null>(null);
  useEffect(() => {
    if (counts?.version !== undefined) mailVersion.current = counts.version;
  }, [counts?.version]);
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let delay = refreshInterval;
    const poll = async () => {
      if (stopped || document.hidden) return;
      try {
        const response = await fetch(
          `/api/mails/counts?since=${mailVersion.current}`,
          { cache: "no-store" },
        );
        if (response.status === 304) {
          delay = refreshInterval;
          return;
        }
        if (!response.ok) throw new Error("Polling failed");
        const next = (await response.json()) as CountsResponse;
        const inboxCount = next.counts.inbox ?? 0;
        if (
          settings.notificationsEnabled !== false &&
          previousInboxCount.current !== null &&
          inboxCount > previousInboxCount.current
        )
          setNotice("New inbox mail");
        previousInboxCount.current = inboxCount;
        mailVersion.current = next.version ?? mailVersion.current;
        await Promise.all([
          mutate(),
          mutateCounts(next, { revalidate: false }),
          selectedMailId ? mutateThread() : Promise.resolve(),
        ]);
        delay = refreshInterval;
      } catch {
        delay = Math.min(refreshInterval * 4, delay * 2);
        setNotice("Live updates are temporarily delayed");
      }
      if (!stopped && !document.hidden)
        timer = window.setTimeout(() => void poll(), delay);
    };
    const start = () => {
      if (timer) window.clearTimeout(timer);
      delay = refreshInterval;
      void poll();
    };
    const onVisibility = () => {
      if (!document.hidden) start();
    };
    window.addEventListener("focus", start);
    window.addEventListener("online", start);
    document.addEventListener("visibilitychange", onVisibility);
    timer = window.setTimeout(() => void poll(), refreshInterval);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", start);
      window.removeEventListener("online", start);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    refreshInterval,
    settings.notificationsEnabled,
    selectedMailId,
    mutate,
    mutateCounts,
    mutateThread,
  ]);
  const items = data?.items ?? [];
  const itemIds = useMemo(() => items.map((item) => item.mail.id), [items]);
  const allSelected =
    itemIds.length > 0 && itemIds.every((id) => selected.includes(id));
  async function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      const response = await fetch("/api/settings/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarCollapsed: next }),
      });
      if (!response.ok) throw new Error("Unable to save settings");
    } catch {
      setNotice("Unable to save sidebar preference");
    }
  }
  async function act(id: string, action: string, value?: string) {
    const optimistic = data
      ? {
          ...data,
          items: data.items.map((item) =>
            item.mail.id === id
              ? { ...item, state: optimisticState(item.state, action, value) }
              : item,
          ),
        }
      : data;
    await mutate(
      async () => {
        const response = await fetch(`/api/mails/${id}/${action}`, {
          method: "PATCH",
          headers: value ? { "Content-Type": "application/json" } : undefined,
          body: value ? JSON.stringify({ value }) : undefined,
        });
        if (!response.ok) throw new Error("Action failed");
        await mutateCounts();
        return fetchWithEtag<MailResponse>(mailKey);
      },
      { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
    ).catch(() => setNotice("Unable to update this message"));
    if (action === "read") void mutateThread();
  }
  async function bulk(action: string, value?: string) {
    const ids = [...selected];
    if (!ids.length) return;
    await mutate(
      async () => {
        const response = await fetch("/api/mails/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action, value }),
        });
        if (!response.ok) throw new Error("Bulk action failed");
        await mutateCounts();
        return fetchWithEtag<MailResponse>(mailKey);
      },
      { rollbackOnError: true, revalidate: true },
    ).catch(() => setNotice("Unable to update selected messages"));
    setSelected([]);
  }
  function openMail(id: string) {
    const item = items.find((entry) => entry.mail.id === id);
    if (folder === "drafts" && item) {
      setComposeDraftId(item.mail.id);
      setComposeOptions({});
      setComposeOpen(true);
      return;
    }
    setSelectedMailId(id);
    updateSelectedMailUrl(id);
  }
  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      await mutate();
      await mutateCounts();
      router.replace("/login");
    } catch {
      toast.error("Unable to sign out. You are still signed in.");
      setIsSigningOut(false);
    }
  }
  function applyFilterPanel(next: Omit<typeof filters, "page">) {
    setFilters((current) => ({ ...current, ...next, page: 1 }));
  }
  function startReply(mode: "reply" | "replyAll" | "forward") {
    if (!threadData) return;
    const original = threadData.mail.mail;
    const sender = threadData.mail.sender;
    const currentEmail =
      threadData.mail.mail.senderId === threadData.mail.sender?.id
        ? threadData.mail.sender.email
        : undefined;
    const recipients: Recipient[] = [];
    if (mode === "forward") {
      setComposeOptions({
        subject: `Fwd: ${original.subject.replace(/^Fwd: /i, "")}`,
        bodyHtml: `<p><br></p><hr><p>Forwarded message</p><p>${original.bodyHtml}</p>`,
      });
      setComposeDraftId(undefined);
      setComposeOpen(true);
      return;
    }
    if (sender) recipients.push({ email: sender.email, name: sender.name });
    if (mode === "replyAll") {
      const emails = [...original.to, ...original.cc];
      for (const email of emails)
        if (
          !recipients.some(
            (item) => item.email.toLowerCase() === email.toLowerCase(),
          ) &&
          email.toLowerCase() !== currentEmail?.toLowerCase()
        )
          recipients.push({ email, name: email });
    }
    setComposeOptions({
      to: recipients,
      subject: `Re: ${original.subject.replace(/^Re: /i, "")}`,
      bodyHtml: `<p><br></p><hr><p>On ${dateLabel(original.sentAt)}, ${sender?.name ?? "Unknown sender"} wrote:</p><blockquote>${original.bodyHtml}</blockquote>`,
      threadId: original.threadId,
      parentMailId: original.id,
    });
    setComposeDraftId(undefined);
    setComposeOpen(true);
  }
  return (
    <main className="mail-shell grid h-dvh min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
      <MailSidebar
        collapsed={sidebarCollapsed}
        folder={folder}
        counts={counts?.counts ?? {}}
        isAdmin={session?.roles?.includes("admin") ?? false}
        activeUsers={activeUserCount}
        onCompose={() => {
          setComposeDraftId(undefined);
          setComposeOptions({});
          setComposeOpen(true);
        }}
        onToggle={() => void toggleSidebar()}
      />
      <div className="mail-header pointer-events-none row-start-1 col-span-2 flex min-w-0 items-center gap-3 border-b border-border bg-card px-4 py-3 backdrop-blur">
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden shrink-0 font-semibold tracking-tight md:inline">
            Northstar Mail
          </span>
          <Input
            aria-label="Search mail"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFilters((current) => ({ ...current, page: 1 }));
            }}
            placeholder="Search mail"
            className="min-w-0 flex-1"
          />
          <FilterPopover
            value={{
              unread: filters.unread,
              starred: filters.starred,
              sender: filters.sender,
              category: filters.category,
              from: filters.from,
              to: filters.to,
              sort: filters.sort as "newest" | "oldest",
            }}
            categories={[]}
            senders={[]}
            onApply={applyFilterPanel}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            className="cursor-pointer"
            onClick={() => {
              void mutate();
              void mutateCounts();
            }}
          >
            <RefreshCwIcon />
          </Button>
          <details className="relative">
            <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {session?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2) ?? "?"}
            </summary>
            <div className="absolute right-0 top-10 z-10 w-56 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
              <p className="font-medium">{session?.name ?? "Account"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session?.email ?? ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {session?.roles.join(", ") ?? ""}
              </p>
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </details>
        </div>
      </div>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {selectedMailId && threadData ? (
          <ReadingPane
            data={threadData}
            onBack={() => {
          setSelectedMailId("");
          updateSelectedMailUrl();
        }}
            onMove={(delta) => {
              const next = itemIds[itemIds.indexOf(selectedMailId) + delta];
              if (next) {
            setSelectedMailId(next);
            updateSelectedMailUrl(next);
          }
            }}
            onAction={act}
            onReply={startReply}
          />
        ) : (
          <>
            <header className="flex items-center gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0 shrink-0">
                <h1 className="text-xl font-semibold">{labels[folder]}</h1>
                <p className="text-sm text-muted-foreground">
                  {data?.total ?? 0} messages
                </p>
              </div>
            </header>
            <div className="flex items-center gap-3 border-b border-border px-6 py-3">
              <input
                aria-label="Select all messages"
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : itemIds)}
              />
              <button
                type="button"
                onClick={() => void bulk("read")}
                className="rounded px-2 py-1 text-sm hover:bg-accent"
              >
                Mark read
              </button>
              <button
                type="button"
                onClick={() => void bulk("archive")}
                className="rounded px-2 py-1 text-sm hover:bg-accent"
              >
                Archive
              </button>
            </div>
            {error ? (
              <p className="p-6 text-sm text-destructive">
                Unable to load mail.
              </p>
            ) : isLoading && !data ? (
              <p className="p-6 text-sm text-muted-foreground">Loading mail���</p>
            ) : items.length ? (
              items.map((item) => (
                <MailRow
                  key={item.mail.id}
                  item={item}
                  checked={selected.includes(item.mail.id)}
                  onToggle={(id) =>
                    setSelected((current) =>
                      current.includes(id)
                        ? current.filter((value) => value !== id)
                        : [...current, id],
                    )
                  }
                  onOpen={openMail}
                  onAction={act}
                  rowHeight={rowHeight}
                />
              ))
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No messages in this folder.
              </p>
            )}
          </>
        )}
      </section>
      {composeOpen ? (
        <ComposeWindow
          onClose={() => {
            setComposeOpen(false);
            void mutate();
            void mutateCounts();
          }}
          draftId={composeDraftId}
          initialTo={composeOptions.to}
          initialCc={composeOptions.cc}
          initialSubject={composeOptions.subject}
          initialBodyHtml={composeOptions.bodyHtml}
          threadId={composeOptions.threadId}
          parentMailId={composeOptions.parentMailId}
        />
      ) : null}
    </main>
  );
}
function optimisticState(
  state: UserMail,
  action: string,
  value?: string,
): UserMail {
  const next = { ...state };
  if (action === "read") next.isRead = true;
  if (action === "unread") next.isRead = false;
  if (action === "star") next.isStarred = true;
  if (action === "unstar") next.isStarred = false;
  if (action === "archive") next.folder = "archive";
  if (action === "trash") next.folder = "trash";
  if (action === "spam") next.folder = "spam";
  if (action === "restore" || action === "not-spam") next.folder = "inbox";
  if (action === "category") next.categoryId = value ?? null;
  if (action === "snooze") next.snoozedUntil = value ?? null;
  return next;
}
type MailRowProps = {
  item: MailItem;
  checked: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAction: (id: string, action: string, value?: string) => Promise<void>;
  rowHeight: string;
};
const MailRow = memo(function MailRow({
  item,
  checked,
  onToggle,
  onOpen,
  onAction,
  rowHeight,
}: MailRowProps) {
  return (
    <article
      className={`mail-row flex items-center gap-4 border-b border-border px-6 ${rowHeight} ${item.state.isRead ? "bg-background" : "bg-accent/20"}`}
    >
      <input
        aria-label={`Select ${item.mail.subject}`}
        type="checkbox"
        checked={checked}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggle(item.mail.id)}
      />
      <button
        type="button"
        aria-label={item.state.isStarred ? "Unstar message" : "Star message"}
        onClick={() =>
          void onAction(item.mail.id, item.state.isStarred ? "unstar" : "star")
        }
        className="text-muted-foreground"
      >
        {
          <span
            className={
              item.state.isStarred
                ? "text-[color:var(--star)]"
                : "text-muted-foreground"
            }
          >
            {item.state.isStarred ? "★" : "☆"}
          </span>
        }
      </button>
      <button
        type="button"
        onClick={() => onOpen(item.mail.id)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {item.sender?.initials ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2
              className={`truncate text-sm ${item.state.isRead ? "font-normal" : "font-bold text-foreground"}`}
            >
              {item.mail.subject}
            </h2>
            <time className="shrink-0 text-xs text-muted-foreground">
              {dateLabel(item.mail.sentAt)}
            </time>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.sender?.name ?? "Unknown sender"} ·{" "}
            {item.mail.bodyText.replace(/\\s+/g, " ").trim()}
          </p>
        </div>
      </button>
    </article>
  );
});
function ReadingPane({
  data,
  onBack,
  onMove,
  onAction,
  onReply,
}: {
  data: ThreadResponse;
  onBack: () => void;
  onMove: (delta: number) => void;
  onAction: (id: string, action: string, value?: string) => Promise<void>;
  onReply: (mode: "reply" | "replyAll" | "forward") => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-3 py-2 text-sm bg-card cursor-pointer hover:bg-accent"
        >
          ← Back
        </button>
        {/* <button
          type="button"
          aria-label="Previous mail"
          onClick={() => onMove(-1)}
          className="rounded-md px-2 py-2 hover:bg-accent"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next mail"
          onClick={() => onMove(1)}
          className="rounded-md px-2 py-2 hover:bg-accent"
        >
          →
        </button> */}
        <button
          type="button"
          aria-label="Star message"
          onClick={() =>
            void onAction(
              data.mail.mail.id,
              data.mail.state.isStarred ? "unstar" : "star",
            )
          }
          className="ml-auto text-lg cursor-pointer"
        >
          {data.mail.state.isStarred ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={() => onReply("reply")}
          className="rounded-md px-2 py-1 text-sm hover:bg-accent cursor-pointer"
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => onReply("replyAll")}
          className="rounded-md px-2 py-1 text-sm hover:bg-accent cursor-pointer"
        >
          Reply all
        </button>
        <button
          type="button"
          onClick={() => onReply("forward")}
          className="rounded-md px-2 py-1 text-sm hover:bg-accent cursor-pointer"
        >
          Forward
        </button>
      </div>
      <article className="reading-pane-content mx-auto max-w-4xl p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{data.mail.mail.subject}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.mail.sender?.name ?? "Unknown sender"} &lt;
              {data.mail.sender?.email ?? "unknown"}&gt;
            </p>
          </div>
          {data.mail.category ? (
            <span className="rounded-full border border-border px-3 py-1 text-xs">
              {data.mail.category.name}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          {data.thread.map((item) => (
            <section
              key={item.mail.id}
              className="rounded-lg border bg-card border-border p-6"
            >
              <p className="mb-3 text-xs text-muted-foreground">
                {item.sender?.name ?? "Unknown sender"} ·{" "}
                {dateLabel(item.mail.sentAt)}
              </p>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: item.mail.bodyHtml }}
              />
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
