import fs from "fs";
import path from "path";
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
} from "./types";

const DB_DIR = path.join(process.cwd(), "data", "db");
const mutexes = new Map<string, Promise<void>>();
const runtimeCollections = new Map<string, unknown[]>();
function getMutex(filePath: string): Promise<void> {
  if (!mutexes.has(filePath)) mutexes.set(filePath, Promise.resolve());
  return mutexes.get(filePath)!;
}
function setMutex(filePath: string, promise: Promise<void>): void {
  mutexes.set(filePath, promise);
}
function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}
function getFilePath(collection: string): string {
  return path.join(DB_DIR, `${collection}.json`);
}
function readCollection<T>(collection: string): T[] {
  const runtimeValue = runtimeCollections.get(collection);
  if (runtimeValue) return structuredClone(runtimeValue) as T[];
  ensureDbDir();
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}
async function writeCollection<T>(
  collection: string,
  data: T[],
): Promise<void> {
  ensureDbDir();
  const filePath = getFilePath(collection);
  const previousWrite = getMutex(filePath);
  const writePromise = previousWrite.then(
    () =>
      new Promise<void>((resolve, reject) => {
        const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFile(tempPath, JSON.stringify(data, null, 2), (err) => {
          if (err) {
            reject(err);
            return;
          }
          fs.rename(tempPath, filePath, (renameError) =>
            renameError ? reject(renameError) : resolve(),
          );
        });
      }),
  );
  setMutex(filePath, writePromise.catch(() => undefined));
  try {
    await writePromise;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EROFS" && (error as NodeJS.ErrnoException)?.code !== "EACCES") throw error;
    runtimeCollections.set(collection, structuredClone(data));
    console.warn(`[v0] Using runtime storage for ${collection}; filesystem is read-only.`);
  }
}

export const db = {
  async getAllRoles(): Promise<Role[]> {
    return readCollection<Role>("roles");
  },
  async getRoleById(id: string): Promise<Role | undefined> {
    return readCollection<Role>("roles").find((r) => r.id === id);
  },
  async insertRole(role: Role): Promise<void> {
    const roles = readCollection<Role>("roles");
    roles.push(role);
    await writeCollection("roles", roles);
  },
  async updateRole(id: string, updates: Partial<Role>): Promise<void> {
    const roles = readCollection<Role>("roles");
    const i = roles.findIndex((r) => r.id === id);
    if (i !== -1) {
      roles[i] = { ...roles[i], ...updates };
      await writeCollection("roles", roles);
    }
  },
  async removeRole(id: string): Promise<void> {
    await writeCollection(
      "roles",
      readCollection<Role>("roles").filter((r) => r.id !== id),
    );
  },
  async getAllUsers(): Promise<User[]> {
    return readCollection<User>("users");
  },
  async getUserById(id: string): Promise<User | undefined> {
    return readCollection<User>("users").find((u) => u.id === id);
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    return readCollection<User>("users").find((u) => u.email === email);
  },
  async insertUser(user: User): Promise<void> {
    const users = readCollection<User>("users");
    users.push(user);
    await writeCollection("users", users);
  },
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const users = readCollection<User>("users");
    const i = users.findIndex((u) => u.id === id);
    if (i !== -1) {
      users[i] = { ...users[i], ...updates };
      await writeCollection("users", users);
    }
  },
  async removeUser(id: string): Promise<void> {
    await writeCollection(
      "users",
      readCollection<User>("users").filter((u) => u.id !== id),
    );
  },
  async getAllUserRoles(): Promise<UserRole[]> {
    return readCollection<UserRole>("user-roles");
  },
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return readCollection<UserRole>("user-roles").filter(
      (ur) => ur.userId === userId,
    );
  },
  async insertUserRole(userRole: UserRole): Promise<void> {
    const roles = readCollection<UserRole>("user-roles");
    roles.push(userRole);
    await writeCollection("user-roles", roles);
  },
  async removeUserRole(userId: string, roleId: string): Promise<void> {
    await writeCollection(
      "user-roles",
      readCollection<UserRole>("user-roles").filter(
        (ur) => !(ur.userId === userId && ur.roleId === roleId),
      ),
    );
  },
  async removeAllUserRoles(userId: string): Promise<void> {
    await writeCollection(
      "user-roles",
      readCollection<UserRole>("user-roles").filter(
        (ur) => ur.userId !== userId,
      ),
    );
  },
  async getAllMails(): Promise<Mail[]> {
    return readCollection<Mail>("mails");
  },
  async getMailById(id: string): Promise<Mail | undefined> {
    return readCollection<Mail>("mails").find((m) => m.id === id);
  },
  async insertMail(mail: Mail): Promise<void> {
    const mails = readCollection<Mail>("mails");
    mails.push(mail);
    await writeCollection("mails", mails);
  },
  async updateMail(id: string, updates: Partial<Mail>): Promise<void> {
    const mails = readCollection<Mail>("mails");
    const i = mails.findIndex((m) => m.id === id);
    if (i !== -1) {
      mails[i] = { ...mails[i], ...updates };
      await writeCollection("mails", mails);
    }
  },
  async removeMail(id: string): Promise<void> {
    await writeCollection(
      "mails",
      readCollection<Mail>("mails").filter((m) => m.id !== id),
    );
  },
  async getAllUserMails(): Promise<UserMail[]> {
    return readCollection<UserMail>("user-mails");
  },
  async getUserMailsForMail(mailId: string): Promise<UserMail[]> {
    return readCollection<UserMail>("user-mails").filter(
      (um) => um.mailId === mailId,
    );
  },
  async getUserMailsByFolder(
    userId: string,
    folder: string,
  ): Promise<UserMail[]> {
    return readCollection<UserMail>("user-mails").filter(
      (um) => um.userId === userId && um.folder === folder,
    );
  },
  async insertUserMail(userMail: UserMail): Promise<void> {
    const rows = readCollection<UserMail>("user-mails");
    rows.push(userMail);
    await writeCollection("user-mails", rows);
  },
  async updateUserMail(
    userId: string,
    mailId: string,
    updates: Partial<UserMail>,
  ): Promise<void> {
    const rows = readCollection<UserMail>("user-mails");
    const i = rows.findIndex(
      (um) => um.userId === userId && um.mailId === mailId,
    );
    if (i !== -1) {
      rows[i] = { ...rows[i], ...updates };
      await writeCollection("user-mails", rows);
    }
  },
  async removeUserMail(userId: string, mailId: string): Promise<void> {
    await writeCollection(
      "user-mails",
      readCollection<UserMail>("user-mails").filter(
        (um) => !(um.userId === userId && um.mailId === mailId),
      ),
    );
  },
  async removeAllUserMails(userId: string): Promise<void> {
    await writeCollection(
      "user-mails",
      readCollection<UserMail>("user-mails").filter(
        (um) => um.userId !== userId,
      ),
    );
  },
  async getAllMailCategories(): Promise<MailCategory[]> {
    return readCollection<MailCategory>("mail-category");
  },
  async getMailCategoryById(id: string): Promise<MailCategory | undefined> {
    return readCollection<MailCategory>("mail-category").find(
      (c) => c.id === id,
    );
  },
  async insertMailCategory(category: MailCategory): Promise<void> {
    const rows = readCollection<MailCategory>("mail-category");
    rows.push(category);
    await writeCollection("mail-category", rows);
  },
  async updateMailCategory(
    id: string,
    updates: Partial<MailCategory>,
  ): Promise<void> {
    const rows = readCollection<MailCategory>("mail-category");
    const i = rows.findIndex((c) => c.id === id);
    if (i !== -1) {
      rows[i] = { ...rows[i], ...updates };
      await writeCollection("mail-category", rows);
    }
  },
  async removeMailCategory(id: string): Promise<void> {
    await writeCollection(
      "mail-category",
      readCollection<MailCategory>("mail-category").filter((c) => c.id !== id),
    );
  },
  async getDashboardSettings(): Promise<DashboardSettings | undefined> {
    return readCollection<DashboardSettings>("dashboard-settings")[0];
  },
  async updateDashboardSettings(
    updates: Partial<DashboardSettings>,
  ): Promise<void> {
    const rows = readCollection<DashboardSettings>("dashboard-settings");
    if (!rows.length) rows.push(updates as DashboardSettings);
    else rows[0] = { ...rows[0], ...updates };
    await writeCollection("dashboard-settings", rows);
  },
  async getUserDashboardSettings(
    userId: string,
  ): Promise<UserDashboardSettings | undefined> {
    return readCollection<UserDashboardSettings>(
      "user-dashboard-settings",
    ).find((s) => s.userId === userId);
  },
  async insertUserDashboardSettings(
    settings: UserDashboardSettings,
  ): Promise<void> {
    const rows = readCollection<UserDashboardSettings>(
      "user-dashboard-settings",
    );
    rows.push(settings);
    await writeCollection("user-dashboard-settings", rows);
  },
  async updateUserDashboardSettings(
    userId: string,
    updates: Partial<UserDashboardSettings>,
  ): Promise<void> {
    const rows = readCollection<UserDashboardSettings>(
      "user-dashboard-settings",
    );
    const i = rows.findIndex((s) => s.userId === userId);
    if (i !== -1) {
      rows[i] = { ...rows[i], ...updates };
      await writeCollection("user-dashboard-settings", rows);
    }
  },
  async removeUserDashboardSettings(userId: string): Promise<void> {
    await writeCollection(
      "user-dashboard-settings",
      readCollection<UserDashboardSettings>("user-dashboard-settings").filter(
        (s) => s.userId !== userId,
      ),
    );
  },
  async getUserVersion(userId: string): Promise<number> {
    return (
      readCollection<{ userId: string; version: number }>("versions").find(
        (entry) => entry.userId === userId,
      )?.version ?? 1
    );
  },
  async incrementUserVersion(userId: string): Promise<void> {
    const rows = readCollection<{ userId: string; version: number }>(
      "versions",
    );
    const i = rows.findIndex((entry) => entry.userId === userId);
    if (i === -1) rows.push({ userId, version: 1 });
    else rows[i] = { ...rows[i], version: rows[i].version + 1 };
    await writeCollection("versions", rows);
  },
};
