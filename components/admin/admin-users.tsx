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
          body: JSON.stringify(form),
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
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Add user</h2>
        <form onSubmit={addUser} className="grid gap-3 md:grid-cols-3">
          {(
            ["name", "email", "password", "jobTitle", "department"] as const
          ).map((field) => (
            <input
              key={field}
              required={field !== "jobTitle" && field !== "department"}
              type={
                field === "password"
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              placeholder={field}
              value={form[field]}
              onChange={(event) =>
                setForm({ ...form, [field]: event.target.value })
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          ))}
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
          <button className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
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
