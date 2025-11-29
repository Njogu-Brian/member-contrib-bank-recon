import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  getChartOfAccounts,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getCashFlow,
  createJournalEntry,
  postJournalEntry,
} from '../api/accounting'
import { HiDocumentText, HiTableCells, HiChartBar, HiCurrencyDollar, HiArrowTrendingUp } from 'react-icons/hi2'

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('chart-of-accounts')
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts(),
    enabled: activeTab === 'chart-of-accounts',
  })

  const { data: ledger } = useQuery({
    queryKey: ['general-ledger', selectedPeriod],
    queryFn: () => getGeneralLedger({ period_id: selectedPeriod }),
    enabled: activeTab === 'general-ledger' && selectedPeriod,
  })

  const { data: trialBalance } = useQuery({
    queryKey: ['trial-balance', selectedPeriod],
    queryFn: () => getTrialBalance({ period_id: selectedPeriod }),
    enabled: activeTab === 'trial-balance' && selectedPeriod,
  })

  const { data: profitLoss } = useQuery({
    queryKey: ['profit-loss', selectedPeriod],
    queryFn: () => getProfitAndLoss({ period_id: selectedPeriod }),
    enabled: activeTab === 'profit-loss' && selectedPeriod,
  })

  const { data: cashFlow } = useQuery({
    queryKey: ['cash-flow', selectedPeriod],
    queryFn: () => getCashFlow({ period_id: selectedPeriod }),
    enabled: activeTab === 'cash-flow' && selectedPeriod,
  })

  const tabs = [
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: HiTableCells },
    { id: 'journal-entries', label: 'Journal Entries', icon: HiDocumentText },
    { id: 'general-ledger', label: 'General Ledger', icon: HiDocumentText },
    { id: 'trial-balance', label: 'Trial Balance', icon: HiChartBar },
    { id: 'profit-loss', label: 'Profit & Loss', icon: HiArrowTrendingUp },
    { id: 'cash-flow', label: 'Cash Flow', icon: HiCurrencyDollar },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-600 mt-1">Financial accounting and reporting</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'chart-of-accounts' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Chart of Accounts</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Add Account
                </button>
              </div>
              {accounts && accounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accounts.map((account) => (
                        <tr key={account.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{account.code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{account.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{account.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded ${
                              account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No accounts found. Create your chart of accounts to get started.</p>
              )}
            </div>
          )}

          {activeTab === 'trial-balance' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Accounting Period
                </label>
                <input
                  type="number"
                  value={selectedPeriod || ''}
                  onChange={(e) => setSelectedPeriod(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Period ID"
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              {trialBalance && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Trial Balance</h2>
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
                              {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            {trialBalance.total_debits?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            {trialBalance.total_credits?.toLocaleString()}
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
            </div>
          )}

          {activeTab === 'profit-loss' && profitLoss && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Profit & Loss Statement</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Revenue</span>
                    <span className="font-bold text-green-600">
                      {profitLoss.total_revenue?.toLocaleString() || '0.00'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-bold text-red-600">
                      {profitLoss.total_expenses?.toLocaleString() || '0.00'}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
                  <div className="flex justify-between">
                    <span className="font-bold">Net Income</span>
                    <span className={`font-bold text-xl ${
                      (profitLoss.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profitLoss.net_income?.toLocaleString() || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cash-flow' && cashFlow && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Cash Flow Statement</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <span>Net Income</span>
                    <span>{cashFlow.net_income?.toLocaleString() || '0.00'}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <span>Cash from Operations</span>
                    <span>{cashFlow.cash_from_operations?.toLocaleString() || '0.00'}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <span>Beginning Cash Balance</span>
                    <span>{cashFlow.beginning_cash_balance?.toLocaleString() || '0.00'}</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
                  <div className="flex justify-between font-bold">
                    <span>Ending Cash Balance</span>
                    <span className="text-xl">
                      {cashFlow.ending_cash_balance?.toLocaleString() || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

