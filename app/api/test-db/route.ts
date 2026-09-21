import { db } from '@/lib/db';

export async function GET() {
  try {
    const roles = await db.getAllRoles();
    const users = await db.getAllUsers();
    const userRoles = await db.getAllUserRoles();
    const mails = await db.getAllMails();
    const userMails = await db.getAllUserMails();
    const categories = await db.getAllMailCategories();
    const dashboardSettings = await db.getDashboardSettings();
    const userDashboardSettings = await Promise.all(
      ['user_jordan', 'user_maya', 'user_nora', 'user_andre', 'user_hr', 'user_finance', 'user_eli'].map((id) =>
        db.getUserDashboardSettings(id)
      )
    );

    return Response.json({
      collections: {
        roles: roles.length,
        users: users.length,
        userRoles: userRoles.length,
        mails: mails.length,
        userMails: userMails.length,
        mailCategories: categories.length,
        dashboardSettings: dashboardSettings ? 1 : 0,
        userDashboardSettings: userDashboardSettings.filter((s) => s).length,
      },
      verification: {
        adminUser: users.find((u) => u.email === 'jordan@northstar.co'),
        roleCount: roles.length === 4,
        userCount: users.length === 7,
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
