import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminUsers } from "@/components/admin/admin-users";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("admin")) redirect("/dashboard");
  const [users, roles, assignments] = await Promise.all([
    db.getAllUsers(),
    db.getAllRoles(),
    db.getAllUserRoles(),
  ]);
  const safeUsers = users.map(({ passwordHash: _passwordHash, ...user }) => ({
    ...user,
    roles: assignments
      .filter((a) => a.userId === user.id)
      .map((a) => roles.find((r) => r.id === a.roleId)?.name ?? "employee"),
  }));
  const userSettings = await db.getUserDashboardSettings(session.user.id);
  const defaultFolder =
    userSettings?.defaultFolder === "draft"
      ? "drafts"
      : userSettings?.defaultFolder || "inbox";
  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <PageHeader title="Admin users" backHref={`/mail/${defaultFolder}`} />
      <AdminUsers initialUsers={safeUsers} roles={roles} />
    </main>
  );
}
