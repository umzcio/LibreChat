import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, Shield, Ban, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface Violation {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  type: string;
  score: number;
  metadata: any;
  createdAt: string;
}

export default function Governance() {
  const { data: violations } = useQuery<Violation[]>({
    queryKey: ['violations'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/violations', {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const { data: moderationStats } = useQuery({
    queryKey: ['moderationStats'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/moderation/stats', {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const getViolationBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      MESSAGE_LIMIT: 'bg-yellow-100 text-yellow-800',
      ILLEGAL_MODEL_REQUEST: 'bg-red-100 text-red-800',
      TOKEN_BALANCE: 'bg-orange-100 text-orange-800',
      BAN: 'bg-red-100 text-red-800',
      FILE_UPLOAD_LIMIT: 'bg-blue-100 text-blue-800',
      LOGINS: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Governance & Moderation</h2>
        <p className="mt-1 text-sm text-gray-500">
          Monitor violations, manage policies, and review flagged content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Violations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {moderationStats?.totalViolations || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3">
              <MessageSquare className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Flagged Messages</p>
              <p className="text-2xl font-semibold text-gray-900">
                {moderationStats?.flaggedMessages || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-3">
              <Ban className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Banned Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {moderationStats?.bannedUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Policies</p>
              <p className="text-2xl font-semibold text-gray-900">
                {moderationStats?.activePolicies || 5}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Violations</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Violation Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {violations?.map((violation) => (
                <tr key={violation._id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {violation.userId?.username || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {violation.userId?.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getViolationBadgeColor(
                        violation.type
                      )}`}
                    >
                      {violation.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {violation.score}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {format(new Date(violation.createdAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Moderation Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Moderation Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">OpenAI Moderation</p>
              <p className="text-sm text-gray-500">Use OpenAI's moderation API to flag content</p>
            </div>
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium">
              Configure
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-Ban Threshold</p>
              <p className="text-sm text-gray-500">Automatically ban users after violations</p>
            </div>
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium">
              Configure
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Content Filtering</p>
              <p className="text-sm text-gray-500">Block specific keywords and patterns</p>
            </div>
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
