import { getSession, requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await requireUser();
    const [allMails, allUserMails, allCategories, allUsers] = await Promise.all([
      db.getAllMails(),
      db.getAllUserMails(),
      db.getAllMailCategories(),
      db.getAllUsers(),
    ]);
    const userRoles = await db.getUserRoles(user.id);
    let isAdmin = false;
    for (const ur of userRoles) {
      const role = await db.getRoleById(ur.roleId);
      if (role?.name === 'admin') isAdmin = true;
    }

    // Get user settings
    const userSettings = await db.getUserDashboardSettings(user.id);
    const enabledWidgets = userSettings?.widgets || [];

    const data: Record<string, unknown> = {};

    // === User-visible widgets ===

    // Unread count
    if (enabledWidgets.includes('unread_count') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      const inboxMails = userMails.filter((um) => um.folder === 'inbox');
      data.unreadCount = inboxMails.filter((um) => !um.isRead).length;
    }

    // Sent today
    if (enabledWidgets.includes('sent_today') || enabledWidgets.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sentMails = allMails.filter((m) => m.senderId === user.id && m.sentAt && !m.isDraft);
      data.sentToday = sentMails.filter((m) => {
        const sentDate = new Date(m.sentAt!);
        sentDate.setHours(0, 0, 0, 0);
        return sentDate.getTime() === today.getTime();
      }).length;
    }

    // Starred count
    if (enabledWidgets.includes('starred_messages') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      data.starredCount = userMails.filter((um) => um.isStarred).length;
    }

    // Drafts count
    if (enabledWidgets.includes('drafts') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      data.draftsCount = userMails.filter((um) => um.folder === 'draft').length;
    }

    // Spam count
    if (enabledWidgets.includes('spam') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      data.spamCount = userMails.filter((um) => um.folder === 'spam').length;
    }

    // Mails per category (chart)
    if (enabledWidgets.includes('mails_per_category') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      const categoryCounts: Record<string, number> = {};

      for (const um of userMails) {
        if (um.categoryId) {
          const category = allCategories.find((c) => c.id === um.categoryId);
          if (category) {
            categoryCounts[category.name] = (categoryCounts[category.name] || 0) + 1;
          }
        }
      }

      data.mailsPerCategory = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        value: count,
      }));
    }

    // Mails received per day (last 7 days)
    if (enabledWidgets.includes('mails_per_day') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id && um.folder === 'inbox');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyCounts: Record<string, number> = {};

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyCounts[dateStr] = 0;
      }

      for (const um of userMails) {
        const mail = allMails.find((m) => m.id === um.mailId);
        if (mail && mail.sentAt) {
          const sentDate = new Date(mail.sentAt);
          sentDate.setHours(0, 0, 0, 0);
          const dateStr = sentDate.toISOString().split('T')[0];
          if (dateStr in dailyCounts) {
            dailyCounts[dateStr]++;
          }
        }
      }

      data.mailsPerDay = Object.entries(dailyCounts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }));
    }

    // Recent mails
    if (enabledWidgets.includes('recent_conversations') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      const recentMails = userMails
        .map((um) => {
          const mail = allMails.find((m) => m.id === um.mailId);
          return mail ? { ...mail, userMail: um } : null;
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aDate = new Date(a!.sentAt || a!.createdAt);
          const bDate = new Date(b!.sentAt || b!.createdAt);
          return bDate.getTime() - aDate.getTime();
        })
        .slice(0, 5)
        .map((item) => {
          const sender = allUsers.find((u) => u.id === item!.senderId);
          return {
            id: item!.id,
            subject: item!.subject,
            senderName: sender?.name || 'Unknown',
            senderEmail: sender?.email || 'unknown',
            date: item!.sentAt || item!.createdAt,
            isRead: item!.userMail.isRead,
          };
        });

      data.recentMails = recentMails;
    }

    // Top senders
    if (enabledWidgets.includes('top_senders') || enabledWidgets.length === 0) {
      const userMails = allUserMails.filter((um) => um.userId === user.id);
      const senderCounts: Record<string, { count: number; email: string }> = {};

      for (const um of userMails) {
        const mail = allMails.find((m) => m.id === um.mailId);
        if (mail) {
          const sender = allUsers.find((u) => u.id === mail.senderId);
          if (sender && sender.id !== user.id) {
            if (!senderCounts[sender.name]) {
              senderCounts[sender.name] = { count: 0, email: sender.email };
            }
            senderCounts[sender.name].count++;
          }
        }
      }

      data.topSenders = Object.entries(senderCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([name, { count, email }]) => ({ name, email, count }));
    }

    // === Admin-only widgets ===
    if (isAdmin) {
      if (enabledWidgets.includes('total_users')) {
        data.totalUsers = allUsers.length;
      }

      if (enabledWidgets.includes('users_by_role')) {
        const usersByRole: Record<string, number> = {};
        for (const ur of await db.getAllUserRoles()) {
          const role = await db.getRoleById(ur.roleId);
          if (role) {
            usersByRole[role.name] = (usersByRole[role.name] || 0) + 1;
          }
        }
        data.usersByRole = usersByRole;
      }

      if (enabledWidgets.includes('total_mails')) {
        data.totalMails = allMails.length;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Dashboard error:', error);
    return NextResponse.json({ error: 'Unable to fetch dashboard data' }, { status: 500 });
  }
}
