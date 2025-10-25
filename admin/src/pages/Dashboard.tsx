import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Zap, TrendingUp, Activity, Database } from 'lucide-react';
import axios from '~/utils/axios';

interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalConversations: number;
  totalMessages: number;
  tokensToday: number;
  tokensThisMonth: number;
  totalTokens: number;
  storageUsed: number;
  averageMessagesPerConvo: number;
}

function StatCard({ title, value, icon: Icon, subtitle, trend }: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="rounded-full bg-purple-100 p-3">
          <Icon className="h-6 w-6 text-purple-600" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={`h-4 w-4 ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`ml-2 text-sm font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="ml-2 text-sm text-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/stats', {
        withCredentials: true,
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-800">Error loading dashboard data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome to LibreChat Admin</h2>
        <p className="mt-2 text-purple-100">
          Manage users, monitor usage, and configure governance policies
        </p>
      </div>

      {/* User Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">User Statistics</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || 0}
            icon={Users}
            subtitle="Registered accounts"
          />
          <StatCard
            title="Active (24h)"
            value={stats?.activeUsers24h?.toLocaleString() || 0}
            icon={Activity}
            subtitle="Last 24 hours"
          />
          <StatCard
            title="Active (7d)"
            value={stats?.activeUsers7d?.toLocaleString() || 0}
            icon={Activity}
            subtitle="Last 7 days"
          />
          <StatCard
            title="Active (30d)"
            value={stats?.activeUsers30d?.toLocaleString() || 0}
            icon={Activity}
            subtitle="Last 30 days"
          />
        </div>
      </div>

      {/* Usage Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Usage Statistics</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Conversations"
            value={stats?.totalConversations?.toLocaleString() || 0}
            icon={MessageSquare}
            subtitle={`Avg ${stats?.averageMessagesPerConvo?.toFixed(1) || 0} msgs/convo`}
          />
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages?.toLocaleString() || 0}
            icon={MessageSquare}
          />
          <StatCard
            title="Storage Used"
            value={`${((stats?.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB`}
            icon={Database}
            subtitle="Files uploaded"
          />
        </div>
      </div>

      {/* Token Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Token Usage</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="Tokens Today"
            value={(stats?.tokensToday || 0).toLocaleString()}
            icon={Zap}
          />
          <StatCard
            title="Tokens This Month"
            value={(stats?.tokensThisMonth || 0).toLocaleString()}
            icon={Zap}
          />
          <StatCard
            title="Total Tokens"
            value={(stats?.totalTokens || 0).toLocaleString()}
            icon={Zap}
            subtitle="All time"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/admin/users"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-purple-500 hover:bg-purple-50"
          >
            <Users className="mr-3 h-8 w-8 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Manage Users</h4>
              <p className="text-sm text-gray-500">View and edit user accounts</p>
            </div>
          </a>
          <a
            href="/admin/analytics"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-purple-500 hover:bg-purple-50"
          >
            <TrendingUp className="mr-3 h-8 w-8 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Analytics</h4>
              <p className="text-sm text-gray-500">Detailed usage reports</p>
            </div>
          </a>
          <a
            href="/admin/governance"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-purple-500 hover:bg-purple-50"
          >
            <Activity className="mr-3 h-8 w-8 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Governance</h4>
              <p className="text-sm text-gray-500">Violations & policies</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
