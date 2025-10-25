import { useQuery } from '@tanstack/react-query';
import axios from '~/utils/axios';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/analytics', {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const tokenUsageByEndpoint = {
    labels: analytics?.tokensByEndpoint?.map((d: any) => d._id) || [],
    datasets: [
      {
        label: 'Tokens Used',
        data: analytics?.tokensByEndpoint?.map((d: any) => d.total) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const dailyUsage = {
    labels: analytics?.dailyUsage?.map((d: any) => d.date) || [],
    datasets: [
      {
        label: 'Messages',
        data: analytics?.dailyUsage?.map((d: any) => d.messages) || [],
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Tokens',
        data: analytics?.dailyUsage?.map((d: any) => d.tokens) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const topUsers = analytics?.topUsers || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Usage Analytics</h2>

      {/* Token Usage by Endpoint */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Token Usage by Endpoint</h3>
        <div className="h-80">
          <Bar
            data={tokenUsageByEndpoint}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Daily Usage Trend */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Daily Usage (Last 30 Days)</h3>
        <div className="h-80">
          <Line
            data={dailyUsage}
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

      {/* Top Users */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Users by Token Usage</h3>
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
                  Tokens Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Conversations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {topUsers.map((user: any, index: number) => (
                <tr key={user._id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    #{index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.tokensUsed?.toLocaleString() || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.messageCount?.toLocaleString() || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.conversationCount?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
