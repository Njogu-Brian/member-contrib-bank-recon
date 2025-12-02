import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSummary, getDepositReport, getExpensesReport, getMembersReport } from '../api/reports'
import { getTrialBalance, getProfitAndLoss, getCashFlow, getAccountingPeriods } from '../api/accounting'
import { currency, number, buildBadgeStyle } from '../lib/utils'
import ReportExportButton from '../components/ReportExportButton'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('summary')
  const [depositDataset, setDepositDataset] = useState('monthly')
  const [statusFilter, setStatusFilter] = useState('')

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: getSummary,
    enabled: activeTab === 'summary',
  })

  const {
    data: depositReport,
    isLoading: isDepositsLoading,
    isError: isDepositsError,
    error: depositsError,
  } = useQuery({
    queryKey: ['reports-deposits'],
    queryFn: getDepositReport,
    enabled: activeTab === 'deposits',
  })

  const {
    data: expensesReport,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    error: expensesError,
  } = useQuery({
    queryKey: ['reports-expenses'],
    queryFn: getExpensesReport,
    enabled: activeTab === 'expenses',
  })

  const {
    data: membersReport,
    isLoading: isMembersLoading,
    isError: isMembersError,
    error: membersError,
  } = useQuery({
    queryKey: ['reports-members', statusFilter],
    queryFn: () => getMembersReport(statusFilter || null),
    enabled: activeTab === 'members',
  })

  const [accountingPeriod, setAccountingPeriod] = useState(null)

  const { data: accountingPeriods } = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: async () => {
      // Try to get accounting periods, but handle if endpoint doesn't exist
      try {
        const { getAccountingPeriods } = await import('../api/accounting')
        return await getAccountingPeriods()
      } catch {
        return []
      }
    },
    enabled: activeTab === 'accounting',
  })

  const { data: trialBalance } = useQuery({
    queryKey: ['trial-balance', accountingPeriod],
    queryFn: () => getTrialBalance({ period_id: accountingPeriod }),
    enabled: activeTab === 'accounting' && accountingPeriod !== null,
  })

  const { data: profitLoss } = useQuery({
    queryKey: ['profit-loss', accountingPeriod],
    queryFn: () => getProfitAndLoss({ period_id: accountingPeriod }),
    enabled: activeTab === 'accounting' && accountingPeriod !== null,
  })

  const { data: cashFlow } = useQuery({
    queryKey: ['cash-flow', accountingPeriod],
    queryFn: () => getCashFlow({ period_id: accountingPeriod }),
    enabled: activeTab === 'accounting' && accountingPeriod !== null,
  })

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'members', label: 'Members Performance' },
    { id: 'accounting', label: 'Accounting Reports' },
  ]

  const summaryStatuses = summary?.status_counts?.statuses || []
  const memberStatusOptions = membersReport?.available_statuses || []
  const memberSummaryStatuses = membersReport?.summary?.statuses || []

  const renderBar = (value, max, color = 'bg-indigo-500') => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
      <div className="h-2 bg-gray-100 rounded">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        {activeTab !== 'accounting' && (
          <ReportExportButton 
            reportType={activeTab} 
            filters={{
              status: statusFilter || undefined,
              period: activeTab === 'deposits' ? depositDataset : undefined,
            }}
          />
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {isSummaryLoading && <Placeholder message="Loading summary data..." />}
          {isSummaryError && <ErrorMessage error={summaryError} />}

          {summary && !isSummaryLoading && !isSummaryError && (
            <>
              <div className="flex justify-end mb-4">
                <ReportExportButton reportType="summary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Contributions" value={currency(summary.total_contributions)} />
                <SummaryCard title="Total Expenses" value={currency(summary.total_expenses)} />
                <SummaryCard title="Total Members" value={number(summary.total_members)} />
                <SummaryCard title="Unassigned Transactions" value={number(summary.transaction_stats?.unassigned || 0)} />
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Member Performance</h3>
                  <p className="text-sm text-gray-500">Based on % of goal invested</p>
                </div>
                {summaryStatuses.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summaryStatuses.map((status) => (
                      <SummaryCard
                        key={status.slug}
                        title={status.name}
                        value={number(status.count || 0)}
                        subtitle={`${status.percentage ?? 0}% of members`}
                        colorHex={status.color}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No status data available yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'deposits' && (
        <div className="space-y-6">
          {isDepositsLoading && <Placeholder message="Loading deposit analytics..." />}
          {isDepositsError && <ErrorMessage error={depositsError} />}

          {depositReport && !isDepositsLoading && !isDepositsError && (
            <>
              <div className="flex justify-end mb-4">
                <ReportExportButton reportType="deposits" filters={{ period: depositDataset }} />
              </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Today', value: depositReport.totals?.today },
              { label: 'This Week', value: depositReport.totals?.this_week },
              { label: 'This Month', value: depositReport.totals?.this_month },
              { label: 'This Year', value: depositReport.totals?.this_year },
              { label: 'All Time', value: depositReport.totals?.all_time },
            ].map((item) => (
              <SummaryCard key={item.label} title={item.label} value={currency(item.value || 0)} />
            ))}
          </div>

          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Deposit Trends</h3>
              <div className="flex gap-2">
                {['monthly', 'weekly', 'yearly'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setDepositDataset(option)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      depositDataset === option ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {(() => {
                const dataset = depositReport.breakdowns?.[depositDataset] || []
                if (dataset.length === 0) {
                  return <p className="text-sm text-gray-500">No deposits recorded for this period.</p>
                }
                const maxValue = Math.max(...dataset.map((d) => d.total))
                return dataset.map((entry) => (
                  <div key={entry.label}>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{entry.label}</span>
                      <span>{currency(entry.total)}</span>
                    </div>
                    {renderBar(entry.total, maxValue)}
                  </div>
                ))
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Contributors</h3>
              {depositReport.top_members?.length ? (
                <ul className="space-y-3">
                  {depositReport.top_members.map((member) => (
                    <li key={member.member_id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{member.member_name}</span>
                      <span className="text-gray-600">{currency(member.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No members found.</p>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Deposits</h3>
              <div className="space-y-3">
                {depositReport.recent?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-gray-900">{item.member_name || 'Unassigned'}</p>
                      <p className="text-xs text-gray-500">{item.particulars}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{currency(item.amount)}</p>
                      <p className="text-xs text-gray-500">{item.tran_date}</p>
                    </div>
                  </div>
                ))}
                {!depositReport.recent?.length && <p className="text-sm text-gray-500">No recent deposits</p>}
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {isExpensesLoading && <Placeholder message="Loading expenses..." />}
          {isExpensesError && <ErrorMessage error={expensesError} />}
          {expensesReport && !isExpensesLoading && !isExpensesError && (
            <>
              <div className="flex justify-end mb-4">
                <ReportExportButton reportType="expenses" />
              </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
            <div className="space-y-3">
              {expensesReport.categories?.length ? (
                (() => {
                  const max = Math.max(...expensesReport.categories.map((c) => c.total))
                  return expensesReport.categories.map((category) => (
                    <div key={category.category}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{category.category}</span>
                        <span>{currency(category.total)}</span>
                      </div>
                      {renderBar(category.total, max || category.total, 'bg-red-500')}
                    </div>
                  ))
                })()
              ) : (
                <p className="text-sm text-gray-500">No expenses recorded.</p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Spend (last 12 months)</h3>
            <div className="space-y-3">
              {expensesReport.monthly?.length ? (
                (() => {
                  const max = Math.max(...expensesReport.monthly.map((d) => d.total))
                  return expensesReport.monthly.map((entry) => (
                    <div key={entry.label}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{entry.label}</span>
                        <span>{currency(entry.total)}</span>
                      </div>
                      {renderBar(entry.total, max || entry.total, 'bg-orange-500')}
                    </div>
                  ))
                })()
              ) : (
                <p className="text-sm text-gray-500">No expense history yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
            <div className="space-y-3">
              {expensesReport.recent?.map((expense) => (
                <div key={expense.id} className="flex justify-between text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-500">{expense.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{currency(expense.amount)}</p>
                    <p className="text-xs text-gray-500">{expense.expense_date}</p>
                  </div>
                </div>
              ))}
              {!expensesReport.recent?.length && <p className="text-sm text-gray-500">No recent expenses</p>}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Members Performance</h2>
            <div className="flex gap-3">
              <ReportExportButton reportType="members" filters={{ status: statusFilter || undefined }} />
              <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Status</option>
              {memberStatusOptions.map((status) => (
                <option key={status.slug} value={status.slug}>
                  {status.name}
                </option>
              ))}
            </select>
            </div>
          </div>

          {isMembersLoading && <Placeholder message="Loading members..." />}
          {isMembersError && <ErrorMessage error={membersError} />}

          {membersReport && !isMembersLoading && !isMembersError && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Members" value={number(membersReport.summary?.total || 0)} />
                {memberSummaryStatuses.map((status) => (
                  <SummaryCard
                    key={status.slug}
                    title={status.name}
                    value={number(status.count || 0)}
                    subtitle={`${status.percentage ?? 0}%`}
                    colorHex={status.color}
                  />
                ))}
              </div>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {membersReport.members?.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{currency(member.total_contributions || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{currency(member.expected_contributions || 0)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${member.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {currency(member.difference || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border"
                            style={buildBadgeStyle(member.status_color || '#6b7280')}
                          >
                            {member.status_label || member.contribution_status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!membersReport.members?.length && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No members match this filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'accounting' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Accounting Period (Optional)
              </label>
              <select
                value={accountingPeriod || ''}
                onChange={(e) => setAccountingPeriod(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">All Periods</option>
                {accountingPeriods?.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.start_date} to {period.end_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setAccountingPeriod(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  accountingPeriod === null
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Trial Balance
              </button>
              <button
                onClick={() => setAccountingPeriod(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  accountingPeriod === null
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Profit & Loss
              </button>
              <button
                onClick={() => setAccountingPeriod(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  accountingPeriod === null
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cash Flow
              </button>
            </div>

            {trialBalance && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Trial Balance</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {trialBalance.entries?.map((entry, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.account_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {entry.debit > 0 ? currency(entry.debit) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {entry.credit > 0 ? currency(entry.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {currency(trialBalance.total_debits || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {currency(trialBalance.total_credits || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {trialBalance.balanced && (
                  <p className="mt-4 text-green-600 font-medium">✓ Trial balance is balanced</p>
                )}
              </div>
            )}

            {profitLoss && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Profit & Loss Statement</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold text-green-600">{currency(profitLoss.total_revenue || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Expenses</span>
                      <span className="font-bold text-red-600">{currency(profitLoss.total_expenses || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
                    <div className="flex justify-between">
                      <span className="font-bold">Net Income</span>
                      <span
                        className={`font-bold text-xl ${
                          (profitLoss.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {currency(profitLoss.net_income || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {cashFlow && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Cash Flow Statement</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between">
                      <span>Net Income</span>
                      <span>{currency(cashFlow.net_income || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between">
                      <span>Cash from Operations</span>
                      <span>{currency(cashFlow.cash_from_operations || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between">
                      <span>Beginning Cash Balance</span>
                      <span>{currency(cashFlow.beginning_cash_balance || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
                    <div className="flex justify-between font-bold">
                      <span>Ending Cash Balance</span>
                      <span className="text-xl">{currency(cashFlow.ending_cash_balance || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!trialBalance && !profitLoss && !cashFlow && accountingPeriod !== null && (
              <p className="text-gray-500 text-center py-8">Select an accounting period to view reports</p>
            )}

            {!trialBalance && !profitLoss && !cashFlow && accountingPeriod === null && (
              <p className="text-gray-500 text-center py-8">
                Accounting reports will appear here. Please select an accounting period or create accounting data first.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, accent = 'text-gray-900', subtitle, colorHex }) {
  const valueStyle = colorHex ? { color: colorHex } : undefined
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-xl font-semibold mt-2 ${colorHex ? '' : accent}`} style={valueStyle}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function Placeholder({ message }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-sm text-gray-500">
      {message}
    </div>
  )
}

function ErrorMessage({ error }) {
  const message = error?.response?.data?.message || error?.message || 'Failed to load data.'
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
      {message}
    </div>
  )
}

