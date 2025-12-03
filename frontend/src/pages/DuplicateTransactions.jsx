import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getDuplicates, reanalyzeDuplicates } from '../api/duplicates'
import { getStatements } from '../api/statements'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'

export default function DuplicateTransactions() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    statement_id: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const { data, isLoading, error } = useQuery({
    queryKey: ['duplicates', filters, page, perPage],
    queryFn: () => getDuplicates({ ...filters, page, per_page: perPage }),
  })

  const { data: statementsData } = useQuery({
    queryKey: ['statements', 'all'],
    queryFn: () => getStatements({ per_page: 500 }),
  })

  const queryClient = useQueryClient()

  const reanalyzeMutation = useMutation({
    mutationFn: (statementId) => reanalyzeDuplicates(statementId),
    onSuccess: () => {
      queryClient.invalidateQueries(['duplicates'])
      alert('Duplicate reanalysis completed successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to reanalyze duplicates')
    },
  })

  const duplicates = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  const pagination = data && !Array.isArray(data) ? data : {}

  if (isLoading) {
    return <div className="text-center py-12">Loading duplicate transactions...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load duplicates: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duplicate Transactions"
        description="Transactions flagged as duplicates based on value date, narrative, and amount"
        metric={pagination?.total || 0}
        metricLabel="Total Duplicates"
        gradient="from-red-600 to-orange-600"
      />

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => {
              if (confirm('Reanalyze all duplicate transactions? This will re-check all statements.')) {
                reanalyzeMutation.mutate(null)
              }
            }}
            disabled={reanalyzeMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {reanalyzeMutation.isPending ? 'Reanalyzing...' : '🔄 Reanalyze All'}
          </button>
          {filters.statement_id && (
            <button
              onClick={() => {
                if (confirm(`Reanalyze duplicates for this statement only?`)) {
                  reanalyzeMutation.mutate(filters.statement_id)
                }
              }}
              disabled={reanalyzeMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {reanalyzeMutation.isPending ? 'Reanalyzing...' : '🔄 Reanalyze Statement'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Statement</label>
          <select
            value={filters.statement_id}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, statement_id: e.target.value }))
              setPage(1)
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Statements</option>
            {statementsData?.data?.map((statement) => (
              <option key={statement.id} value={statement.id}>
                {statement.filename}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }))
              setPage(1)
            }}
            placeholder="Search particulars, reference, or reason..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duplicate Entry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statement
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {duplicates.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="text-6xl mb-4">✅</div>
                      <p className="text-lg font-medium text-gray-900">No Duplicates Found</p>
                      <p className="text-sm text-gray-500 mt-2">
                        All transactions are unique based on value date, narrative, and amount.
                      </p>
                      <button
                        onClick={() => {
                          if (confirm('Reanalyze all statements to check for duplicates?')) {
                            reanalyzeMutation.mutate(null)
                          }
                        }}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        🔄 Reanalyze for Duplicates
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {duplicates.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 align-top text-sm text-gray-900 space-y-2">
                    <button
                      onClick={() => navigate(`/statements/${item.bank_statement_id}/transactions`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-red-700">Duplicate Entry 🔴</p>
                          <p className="text-xs text-gray-500">Reason: {item.duplicate_reason || 'N/A'}</p>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">
                          View in Statement →
                        </span>
                      </div>
                      <div className="space-y-1">
                          <div>
                            <span className="text-xs text-gray-500">Date: </span>
                            <span className="font-medium">
                              {item.tran_date ? new Date(item.tran_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }) : 'Unknown'}
                            </span>
                          </div>
                        {item.particulars_snapshot && (
                          <div>
                            <span className="text-xs text-gray-500">Particulars: </span>
                            <div className="text-sm mt-1 max-h-12 overflow-hidden">{item.particulars_snapshot}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-gray-500">Amount: </span>
                          <span className="font-semibold text-red-600">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(item.credit || 0))}
                          </span>
                        </div>
                        {item.page_number && (
                          <div className="text-xs text-gray-500">Page {item.page_number}</div>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 space-y-2">
                    {item.transaction ? (
                      item.transaction.member_id ? (
                        <button
                          onClick={() => navigate(`/members/${item.transaction.member_id}?highlight=${item.transaction_id}`)}
                          className="w-full text-left p-3 rounded-lg hover:bg-green-50 transition-colors border border-green-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-green-700">
                              Transaction #{item.transaction_id}
                            </p>
                            <span className="text-xs text-green-700 font-medium">
                              View Member →
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-xs text-gray-500">Date: </span>
                              <span className="font-medium">
                                {new Date(item.transaction.tran_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Particulars: </span>
                              <div className="text-sm mt-1 max-h-12 overflow-hidden">{item.transaction.particulars}</div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Amount: </span>
                              <span className="font-semibold text-green-600">
                                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                                  Number(item.transaction.credit || 0)
                                )}
                              </span>
                            </div>
                            {item.transaction.member && (
                              <div className="text-xs text-green-600 font-medium mt-2">
                                ✓ Assigned to: {item.transaction.member.name}
                              </div>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-700">
                              Transaction #{item.transaction_id}
                            </p>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                              {item.transaction.assignment_status || 'unassigned'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-xs text-gray-500">Date: </span>
                              <span>{new Date(item.transaction.tran_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Particulars: </span>
                              <div className="text-sm mt-1 max-h-12 overflow-hidden">{item.transaction.particulars}</div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Amount: </span>
                              <span className="font-semibold">
                                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                                  Number(item.transaction.credit || 0)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-800">
                          ⚠️ Original transaction not found. It may have been deleted or archived.
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900">
                    {item.statement ? (
                      <Link
                        to={`/statements/${item.statement.id}/transactions`}
                        className="block p-3 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200"
                      >
                        <p className="font-semibold text-indigo-700">{item.statement.filename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {new Date(item.statement.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                        <div className="text-xs text-indigo-600 font-medium mt-2">
                          View Transactions →
                        </div>
                      </Link>
                    ) : (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">Statement not found</p>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (pagination.last_page > 1 || pagination.total > 0) && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              <Pagination
                pagination={{
                  current_page: pagination.current_page || page,
                  last_page: pagination.last_page || 1,
                  per_page: perPage,
                  total: pagination.total || 0,
                }}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


