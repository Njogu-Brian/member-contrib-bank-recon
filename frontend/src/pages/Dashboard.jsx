import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { getSettings } from '../api/settings'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })
  
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  })
  
  const appName = settings?.app_name || 'Dashboard'
  const logoUrl = settings?.logo_url

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const stats = data?.statistics || {}
  const weeks = data?.contributions_by_week || []
  const months = data?.contributions_by_month || []
  const recentTransactions = data?.recent_transactions || []
  const recentStatements = data?.recent_statements || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={appName}
              className="h-12 object-contain"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{appName}</h1>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">{stats.total_members || 0}</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">{stats.unassigned_transactions || 0}</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Unassigned Transactions</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(stats.total_contributions || 0)}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Contributions</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contributions by Week</h2>
          <div className="space-y-2">
            {weeks.map((week, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{week.week_start}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(week.amount / Math.max(...weeks.map(w => w.amount), 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">
                    {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(week.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contributions by Month</h2>
          <div className="space-y-2">
            {months.map((month, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month.month_name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(month.amount / Math.max(...months.map(m => m.amount), 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">
                    {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(month.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 break-words whitespace-normal">{tx.particulars}</p>
                    <p className="text-xs text-gray-500">{tx.tran_date}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(tx.credit)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                      tx.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                      tx.assignment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tx.assignment_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Statements</h2>
          <div className="space-y-3">
            {recentStatements.map((stmt) => (
              <div key={stmt.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{stmt.filename}</p>
                    <p className="text-xs text-gray-500">{new Date(stmt.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stmt.status === 'completed' ? 'bg-green-100 text-green-800' :
                    stmt.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    stmt.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {stmt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

