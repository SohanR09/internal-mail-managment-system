'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import { useState, useEffect } from 'react';

type DashboardData = {
  unreadCount?: number;
  sentToday?: number;
  starredCount?: number;
  draftsCount?: number;
  spamCount?: number;
  mailsPerCategory?: Array<{ name: string; value: number }>;
  mailsPerDay?: Array<{ date: string; count: number }>;
  recentMails?: Array<{
    id: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    date: string;
    isRead: boolean;
  }>;
  topSenders?: Array<{ name: string; email: string; count: number }>;
  totalUsers?: number;
  usersByRole?: Record<string, number>;
  totalMails?: number;
};

const COLORS = [
  'var(--chart-1)',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function StatCard({ label, value, icon }: { label: string; value?: number; icon?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value ?? '-'}</p>
          </div>
          {icon && <span className="text-3xl text-muted-foreground">{icon}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function MailsPerCategoryChart({ data }: { data: DashboardData['mailsPerCategory'] }) {
  if (!data?.length) return null;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Mails per Category</CardTitle>
        <CardDescription>Distribution of your mails by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: 'Count',
              color: 'var(--chart-1)',
            },
          }}
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name} (${value})`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function MailsPerDayChart({ data }: { data: DashboardData['mailsPerDay'] }) {
  if (!data?.length) return null;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Mails Received (Last 7 Days)</CardTitle>
        <CardDescription>Daily mail activity over the past week</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            count: {
              label: 'Mails',
              color: 'hsl(var(--chart-2))',
            },
          }}
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '0.875rem' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '0.875rem' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function RecentMailsWidget({ data }: { data: DashboardData['recentMails'] }) {
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Mails</CardTitle>
        <CardDescription>Your latest messages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((mail) => (
            <div key={mail.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${mail.isRead ? 'font-normal' : 'font-semibold'}`}>{mail.subject}</p>
                  <p className="text-xs text-muted-foreground">{mail.senderName}</p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{new Date(mail.date).toLocaleDateString()}</time>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopSendersWidget({ data }: { data: DashboardData['topSenders'] }) {
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Senders</CardTitle>
        <CardDescription>Most frequent senders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((sender, idx) => (
            <div key={`${sender.email}-${idx}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{sender.name}</p>
                <p className="text-xs text-muted-foreground">{sender.email}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-primary">{sender.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({
  data: initialData,
  enabledWidgets,
  isAdmin,
}: {
  data: DashboardData;
  enabledWidgets: string[];
  isAdmin: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh dashboard data every 30 seconds
  const { data = initialData, isLoading } = useSWR<DashboardData>('/api/dashboard', async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json() as Promise<DashboardData>;
  }, {
    refreshInterval: 30000,
    dedupingInterval: 5000,
  });

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your mail activity</p>

        {isLoading && <p className="mt-4 text-xs text-muted-foreground">Updating...</p>}

        {/* User Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {enabledWidgets.includes('unread_count') && data.unreadCount !== undefined && (
            <StatCard label="Unread" value={data.unreadCount} />
          )}
          {enabledWidgets.includes('sent_today') && data.sentToday !== undefined && (
            <StatCard label="Sent Today" value={data.sentToday} />
          )}
          {enabledWidgets.includes('starred_messages') && data.starredCount !== undefined && (
            <StatCard label="Starred" value={data.starredCount} />
          )}
          {enabledWidgets.includes('drafts') && data.draftsCount !== undefined && (
            <StatCard label="Drafts" value={data.draftsCount} />
          )}
          {enabledWidgets.includes('spam') && data.spamCount !== undefined && (
            <StatCard label="Spam" value={data.spamCount} />
          )}
        </div>

        {/* Admin Stats */}
        {isAdmin && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {enabledWidgets.includes('total_users') && data.totalUsers !== undefined && (
              <StatCard label="Total Users" value={data.totalUsers} icon="👥" />
            )}
            {enabledWidgets.includes('total_mails') && data.totalMails !== undefined && (
              <StatCard label="Total Mails" value={data.totalMails} icon="📧" />
            )}
          </div>
        )}

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {enabledWidgets.includes('mails_per_day') && data.mailsPerDay && (
            <MailsPerDayChart data={data.mailsPerDay} />
          )}
          {enabledWidgets.includes('mails_per_category') && data.mailsPerCategory && (
            <MailsPerCategoryChart data={data.mailsPerCategory} />
          )}
        </div>

        {/* Widgets */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {enabledWidgets.includes('recent_conversations') && data.recentMails && (
            <RecentMailsWidget data={data.recentMails} />
          )}
          {enabledWidgets.includes('top_senders') && data.topSenders && (
            <TopSendersWidget data={data.topSenders} />
          )}
        </div>

        {/* Admin widgets */}
        {isAdmin && enabledWidgets.includes('users_by_role') && data.usersByRole && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
              <CardDescription>Distribution of users across roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.usersByRole).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <p className="text-sm capitalize">{role}</p>
                    <p className="text-sm font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
