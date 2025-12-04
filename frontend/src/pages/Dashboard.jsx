import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import { getSettings } from '../api/settings'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  HiOutlineUsers,
  HiOutlineBanknotes,
  HiOutlineReceiptPercent,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCalendarDays,
  HiOutlineMegaphone,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = data?.statistics || {}
  const weeks = data?.contributions_by_week || []
  const months = data?.contributions_by_month || []
  const recentTransactions = data?.recent_transactions || []
  const recentStatements = data?.recent_statements || []
  const memberStatusBreakdown = data?.member_status_breakdown || {}
  const invoicePaymentTrend = data?.invoice_payment_trend || []

  // Calculate key metrics
  const collectionRate = stats.collection_rate || 0
  const netCashFlow = (stats.total_contributions || 0) - (stats.total_expenses || 0)
  const outstandingInvoices = stats.pending_invoices || 0

  // Pie chart colors
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6']

  // Status breakdown for pie chart
  const statusData = Object.entries(memberStatusBreakdown).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Admin 👋</h1>
            <p className="text-indigo-100 text-lg">
              Here's what's happening with your organization today
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="text-right">
              <div className="text-sm text-indigo-200">Collection Rate</div>
              <div className="text-4xl font-bold">{collectionRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Members */}
        <Link to="/members" className="group">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_members || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Active members</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full group-hover:scale-110 transition-transform">
                <HiOutlineUsers className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Total Contributions */}
        <Link to="/transactions" className="group">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(stats.total_contributions || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full group-hover:scale-110 transition-transform">
                <HiOutlineBanknotes className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Pending Invoices */}
        <Link to="/invoices" className="group">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(outstandingInvoices)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.pending_invoice_count || 0} invoices</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full group-hover:scale-110 transition-transform">
                <HiOutlineReceiptPercent className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Net Cash Flow */}
        <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${netCashFlow >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
              <p className={`text-3xl font-bold mt-2 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(netCashFlow)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Contributions - Expenses</p>
            </div>
            <div className={`${netCashFlow >= 0 ? 'bg-emerald-100' : 'bg-red-100'} p-3 rounded-full`}>
              {netCashFlow >= 0 ? (
                <HiOutlineArrowTrendingUp className={`h-8 w-8 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              ) : (
                <HiOutlineArrowTrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            to="/manual-contributions"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-indigo-50 transition-colors group"
          >
            <div className="bg-indigo-100 p-3 rounded-full group-hover:bg-indigo-200 transition-colors">
              <HiOutlineBanknotes className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">Record Contribution</span>
          </Link>

          <Link
            to="/statements"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-purple-50 transition-colors group"
          >
            <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
              <HiOutlineDocumentText className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">Upload Statement</span>
          </Link>

          <Link
            to="/invoices"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-orange-50 transition-colors group"
          >
            <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition-colors">
              <HiOutlineReceiptPercent className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">Manage Invoices</span>
          </Link>

          <Link
            to="/expenses"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-red-50 transition-colors group"
          >
            <div className="bg-red-100 p-3 rounded-full group-hover:bg-red-200 transition-colors">
              <HiOutlineCurrencyDollar className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">Add Expense</span>
          </Link>

          <Link
            to="/meetings"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
              <HiOutlineCalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">Schedule Meeting</span>
          </Link>

          <Link
            to="/reports"
            className="flex flex-col items-center p-4 rounded-lg hover:bg-green-50 transition-colors group"
          >
            <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
              <HiOutlineChartBarSquare className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 mt-2 text-center">View Reports</span>
          </Link>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Statements Processed</p>
              <p className="text-3xl font-bold mt-1">{stats.statements_processed || 0}</p>
            </div>
            <HiOutlineDocumentText className="h-10 w-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Auto Assigned</p>
              <p className="text-3xl font-bold mt-1">{stats.auto_assigned || 0}</p>
            </div>
            <HiOutlineClipboardDocumentList className="h-10 w-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Pending Expenses</p>
              <p className="text-3xl font-bold mt-1">{stats.pending_expenses || 0}</p>
            </div>
            <HiOutlineExclamationTriangle className="h-10 w-10 text-amber-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Upcoming Meetings</p>
              <p className="text-3xl font-bold mt-1">{stats.upcoming_meetings || 0}</p>
            </div>
            <HiOutlineCalendarDays className="h-10 w-10 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Invoice vs Payment Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice vs Payment Trend (8 Weeks)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={invoicePaymentTrend}>
              <defs>
                <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="invoiced"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorInvoiced)"
                name="Invoiced"
              />
              <Area
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorPaid)"
                name="Paid"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Member Status Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Status Distribution</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No status data available
            </div>
          )}
        </div>
      </div>

      {/* Monthly Contributions Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Contributions Overview</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={months.slice(-12)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)
              }
            />
            <Legend />
            <Bar dataKey="amount" fill="#6366f1" name="Contributions" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Summary</h3>
            <Link to="/invoices" className="text-sm text-indigo-600 hover:text-indigo-800">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Invoiced</span>
              <span className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.total_invoices || 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Paid</span>
              <span className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.paid_invoices || 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-lg font-bold text-orange-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.pending_invoices || 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overdue</span>
              <span className="text-lg font-bold text-red-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.overdue_invoices || 0
                )}
              </span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Collection Rate</span>
                <span className="text-2xl font-bold text-indigo-600">{collectionRate.toFixed(1)}%</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Summary</h3>
            <Link to="/transactions" className="text-sm text-indigo-600 hover:text-indigo-800">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Auto Assigned</span>
              <span className="text-xl font-bold text-green-600">{stats.auto_assigned || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-900">Draft</span>
              <span className="text-xl font-bold text-yellow-600">{stats.draft_assignments || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Unassigned</span>
              <span className="text-xl font-bold text-gray-600">{stats.unassigned_transactions || 0}</span>
            </div>
            {stats.unassigned_transactions > 0 && (
              <Link
                to="/transactions"
                className="block w-full text-center py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Assign Transactions
              </Link>
            )}
          </div>
        </div>

        {/* Expense Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Expense Summary</h3>
            <Link to="/expenses" className="text-sm text-indigo-600 hover:text-indigo-800">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Expenses</span>
              <span className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.total_expenses || 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-lg font-bold text-red-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                  stats.monthly_expenses || 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Approval</span>
              <span className="text-lg font-bold text-orange-600">{stats.pending_expenses || 0}</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Net Position</span>
                <span className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                    netCashFlow
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Types Breakdown */}
      {stats.invoices_by_type && Object.keys(stats.invoices_by_type).length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-indigo-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">📋 Invoice Types Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.invoices_by_type.weekly_contribution && (
              <div className="bg-white rounded-xl p-4 border-2 border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📅</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {stats.invoices_by_type.weekly_contribution.count}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Weekly Contributions</h4>
                <p className="text-xs text-gray-500 mb-2">Recurring weekly</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.weekly_contribution.total || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-semibold text-green-700">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.weekly_contribution.paid || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {stats.invoices_by_type.registration_fee && (
              <div className="bg-white rounded-xl p-4 border-2 border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {stats.invoices_by_type.registration_fee.count}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Registration Fees</h4>
                <p className="text-xs text-gray-500 mb-2">One-time charge</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.registration_fee.total || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-semibold text-green-700">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.registration_fee.paid || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {stats.invoices_by_type.software_acquisition && (
              <div className="bg-white rounded-xl p-4 border-2 border-orange-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">💻</span>
                  <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    {stats.invoices_by_type.software_acquisition.count}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Software Acquisition</h4>
                <p className="text-xs text-gray-500 mb-2">Development cost</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.software_acquisition.total || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-semibold text-green-700">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.software_acquisition.paid || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {stats.invoices_by_type.annual_subscription && (
              <div className="bg-white rounded-xl p-4 border-2 border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📆</span>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                    {stats.invoices_by_type.annual_subscription.count}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Annual Subscriptions</h4>
                <p className="text-xs text-gray-500 mb-2">Yearly fee</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.annual_subscription.total || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-semibold text-green-700">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(
                        stats.invoices_by_type.annual_subscription.paid || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts & Notifications */}
      {(stats.unassigned_transactions > 0 || stats.overdue_invoices > 0 || stats.pending_expenses > 0) && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiOutlineExclamationTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">Action Required</h3>
              <div className="mt-2 text-sm text-amber-700 space-y-1">
                {stats.unassigned_transactions > 0 && (
                  <p>
                    • <Link to="/transactions" className="font-medium underline hover:text-amber-900">
                      {stats.unassigned_transactions} unassigned transactions
                    </Link>{' '}
                    need attention
                  </p>
                )}
                {stats.overdue_invoices > 0 && (
                  <p>
                    • <Link to="/invoices?status=overdue" className="font-medium underline hover:text-amber-900">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                        stats.overdue_invoices
                      )}{' '}
                      in overdue invoices
                    </Link>
                  </p>
                )}
                {stats.pending_expenses > 0 && (
                  <p>
                    • <Link to="/expenses" className="font-medium underline hover:text-amber-900">
                      {stats.pending_expenses} expenses
                    </Link>{' '}
                    awaiting approval
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.member?.name || 'Unassigned'}</p>
                    <p className="text-xs text-gray-500 truncate">{tx.particulars}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(tx.tran_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(tx.credit)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        tx.assignment_status === 'auto_assigned'
                          ? 'bg-green-100 text-green-800'
                          : tx.assignment_status === 'manual_assigned'
                          ? 'bg-blue-100 text-blue-800'
                          : tx.assignment_status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tx.assignment_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No recent transactions</div>
            )}
          </div>
        </div>

        {/* Recent Statements */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Statements</h2>
            <Link to="/statements" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentStatements.length > 0 ? (
              recentStatements.map((stmt) => (
                <Link
                  key={stmt.id}
                  to={`/statements/${stmt.id}`}
                  className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                      {stmt.filename}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(stmt.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <span
                    className={`ml-4 flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stmt.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : stmt.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : stmt.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {stmt.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No recent statements</div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Section */}
      {(stats.upcoming_meetings > 0 || stats.active_announcements > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {stats.upcoming_meetings > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.upcoming_meetings}</p>
                  <p className="text-sm text-gray-600 mt-1">Scheduled meetings</p>
                </div>
                <Link
                  to="/meetings"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Meetings
                </Link>
              </div>
            </div>
          )}

          {stats.active_announcements > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Active Announcements</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.active_announcements}</p>
                  <p className="text-sm text-gray-600 mt-1">Current announcements</p>
                </div>
                <Link
                  to="/announcements"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  View Announcements
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
