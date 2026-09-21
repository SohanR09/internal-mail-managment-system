"use client";

import { useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
};
type Role = { id: string; name: string };

export function AdminUsers({
  initialUsers,
  roles,
}: {
  initialUsers: User[];
  roles: Role[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    jobTitle: "",
    department: "",
    roleId: roles.find((r) => r.name === "employee")?.id ?? roles[0]?.id ?? "",
  });
  const [message, setMessage] = useState("");
  async function refresh(response: Response) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    setUsers(data.users);
  }
  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    try {
      await refresh(
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, email: `${form.email}@northstar.co` }),
        }),
      );
      setForm({
        ...form,
        name: "",
        email: "",
        password: "",
        jobTitle: "",
        department: "",
      });
      setMessage("User added");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add user");
    }
  }
  async function updateUser(userId: string, update: object) {
    try {
      await refresh(
        await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...update }),
        }),
      );
      setMessage("User updated");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update user",
      );
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <header>
        <p className="text-sm text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-semibold">Users</h1>
      </header>
      {message ? (
        <p
          role="status"
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm"
        >
          {message}
        </p>
      ) : null}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Directory access
            </p>
            <h2 className="mt-1 text-lg font-semibold">Add user</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a Northstar account and assign its first role.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            @northstar.co
          </span>
        </div>
        <form onSubmit={addUser} className="grid gap-4 md:grid-cols-3">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex min-w-0 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
            <input
              required
              type="text"
              inputMode="email"
              pattern="[A-Za-z0-9._%+-]+"
              title="Enter the email name before @northstar.co"
              placeholder="email name"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value.replace(/\\s/g, "") })
              }
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <span className="flex items-center border-l border-border px-3 text-sm text-muted-foreground">
              @northstar.co
            </span>
          </div>
          <input
            required
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Job title (optional)"
            value={form.jobTitle}
            onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Department (optional)"
            value={form.department}
            onChange={(event) => setForm({ ...form, department: event.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={form.roleId}
            onChange={(event) =>
              setForm({ ...form, roleId: event.target.value })
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Add user
          </button>
        </form>
      </section>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-4">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </td>
                  <td className="p-4">
                    <select
                      value={
                        roles.find((role) => user.roles.includes(role.name))
                          ?.id ?? ""
                      }
                      onChange={(event) =>
                        void updateUser(user.id, {
                          action: "role",
                          roleId: event.target.value,
                        })
                      }
                      className="rounded-md border border-border bg-background px-2 py-1"
                    >
                      <option value="" disabled>
                        Select role
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <span
                      className={
                        user.isActive
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() =>
                        void updateUser(user.id, {
                          action: "status",
                          isActive: !user.isActive,
                        })
                      }
                      className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
