import { db } from '@/lib/db';
import type { Mail, MailCategory, User, UserMail } from '@/lib/db/types';
import sanitizeHtml from 'sanitize-html';

export const MAIL_FOLDERS = ['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'all', 'trash', 'spam'] as const;
export type MailFolder = (typeof MAIL_FOLDERS)[number];

export interface MailItem {
  mail: Mail;
  state: UserMail;
  sender: { id: string; name: string; initials: string; email: string } | null;
  category: MailCategory | null;
}

export function etag(userId: string, version: number): string {
  return `W/"${userId}-${version}"`;
}

export function matchesFolder(state: UserMail, folder: MailFolder, now: number): boolean {
  const isSnoozed = Boolean(state.snoozedUntil && Date.parse(state.snoozedUntil) > now);
  if (folder === 'snoozed') return isSnoozed;
  if (isSnoozed) return false;
  if (folder === 'all') return state.folder !== 'trash' && state.folder !== 'spam';
  if (folder === 'starred') return state.isStarred && state.folder !== 'trash' && state.folder !== 'spam';
  if (folder === 'drafts') return state.folder === 'draft';
  return state.folder === folder;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export async function getMailData(userId: string): Promise<{ mails: Mail[]; states: UserMail[]; users: User[]; categories: MailCategory[] }> {
  const [mails, allStates, users, categories] = await Promise.all([
    db.getAllMails(),
    db.getAllUserMails(),
    db.getAllUsers(),
    db.getAllMailCategories(),
  ]);
  return { mails, states: allStates.filter((state) => state.userId === userId), users, categories };
}

export function toMailItem(mail: Mail, state: UserMail, users: User[], categories: MailCategory[]): MailItem {
  const sender = users.find((user) => user.id === mail.senderId);
  return {
    mail: { ...mail, bodyHtml: sanitizeHtml(mail.bodyHtml) },
    state,
    sender: sender ? { id: sender.id, name: sender.name, initials: initials(sender.name), email: sender.email } : null,
    category: state.categoryId ? categories.find((category) => category.id === state.categoryId) ?? null : null,
  };
}
