export interface Role {
  id: string;
  name: 'admin' | 'manager' | 'hr' | 'employee';
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  jobTitle: string;
  department: string;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
}

export interface Mail {
  id: string;
  threadId: string;
  parentMailId: string | null;
  senderId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isDraft: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface UserMail {
  userId: string;
  mailId: string;
  folder: 'inbox' | 'sent' | 'draft' | 'archive' | 'trash' | 'spam' | 'snoozed';
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  categoryId: string | null;
  snoozedUntil: string | null;
  deletedAt: string | null;
}

export interface MailCategory {
  id: string;
  name: string;
  color: string;
}

export interface DashboardSettings {
  defaultFolder: 'inbox' | 'sent' | 'draft' | 'archive' | 'trash';
  pageSize: number;
  refreshIntervalSeconds: number;
  enabledWidgets: string[];
}

export interface UserVersion {
  userId: string;
  version: number;
}

export interface UserDashboardSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  defaultFolder: 'inbox' | 'sent' | 'draft' | 'archive' | 'trash';
  sidebarCollapsed: boolean;
  rowsPerPage: number;
  refreshIntervalSeconds: number;
  notificationsEnabled: boolean;
  signature: string;
  widgets: string[];
}
