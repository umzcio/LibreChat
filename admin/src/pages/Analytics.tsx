import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '~/utils/axios';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Activity, MessageSquare, Database, Users } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
}

function StatCard({ title, value, icon, subtitle, trend }: StatCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && <p className="mt-1 text-sm text-green-600">{trend}</p>}
        </div>
        <div className="rounded-full bg-purple-100 p-3">{icon}</div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      'all': null,
    };
    return ranges[timeRange];
  };

  const dateParams = {
    startDate: getDateRange()?.toISOString(),
  };

  // Fetch all analytics data
  const { data: messageAnalytics } = useQuery({
    queryKey: ['message-analytics', timeRange],
    queryFn: async () => {
      const response = await axios.get('/api/admin/detailed-analytics/messages', {
        params: dateParams,
        withCredentials: true,
      });
      return response.data;
    },
  });

  // Available for future use
  // const { data: conversationAnalytics } = useQuery({
  //   queryKey: ['conversation-analytics', timeRange],
  //   queryFn: async () => {
  //     const response = await axios.get('/api/admin/detailed-analytics/conversations', {
  //       params: dateParams,
  //       withCredentials: true,
  //     });
  //     return response.data;
  //   },
  // });

  const { data: modelAnalytics } = useQuery({
    queryKey: ['model-analytics', timeRange],
    queryFn: async () => {
      const response = await axios.get('/api/admin/detailed-analytics/models', {
        params: dateParams,
        withCredentials: true,
      });
      return response.data;
    },
  });

  const { data: storageAnalytics } = useQuery({
    queryKey: ['storage-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/detailed-analytics/storage', {
        withCredentials: true,
      });
      return response.data;
    },
  });

  // Available for future use
  // const { data: transactionAnalytics } = useQuery({
  //   queryKey: ['transaction-analytics', timeRange],
  //   queryFn: async () => {
  //     const response = await axios.get('/api/admin/detailed-analytics/transactions', {
  //       params: dateParams,
  //       withCredentials: true,
  //     });
  //     return response.data;
  //   },
  // });

  const { data: engagementAnalytics } = useQuery({
    queryKey: ['engagement-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/detailed-analytics/engagement', {
        withCredentials: true,
      });
      return response.data;
    },
  });

  // Chart data configurations
  const messagesOverTimeData = {
    labels: messageAnalytics?.messagesOverTime?.map((d: any) => d.date) || [],
    datasets: [
      {
        label: 'Messages',
        data: messageAnalytics?.messagesOverTime?.map((d: any) => d.count) || [],
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const tokensOverTimeData = {
    labels: messageAnalytics?.messagesOverTime?.map((d: any) => d.date) || [],
    datasets: [
      {
        label: 'Tokens',
        data: messageAnalytics?.messagesOverTime?.map((d: any) => d.tokens) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const modelUsageData = {
    labels: modelAnalytics?.modelUsage?.slice(0, 5).map((m: any) => m.model) || [],
    datasets: [
      {
        label: 'Messages',
        data: modelAnalytics?.modelUsage?.slice(0, 5).map((m: any) => m.messageCount) || [],
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  const fileTypesData = {
    labels: storageAnalytics?.fileTypeDistribution?.map((f: any) => f.type) || [],
    datasets: [
      {
        data: storageAnalytics?.fileTypeDistribution?.map((f: any) => f.count) || [],
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  const userRegistrationsData = {
    labels: engagementAnalytics?.userRegistrations?.map((r: any) => r.date) || [],
    datasets: [
      {
        label: 'New Users',
        data: engagementAnalytics?.userRegistrations?.map((r: any) => r.count) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Comprehensive Analytics</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeRange === '7d'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeRange === '30d'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeRange === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Messages"
          value={messageAnalytics?.totalMessages?.toLocaleString() || '0'}
          icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
          subtitle={`${messageAnalytics?.userMessages?.toLocaleString() || 0} from users`}
        />
        <StatCard
          title="Total Tokens"
          value={
            messageAnalytics?.tokenStats?.totalTokens
              ? (messageAnalytics.tokenStats.totalTokens / 1000000).toFixed(2) + 'M'
              : '0'
          }
          icon={<Activity className="h-6 w-6 text-blue-600" />}
          subtitle={`Avg: ${messageAnalytics?.tokenStats?.avgTokens?.toFixed(0) || 0} per message`}
        />
        <StatCard
          title="Total Users"
          value={engagementAnalytics?.totalUsers?.toLocaleString() || '0'}
          icon={<Users className="h-6 w-6 text-green-600" />}
          subtitle={`${engagementAnalytics?.activeUsersLast7Days || 0} active (7d)`}
          trend={`${engagementAnalytics?.retentionRate || 0}% retention`}
        />
        <StatCard
          title="Storage Used"
          value={storageAnalytics?.totalGB ? `${storageAnalytics.totalGB} GB` : '0 GB'}
          icon={<Database className="h-6 w-6 text-orange-600" />}
          subtitle={`${storageAnalytics?.totalFiles?.toLocaleString() || 0} files`}
        />
      </div>

      {/* Messages & Tokens Over Time */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Messages Over Time</h3>
          <div className="h-80">
            <Line
              data={messagesOverTimeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Token Usage Over Time</h3>
          <div className="h-80">
            <Line
              data={tokensOverTimeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Model Usage & File Types */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top AI Models Used</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-full max-w-md">
              <Doughnut
                data={modelUsageData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">File Types Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-full max-w-md">
              <Doughnut
                data={fileTypesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Registrations */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">User Registrations</h3>
        <div className="h-80">
          <Bar
            data={userRegistrationsData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Top Users by Messages */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Users by Message Activity</h3>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tokens
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {messageAnalytics?.topUsers?.map((user: any, index: number) => (
                <tr key={user.userId}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    #{index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.messageCount?.toLocaleString() || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.totalTokens?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users by Storage */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Users by Storage</h3>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Storage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {storageAnalytics?.topUsers?.map((user: any, index: number) => (
                <tr key={user.userId}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    #{index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.fileCount?.toLocaleString() || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.totalMB} MB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">User Engagement Summary</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-600">Active Users (7 days)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {engagementAnalytics?.activeUsersLast7Days || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Users (30 days)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {engagementAnalytics?.activeUsersLast30Days || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Retention Rate</p>
            <p className="mt-2 text-2xl font-semibold text-green-600">
              {engagementAnalytics?.retentionRate || 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
