import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Ban, Trash2, RotateCcw, UserPlus, DollarSign } from 'lucide-react';
import axios from '~/utils/axios';
import { format } from 'date-fns';

interface User {
  _id: string;
  email: string;
  username: string;
  name?: string;
  role: string;
  createdAt: string;
  isEnabled: boolean;
  balance?: {
    tokenCredits: number;
  };
}

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      const response = await axios.get('/api/admin/users', {
        params: { search: searchQuery },
        withCredentials: true,
      });
      return response.data;
    },
  });

  const banMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/admin/users/${userId}/ban`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/admin/users/${userId}/unban`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/admin/users/${userId}`, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      await axios.post(`/api/admin/users/${userId}/balance`, { amount }, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowBalanceModal(false);
      setSelectedUser(null);
      setBalanceAmount('');
    },
  });

  const handleBanUser = (user: User) => {
    if (confirm(`Are you sure you want to ban ${user.email}?`)) {
      banMutation.mutate(user._id);
    }
  };

  const handleUnbanUser = (user: User) => {
    unbanMutation.mutate(user._id);
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to DELETE ${user.email}? This action cannot be undone.`)) {
      deleteMutation.mutate(user._id);
    }
  };

  const handleAddBalance = () => {
    if (selectedUser && balanceAmount) {
      balanceMutation.mutate({
        userId: selectedUser._id,
        amount: parseInt(balanceAmount, 10),
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            {users?.length || 0} total users
          </p>
        </div>
        <button className="flex items-center rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
          <UserPlus size={20} className="mr-2" />
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email, username, or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users?.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {user.balance?.tokenCredits?.toLocaleString() || 0}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    user.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isEnabled ? 'Active' : 'Banned'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowBalanceModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                      title="Add Balance"
                    >
                      <DollarSign size={18} />
                    </button>
                    {user.isEnabled ? (
                      <button
                        onClick={() => handleBanUser(user)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Ban User"
                      >
                        <Ban size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnbanUser(user)}
                        className="text-green-600 hover:text-green-900"
                        title="Unban User"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Balance Modal */}
      {showBalanceModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Balance for {selectedUser.username}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Current balance: {selectedUser.balance?.tokenCredits?.toLocaleString() || 0} tokens
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Token Amount</label>
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="Enter token amount"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedUser(null);
                  setBalanceAmount('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBalance}
                disabled={!balanceAmount || balanceMutation.isPending}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {balanceMutation.isPending ? 'Adding...' : 'Add Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
