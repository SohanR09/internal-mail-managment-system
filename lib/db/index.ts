import fs from 'fs';
import path from 'path';
import {
  Role,
  User,
  UserRole,
  Mail,
  UserMail,
  MailCategory,
  DashboardSettings,
  UserDashboardSettings,
  UserVersion,
} from './types';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

// In-process mutex for atomic writes
const mutexes = new Map<string, Promise<void>>();

function getMutex(filePath: string): Promise<void> {
  if (!mutexes.has(filePath)) {
    mutexes.set(filePath, Promise.resolve());
  }
  return mutexes.get(filePath)!;
}

function setMutex(filePath: string, promise: Promise<void>): void {
  mutexes.set(filePath, promise);
}

// Ensure DB directory exists
function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Get file path
function getFilePath(collection: string): string {
  return path.join(DB_DIR, `${collection}.json`);
}

// Read collection
function readCollection<T>(collection: string): T[] {
  ensureDbDir();
  const filePath = getFilePath(collection);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

// Write collection atomically
async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  ensureDbDir();
  const filePath = getFilePath(collection);

  // Wait for previous writes
  await getMutex(filePath);

  // Create new mutex promise
  const writePromise = (async () => {
    const tempPath = `${filePath}.tmp`;
    const jsonData = JSON.stringify(data, null, 2);

    return new Promise<void>((resolve, reject) => {
      fs.writeFile(tempPath, jsonData, (err) => {
        if (err) {
          reject(err);
        } else {
          fs.rename(tempPath, filePath, (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  })();

  setMutex(filePath, writePromise);
  await writePromise;
}

// Generic CRUD operations
export const db = {
  // Roles
  async getAllRoles(): Promise<Role[]> {
    return readCollection<Role>('roles');
  },

  async getRoleById(id: string): Promise<Role | undefined> {
    const roles = readCollection<Role>('roles');
    return roles.find((r) => r.id === id);
  },

  async insertRole(role: Role): Promise<void> {
    const roles = readCollection<Role>('roles');
    roles.push(role);
    await writeCollection('roles', roles);
  },

  async updateRole(id: string, updates: Partial<Role>): Promise<void> {
    const roles = readCollection<Role>('roles');
    const index = roles.findIndex((r) => r.id === id);
    if (index !== -1) {
      roles[index] = { ...roles[index], ...updates };
      await writeCollection('roles', roles);
    }
  },

  async removeRole(id: string): Promise<void> {
    const roles = readCollection<Role>('roles');
    await writeCollection(
      'roles',
      roles.filter((r) => r.id !== id)
    );
  },

  // Users
  async getAllUsers(): Promise<User[]> {
    return readCollection<User>('users');
  },

  async getUserById(id: string): Promise<User | undefined> {
    const users = readCollection<User>('users');
    return users.find((u) => u.id === id);
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = readCollection<User>('users');
    return users.find((u) => u.email === email);
  },

  async insertUser(user: User): Promise<void> {
    const users = readCollection<User>('users');
    users.push(user);
    await writeCollection('users', users);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const users = readCollection<User>('users');
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await writeCollection('users', users);
    }
  },

  async removeUser(id: string): Promise<void> {
    const users = readCollection<User>('users');
    await writeCollection(
      'users',
      users.filter((u) => u.id !== id)
    );
  },

  // User Roles
  async getAllUserRoles(): Promise<UserRole[]> {
    return readCollection<UserRole>('user-roles');
  },

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const userRoles = readCollection<UserRole>('user-roles');
    return userRoles.filter((ur) => ur.userId === userId);
  },

  async insertUserRole(userRole: UserRole): Promise<void> {
    const userRoles = readCollection<UserRole>('user-roles');
    userRoles.push(userRole);
    await writeCollection('user-roles', userRoles);
  },

  async removeUserRole(userId: string, roleId: string): Promise<void> {
    const userRoles = readCollection<UserRole>('user-roles');
    await writeCollection(
      'user-roles',
      userRoles.filter((ur) => !(ur.userId === userId && ur.roleId === roleId))
    );
  },

  // Mails
  async getAllMails(): Promise<Mail[]> {
    return readCollection<Mail>('mails');
  },

  async getMailById(id: string): Promise<Mail | undefined> {
    const mails = readCollection<Mail>('mails');
    return mails.find((m) => m.id === id);
  },

  async insertMail(mail: Mail): Promise<void> {
    const mails = readCollection<Mail>('mails');
    mails.push(mail);
    await writeCollection('mails', mails);
  },

  async updateMail(id: string, updates: Partial<Mail>): Promise<void> {
    const mails = readCollection<Mail>('mails');
    const index = mails.findIndex((m) => m.id === id);
    if (index !== -1) {
      mails[index] = { ...mails[index], ...updates };
      await writeCollection('mails', mails);
    }
  },

  async removeMail(id: string): Promise<void> {
    const mails = readCollection<Mail>('mails');
    await writeCollection(
      'mails',
      mails.filter((m) => m.id !== id)
    );
  },

  // User Mails
  async getAllUserMails(): Promise<UserMail[]> {
    return readCollection<UserMail>('user-mails');
  },

  async getUserMailsForMail(mailId: string): Promise<UserMail[]> {
    const userMails = readCollection<UserMail>('user-mails');
    return userMails.filter((um) => um.mailId === mailId);
  },

  async getUserMailsByFolder(userId: string, folder: string): Promise<UserMail[]> {
    const userMails = readCollection<UserMail>('user-mails');
    return userMails.filter((um) => um.userId === userId && um.folder === folder);
  },

  async insertUserMail(userMail: UserMail): Promise<void> {
    const userMails = readCollection<UserMail>('user-mails');
    userMails.push(userMail);
    await writeCollection('user-mails', userMails);
  },

  async updateUserMail(
    userId: string,
    mailId: string,
    updates: Partial<UserMail>
  ): Promise<void> {
    const userMails = readCollection<UserMail>('user-mails');
    const index = userMails.findIndex((um) => um.userId === userId && um.mailId === mailId);
    if (index !== -1) {
      userMails[index] = { ...userMails[index], ...updates };
      await writeCollection('user-mails', userMails);
    }
  },

  async removeUserMail(userId: string, mailId: string): Promise<void> {
    const userMails = readCollection<UserMail>('user-mails');
    await writeCollection(
      'user-mails',
      userMails.filter((um) => !(um.userId === userId && um.mailId === mailId))
    );
  },

  // Mail Categories
  async getAllMailCategories(): Promise<MailCategory[]> {
    return readCollection<MailCategory>('mail-category');
  },

  async getMailCategoryById(id: string): Promise<MailCategory | undefined> {
    const categories = readCollection<MailCategory>('mail-category');
    return categories.find((c) => c.id === id);
  },

  async insertMailCategory(category: MailCategory): Promise<void> {
    const categories = readCollection<MailCategory>('mail-category');
    categories.push(category);
    await writeCollection('mail-category', categories);
  },

  async updateMailCategory(id: string, updates: Partial<MailCategory>): Promise<void> {
    const categories = readCollection<MailCategory>('mail-category');
    const index = categories.findIndex((c) => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      await writeCollection('mail-category', categories);
    }
  },

  async removeMailCategory(id: string): Promise<void> {
    const categories = readCollection<MailCategory>('mail-category');
    await writeCollection(
      'mail-category',
      categories.filter((c) => c.id !== id)
    );
  },

  // Dashboard Settings
  async getDashboardSettings(): Promise<DashboardSettings | undefined> {
    const settings = readCollection<DashboardSettings>('dashboard-settings');
    return settings[0];
  },

  async updateDashboardSettings(updates: Partial<DashboardSettings>): Promise<void> {
    const settings = readCollection<DashboardSettings>('dashboard-settings');
    if (settings.length === 0) {
      settings.push(updates as DashboardSettings);
    } else {
      settings[0] = { ...settings[0], ...updates };
    }
    await writeCollection('dashboard-settings', settings);
  },

  // User Dashboard Settings
  async getUserDashboardSettings(userId: string): Promise<UserDashboardSettings | undefined> {
    const settings = readCollection<UserDashboardSettings>('user-dashboard-settings');
    return settings.find((s) => s.userId === userId);
  },

  async insertUserDashboardSettings(settings: UserDashboardSettings): Promise<void> {
    const allSettings = readCollection<UserDashboardSettings>('user-dashboard-settings');
    allSettings.push(settings);
    await writeCollection('user-dashboard-settings', allSettings);
  },

  async updateUserDashboardSettings(
    userId: string,
    updates: Partial<UserDashboardSettings>
  ): Promise<void> {
    const settings = readCollection<UserDashboardSettings>('user-dashboard-settings');
    const index = settings.findIndex((s) => s.userId === userId);
    if (index !== -1) {
      settings[index] = { ...settings[index], ...updates };
      await writeCollection('user-dashboard-settings', settings);
    }
  },

  async getUserVersion(userId: string): Promise<number> {
    const versions = readCollection<UserVersion>('versions');
    return versions.find((entry) => entry.userId === userId)?.version ?? 1;
  },

  async incrementUserVersion(userId: string): Promise<void> {
    const versions = readCollection<UserVersion>('versions');
    const index = versions.findIndex((entry) => entry.userId === userId);
    if (index === -1) {
      versions.push({ userId, version: 1 });
    } else {
      versions[index] = { ...versions[index], version: versions[index].version + 1 };
    }
    await writeCollection('versions', versions);
  },
};
