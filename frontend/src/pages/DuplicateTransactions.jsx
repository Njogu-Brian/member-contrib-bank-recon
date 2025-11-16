import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDuplicates } from '../api/duplicates'
import { getStatements } from '../api/statements'
import Pagination from '../components/Pagination'

export default function DuplicateTransactions() {
  const [filters, setFilters] = useState({
    statement_id: '',
    search: '',
  })
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['duplicates', filters, page],
    queryFn: () => getDuplicates({ ...filters, page }),
  })

  const { data: statementsData } = useQuery({
    queryKey: ['statements', 'all'],
    queryFn: () => getStatements({ per_page: 500 }),
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Duplicate Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            These entries were skipped during import because they matched an existing transaction.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                  <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                    No duplicates were recorded for the current filters.
                  </td>
                </tr>
              )}

              {duplicates.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Duplicate</p>
                        <p className="text-xs text-gray-500">Reason: {item.reason || 'N/A'}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Date</div>
                    <div>{item.duplicate.tran_date || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">Particulars</div>
                    <div className="whitespace-pre-wrap">{item.duplicate.particulars}</div>
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="font-semibold">Ksh {Number(item.duplicate.credit || 0).toLocaleString()}</div>
                    {item.duplicate.page_number && (
                      <div className="text-xs text-gray-500">Page {item.duplicate.page_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 space-y-2">
                    {item.original_transaction ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">
                            Tx #{item.original_transaction.id}
                          </p>
                          <span className="text-xs text-gray-500 capitalize">
                            {item.original_transaction.assignment_status?.replace('_', ' ') || 'unassigned'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Date</div>
                        <div>{item.original_transaction.tran_date || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">Particulars</div>
                        <div className="whitespace-pre-wrap">
                          {item.original_transaction.particulars}
                        </div>
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="font-semibold">
                          Ksh {Number(item.original_transaction.credit || 0).toLocaleString()}
                        </div>
                        {item.original_transaction.member && (
                          <div className="text-xs text-gray-500">
                            Member: {item.original_transaction.member.name}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Original transaction could not be found. It may have been deleted.
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 space-y-2">
                    {item.statement ? (
                      <>
                        <p className="font-semibold">{item.statement.filename}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {item.statement.uploaded_at ? new Date(item.statement.uploaded_at).toLocaleString() : ''}
                        </p>
                        <Link
                          to={`/statements/${item.statement.id}`}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          View Statement
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Statement deleted</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination?.last_page > 1 && (
          <div className="border-t px-6 py-4 bg-gray-50">
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        )}
      </div>
    </div>
  )
}


