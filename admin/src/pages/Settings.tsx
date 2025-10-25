export default function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* System Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">System Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Allowed Email Domains
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Current: umontana.edu
            </p>
            <button className="mt-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium">
              Edit
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Default Token Balance
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Tokens given to new users
            </p>
            <input
              type="number"
              className="mt-2 rounded-md border border-gray-300 px-3 py-2"
              defaultValue="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rate Limiting
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Maximum messages per user per minute
            </p>
            <input
              type="number"
              className="mt-2 rounded-md border border-gray-300 px-3 py-2"
              defaultValue="40"
            />
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Feature Flags</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">User Registration</p>
              <p className="text-sm text-gray-500">Allow new user sign-ups</p>
            </div>
            <button className="rounded-full bg-green-600 p-1 px-4 text-sm text-white">
              Enabled
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">File Uploads</p>
              <p className="text-sm text-gray-500">Allow users to upload files</p>
            </div>
            <button className="rounded-full bg-green-600 p-1 px-4 text-sm text-white">
              Enabled
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Social Login</p>
              <p className="text-sm text-gray-500">OAuth authentication</p>
            </div>
            <button className="rounded-full bg-gray-400 p-1 px-4 text-sm text-white">
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Database Maintenance */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Database Maintenance</h3>
        <div className="space-y-4">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Clear Cache
          </button>
          <button className="ml-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Reset Meilisearch
          </button>
          <button className="ml-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
