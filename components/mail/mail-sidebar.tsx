"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  PenSquare,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react";

type Folder =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "all"
  | "trash"
  | "spam";
const iconMap = { inbox: Inbox, star: Star, send: Send, "file-text": FileText, mail: Mail, trash: Trash2 } as const;
const fetchFolders = (url: string) => fetch(url).then((response) => response.json());

export function MailSidebar({
  collapsed,
  folder,
  counts,
  isAdmin,
  activeUsers,
  onCompose,
  onToggle,
}: {
  collapsed: boolean;
  folder: Folder;
  counts: Record<string, number>;
  isAdmin: boolean;
  activeUsers: number;
  onCompose: () => void;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { data: folders = [] } = useSWR<Array<{ id: Folder; label: string; icon: keyof typeof iconMap }>>("/api/mail-folders", fetchFolders, { revalidateOnFocus: false });
  const item = (
    label: string,
    icon: typeof Inbox,
    count: number | undefined,
    active: boolean,
    onClick: () => void,
  ) => {
    const content = (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        className={`sidebar-item flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${active ? "border-primary bg-accent" : "border-transparent hover:bg-accent"}`}
      >
        <span className="relative grid size-5 shrink-0 place-items-center">
          {icon &&
            (() => {
              const Icon = icon;
              return <Icon aria-hidden="true" />;
            })()}
          {collapsed && count ? (
            <span className="absolute -right-2 -top-1 size-2 rounded-full bg-unread" />
          ) : null}
        </span>
        {collapsed ? null : (
          <span className="min-w-0 flex-1 truncate">{label}</span>
        )}
        {!collapsed && count ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        ) : null}
      </button>
    );
    return collapsed ? (
      <Tooltip key={label}>
        <TooltipTrigger render={content} />
        <TooltipContent side="right">
          {label}
          {count ? ` (${count})` : ""}
        </TooltipContent>
      </Tooltip>
    ) : (
      <span key={label}>{content}</span>
    );
  };
  return (
    <TooltipProvider>
      <aside
        className={`mail-sidebar row-start-2 col-start-1 min-h-0 min-w-0 overflow-y-auto border-r border-border bg-card transition-[width] duration-200 ${collapsed ? "w-16" : "w-64"}`}
      >
        <div className="flex min-h-full flex-col gap-2 p-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  onClick={onCompose}
                  aria-label="Compose"
                  variant="default"
                  size={collapsed ? "icon" : "default"}
                  className="w-full cursor-pointer"
                />
              }
            >
              <PenSquare />
              {collapsed ? null : "Compose"}
            </TooltipTrigger>
            <TooltipContent side="right">Compose</TooltipContent>
          </Tooltip>
          <nav className="flex flex-col gap-1">
            {folders.map(({ id, label, icon }) => {
              const FolderIcon = iconMap[icon];
              return item(label, FolderIcon, counts[id], folder === id, () =>
                router.push(`/mail/${id}`),
              );
            })}
          </nav>
          <div className="my-2 border-t border-border" />
          {/* {item("Dashboard", LayoutDashboard, undefined, false, () =>
            router.push("/dashboard"),
          )} */}
          {isAdmin
            ? item("Admin page", Users, undefined, false, () =>
                router.push("/admin/users"),
              )
            : null}
          {collapsed ? null : (
            <div className="mt-auto rounded-lg border border-border bg-muted p-3 text-sm">
              <p className="font-medium">Team space</p>
              <p className="text-muted-foreground">
                {activeUsers} active members
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  onClick={onToggle}
                  className="mt-auto w-full justify-center cursor-pointer"
                />
              }
            >
              {collapsed ? (
                <ChevronsRight />
              ) : (
                <>
                  <ChevronsLeft />
                  Collapse
                </>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
