import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

async function serializeUsers() {
  const [users, roles, assignments] = await Promise.all([
    db.getAllUsers(),
    db.getAllRoles(),
    db.getAllUserRoles(),
  ]);
  return users.map(({ passwordHash: _passwordHash, ...user }) => ({
    ...user,
    roles: assignments
      .filter((a) => a.userId === user.id)
      .map((a) => roles.find((r) => r.id === a.roleId)?.name)
      .filter(Boolean),
  }));
}

export async function GET() {
  try {
    await requireRole("admin");
    return NextResponse.json({
      users: await serializeUsers(),
      roles: await db.getAllRoles(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Forbidden"
            ? "Forbidden"
            : "Unauthorized",
      },
      {
        status:
          error instanceof Error && error.message === "Forbidden" ? 403 : 401,
      },
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  jobTitle: z.string().max(120).default(""),
  department: z.string().max(120).default(""),
  roleId: z.string().min(1),
});
const patchSchema = z.object({
  action: z.enum(["role", "status"]),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid user details" },
        { status: 400 },
      );
    const input = parsed.data;
    if (await db.getUserByEmail(input.email))
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    if (!(await db.getRoleById(input.roleId)))
      return NextResponse.json({ error: "Role not found" }, { status: 400 });
    const id = `user_${randomUUID()}`;
    await db.insertUser({
      id,
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      jobTitle: input.jobTitle,
      department: input.department,
      avatar: null,
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    });
    await db.insertUserRole({ userId: id, roleId: input.roleId });
    return NextResponse.json(
      { users: await serializeUsers() },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Forbidden"
            ? "Forbidden"
            : "Unauthorized",
      },
      {
        status:
          error instanceof Error && error.message === "Forbidden" ? 403 : 401,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("admin");
    const body = await request.json();
    const userId = z.string().min(1).parse(body.userId);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    const target = await db.getUserById(userId);
    if (!target)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (parsed.data.action === "role") {
      if (!parsed.data.roleId || !(await db.getRoleById(parsed.data.roleId)))
        return NextResponse.json({ error: "Role not found" }, { status: 400 });
      const current = await db.getUserRoles(userId);
      await Promise.all(
        current.map((r) => db.removeUserRole(userId, r.roleId)),
      );
      await db.insertUserRole({ userId, roleId: parsed.data.roleId });
    } else {
      if (userId === admin.id && parsed.data.isActive === false)
        return NextResponse.json(
          { error: "You cannot deactivate yourself" },
          { status: 400 },
        );
      await db.updateUser(userId, { isActive: parsed.data.isActive });
    }
    return NextResponse.json({ users: await serializeUsers() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Forbidden"
            ? "Forbidden"
            : "Unauthorized",
      },
      {
        status:
          error instanceof Error && error.message === "Forbidden" ? 403 : 401,
      },
    );
  }
}
